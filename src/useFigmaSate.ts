function useFigmaState<T>(key: string, initialValue: T) {
	function update(value: T) {
		figma.ui.postMessage({
			type: "UPDATE_STATE",
			value: value,
			key: key,
		});
	}
	return {
		update,
	};
}

export default useFigmaState;
