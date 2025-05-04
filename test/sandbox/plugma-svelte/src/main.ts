// Read the docs https://plugma.dev/docs
import { useFigmaState } from "figma-store";

export default async function () {
	figma.showUI(__html__, { width: 300, height: 260, themeColors: true });

	let rectCount = useFigmaState<number>("rectCount");

	rectCount.on("change", (value) => {
		const rectangles = Array.from({ length: value }, (_, i) => {
			const rect = figma.createRectangle();
			rect.x = i * 150;
			rect.y = 0;
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

	let selectedNodeCount = useFigmaState<number>("selectedNodeCount");

	figma.on("selectionchange", () => {
		selectedNodeCount.set(figma.currentPage.selection.length);
	});
}
