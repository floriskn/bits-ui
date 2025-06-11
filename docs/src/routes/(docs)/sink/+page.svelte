<script lang="ts">
	import type { DateRange } from "bits-ui";
	import Combobox from "./combobox.svelte";
	import MonthCal from "./month-cal.svelte";
	import MonthRangeCal from "./month-range-cal.svelte";
	import RangeCal from "./range-cal.svelte";

	let myValue = $state("");
	const testItems = [
		{ value: "mango", label: "Mango" },
		{ value: "watermelon", label: "Watermelon" },
		{ value: "apple", label: "Apple" },
	];

	let value: undefined | DateRange = $state();
</script>

<div class="mt-4 flex flex-col gap-4">
	<div class="flex">
		<!-- <button onclick={() => (myValue = "apple")}> Select Apple </button>
	<Combobox items={testItems} type="single" bind:value={myValue} /> -->
		<!-- <RangeCal /> -->
		<!-- <MonthCal /> -->
		<MonthRangeCal bind:value />
	</div>

	<div>
		{`${value?.start?.toString()} - ${value?.end?.toString()}`}
	</div>
</div>
