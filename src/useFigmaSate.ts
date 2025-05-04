// Used in main code context only
import { evalMessage } from "./initListeners";

// TODO: Can useFigmaState also create the clientStorage key if it hasn't been created by the UI yet?
export function useFigmaState<T>(key: string, initialValue?: T) {
	// FIXME: Needs updating to only trigger when manually set. Probably need to pass something to event
	async function onChange(callback: (value: T) => void): Promise<() => void> {
		const messageHandler = async (msg: any) => {
			if (msg.stateType === "set") {
				const result = await evalMessage(msg);
				if (result) {
					const { value, key: keyFromResult } = result;
					if (keyFromResult === key) {
						callback(value);
					}
				}
			}
		};

		figma.ui.on("message", messageHandler);

		// Return cleanup function
		return () => {
			figma.ui.off("message", messageHandler);
		};
	}

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
			set(updateFunction(currentValue));
		});
	}

	function get() {
		return figma.clientStorage.getAsync(key);
	}

	return {
		set,
		get,
		update,
		onChange,
	};
}
