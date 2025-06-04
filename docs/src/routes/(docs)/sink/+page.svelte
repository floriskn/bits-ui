<script lang="ts">
	import Combobox from "./combobox.svelte";
	import MonthCal from "./month-cal.svelte";
	import RangeCal from "./range-cal.svelte";

	let myValue = $state("");
	const testItems = [
		{ value: "mango", label: "Mango" },
		{ value: "watermelon", label: "Watermelon" },
		{ value: "apple", label: "Apple" },
	];
</script>

<div class="mt-4 flex">
	<!-- <button onclick={() => (myValue = "apple")}> Select Apple </button>
	<Combobox items={testItems} type="single" bind:value={myValue} /> -->
	<!-- <RangeCal /> -->
	<MonthCal />
</div>
