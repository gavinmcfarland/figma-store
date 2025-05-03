# Figma Store

Simplifies state management in Figma plugins by syncing reactive values to `clientStorage` and `pluginData` behind the scenes.

> [!NOTE]
> This is still a work in progress and things might not work as expected. It currently only supports Svelte.

## Install

```shell
npm install github:gavinmcfarland/figma-store
```

## Setup

Inside the UI import the `figmaState` runable store.

```js
import { figmaState } from "figma-store";
```

Within the main code, initialise the listeners required for the UI to make updates to `clientStorage` and `pluginData`.

```js
import { initListeners } from "figma-store";

initListeners();
```

## Usage

### Create a store

To persist a store to `clientStorage` provide a key.

```ts
let count = await figmaState<number>("count");
```

This loads the store from `clientStorage`.

Use the `initialize` method to initialise the store.

```js
await count.initialize();
```

### Updating a store

```js
count.update((value) => {
  return value + 1
)
```

This is synchronouse and immediately updates the value of the store in the UI while asynchronously updating the value in `clientStorage`.

### Setting a store

The same happens for replacing the value using `set`.

```ts
count.set(10);
```

### Getting a store

Retrieve the value of the store from the UI.

```ts
console.log(count.get()); // => 10
```

## PluginData (experimental)

Below is a basic example of storing a value using `pluginData`. It requires a key, an initial value and a function that returns the node for the plugin data to be set on.

```ts
let fileKey = await figmaState<null>("fileKey", null, (figma) => figma.root);
```

Below is a more complex example of setting `pluginData` on several nodes by returning an array of nodes. It also shows how you can also provide in a dynamic value in retrieving the node.

```ts
let store = await figmaState<null>(
    `layerStyle${id}`,
    {},
    (figma, { id }) => {
        return figma.root.findAll((node) => node.name === layerStyle + id);
    },
    { id },
);
```

## Async (experimental)

If you need to wait for a store to be set asynchronously, you can use the `Async` variant.

### Updating a store asynchronously

For example, you can update a value based off some logic with the main code.

```ts
await sites.updateAsync(async (figma, store, { siteId }) => {
    store.map((site) => {
        const activeSite = await figma.clientStorage.getAsync("activeSite")

        if (activeSite) {
            return store.shift()
        }
        else {
            site.activeSite(sideId)
        }
    }, {siteId})

    return store
)
```
