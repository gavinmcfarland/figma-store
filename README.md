# Figma Store

Simplifies state management in Figma plugins by syncing reactive state to `clientStorage` and `pluginData`.

> [!NOTE]
> This is a work in progress and things might not work as expected. It currently only supports Svelte.

## Install

```shell
npm install github:gavinmcfarland/figma-store
```

## Setup

Inside the `ui` context, import the `figmaState` reactive primitive.

```js
// ui.ts
import { useFigmaState } from "figma-store/svelte";
```

Within the main code, import the `figmaState` function which will initialise the listeners.

```js
// code.ts
import { useFigmaState } from "figma-store";
```

## Usage

Within the `ui` context you can create a reactive state which will be synced to `clientStorage`.

```svelte
<!-- ui.svelte -->
<script lang="ts">
    import { useFigmaState } from "figma-store/svelte";

    let count = useFigmaState<number>("count");
    let isInitialized = $state(false);

    $effect(() => {
        count.onInit((value) => {
            isInitialized = true;
        });
    });
</script>

{#if !isInitialized}
    <p>Loading...</p>
{:else}
    <button on:click={() => count.update((value) => value + 1)}>Increment</button>
    <p>{count}</p>
{/if}
```

## Methods

- ### onInit

    This loads the store from `clientStorage`.

    Use the `onInit` method to listen for when the state is initialised.

    ```js
    // ui.ts
    let isInitialized;

    count.onInit((value) => {
        isInitialized = true;
    });
    ```

- ### Set

    ```ts
    count.set(10);
    ```

- ### Update

    ```js
    count.update((value) => value + 1);
    ```

- ### Get

    ```ts
    console.log(count.get()); // => 10
    ```

## Main

Within the `main` context you can also manipulate the state.

- ### Use

    ```ts
    let count = useFigmaState<number>("count");
    ```

- ### Set

    ```ts
    count.set(100);
    ```

- ### Update

    ```ts
    count.update((value) => value + 1);
    ```
