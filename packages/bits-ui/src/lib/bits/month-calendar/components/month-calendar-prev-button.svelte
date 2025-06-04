<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import type { MonthCalendarPrevButtonProps } from "../types.js";
	import { useMonthCalendarPrevButton } from "../month-calendar.svelte.js";
	import { createId } from "$lib/internal/create-id.js";

	const uid = $props.id();

	let {
		children,
		child,
		id = createId(uid),
		ref = $bindable(null),
		...restProps
	}: MonthCalendarPrevButtonProps = $props();

	const prevButtonState = useMonthCalendarPrevButton({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, prevButtonState.props));
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<button {...mergedProps}>
		{@render children?.()}
	</button>
{/if}
