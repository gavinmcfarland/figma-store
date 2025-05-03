// figmaStore.ts
import { figmaAPI } from "./figmaAPI";

type StoreValue = object | number | string | boolean | null;

type NodeTargetFn = (
	figma: PluginAPI,
	params: Record<string, any>,
) => SceneNode | BaseNode[];

export function figmaState<T extends StoreValue>(
	storageKey: string,
	initialValue: T,
	nodeTarget?: NodeTargetFn,
	params?: Record<string, any>,
) {
	// Runtime check
	if (typeof figma !== "undefined") {
		throw new Error("FigmaStore cannot be used in the Figma main thread.");
	}

	let isInitialized = false;

	// @ts-ignore
	let store = $state<T>(initialValue);

	async function _saveStateToStorage() {
		try {
			const inputParams = {
				key: storageKey,
				value: store,
				params: params,
			};
			await figmaAPI.run(async (figma, inputParams) => {
				// Safely destructure after checking if inputParams is defined
				const { key, value, params } = inputParams || {
					key: "",
					value: undefined,
					params: undefined,
				};
				if (!key || !value) return;
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

	async function initialize() {
		console.log("initializing", isInitialized);
		if (isInitialized) return;

		try {
			const storedState = await figmaAPI.run(
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
			// Ensure that storedState is only applied if it is not undefined
			if (typeof storedState !== "undefined") {
				store = storedState;
			}

			if (typeof storedState !== "undefined") {
				store = storedState;
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

	function get(): T {
		return store;
	}

	function set(newState: T): void {
		store = newState;
	}

	function update(updater: (state: T) => T): void {
		store = updater(store);
		_saveStateToStorage();
	}

	async function updateAsync(
		updater: (state: T) => Promise<T>,
	): Promise<void> {
		try {
			const updated = await updater(store);
			store = updated;
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
		initialize,
		get,
		set,
		update,
		updateAsync,
		getNodeTarget,
		subscribe: (callback: (val: T) => void) => {},
	};
}
