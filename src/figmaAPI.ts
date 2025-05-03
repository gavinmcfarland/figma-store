class FigmaAPI {
	private id = 0;

	/**
	 * Helper function that ensures Figma typings within the run function.
	 * This function ensures that the `figma` object is available and correctly typed.
	 */
	private figmaScopedRun<T, U>(
		fn: (figma: PluginAPI, params: U | undefined) => Promise<T> | T,
		params?: U,
	): string {
		// Ensure the Figma typings are scoped within this function and return the function string
		// if (typeof figma !== "undefined") {
		// We return the stringified function to be passed to postMessage
		return fn.toString();
		// } else {
		// 	throw new Error("Figma environment not available.");
		// }
	}

	/**
	 * Run a function in the Figma plugin context. The function cannot reference
	 * any variables outside of itself, and the return value must be JSON
	 * serializable. If you need to pass in variables, you can do so by passing
	 * them as the second parameter.
	 */
	run<T, U extends Record<string, any> | undefined>(
		fn: (figma: PluginAPI, params: U | undefined) => Promise<T> | T,
		params?: U,
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const id = this.id++;

			const cb = (event: MessageEvent) => {
				if (event.data.pluginMessage?.type === "EVAL_RESULT") {
					if (event.data.pluginMessage.id === id) {
						window.removeEventListener("message", cb);
						resolve(event.data.pluginMessage.result);
					}
				}

				if (event.data.pluginMessage?.type === "EVAL_REJECT") {
					if (event.data.pluginMessage.id === id) {
						window.removeEventListener("message", cb);
						const message = event.data.pluginMessage.error;
						reject(
							new Error(
								typeof message === "string"
									? message
									: "An error occurred in FigmaAPI.run()",
							),
						);
					}
				}
			};
			window.addEventListener("message", cb);

			// Stringify the function and parameters
			let paramsString = JSON.stringify(params, function (key, value) {
				if (typeof value === "function") {
					return value.toString(); // Convert functions to string
				}
				return value; // Return other values unchanged
			});

			const msg = {
				pluginMessage: {
					type: "EVAL",
					code: this.figmaScopedRun(fn, params), // Use figmaScopedRun to stringify the function
					id,
					params: params ? paramsString : undefined,
				},
				pluginId: "*", // Adjust this if necessary
			};

			// Post message to the parent
			parent.postMessage(msg, "*");
		});
	}
}

export const figmaAPI = new FigmaAPI();
