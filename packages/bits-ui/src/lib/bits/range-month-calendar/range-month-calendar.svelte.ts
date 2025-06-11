import { type DateValue, getLocalTimeZone, isSameMonth, today } from "@internationalized/date";
import { attachRef, DOMContext } from "svelte-toolbelt";
import { Context, watch } from "runed";
import type { DateRange } from "$lib/shared/index.js";
import type { ReadableBoxedValues, WritableBoxedValues } from "$lib/internal/box.svelte.js";
import type {
	BitsFocusEvent,
	BitsKeyboardEvent,
	BitsMouseEvent,
	WithRefProps,
} from "$lib/internal/types.js";
import { useId } from "$lib/internal/use-id.js";
import {
	getAriaDisabled,
	getAriaSelected,
	getDataDisabled,
	getDataSelected,
	getDataUnavailable,
} from "$lib/internal/attrs.js";
import { type Announcer, getAnnouncer } from "$lib/internal/date-time/announcer.js";
import { type Formatter, createFormatter } from "$lib/internal/date-time/formatter.js";
import {
	createYears,
	getCalendarElementProps,
	getIsNextYearCalendarButtonDisabled,
	getIsPrevYearCalendarButtonDisabled,
	getMonthCalendarHeadingValue,
	handleCalendarKeydown,
	handleMonthCalendarNextPage,
	handleMonthCalendarPrevPage,
	monthCalendarAttrs,
	shiftMonthCalendarFocus,
	useEnsureNonDisabledMonthPlaceholder,
	useYearViewOptionsSync,
	useYearViewPlaceholderSync,
} from "$lib/internal/date-time/calendar-helpers.svelte.js";
import {
	areAllDaysBetweenValid,
	getDateValueType,
	isAfter,
	isBefore,
	isBetweenInclusive,
	toDate,
} from "$lib/internal/date-time/utils.js";
import type { Year } from "$lib/shared/date/types.js";
import { onMount } from "svelte";
import { MonthCalendarRootContext } from "../month-calendar/month-calendar.svelte.js";

type RangeMonthCalendarRootStateProps = WithRefProps<
	WritableBoxedValues<{
		value: DateRange;
		placeholder: DateValue;
		startValue: DateValue | undefined;
		endValue: DateValue | undefined;
	}> &
		ReadableBoxedValues<{
			preventDeselect: boolean;
			minValue: DateValue | undefined;
			maxValue: DateValue | undefined;
			disabled: boolean;
			pagedNavigation: boolean;
			monthFormat: Intl.DateTimeFormatOptions["month"];
			isMonthDisabled: (date: DateValue) => boolean;
			isMonthUnavailable: (date: DateValue) => boolean;
			numberOfYears: number;
			locale: string;
			calendarLabel: string;
			readonly: boolean;
			/**
			 * This is strictly used by the `DateRangePicker` component to close the popover when a date range
			 * is selected. It is not intended to be used by the user.
			 */
			onRangeSelect?: () => void;
		}> & {
			defaultPlaceholder: DateValue;
		}
>;

export class RangeMonthCalendarRootState {
	readonly opts: RangeMonthCalendarRootStateProps;
	readonly visibleYears = $derived.by(() => this.years.map((year) => year.value));
	years: Year<DateValue>[] = $state([]);
	announcer: Announcer;
	formatter: Formatter;
	accessibleHeadingId = useId();
	focusedValue = $state<DateValue | undefined>(undefined);
	lastPressedDateValue: DateValue | undefined = undefined;
	domContext: DOMContext;

	readonly isStartInvalid = $derived.by(() => {
		if (!this.opts.startValue.current) return false;
		return (
			this.isMonthUnavailable(this.opts.startValue.current) ||
			this.isMonthDisabled(this.opts.startValue.current)
		);
	});

	readonly isEndInvalid = $derived.by(() => {
		if (!this.opts.endValue.current) return false;
		return (
			this.isMonthUnavailable(this.opts.endValue.current) ||
			this.isMonthDisabled(this.opts.endValue.current)
		);
	});

	readonly isInvalid = $derived.by(() => {
		if (this.isStartInvalid || this.isEndInvalid) return true;

		if (
			this.opts.endValue.current &&
			this.opts.startValue.current &&
			isBefore(this.opts.endValue.current, this.opts.startValue.current)
		)
			return true;

		return false;
	});

	readonly isNextButtonDisabled = $derived.by(() => {
		return getIsNextYearCalendarButtonDisabled({
			maxValue: this.opts.maxValue.current,
			years: this.years,
			disabled: this.opts.disabled.current,
		});
	});

	readonly isPrevButtonDisabled = $derived.by(() => {
		return getIsPrevYearCalendarButtonDisabled({
			minValue: this.opts.minValue.current,
			years: this.years,
			disabled: this.opts.disabled.current,
		});
	});

	readonly headingValue = $derived.by(() => {
		return getMonthCalendarHeadingValue({
			years: this.years,
			formatter: this.formatter,
			locale: this.opts.locale.current,
		});
	});

	readonly fullCalendarLabel = $derived.by(
		() => `${this.opts.calendarLabel.current} ${this.headingValue}`
	);

	readonly highlightedRange = $derived.by(() => {
		if (this.opts.startValue.current && this.opts.endValue.current) return null;
		if (!this.opts.startValue.current || !this.focusedValue) return null;

		const isStartBeforeFocused = isBefore(this.opts.startValue.current, this.focusedValue);
		const start = isStartBeforeFocused ? this.opts.startValue.current : this.focusedValue;
		const end = isStartBeforeFocused ? this.focusedValue : this.opts.startValue.current;
		const range = { start, end };

		if (isSameMonth(start.add({ months: 1 }), end) || isSameMonth(start, end)) {
			return range;
		}

		const isValid = areAllDaysBetweenValid(
			start,
			end,
			this.isMonthUnavailable,
			this.isMonthDisabled
		);

		if (isValid) return range;
		return null;
	});

	constructor(opts: RangeMonthCalendarRootStateProps) {
		this.opts = opts;
		this.domContext = new DOMContext(opts.ref);
		this.announcer = getAnnouncer(null);
		this.formatter = createFormatter(this.opts.locale.current);

		this.years = createYears({
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			dateObj: this.opts.placeholder.current,
			numberOfYears: this.opts.numberOfYears.current,
		});

		$effect(() => {
			if (this.formatter.getLocale() === this.opts.locale.current) return;
			this.formatter.setLocale(this.opts.locale.current);
		});

		onMount(() => {
			this.announcer = getAnnouncer(this.domContext.getDocument());
		});

		/**
		 * Updates the displayed months based on changes in the placeholder values,
		 * which determines the month to show in the calendar.
		 */
		useYearViewPlaceholderSync({
			placeholder: this.opts.placeholder,
			getVisibleYears: () => this.visibleYears,
			// locale: this.opts.locale,
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			numberOfYears: this.opts.numberOfYears,
			setYears: (years: Year<DateValue>[]) => (this.years = years),
		});

		/**
		 * Updates the displayed months based on changes in the options values,
		 * which determines the month to show in the calendar.
		 */
		useYearViewOptionsSync({
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			numberOfYears: this.opts.numberOfYears,
			placeholder: this.opts.placeholder,
			setYears: this.setYears,
		});

		/**
		 * Update the accessible heading's text content when the `fullCalendarLabel`
		 * changes.
		 */
		$effect(() => {
			const node = this.domContext.getElementById(this.accessibleHeadingId);
			if (!node) return;
			node.textContent = this.fullCalendarLabel;
		});

		/**
		 * Synchronize the start and end values with the `value` in case
		 * it is updated externally.
		 */
		watch(
			() => this.opts.value.current,
			(value) => {
				if (value.start && value.end) {
					this.opts.startValue.current = value.start;
					this.opts.endValue.current = value.end;
				} else if (value.start) {
					this.opts.startValue.current = value.start;
					this.opts.endValue.current = undefined;
				} else if (value.start === undefined && value.end === undefined) {
					this.opts.startValue.current = undefined;
					this.opts.endValue.current = undefined;
				}
			}
		);

		/**
		 * Synchronize the placeholder value with the current start value
		 */
		watch(
			() => this.opts.value.current,
			(value) => {
				const startValue = value.start;
				if (startValue && this.opts.placeholder.current !== startValue) {
					this.opts.placeholder.current = startValue;
				}
			}
		);

		watch(
			[() => this.opts.startValue.current, () => this.opts.endValue.current],
			([startValue, endValue]) => {
				if (
					this.opts.value.current &&
					this.opts.value.current.start === startValue &&
					this.opts.value.current.end === endValue
				) {
					return;
				}

				if (startValue && endValue) {
					this.#updateValue((prev) => {
						if (prev.start === startValue && prev.end === endValue) {
							return prev;
						}
						if (isBefore(endValue, startValue)) {
							const start = startValue;
							const end = endValue;
							this.#setStartValue(end);
							this.#setEndValue(start);
							return {
								start: endValue.set({ day: 1 }),
								end: startValue.set({ day: 35 }),
							};
						} else {
							return {
								start: startValue.set({ day: 1 }),
								end: endValue.set({ day: 35 }),
							};
						}
					});
				} else if (
					this.opts.value.current &&
					this.opts.value.current.start &&
					this.opts.value.current.end
				) {
					this.opts.value.current.start = undefined;
					this.opts.value.current.end = undefined;
				}
			}
		);

		this.shiftFocus = this.shiftFocus.bind(this);
		this.handleCellClick = this.handleCellClick.bind(this);
		this.onkeydown = this.onkeydown.bind(this);
		this.nextPage = this.nextPage.bind(this);
		this.prevPage = this.prevPage.bind(this);
		this.nextYear = this.nextYear.bind(this);
		this.prevYear = this.prevYear.bind(this);
		this.setYear = this.setYear.bind(this);
		this.setMonth = this.setMonth.bind(this);
		this.isMonthDisabled = this.isMonthDisabled.bind(this);
		this.isMonthUnavailable = this.isMonthUnavailable.bind(this);
		this.isSelected = this.isSelected.bind(this);

		useEnsureNonDisabledMonthPlaceholder({
			placeholder: opts.placeholder,
			defaultPlaceholder: opts.defaultPlaceholder,
			isMonthDisabled: opts.isMonthDisabled,
			maxValue: opts.maxValue,
			minValue: opts.minValue,
			ref: opts.ref,
		});
	}

	#updateValue(cb: (value: DateRange) => DateRange) {
		const value = this.opts.value.current;
		const newValue = cb(value);
		this.opts.value.current = newValue;
		if (newValue.start && newValue.end) {
			this.opts.onRangeSelect?.current?.();
		}
	}

	#setStartValue(value: DateValue | undefined) {
		this.opts.startValue.current = value;
	}

	#setEndValue(value: DateValue | undefined) {
		this.opts.endValue.current = value;
	}

	setYears = (years: Year<DateValue>[]) => {
		this.years = years;
	};

	isMonthDisabled(month: DateValue) {
		if (this.opts.isMonthDisabled.current(month) || this.opts.disabled.current) return true;
		const minValue = this.opts.minValue.current;
		const maxValue = this.opts.maxValue.current;
		if (minValue && isBefore(month, minValue)) return true;
		if (maxValue && isAfter(month, maxValue)) return true;
		return false;
	}

	isMonthUnavailable(month: DateValue) {
		if (this.opts.isMonthUnavailable.current(month)) return true;
		return false;
	}

	isSelectionStart(date: DateValue) {
		if (!this.opts.startValue.current) return false;
		return isSameMonth(date, this.opts.startValue.current);
	}

	isSelectionEnd(date: DateValue) {
		if (!this.opts.endValue.current) return false;
		return isSameMonth(date, this.opts.endValue.current);
	}

	isSelected(date: DateValue) {
		if (this.opts.startValue.current && isSameMonth(this.opts.startValue.current, date))
			return true;
		if (this.opts.endValue.current && isSameMonth(this.opts.endValue.current, date))
			return true;
		if (this.opts.startValue.current && this.opts.endValue.current) {
			return isBetweenInclusive(
				date,
				this.opts.startValue.current,
				this.opts.endValue.current
			);
		}
		return false;
	}

	shiftFocus(node: HTMLElement, add: number) {
		return shiftMonthCalendarFocus({
			node,
			add,
			placeholder: this.opts.placeholder,
			calendarNode: this.opts.ref.current,
			isPrevButtonDisabled: this.isPrevButtonDisabled,
			isNextButtonDisabled: this.isNextButtonDisabled,
			years: this.years,
			numberOfYears: this.opts.numberOfYears.current,
		});
	}

	#announceEmpty() {
		this.announcer.announce("Selected date is now empty.", "polite");
	}

	#announceSelectedDate(date: DateValue) {
		this.announcer.announce(
			`Selected Date: ${this.formatter.selectedDate(date, false)}`,
			"polite"
		);
	}

	#announceSelectedRange(start: DateValue, end: DateValue) {
		this.announcer.announce(
			`Selected Dates: ${this.formatter.selectedDate(start, false)} to ${this.formatter.selectedDate(end, false)}`,
			"polite"
		);
	}

	handleCellClick(e: Event, month: DateValue) {
		if (this.isMonthDisabled(month) || this.isMonthUnavailable(month)) return;
		const prevLastPressedDate = this.lastPressedDateValue;
		this.lastPressedDateValue = month;

		if (this.opts.startValue.current && this.highlightedRange === null) {
			if (
				isSameMonth(this.opts.startValue.current, month) &&
				!this.opts.preventDeselect.current &&
				!this.opts.endValue.current
			) {
				this.#setStartValue(undefined);
				this.opts.placeholder.current = month;
				this.#announceEmpty();
				return;
			} else if (!this.opts.endValue.current) {
				e.preventDefault();
				if (prevLastPressedDate && isSameMonth(prevLastPressedDate, month)) {
					this.#setStartValue(month);
					this.#announceSelectedDate(month);
				}
			}
		}

		if (
			this.opts.startValue.current &&
			this.opts.endValue.current &&
			isSameMonth(this.opts.endValue.current, month) &&
			!this.opts.preventDeselect.current
		) {
			this.#setStartValue(undefined);
			this.#setEndValue(undefined);
			this.opts.placeholder.current = month;
			this.#announceEmpty();
			return;
		}

		if (!this.opts.startValue.current) {
			this.#announceSelectedDate(month);
			this.#setStartValue(month);
		} else if (!this.opts.endValue.current) {
			this.#announceSelectedRange(this.opts.startValue.current, month);
			this.#setEndValue(month);
		} else if (this.opts.endValue.current && this.opts.startValue.current) {
			this.#setEndValue(undefined);
			this.#announceSelectedDate(month);
			this.#setStartValue(month);
		}
	}

	onkeydown(event: BitsKeyboardEvent) {
		return handleCalendarKeydown({
			event,
			handleCellClick: this.handleCellClick,
			placeholderValue: this.opts.placeholder.current,
			shiftFocus: this.shiftFocus,
		});
	}

	/**
	 * Navigates to the next page of the calendar.
	 */
	nextPage() {
		handleMonthCalendarNextPage({
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			numberOfYears: this.opts.numberOfYears.current,
			pagedNavigation: this.opts.pagedNavigation.current,
			setYears: this.setYears,
			setPlaceholder: (date: DateValue) => (this.opts.placeholder.current = date),
			years: this.years,
		});
	}

	/**
	 * Navigates to the previous page of the calendar.
	 */
	prevPage() {
		handleMonthCalendarPrevPage({
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			numberOfYears: this.opts.numberOfYears.current,
			pagedNavigation: this.opts.pagedNavigation.current,
			setYears: this.setYears,
			setPlaceholder: (date: DateValue) => (this.opts.placeholder.current = date),
			years: this.years,
		});
	}

	nextYear() {
		this.opts.placeholder.current = this.opts.placeholder.current.add({ years: 1 });
	}

	prevYear() {
		this.opts.placeholder.current = this.opts.placeholder.current.subtract({ years: 1 });
	}

	setYear(year: number) {
		this.opts.placeholder.current = this.opts.placeholder.current.set({ year });
	}

	setMonth(month: number) {
		this.opts.placeholder.current = this.opts.placeholder.current.set({ month });
	}

	getBitsAttr: (typeof monthCalendarAttrs)["getAttr"] = (part) => {
		return monthCalendarAttrs.getAttr(part, "range-calendar");
	};

	readonly snippetProps = $derived.by(() => ({
		years: this.years,
	}));

	readonly props = $derived.by(
		() =>
			({
				...getCalendarElementProps({
					fullCalendarLabel: this.fullCalendarLabel,
					id: this.opts.id.current,
					isInvalid: this.isInvalid,
					disabled: this.opts.disabled.current,
					readonly: this.opts.readonly.current,
				}),
				[this.getBitsAttr("root")]: "",
				//
				onkeydown: this.onkeydown,
				...attachRef(this.opts.ref),
			}) as const
	);
}

type RangeMonthCalendarCellStateProps = WithRefProps<
	ReadableBoxedValues<{
		month: DateValue;
		year: DateValue;
	}>
>;

export class RangeMonthCalendarCellState {
	readonly opts: RangeMonthCalendarCellStateProps;
	readonly root: RangeMonthCalendarRootState;
	readonly cellMonth = $derived.by(() => toDate(this.opts.month.current));
	readonly isDisabled = $derived.by(() => this.root.isMonthDisabled(this.opts.month.current));
	readonly isUnavailable = $derived.by(() =>
		this.root.opts.isMonthUnavailable.current(this.opts.month.current)
	);
	readonly isDateThisMonth = $derived.by(() =>
		isSameMonth(today(getLocalTimeZone()), this.opts.month.current)
	);
	readonly isFocusedMonth = $derived.by(() =>
		isSameMonth(this.opts.month.current, this.root.opts.placeholder.current)
	);
	readonly isSelectedMonth = $derived.by(() => this.root.isSelected(this.opts.month.current));
	readonly isSelectionStart = $derived.by(() =>
		this.root.isSelectionStart(this.opts.month.current)
	);
	readonly isSelectionEnd = $derived.by(() => this.root.isSelectionEnd(this.opts.month.current));
	readonly isHighlighted = $derived.by(() =>
		this.root.highlightedRange
			? isBetweenInclusive(
					this.opts.month.current,
					this.root.highlightedRange.start,
					this.root.highlightedRange.end
				)
			: false
	);

	readonly labelText = $derived.by(() =>
		this.root.formatter.custom(this.cellMonth, {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		})
	);

	readonly monthName = $derived.by(() =>
		this.root.formatter.custom(this.cellMonth, {
			month: this.root.opts.monthFormat.current ?? "short",
		})
	);

	constructor(opts: RangeMonthCalendarCellStateProps, root: RangeMonthCalendarRootState) {
		this.opts = opts;
		this.root = root;
	}

	readonly snippetProps = $derived.by(() => ({
		disabled: this.isDisabled,
		unavailable: this.isUnavailable,
		selected: this.isSelectedMonth,
	}));

	readonly ariaDisabled = $derived.by(() => {
		return this.isDisabled || this.isUnavailable;
	});

	readonly sharedDataAttrs = $derived.by(
		() =>
			({
				"data-unavailable": getDataUnavailable(this.isUnavailable),
				"data-today": this.isDateThisMonth ? "" : undefined,
				"data-focused": this.isFocusedMonth ? "" : undefined,
				"data-selection-start": this.isSelectionStart ? "" : undefined,
				"data-selection-end": this.isSelectionEnd ? "" : undefined,
				"data-highlighted": this.isHighlighted ? "" : undefined,
				"data-selected": getDataSelected(this.isSelectedMonth),
				"data-value": this.opts.month.current.toString(),
				"data-type": getDateValueType(this.opts.month.current),
				"data-disabled": getDataDisabled(this.isDisabled),
			}) as const
	);

	readonly props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				role: "gridcell",
				"aria-selected": getAriaSelected(this.isSelectedMonth),
				"aria-disabled": getAriaDisabled(this.ariaDisabled),
				...this.sharedDataAttrs,
				[this.root.getBitsAttr("cell")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

type RangeMonthCalendarMonthStateProps = WithRefProps;

class RangeMonthCalendarMonthState {
	readonly opts: RangeMonthCalendarMonthStateProps;
	readonly cell: RangeMonthCalendarCellState;

	constructor(opts: RangeMonthCalendarMonthStateProps, cell: RangeMonthCalendarCellState) {
		this.opts = opts;
		this.cell = cell;

		this.onclick = this.onclick.bind(this);
		this.onmouseenter = this.onmouseenter.bind(this);
		this.onfocusin = this.onfocusin.bind(this);
	}

	readonly #tabindex = $derived.by(() =>
		this.cell.isDisabled ? undefined : this.cell.isFocusedMonth ? 0 : -1
	);

	onclick(e: BitsMouseEvent) {
		if (this.cell.isDisabled) return;
		this.cell.root.handleCellClick(e, this.cell.opts.month.current);
	}

	onmouseenter(_: BitsMouseEvent) {
		if (this.cell.isDisabled) return;
		this.cell.root.focusedValue = this.cell.opts.month.current;
	}

	onfocusin(_: BitsFocusEvent) {
		if (this.cell.isDisabled) return;
		this.cell.root.focusedValue = this.cell.opts.month.current;
	}

	readonly snippetProps = $derived.by(() => ({
		disabled: this.cell.isDisabled,
		unavailable: this.cell.isUnavailable,
		selected: this.cell.isSelectedMonth,
		month: this.cell.monthName,
	}));

	readonly props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				role: "button",
				"aria-label": this.cell.labelText,
				"aria-disabled": getAriaDisabled(this.cell.ariaDisabled),
				...this.cell.sharedDataAttrs,
				tabindex: this.#tabindex,
				[this.cell.root.getBitsAttr("month")]: "",
				// Shared logic for range calendar and calendar
				"data-bits-month": "",
				//
				onclick: this.onclick,
				onmouseenter: this.onmouseenter,
				onfocusin: this.onfocusin,
				...attachRef(this.opts.ref),
			}) as const
	);
}

const RangeMonthCalendarCellContext = new Context<RangeMonthCalendarCellState>(
	"RangeMonthCalendar.Cell"
);

export function useRangeMonthCalendarRoot(props: RangeMonthCalendarRootStateProps) {
	return MonthCalendarRootContext.set(new RangeMonthCalendarRootState(props));
}

export function useRangeMonthCalendarCell(props: RangeMonthCalendarCellStateProps) {
	return RangeMonthCalendarCellContext.set(
		new RangeMonthCalendarCellState(
			props,
			MonthCalendarRootContext.get() as RangeMonthCalendarRootState
		)
	);
}

export function useRangeMonthCalendarMonth(props: RangeMonthCalendarMonthStateProps) {
	return new RangeMonthCalendarMonthState(props, RangeMonthCalendarCellContext.get());
}
