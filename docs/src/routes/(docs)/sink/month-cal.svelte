<script lang="ts">
	import { MonthCalendar } from "bits-ui";

	import CaretLeft from "phosphor-svelte/lib/CaretLeft";
	import CaretRight from "phosphor-svelte/lib/CaretRight";
	import { getLocalTimeZone, today } from "@internationalized/date";

	let value = $state(today(getLocalTimeZone()));

	function getMonthName(monthNumber: number, locale = "en-US") {
		const date = new Date(2000, monthNumber - 1); // year and day don't matter
		return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
	}
</script>

<MonthCalendar.Root
	class="border-dark-10 bg-background-alt shadow-card mt-6 rounded-[15px] border p-[22px]"
	monthFormat="short"
	type="single"
	bind:value
	numberOfYears={1}
>
	{#snippet children({ years })}
		<MonthCalendar.Header class="flex items-center justify-between">
			<MonthCalendar.PrevButton
				class="rounded-9px bg-background-alt hover:bg-muted inline-flex size-10 items-center justify-center active:scale-[0.98] active:transition-all"
			>
				<CaretLeft class="size-6" />
			</MonthCalendar.PrevButton>
			<MonthCalendar.Heading class="text-[15px] font-medium" />
			<MonthCalendar.NextButton
				class="rounded-9px bg-background-alt hover:bg-muted inline-flex size-10 items-center justify-center active:scale-[0.98] active:transition-all"
			>
				<CaretRight class="size-6" />
			</MonthCalendar.NextButton>
		</MonthCalendar.Header>
		<div class="flex flex-col space-y-4 pt-4 sm:flex-row sm:space-x-4 sm:space-y-0">
			{#each years as year, i (i)}
				<MonthCalendar.Grid class="w-full border-collapse select-none space-y-1">
					<MonthCalendar.GridBody>
						{#each year.months as monthDates, i (i)}
							<MonthCalendar.GridRow class="flex w-full">
								{#each monthDates as { date, name }, i (i)}
									<MonthCalendar.Cell
										{date}
										year={year.value}
										class="p-0! relative size-10 text-center text-sm"
									>
										<MonthCalendar.Month
											class="rounded-9px text-foreground hover:border-foreground data-selected:bg-foreground data-disabled:text-foreground/30 data-selected:text-background data-unavailable:text-muted-foreground data-disabled:pointer-events-none data-outside-month:pointer-events-none data-selected:font-medium data-unavailable:line-through group relative inline-flex size-10 items-center justify-center whitespace-nowrap border border-transparent bg-transparent p-0 text-sm font-normal"
										>
											<div
												class="bg-foreground group-data-selected:bg-background group-data-today:block absolute top-[5px] hidden size-1 rounded-full"
											></div>
											{name}
										</MonthCalendar.Month>
									</MonthCalendar.Cell>
								{/each}
							</MonthCalendar.GridRow>
						{/each}
					</MonthCalendar.GridBody>
				</MonthCalendar.Grid>
			{/each}
		</div>
	{/snippet}
</MonthCalendar.Root>
