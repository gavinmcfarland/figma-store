// TODO: Update to use automatic getters and setters if possible

import { figmaAPI } from "./figmaAPI";
import { tick } from "svelte";

type NodeTargetFn = (
	figma: PluginAPI,
	params: Record<string, any>,
) => SceneNode | BaseNode[];

class FigmaState<T> {
	// @ts-ignore
	private version = $state(0);
	// @ts-ignore
	private _value = $state<T | undefined>(undefined);

	// Update getter and add setter for direct value access
	get value() {
		this.version; // Track version changes
		return this._value;
	}

	set value(newValue: T | undefined) {
		this._value = newValue;
		this.version += 1;
		this._saveStateToStorage("set");
	}

	private isInitialized = false;

	private listeners = 0;
	private initCallbacks: ((state: T | undefined) => Promise<void> | void)[] =
		[];
	private messageQueue: { type: string; value: any }[] = [];
	private initPromise: Promise<void> | null = null;

	constructor(
		private storageKey: string,
		private initialValue?: T,
		private nodeTarget?: NodeTargetFn,
		private params?: Record<string, any>,
	) {
		// Runtime check
		if (typeof figma !== "undefined") {
			throw new Error(
				"FigmaStore cannot be used in the Figma main thread.",
			);
		}

		this._value = initialValue;
		this.init();
		this.setupEffects();
	}

	private messageHandler = (event: MessageEvent) => {
		let message = event.data.pluginMessage;
		if (
			message.type === "UPDATE_STATE" &&
			message.key === this.storageKey
		) {
			console.log(
				"Received message:",
				message.value,
				"isInitialized:",
				this.isInitialized,
			);
			if (!this.isInitialized) {
				this.messageQueue.push(message);
				console.log(
					"Queued message, queue length:",
					this.messageQueue.length,
				);
			} else {
				this._value = message.value;
				this.version += 1;
				console.log(
					"Applied message directly, new value:",
					this._value,
				);
			}
		}
	};

	private setupEffects() {
		// @ts-ignore
		$effect(() => {
			if (this.listeners === 0) {
				window.addEventListener("message", this.messageHandler);
			}
			this.listeners += 1;

			return () => {
				tick().then(() => {
					this.listeners -= 1;
					if (this.listeners === 0) {
						window.removeEventListener(
							"message",
							this.messageHandler,
						);
					}
				});
			};
		});

		// @ts-ignore
		$effect(() => {
			if (!this.isInitialized) return;
			this._saveStateToStorage();
		});
	}

	private async _saveStateToStorage(stateType?: "set") {
		try {
			const inputParams = {
				key: this.storageKey,
				value: this._value,
				params: this.params,
			};
			await figmaAPI.run(
				async (figma, inputParams) => {
					const { key, value, params } = inputParams || {
						key: "",
						value: undefined,
						params: undefined,
					};
					if (!key) return;
					await figma.clientStorage.setAsync(key, value);
					return value;
				},
				inputParams,
				stateType,
			);
		} catch (error) {
			console.error(
				`Failed to save state to storage for key "${this.storageKey}":`,
				error,
			);
		}
	}

	private async _loadStateFromStorage() {
		try {
			return await figmaAPI.run(
				async (figma, inputParams) => {
					const { key, params } = inputParams || {
						key: "",
						params: undefined,
					};
					if (!key) return;
					return await figma.clientStorage.getAsync(key);
				},
				{ key: this.storageKey, params: this.params },
			);
		} catch (error) {
			console.error(
				`Failed to load state from storage for key "${this.storageKey}":`,
				error,
			);
		}
	}

	async init() {
		if (this.initPromise) {
			return this.initPromise;
		}

		if (this.isInitialized) return;

		this.initPromise = (async () => {
			try {
				const storedState = await this._loadStateFromStorage();
				console.log("Loaded stored state:", storedState);

				if (typeof storedState !== "undefined") {
					this._value = storedState;
					console.log("Applied stored state, value:", this._value);
				}

				this.isInitialized = true;
				console.log(
					"Processing queued messages, count:",
					this.messageQueue.length,
				);

				while (this.messageQueue.length > 0) {
					const message = this.messageQueue.shift();
					console.log("Processing queued message:", message?.value);
					if (message) {
						this._value = message.value;
						this.version += 1;
						console.log(
							"Applied queued message, new value:",
							this._value,
						);
					}
				}

				await Promise.all(
					this.initCallbacks.map((callback) => callback(this._value)),
				);
			} catch (error) {
				console.error(
					`Failed to load state from storage for key "${this.storageKey}":`,
					error,
				);
			} finally {
				this.initPromise = null;
			}
		})();

		return this.initPromise;
	}

	get(): T | undefined {
		this.version; // Track version changes
		return this._value;
	}

	set(newState: T): void {
		this._value = newState;
		this.version += 1;
		this._saveStateToStorage("set");
	}

	update(updater: (state: T) => T): void {
		this._value = updater(this._value);
		this._saveStateToStorage();
	}

	async updateAsync(updater: (state: T) => Promise<T>): Promise<void> {
		try {
			const updated = await updater(this._value);
			this._value = updated;
		} catch (err) {
			console.error("Failed to update state asynchronously:", err);
		}
	}

	getNodeTarget(): SceneNode | BaseNode | BaseNode[] | undefined {
		if (!this.nodeTarget) return;
		const target = this.nodeTarget(figma, this.params || {});
		if (Array.isArray(target)) {
			return target.length > 0 ? target : undefined;
		}
		return target;
	}

	async onInit(callback?: (state: T | undefined) => Promise<void> | void) {
		if (this.isInitialized) {
			if (callback) {
				await Promise.resolve(callback(this._value));
			}
			return;
		}

		const initPromise = new Promise<void>((resolve) => {
			this.initCallbacks.push(async (state) => {
				if (callback) {
					await Promise.resolve(callback(state));
				}
				resolve();
			});
		});

		if (!this.isInitialized) {
			this.init();
		}

		return initPromise;
	}

	subscribe(callback: (val: T) => void) {
		if (this.listeners === 0) {
			window.addEventListener("message", this.messageHandler);
		}
		this.listeners += 1;

		return () => {
			this.listeners -= 1;
			if (this.listeners === 0) {
				window.removeEventListener("message", this.messageHandler);
			}
		};
	}
}

export function useFigmaState<T>(
	storageKey: string,
	initialValue?: T,
	nodeTarget?: NodeTargetFn,
	params?: Record<string, any>,
) {
	return new FigmaState<T>(storageKey, initialValue, nodeTarget, params);
}
