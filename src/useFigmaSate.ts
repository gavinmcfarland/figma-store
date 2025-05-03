export function useFigmaState<T>(key: string, initialValue?: T) {
	function set(value: T) {
		figma.ui.postMessage({
			type: "UPDATE_STATE",
			value: value,
			key: key,
		});
	}
	return {
		set,
	};
}
