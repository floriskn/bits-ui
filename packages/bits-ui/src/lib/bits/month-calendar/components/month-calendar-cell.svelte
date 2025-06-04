<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import { useMonthCalendarCell } from "../month-calendar.svelte.js";
	import type { MonthCalendarCellProps } from "../types.js";
	import { createId } from "$lib/internal/create-id.js";

	const uid = $props.id();

	let {
		children,
		child,
		ref = $bindable(null),
		id = createId(uid),
		date,
		year,
		...restProps
	}: MonthCalendarCellProps = $props();

	const cellState = useMonthCalendarCell({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
		date: box.with(() => date),
		year: box.with(() => year),
	});

	const mergedProps = $derived(mergeProps(restProps, cellState.props));
</script>

{#if child}
	{@render child({
		props: mergedProps,
		...cellState.snippetProps,
	})}
{:else}
	<td {...mergedProps}>
		{@render children?.(cellState.snippetProps)}
	</td>
{/if}
