<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import { useMonthCalendarGridRow } from "../month-calendar.svelte.js";
	import type { MonthCalendarGridRowProps } from "../types.js";
	import { createId } from "$lib/internal/create-id.js";

	const uid = $props.id();

	let {
		children,
		child,
		ref = $bindable(null),
		id = createId(uid),
		...restProps
	}: MonthCalendarGridRowProps = $props();

	const gridRowState = useMonthCalendarGridRow({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, gridRowState.props));
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<tr {...mergedProps}>
		{@render children?.()}
	</tr>
{/if}
