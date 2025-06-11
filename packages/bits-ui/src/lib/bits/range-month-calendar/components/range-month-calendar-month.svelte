<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import type { RangeMonthCalendarMonthProps } from "../types.js";
	import { useRangeMonthCalendarMonth } from "../range-month-calendar.svelte.js";
	import { createId } from "$lib/internal/create-id.js";

	const uid = $props.id();

	let {
		children,
		child,
		id = createId(uid),
		ref = $bindable(null),
		...restProps
	}: RangeMonthCalendarMonthProps = $props();

	const monthState = useRangeMonthCalendarMonth({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, monthState.props));
</script>

{#if child}
	{@render child({ props: mergedProps, ...monthState.snippetProps })}
{:else}
	<div {...mergedProps}>
		{#if children}
			{@render children?.(monthState.snippetProps)}
		{:else}
			{monthState.cell.monthName}
		{/if}
	</div>
{/if}
