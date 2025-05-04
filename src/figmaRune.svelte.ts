// TODO: Update to use automatic getters and setters if possible

import { figmaAPI } from "./figmaAPI";
import { tick } from "svelte";

type NodeTargetFn = (
	figma: PluginAPI,
	params: Record<string, any>,
) => SceneNode | BaseNode[];

export function useFigmaState<T>(
	storageKey: string,
	initialValue?: T,
	nodeTarget?: NodeTargetFn,
	params?: Record<string, any>,
) {
	// @ts-ignore
	let version = $state(0);
	// Runtime check
	if (typeof figma !== "undefined") {
		throw new Error("FigmaStore cannot be used in the Figma main thread.");
	}

	let isInitialized = false;
	let listeners = 0;

	// @ts-ignore
	let value = $state<T | undefined>(initialValue);

	let initCallbacks: ((state: T | undefined) => Promise<void> | void)[] = [];

	let messageQueue: { type: string; value: any }[] = [];

	let initPromise: Promise<void> | null = null;

	const messageHandler = (event: MessageEvent) => {
		let message = event.data.pluginMessage;
		if (message.type === "UPDATE_STATE" && message.key === storageKey) {
			console.log(
				"Received message:",
				message.value,
				"isInitialized:",
				isInitialized,
			);
			if (!isInitialized) {
				messageQueue.push(message);
				console.log(
					"Queued message, queue length:",
					messageQueue.length,
				);
			} else {
				value = message.value;
				version += 1;
				console.log("Applied message directly, new value:", value);
			}
		}
	};

	init();
	// @ts-ignore
	$effect(() => {
		if (listeners === 0) {
			window.addEventListener("message", messageHandler);
		}
		listeners += 1;

		return () => {
			tick().then(() => {
				listeners -= 1;
				if (listeners === 0) {
					window.removeEventListener("message", messageHandler);
				}
			});
		};
	});

	async function _saveStateToStorage(stateType?: "set") {
		try {
			const inputParams = {
				key: storageKey,
				value: value,
				params: params,
			};
			await figmaAPI.run(
				async (figma, inputParams) => {
					// Safely destructure after checking if inputParams is defined
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
				`Failed to save state to storage for key "${storageKey}":`,
				error,
			);
		}
	}

	async function _loadStateFromStorage() {
		try {
			return await figmaAPI.run(
				async (figma, inputParams) => {
					const { key, params } = inputParams || {
						key: "",
						params: undefined,
					};
					// Guard clause for undefined key
					if (!key) return;
					return await figma.clientStorage.getAsync(key);
				},
				{ key: storageKey, params: params },
			);
		} catch (error) {
			console.error(
				`Failed to load state from storage for key "${storageKey}":`,
				error,
			);
		}
	}

	async function init() {
		// If initialization is already in progress, wait for it
		if (initPromise) {
			return initPromise;
		}

		// If already initialized, return immediately
		if (isInitialized) return;

		// Create a new initialization promise
		initPromise = (async () => {
			try {
				const storedState = await _loadStateFromStorage();
				console.log("Loaded stored state:", storedState);
				// Apply stored state if it exists, otherwise keep initialValue
				if (typeof storedState !== "undefined") {
					value = storedState;
					console.log("Applied stored state, value:", value);
				}

				isInitialized = true;
				console.log(
					"Processing queued messages, count:",
					messageQueue.length,
				);
				// Process queued messages
				while (messageQueue.length > 0) {
					const message = messageQueue.shift();
					console.log("Processing queued message:", message?.value);
					if (message) {
						value = message.value;
						version += 1;
						console.log(
							"Applied queued message, new value:",
							value,
						);
					}
				}
				// Call all registered init callbacks
				await Promise.all(
					initCallbacks.map((callback) => callback(value)),
				);
			} catch (error) {
				console.error(
					`Failed to load state from storage for key "${storageKey}":`,
					error,
				);
			} finally {
				// Clear the promise after initialization is complete
				initPromise = null;
			}
		})();

		return initPromise;
	}

	// @ts-ignore
	$effect(() => {
		if (!isInitialized) return;
		_saveStateToStorage();
	});

	function get(): T | undefined {
		version; // Track version changes
		return value;
	}

	function set(newState: T): void {
		value = newState;
		version += 1;
		_saveStateToStorage("set");
	}

	function update(updater: (state: T) => T): void {
		value = updater(value);
		_saveStateToStorage();
	}

	async function updateAsync(
		updater: (state: T) => Promise<T>,
	): Promise<void> {
		try {
			const updated = await updater(value);
			value = updated;
		} catch (err) {
			console.error("Failed to update state asynchronously:", err);
		}
	}

	function getNodeTarget(): SceneNode | BaseNode | BaseNode[] | undefined {
		if (!nodeTarget) return;
		const target = nodeTarget(figma, params || {});
		if (Array.isArray(target)) {
			return target.length > 0 ? target : undefined;
		}
		return target;
	}

	return {
		init,
		get,
		set,
		update,
		updateAsync,
		getNodeTarget,
		onInit: async (
			callback?: (state: T | undefined) => Promise<void> | void,
		) => {
			if (isInitialized) {
				// If already initialized, call callback if provided
				if (callback) {
					await Promise.resolve(callback(value));
				}
				return;
			}

			// Create a promise that resolves when initialization is complete
			const initPromise = new Promise<void>((resolve) => {
				initCallbacks.push(async (state) => {
					if (callback) {
						await Promise.resolve(callback(state));
					}
					resolve();
				});
			});

			// Start initialization if not already started
			if (!isInitialized) {
				init();
			}

			return initPromise;
		},
		subscribe: (callback: (val: T) => void) => {
			if (listeners === 0) {
				window.addEventListener("message", messageHandler);
			}
			listeners += 1;

			return () => {
				listeners -= 1;
				if (listeners === 0) {
					window.removeEventListener("message", messageHandler);
				}
			};
		},
	};
}
