function once<T = any>(handler: (event: MessageEvent) => T | void): Promise<T> {
	return new Promise((resolve) => {
		const listener = (event: MessageEvent) => {
			const result = handler(event);
			if (result !== undefined) {
				window.removeEventListener("message", listener);
				resolve(result);
			}
		};
		window.addEventListener("message", listener);
	});
}

export const clientStorage = {
	async setItem(key: string, value: any): Promise<void> {
		parent.postMessage(
			{
				pluginMessage: {
					type: "set-client-storage",
					key,
					value,
				},
				pluginId: "*",
			},
			"https://www.figma.com",
		);

		await once((event) => {
			if (event.data.pluginMessage?.type === "client-storage-set") {
				return;
			}
		});
	},

	async getItem<T = any>(key: string): Promise<T | undefined> {
		parent.postMessage(
			{
				pluginMessage: {
					type: "get-client-storage",
					key,
				},
				pluginId: "*",
			},
			"https://www.figma.com",
		);

		return await once((event) => {
			const message = event.data.pluginMessage;
			if (
				message?.type === "post-client-storage" &&
				message.key === key
			) {
				return message.value as T;
			}
		});
	},

	async removeItem(key: string): Promise<void> {
		parent.postMessage(
			{
				pluginMessage: {
					type: "remove-client-storage",
					key,
				},
				pluginId: "*",
			},
			"https://www.figma.com",
		);

		await once((event) => {
			if (event.data.pluginMessage?.type === "client-storage-removed") {
				return;
			}
		});
	},
};
