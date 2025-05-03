// Used in main code context only

export function useFigmaState<T>(key: string, initialValue?: T) {
	async function set(value: T) {
		await figma.clientStorage.setAsync(key, value);

		figma.ui.postMessage({
			type: "UPDATE_STATE",
			value: value,
			key: key,
		});
	}

	function update(updateFunction: (value: T) => T) {
		get().then((currentValue) => {
			figma.ui.postMessage({
				type: "UPDATE_STATE",
				value: updateFunction(currentValue),
				key: key,
			});
		});
	}

	function get() {
		return figma.clientStorage.getAsync(key);
	}

	return {
		set,
		get,
		update,
	};
}
