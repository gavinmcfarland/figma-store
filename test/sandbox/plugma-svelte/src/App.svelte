<script lang="ts">
	import svelteLogo from "./assets/svelte.svg";
	import Icon from "./components/Icon.svelte";
	import Input from "./components/Input.svelte";
	import Button from "./components/Button.svelte";
	import { figmaState } from "figma-store";
	import { onMount } from "svelte";

	function createRectangles(count: number) {
		parent.postMessage(
			{
				pluginMessage: {
					type: "CREATE_RECTANGLES",
					count,
				},
			},
			"*",
		);
	}

	window.onmessage = (event) => {
		let message = event.data.pluginMessage;

		if (message.type === "POST_NODE_COUNT") {
			nodeCount = message.count;
		}
	};

	let rectCount: number = $state(5);
	let nodeCount: number = $state(0);

	const count = figmaState<number>("count");
	let isInitialized = $state(false);

	onMount(async () => {
		// await count.init();
		count.onInit((state) => {
			console.log("state", state);
			isInitialized = true;
		});
	});
</script>

{#if !isInitialized}
	<div></div>
{:else}
	<div class="container">
		<div class="banner">
			<Icon svg="plugma" size={38} />

			<Icon svg="plus" size={24} />

			<img src={svelteLogo} width="44" height="44" alt="Svelte logo" />
		</div>

		<div class="field create-rectangles">
			<Input type="number" bind:value={rectCount}></Input>
			<Button onclick={() => createRectangles(rectCount)}
				>Create Rectangles</Button
			>
		</div>
		<div class="field node-count">
			<span>{nodeCount} nodes selected</span>
		</div>
		<div class="field count">
			<Button onclick={() => count.update((state) => state + 1)}>
				Increment
			</Button>
			<Button onclick={() => count.set(0)}>Reset</Button>
			<p>{count.get()}</p>
		</div>
	</div>
{/if}

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		width: 100%;
		flex-direction: column;
	}
	.banner {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-bottom: 16px;
	}

	.node-count {
		font-size: 11px;
	}

	.field {
		display: flex;
		gap: var(--spacer-2);
		height: var(--spacer-5);
		align-items: center;
	}

	.create-rectangles :global(.Input) {
		width: 40px;
	}
</style>
