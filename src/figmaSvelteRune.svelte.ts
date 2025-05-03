import { FigmaStore } from "./figmaStore";

export async function useFigmaState<T extends StoreValue>(
	initialValue: T,
	options?: {
		key?: string;
		nodeTarget?: (
			figma: PluginAPI,
			params: Record<string, any>,
		) => SceneNode | BaseNode[];
		params?: Record<string, any>;
	},
) {
	const storageKey =
		options?.key || `figma-state-${Math.random().toString(36).slice(2)}`;

	// @ts-ignore
	const state = $state(initialValue);

	return await FigmaStore.create(
		storageKey,
		state,
		options?.nodeTarget,
		options?.params,
	);
}
