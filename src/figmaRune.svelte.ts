// figmaStore.ts
import { figmaAPI } from "./figmaAPI";
import { tick } from "svelte";

type NodeTargetFn = (
	figma: PluginAPI,
	params: Record<string, any>,
) => SceneNode | BaseNode[];

export function figmaState<T>(
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

	const messageHandler = (event: MessageEvent) => {
		let message = event.data.pluginMessage;
		if (message.type === "STATE_UPDATE") {
			value = message.value;
			version += 1;
		}
	};

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

	async function _saveStateToStorage() {
		try {
			const inputParams = {
				key: storageKey,
				value: value,
				params: params,
			};
			await figmaAPI.run(async (figma, inputParams) => {
				// Safely destructure after checking if inputParams is defined
				const { key, value, params } = inputParams || {
					key: "",
					value: undefined,
					params: undefined,
				};
				if (!key) return;
				await figma.clientStorage.setAsync(key, value);
				return value;
			}, inputParams);
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
		if (isInitialized) return;

		try {
			const storedState = await _loadStateFromStorage();
			// Apply stored state if it exists, otherwise keep initialValue
			if (typeof storedState !== "undefined") {
				value = storedState;
			}

			isInitialized = true;
		} catch (error) {
			console.error(
				`Failed to load state from storage for key "${storageKey}":`,
				error,
			);
		}
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
		_saveStateToStorage();
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
