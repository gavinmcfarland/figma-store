// Read the docs https://plugma.dev/docs
import { useFigmaState } from "figma-store";

export default async function () {
	figma.showUI(__html__, { width: 300, height: 260, themeColors: true });

	let rectCount = useFigmaState<number>("rectCount");

	rectCount.onChange((value) => {
		const rectangles = Array.from({ length: value }, (_, i) => {
			const rect = figma.createRectangle();
			rect.x = i * 150;
			rect.y = 0;
			rect.resize(100, 100);
			rect.fills = [
				{
					type: "SOLID",
					color: {
						r: Math.random(),
						g: Math.random(),
						b: Math.random(),
					},
				},
			];
			return rect;
		});

		figma.viewport.scrollAndZoomIntoView(rectangles);
	});

	// figma.ui.onmessage = (message) => {
	// 	if (message.type === "CREATE_RECTANGLES") {
	// 		let i = 0;

	// 		let rectangles = [];
	// 		while (i < message.count) {
	// 			const rect = figma.createRectangle();
	// 			rect.x = i * 150;
	// 			rect.y = 0;
	// 			rect.resize(100, 100);
	// 			rect.fills = [
	// 				{
	// 					type: "SOLID",
	// 					color: {
	// 						r: Math.random(),
	// 						g: Math.random(),
	// 						b: Math.random(),
	// 					},
	// 				},
	// 			]; // Random color
	// 			rectangles.push(rect);

	// 			i++;
	// 		}

	// 		figma.viewport.scrollAndZoomIntoView(rectangles);
	// 	}
	// };

	let count = useFigmaState<number>("count");
	let nodeCount = useFigmaState<number>("nodeCount");
	// Testing setting value immediately
	// await count.set(100);

	// console.log("main count", await count.get());

	// // Testing setting value after 3 seconds
	// await new Promise((resolve) => setTimeout(resolve, 3000));
	// // count.set(200);

	// await count.update((value) => {
	// 	return value + 1;
	// });

	figma.on("selectionchange", () => {
		nodeCount.set(figma.currentPage.selection.length);
	});
}
