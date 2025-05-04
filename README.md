# Figma Store

Simplifies state management in Figma plugins by syncing reactive state to `clientStorage` and `pluginData`.

> [!NOTE]
> This is a work in progress and things might not work as expected. It currently only supports Svelte.

## Install

```shell
npm install github:gavinmcfarland/figma-store
```

## Setup

Inside the `ui` context, import the `useFigmaState` reactive primitive.

```js
// ui.ts
import { useFigmaState } from "figma-store/svelte";
```

Within the main code, import the `useFigmaState` function which will initialise the listeners.

```js
// code.ts
import { useFigmaState } from "figma-store";
```

## Usage

### `ui` context

Within the `ui` context you can create a reactive state using the `useFigmaState` reactive primitive.

```svelte
<!-- ui.svelte -->
<script lang="ts">
    import { useFigmaState } from "figma-store/svelte";

    let count = useFigmaState<number>("count");
    let isInitialized = $state(false);

    $effect(() => {
        count.on("init", (value) => {
            isInitialized = true;
        });
    });
</script>

{#if !isInitialized}
    <p>Loading...</p>
{:else}
    <button on:click={() => count.update((value) => value + 1)}>Increment</button>
    <p>{count.value}</p>
{/if}
```

When you close and reopen the plugin the state will be persisted in `clientStorage`.

### `main` context

From the `main` context you can also manipulate the state. With the following example the state in the `ui` context will be updated when the user changes the selection.

```ts
let count = useFigmaState<number>("count");

figma.on("selectionchange", () => {
    count.set(figma.currentPage.selection.length);
});
```

And detect when the state changes. Below show you how you can use the state to create rectangles.

```ts
count.on("change", (value) => {
    const rects = Array.from({ length: value }, (_, i) => {
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
});
```

## Exploring API shape

### Idea 1

```ts
let count = clientState<number>("count");
```

```ts
let count = pluginState("width", 100, {
    node: () => figma.currentPage.selection[0],
});
```

```ts
let count = sharedState("width", 100, {
    node: () => figma.currentPage.selection[0],
});
```

```ts
let count = volatileState("width", 100);
```

### Idea 2

```ts
let count = figmaState({
    key: "count",
    type: "client",
    initial: 0,
    node: () => figma.currentPage.selection[0],
});
```

### Idea 3

```ts
let count = state.client("count", 0);
```

```ts
let width = state.plugin("width", 100, {
    node: () => figma.currentPage.selection[0],
});
```

```ts
let label = state.shared("label", "design", {
    node: () => figma.currentPage.selection[0],
});
```

```ts
let hovered = state.volatile("hoveredNode", null);
```

### Idea 4

```ts
let count = state("count", 0, { type: "client" });
let width = state("width", 100, {
    type: "plugin",
    node: () => figma.currentPage.selection[0],
});
let label = state("label", "Author", {
    type: "shared",
    node: () => figma.currentPage.selection[0],
});
let temp = state("hovered", null, { type: "volatile" });
```

### Idea 5

```ts
let count = state.from("client")("count", 0);
let width = state.from("plugin")("width", 100, { node: getNode });
let label = state.from("shared")("label", "Author", { node: getNode });
let temp = state.from("volatile")("hovered", null);
```

### Idea 6

```ts
let count = state("count", 0); // volatile
let count = state("count", 0, { persist: "client" });
let width = state("width", 100, { persist: "plugin", node: getNode });
let label = state("label", "Author", { persist: "shared", node: getNode });
```
