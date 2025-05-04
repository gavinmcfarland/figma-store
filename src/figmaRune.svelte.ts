// TODO: Update to use automatic getters and setters if possible

import { figmaAPI } from "./figmaAPI";
import { tick } from "svelte";

type NodeTargetFn = (
	figma: PluginAPI,
	params: Record<string, any>,
) => SceneNode | BaseNode[];

class FigmaState<T> {
	#storageKey: string;
	// @ts-ignore
	#version = $state(0);
	// @ts-ignore
	#value = $state<T | undefined>(undefined);
	#isInitialized = false;
	#listeners = 0;
	#initCallbacks: ((state: T | undefined) => Promise<void> | void)[] = [];
	#messageQueue: { type: string; value: any }[] = [];
	#initPromise: Promise<void> | null = null;
	#nodeTarget?: NodeTargetFn;
	#params?: Record<string, any>;

	// Update getter and add setter for direct value access
	get value() {
		this.#version; // Track version changes
		return this.#value;
	}

	set value(newValue: T | undefined) {
		this.#value = newValue;
		this.#version += 1;
		this.#saveStateToStorage("set");
	}

	constructor(
		storageKey: string,
		initialValue?: T,
		nodeTarget?: NodeTargetFn,
		params?: Record<string, any>,
	) {
		// Runtime check
		if (typeof figma !== "undefined") {
			throw new Error(
				"FigmaStore cannot be used in the Figma main thread.",
			);
		}

		this.#storageKey = storageKey;
		this.#value = initialValue;
		this.#nodeTarget = nodeTarget;
		this.#params = params;
		this.init();
		this.setupEffects();
	}

	#messageHandler = (event: MessageEvent) => {
		let message = event.data.pluginMessage;
		if (
			message.type === "UPDATE_STATE" &&
			message.key === this.#storageKey
		) {
			console.log(
				"Received message:",
				message.value,
				"isInitialized:",
				this.#isInitialized,
			);
			if (!this.#isInitialized) {
				this.#messageQueue.push(message);
				console.log(
					"Queued message, queue length:",
					this.#messageQueue.length,
				);
			} else {
				this.#value = message.value;
				this.#version += 1;
				console.log(
					"Applied message directly, new value:",
					this.#value,
				);
			}
		}
	};

	private setupEffects() {
		// @ts-ignore
		$effect(() => {
			if (this.#listeners === 0) {
				window.addEventListener("message", this.#messageHandler);
			}
			this.#listeners += 1;

			return () => {
				tick().then(() => {
					this.#listeners -= 1;
					if (this.#listeners === 0) {
						window.removeEventListener(
							"message",
							this.#messageHandler,
						);
					}
				});
			};
		});

		// @ts-ignore
		$effect(() => {
			if (!this.#isInitialized) return;
			this.#saveStateToStorage();
		});
	}

	async #saveStateToStorage(stateType?: "set") {
		try {
			const inputParams = {
				key: this.#storageKey,
				value: this.#value,
				params: this.#params,
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
				`Failed to save state to storage for key "${this.#storageKey}":`,
				error,
			);
		}
	}

	async #loadStateFromStorage() {
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
				{ key: this.#storageKey, params: this.#params },
			);
		} catch (error) {
			console.error(
				`Failed to load state from storage for key "${this.#storageKey}":`,
				error,
			);
		}
	}

	async init() {
		if (this.#initPromise) {
			return this.#initPromise;
		}

		if (this.#isInitialized) return;

		this.#initPromise = (async () => {
			try {
				const storedState = await this.#loadStateFromStorage();
				console.log("Loaded stored state:", storedState);

				if (typeof storedState !== "undefined") {
					this.#value = storedState;
					console.log("Applied stored state, value:", this.#value);
				}

				this.#isInitialized = true;
				console.log(
					"Processing queued messages, count:",
					this.#messageQueue.length,
				);

				while (this.#messageQueue.length > 0) {
					const message = this.#messageQueue.shift();
					console.log("Processing queued message:", message?.value);
					if (message) {
						this.#value = message.value;
						this.#version += 1;
						console.log(
							"Applied queued message, new value:",
							this.#value,
						);
					}
				}

				await Promise.all(
					this.#initCallbacks.map((callback) =>
						callback(this.#value),
					),
				);
			} catch (error) {
				console.error(
					`Failed to load state from storage for key "${this.#storageKey}":`,
					error,
				);
			} finally {
				this.#initPromise = null;
			}
		})();

		return this.#initPromise;
	}

	get(): T | undefined {
		this.#version; // Track version changes
		return this.#value;
	}

	set(newState: T): void {
		this.#value = newState;
		this.#version += 1;
		this.#saveStateToStorage("set");
	}

	update(updater: (state: T) => T): void {
		this.#value = updater(this.#value);
		this.#saveStateToStorage();
	}

	async updateAsync(updater: (state: T) => Promise<T>): Promise<void> {
		try {
			const updated = await updater(this.#value);
			this.#value = updated;
		} catch (err) {
			console.error("Failed to update state asynchronously:", err);
		}
	}

	getNodeTarget(): SceneNode | BaseNode | BaseNode[] | undefined {
		if (!this.#nodeTarget) return;
		const target = this.#nodeTarget(figma, this.#params || {});
		if (Array.isArray(target)) {
			return target.length > 0 ? target : undefined;
		}
		return target;
	}

	async onInit(callback?: (state: T | undefined) => Promise<void> | void) {
		if (this.#isInitialized) {
			if (callback) {
				await Promise.resolve(callback(this.#value));
			}
			return;
		}

		const initPromise = new Promise<void>((resolve) => {
			this.#initCallbacks.push(async (state) => {
				if (callback) {
					await Promise.resolve(callback(state));
				}
				resolve();
			});
		});

		if (!this.#isInitialized) {
			this.init();
		}

		return initPromise;
	}

	subscribe(callback: (val: T) => void) {
		if (this.#listeners === 0) {
			window.addEventListener("message", this.#messageHandler);
		}
		this.#listeners += 1;

		return () => {
			this.#listeners -= 1;
			if (this.#listeners === 0) {
				window.removeEventListener("message", this.#messageHandler);
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
