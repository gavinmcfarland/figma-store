import { writable, type Writable, get } from "svelte/store";
import { figmaAPI } from "./figmaAPI";

export class FigmaStore<T extends StoreValue> {
	private state: T;
	private store: Writable<T>;
	private isInitialized: boolean;
	private storageKey: string;
	private nodeTarget?: (
		figma: PluginAPI,
		params: Record<string, any>,
	) => SceneNode | BaseNode[]; // Updated to return either SceneNode or BaseNode[]

	constructor(
		storageKey: string,
		initialValue: T, // Changed from defaultState to initialValue
		nodeTarget?: (
			figma: PluginAPI,
			params: Record<string, any>,
		) => SceneNode | BaseNode[], // Updated
		private params?: Record<string, any>,
	) {
		// Check if we're in the Figma main code environment
		if (typeof figma !== "undefined") {
			throw new Error(
				"FigmaStore cannot be used in the Figma main thread.",
			);
		}

		this.state = initialValue; // Changed from defaultState to initialValue
		this.store = writable(this.state);
		this.isInitialized = false;
		this.storageKey = storageKey;
		this.nodeTarget = nodeTarget;
		this.params = params;
	}

	/** Static method to create and initialize the store */
	static async create<T extends object | number | string | boolean | null>(
		key: string,
		initialValue: T, // Changed from defaultState to initialValue
		nodeTarget?: (
			figma: PluginAPI,
			params: Record<string, any>,
		) => SceneNode | BaseNode[], // Updated
		params?: Record<string, any>, // Optional fourth parameter
	): Promise<FigmaStore<T>> {
		const store = new FigmaStore(key, initialValue, nodeTarget, params);
		await store.initialize();
		return store;
	}

	/** Initialize the store by loading state from clientStorage */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

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
				{ key: this.storageKey, params: this.params },
			);

			// Ensure that storedState is only applied if it is not undefined
			if (typeof storedState !== "undefined") {
				this.state = storedState;
			}
			this.isInitialized = true;
			console.log("initialize state");
			this.store.set(this.state); // Update the Svelte store
		} catch (error) {
			console.error(
				`Failed to load state from storage for key "${this.storageKey}":`,
				error,
			);
		}
	}

	/** Svelte's subscribe method */
	subscribe(
		run: (value: T) => void,
		invalidate?: (value?: T) => void,
	): () => void {
		return this.store.subscribe(run, invalidate);
	}

	get(): T {
		return this.state;
	}

	/** Set the state immediately and persist asynchronously */
	set(newState: T): void {
		console.log("set state");
		this.state = newState;
		this.store.set(this.state); // Update the Svelte store
		this._saveStateToStorage();
	}

	/** Update the state with a synchronous updater function */
	update(updaterFunction: (state: T) => T): void {
		console.log("update state");
		this.state = updaterFunction(this.state);
		if (typeof this.state !== "undefined") {
			this.store.set(this.state); // Update the Svelte store
			this._saveStateToStorage();
		}
	}

	/** Update the state with an asynchronous updater function */
	async updateAsync(
		asyncUpdaterFunction: (state: T) => Promise<T>,
	): Promise<void> {
		try {
			const storedState = await figmaAPI.run(
				async (figma, inputParams) => {
					const { key, asyncUpdaterFunction, initialValue, params } =
						inputParams || {
							key: "",
							asyncUpdaterFunction: undefined,
							initialValue: undefined,
							params: undefined,
						};
					if (!key || !asyncUpdaterFunction) return;

					// Get store
					let store = await figma.clientStorage.getAsync(key);

					// Use initialValue if store is undefined
					if (typeof store === "undefined") {
						store = initialValue;
					}

					// Do something with store
					const updatedValue = await asyncUpdaterFunction(store);

					if (typeof updatedValue !== "undefined") {
						// Set new store
						await figma.clientStorage.setAsync(key, updatedValue);
						return updatedValue;
					}
				},
				{
					key: this.storageKey,
					asyncUpdaterFunction,
					initialValue: this.state, // Changed from defaultState to initialValue
					params: this.params, // Pass optional params
				},
			);

			this.state = storedState || this.state;
			this.store.set(this.state); // Update the Svelte store
		} catch (error) {
			console.error("Failed to update state asynchronously:", error);
		}
	}

	/** Retrieve the node target, if provided */
	getNodeTarget(): SceneNode | BaseNode | BaseNode[] | undefined {
		if (this.nodeTarget) {
			const target = this.nodeTarget(figma, this.params || {});

			// If it's an array, return the entire array of nodes
			if (Array.isArray(target)) {
				return target.length > 0 ? target : undefined;
			}

			// Otherwise, assume it's a single node and return it
			return target;
		}
		return undefined;
	}

	/** Internal method to save state */
	private async _saveStateToStorage(): Promise<void> {
		try {
			const inputParams = {
				key: this.storageKey,
				value: this.state,
				params: this.params,
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
				`Failed to save state to storage for key "${this.storageKey}":`,
				error,
			);
		}
	}
}

// Export Svelte's get method so it can be retrieved
export { get };
