function initListeners() {
	figma.ui.on("message", async (message, props) => {
		// if (props.origin !== SITE_URL) {
		// 	return
		// }

		switch (message.type) {
			case "EVAL": {
				const fn = eval.call(null, message.code);

				try {
					const parsedObj = JSON.parse(
						message.params,
						function (key, value) {
							if (typeof value === "string") {
								// Detect if it's a regular function
								if (value.startsWith("function")) {
									return eval(`(${value})`); // Reconstruct regular function
								}

								// Detect if it's an arrow function (starts with "(" or variable assignment)
								if (
									value.startsWith("(") ||
									value.includes("=>")
								) {
									return eval(value); // Reconstruct arrow function
								}
							}
							return value;
						},
					);

					console.log("parsedObj", parsedObj, fn.toString());

					const result = await fn(figma, parsedObj);

					console.log("result", result);

					figma.ui.postMessage({
						type: "EVAL_RESULT",
						result,
						id: message.id,
					});
				} catch (e) {
					figma.ui.postMessage({
						type: "EVAL_REJECT",
						error:
							typeof e === "string"
								? e
								: e && typeof e === "object" && "message" in e
									? e.message
									: null,
						id: message.id,
					});
				}

				break;
			}
		}
	});
}

initListeners();
