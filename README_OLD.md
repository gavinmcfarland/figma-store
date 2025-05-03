# Figma Store

This allows you to create stores which can persists in `clientStorage` and `pluginData`.

> [!NOTE]
> This project is still in conception.

## Install

```shell
npm install figma-store@next --save-dev
```

## Setup

Inside the UI import the `FigmaStore` class.

```js
import { FigmaStore } from "figma-store";
```

Within the main code, initialise the listeners required for the UI to make updates to `clientStorage` and `pluginData`.

```js
import { initListeners } from "figma-store";

initListeners();
```

## Usage

### Create a store

To persist a store to `clientStorage` provide a key and an initial value.

```js
let store = await FigmaStore.create("key", { count: 0 });
```

This initialises the store. When the UI loads, it will grab the data from the main code using `figma.clientStorage.getAsync("key")`.

### Updating a store

```js
store.update((value) => {
  return value + 1
)
```

This is synchronouse and immediately updates the value of the store in the UI while asynchronously updating the value in `clientStorage`.

### Setting a store

The same happens for replacing the value using `set`.

```js
store.set(0);
```

### Getting a store

Retrieve the value of the store from the UI.

```js
console.log(store.get()); // => 0
```

## PluginData

Below is a basic example of storing a value using `pluginData`. It requires a key, an initial value and a function that returns the node for the plugin data to be set on.

```js
let fileKey = await FigmaStore.create("fileKey", null, (figma) => figma.root);
```

Below is a more complex example of setting `pluginData` on several nodes by returning an array of nodes. It also shows how you can also provide in a dynamic value in retrieving the node.

```js
let store = await FigmaStore.create(
    `layerStyle${id}`,
    {},
    (figma, { id }) => {
        return figma.root.findAll((node) => node.name === layerStyle + id);
    },
    { id }
);
```

## Async

If you need to wait for a store to be set asynchronously, you can use the `Async` variant.

### Updating a store asynchronously

For example, you can update a value based off some logic with the main code.

```js
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
