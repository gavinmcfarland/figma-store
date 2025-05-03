```ts
let fileKey = figmaState<null>("fileKey", null, (figma) => figma.root);

console.log(fileKey);
```

```ts
let id = "0:1";

let layerStyles = figmaState<null>(
    `layerStyle${id}`,
    {},
    (figma, { id }) => {
        return figma.root.findAll((node) => node.name === `layerStyle${id}`);
    },
    { id },
);

console.log(layerStyles);
```
