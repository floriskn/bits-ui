import { type DateValue, getLocalTimeZone, isSameMonth, today } from "@internationalized/date";
import { DEV } from "esm-env";
import { onMount, untrack } from "svelte";
import { attachRef, DOMContext } from "svelte-toolbelt";
import { Context, watch } from "runed";
import {
	getAriaDisabled,
	getAriaHidden,
	getAriaReadonly,
	getAriaSelected,
	getDataDisabled,
	getDataReadonly,
	getDataSelected,
	getDataUnavailable,
} from "$lib/internal/attrs.js";
import type { ReadableBoxedValues, WritableBoxedValues } from "$lib/internal/box.svelte.js";
import type { BitsKeyboardEvent, BitsMouseEvent, WithRefProps } from "$lib/internal/types.js";
import { useId } from "$lib/internal/use-id.js";
import type { DateMatcher } from "$lib/shared/index.js";
import { type Announcer, getAnnouncer } from "$lib/internal/date-time/announcer.js";
import { type Formatter, createFormatter } from "$lib/internal/date-time/formatter.js";
import {
	createAccessibleHeading,
	createYears,
	getCalendarElementProps,
	getDateWithPreviousTime,
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
import { getDateValueType, isBefore, toDate } from "$lib/internal/date-time/utils.js";
import type { Year } from "$lib/shared/date/types.js";
import type { RangeMonthCalendarRootState } from "../range-month-calendar/range-month-calendar.svelte.js";

type MonthCalendarRootStateProps = WithRefProps<
	WritableBoxedValues<{
		value: DateValue | undefined | DateValue[];
		placeholder: DateValue;
	}> &
		ReadableBoxedValues<{
			preventDeselect: boolean;
			minValue: DateValue | undefined;
			maxValue: DateValue | undefined;
			disabled: boolean;
			pagedNavigation: boolean;
			monthFormat: Intl.DateTimeFormatOptions["month"];
			isDateDisabled: DateMatcher;
			isDateUnavailable: DateMatcher;
			numberOfYears: number;
			locale: string;
			calendarLabel: string;
			type: "single" | "multiple";
			readonly: boolean;
			initialFocus: boolean;
			/**
			 * This is strictly used by the `DatePicker` component to close the popover when a date
			 * is selected. It is not intended to be used by the user.
			 */
			onDateSelect?: () => void;
		}> & {
			defaultPlaceholder: DateValue;
		}
>;

export class MonthCalendarRootState {
	readonly opts: MonthCalendarRootStateProps;
	years: Year<DateValue>[] = $state([]);
	visibleYears = $derived.by(() => this.years.map((year) => year.value));
	announcer: Announcer;
	formatter: Formatter;
	accessibleHeadingId = useId();
	domContext: DOMContext;

	constructor(opts: MonthCalendarRootStateProps) {
		this.opts = opts;
		this.domContext = new DOMContext(opts.ref);
		this.announcer = getAnnouncer(null);
		this.formatter = createFormatter(this.opts.locale.current);

		this.setYears = this.setYears.bind(this);
		this.nextPage = this.nextPage.bind(this);
		this.prevPage = this.prevPage.bind(this);
		this.prevYear = this.prevYear.bind(this);
		this.nextYear = this.nextYear.bind(this);
		this.setYear = this.setYear.bind(this);
		this.setMonth = this.setMonth.bind(this);
		this.isDateDisabled = this.isDateDisabled.bind(this);
		this.isDateSelected = this.isDateSelected.bind(this);
		this.shiftFocus = this.shiftFocus.bind(this);
		this.handleCellClick = this.handleCellClick.bind(this);
		this.handleMultipleUpdate = this.handleMultipleUpdate.bind(this);
		this.handleSingleUpdate = this.handleSingleUpdate.bind(this);
		this.onkeydown = this.onkeydown.bind(this);
		this.getBitsAttr = this.getBitsAttr.bind(this);

		onMount(() => {
			this.announcer = getAnnouncer(this.domContext.getDocument());
		});

		this.years = createYears({
			monthFormat: this.opts.monthFormat.current,
			formatter: this.formatter,
			dateObj: this.opts.placeholder.current,
			numberOfYears: this.opts.numberOfYears.current,
		});

		this.#setupInitialFocusEffect();
		this.#setupAccessibleHeadingEffect();
		this.#setupFormatterEffect();

		/**
		 * Updates the displayed months based on changes in the placeholder value.
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
			// locale: this.opts.locale,
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
		 * Synchronize the placeholder value with the current value.
		 */
		watch(
			() => this.opts.value.current,
			() => {
				const value = this.opts.value.current;
				if (Array.isArray(value) && value.length) {
					const lastValue = value[value.length - 1];
					if (lastValue && this.opts.placeholder.current !== lastValue) {
						this.opts.placeholder.current = lastValue;
					}
				} else if (
					!Array.isArray(value) &&
					value &&
					this.opts.placeholder.current !== value
				) {
					this.opts.placeholder.current = value;
				}
			}
		);

		useEnsureNonDisabledMonthPlaceholder({
			placeholder: opts.placeholder,
			defaultPlaceholder: opts.defaultPlaceholder,
			isMonthDisabled: opts.isDateDisabled,
			maxValue: opts.maxValue,
			minValue: opts.minValue,
			ref: opts.ref,
		});
	}

	setYears(years: Year<DateValue>[]) {
		this.years = years;
	}

	#setupInitialFocusEffect() {
		$effect(() => {
			const initialFocus = untrack(() => this.opts.initialFocus.current);
			if (initialFocus) {
				// focus the first `data-focused` day node
				const firstFocusedMonth =
					this.opts.ref.current?.querySelector<HTMLElement>(`[data-focused]`);
				if (firstFocusedMonth) {
					firstFocusedMonth.focus();
				}
			}
		});
	}

	#setupAccessibleHeadingEffect() {
		$effect(() => {
			if (!this.opts.ref.current) return;
			const removeHeading = createAccessibleHeading({
				calendarNode: this.opts.ref.current,
				label: this.fullCalendarLabel,
				accessibleHeadingId: this.accessibleHeadingId,
			});
			return removeHeading;
		});
	}

	#setupFormatterEffect() {
		$effect(() => {
			if (this.formatter.getLocale() === this.opts.locale.current) return;
			this.formatter.setLocale(this.opts.locale.current);
		});
	}

	/**
	 * Navigates to the next page of the calendar.
	 */
	nextPage() {
		handleMonthCalendarNextPage({
			// locale: this.opts.locale.current,
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
			// locale: this.opts.locale.current,
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

	isNextButtonDisabled = $derived.by(() => {
		return getIsNextYearCalendarButtonDisabled({
			maxValue: this.opts.maxValue.current,
			years: this.years,
			disabled: this.opts.disabled.current,
		});
	});

	isPrevButtonDisabled = $derived.by(() => {
		return getIsPrevYearCalendarButtonDisabled({
			minValue: this.opts.minValue.current,
			years: this.years,
			disabled: this.opts.disabled.current,
		});
	});

	isInvalid = $derived.by(() => {
		const value = this.opts.value.current;
		const isDateDisabled = this.opts.isDateDisabled.current;
		const isDateUnavailable = this.opts.isDateUnavailable.current;
		if (Array.isArray(value)) {
			if (!value.length) return false;
			for (const date of value) {
				if (isDateDisabled(date)) return true;
				if (isDateUnavailable(date)) return true;
			}
		} else {
			if (!value) return false;
			if (isDateDisabled(value)) return true;
			if (isDateUnavailable(value)) return true;
		}
		return false;
	});

	headingValue = $derived.by(() => {
		return getMonthCalendarHeadingValue({
			years: this.years,
			formatter: this.formatter,
			locale: this.opts.locale.current,
		});
	});

	fullCalendarLabel = $derived.by(() => {
		return `${this.opts.calendarLabel.current} ${this.headingValue}`;
	});

	isDateDisabled(date: DateValue) {
		if (this.opts.isDateDisabled.current(date) || this.opts.disabled.current) return true;
		const minValue = this.opts.minValue.current;
		const maxValue = this.opts.maxValue.current;
		if (minValue && isBefore(date, minValue)) return true;
		if (maxValue && isBefore(maxValue, date)) return true;
		return false;
	}

	isDateSelected(date: DateValue) {
		const value = this.opts.value.current;
		if (Array.isArray(value)) {
			return value.some((d) => isSameMonth(d, date));
		} else if (!value) {
			return false;
		}
		return isSameMonth(value, date);
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

	handleCellClick(_: Event, date: DateValue) {
		if (this.opts.readonly.current) return;
		if (
			this.opts.isDateDisabled.current?.(date) ||
			this.opts.isDateUnavailable.current?.(date)
		) {
			return;
		}

		const prev = this.opts.value.current;
		const multiple = this.opts.type.current === "multiple";
		if (multiple) {
			if (Array.isArray(prev) || prev === undefined) {
				this.opts.value.current = this.handleMultipleUpdate(prev, date);
			}
		} else if (!Array.isArray(prev)) {
			const next = this.handleSingleUpdate(prev, date);
			if (!next) {
				this.announcer.announce("Selected date is now empty.", "polite", 5000);
			} else {
				this.announcer.announce(
					`Selected Date: ${this.formatter.selectedDate(next, false)}`,
					"polite"
				);
			}
			this.opts.value.current = getDateWithPreviousTime(next, prev);
			if (next !== undefined) {
				this.opts.onDateSelect?.current?.();
			}
		}
	}

	handleMultipleUpdate(prev: DateValue[] | undefined, date: DateValue) {
		if (!prev) return [date];
		if (!Array.isArray(prev)) {
			if (DEV) throw new Error("Invalid value for multiple prop.");
			return;
		}
		const index = prev.findIndex((d) => isSameMonth(d, date));
		const preventDeselect = this.opts.preventDeselect.current;
		if (index === -1) {
			return [...prev, date];
		} else if (preventDeselect) {
			return prev;
		} else {
			const next = prev.filter((d) => !isSameMonth(d, date));
			if (!next.length) {
				this.opts.placeholder.current = date;
				return undefined;
			}
			return next;
		}
	}

	handleSingleUpdate(prev: DateValue | undefined, date: DateValue) {
		if (Array.isArray(prev)) {
			if (DEV) throw new Error("Invalid value for single prop.");
		}
		if (!prev) return date;
		const preventDeselect = this.opts.preventDeselect.current;
		if (!preventDeselect && isSameMonth(prev, date)) {
			this.opts.placeholder.current = date;
			return undefined;
		}
		return date;
	}

	onkeydown(event: BitsKeyboardEvent) {
		handleCalendarKeydown({
			event,
			handleCellClick: this.handleCellClick,
			shiftFocus: this.shiftFocus,
			placeholderValue: this.opts.placeholder.current,
		});
	}

	snippetProps = $derived.by(() => ({
		years: this.years,
	}));

	getBitsAttr: (typeof monthCalendarAttrs)["getAttr"] = (part) => {
		return monthCalendarAttrs.getAttr(part);
	};

	props = $derived.by(
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

type MonthCalendarCellStateProps = WithRefProps<
	ReadableBoxedValues<{
		date: DateValue;
		year: DateValue;
	}>
>;

class MonthCalendarCellState {
	readonly opts: MonthCalendarCellStateProps;
	readonly root: MonthCalendarRootState;
	cellDate = $derived.by(() => toDate(this.opts.date.current));
	isDisabled = $derived.by(() => this.root.isDateDisabled(this.opts.date.current));
	isUnavailable = $derived.by(() =>
		this.root.opts.isDateUnavailable.current(this.opts.date.current)
	);
	isDateThisMonth = $derived.by(() =>
		isSameMonth(today(getLocalTimeZone()), this.opts.date.current)
	);
	isFocusedDate = $derived.by(() =>
		isSameMonth(this.opts.date.current, this.root.opts.placeholder.current)
	);
	isSelectedDate = $derived.by(() => this.root.isDateSelected(this.opts.date.current));
	labelText = $derived.by(() =>
		this.root.formatter.custom(this.cellDate, {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		})
	);

	constructor(opts: MonthCalendarCellStateProps, root: MonthCalendarRootState) {
		this.opts = opts;
		this.root = root;
	}

	snippetProps = $derived.by(() => ({
		disabled: this.isDisabled,
		unavailable: this.isUnavailable,
		selected: this.isSelectedDate,
	}));

	ariaDisabled = $derived.by(() => {
		return this.isDisabled || this.isUnavailable;
	});

	sharedDataAttrs = $derived.by(
		() =>
			({
				"data-unavailable": getDataUnavailable(this.isUnavailable),
				"data-this-month": this.isDateThisMonth ? "" : undefined,
				"data-focused": this.isFocusedDate ? "" : undefined,
				"data-selected": getDataSelected(this.isSelectedDate),
				"data-value": this.opts.date.current.toString(),
				"data-type": getDateValueType(this.opts.date.current),
				"data-disabled": getDataDisabled(this.isDisabled),
			}) as const
	);

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				role: "gridcell",
				"aria-selected": getAriaSelected(this.isSelectedDate),
				"aria-disabled": getAriaDisabled(this.ariaDisabled),
				...this.sharedDataAttrs,
				[this.root.getBitsAttr("cell")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

type MonthCalendarMonthStateProps = WithRefProps;

class MonthCalendarMonthState {
	readonly opts: MonthCalendarMonthStateProps;
	readonly cell: MonthCalendarCellState;

	constructor(opts: MonthCalendarMonthStateProps, cell: MonthCalendarCellState) {
		this.opts = opts;
		this.cell = cell;
		this.onclick = this.onclick.bind(this);
	}

	#tabindex = $derived.by(() =>
		this.cell.isDisabled ? undefined : this.cell.isFocusedDate ? 0 : -1
	);

	onclick(e: BitsMouseEvent) {
		if (this.cell.isDisabled) return;
		this.cell.root.handleCellClick(e, this.cell.opts.date.current);
	}

	snippetProps = $derived.by(() => ({
		disabled: this.cell.isDisabled,
		unavailable: this.cell.isUnavailable,
		selected: this.cell.isSelectedDate,
		month: `${this.cell.opts.date.current.month}`,
	}));

	props = $derived.by(
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
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarHeadingStateProps = WithRefProps;

export class MonthCalendarHeadingState {
	readonly opts: MonthCalendarHeadingStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;
	headingValue = $derived.by(() => this.root.headingValue);

	constructor(
		opts: MonthCalendarHeadingStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				"aria-hidden": getAriaHidden(true),
				"data-disabled": getDataDisabled(this.root.opts.disabled.current),
				"data-readonly": getDataReadonly(this.root.opts.readonly.current),
				[this.root.getBitsAttr("heading")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarNextButtonStateProps = WithRefProps;

export class MonthCalendarNextButtonState {
	readonly opts: MonthCalendarNextButtonStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;
	isDisabled = $derived.by(() => this.root.isNextButtonDisabled);

	constructor(
		opts: MonthCalendarNextButtonStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
		this.onclick = this.onclick.bind(this);
	}

	onclick(_: BitsMouseEvent) {
		if (this.isDisabled) return;
		this.root.nextPage();
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				role: "button",
				type: "button",
				"aria-label": "Next",
				"aria-disabled": getAriaDisabled(this.isDisabled),
				"data-disabled": getDataDisabled(this.isDisabled),
				disabled: this.isDisabled,
				[this.root.getBitsAttr("next-button")]: "",
				//
				onclick: this.onclick,
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarPrevButtonStateProps = WithRefProps;

export class MonthCalendarPrevButtonState {
	readonly opts: MonthCalendarPrevButtonStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;
	isDisabled = $derived.by(() => this.root.isPrevButtonDisabled);

	constructor(
		opts: MonthCalendarPrevButtonStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
		this.onclick = this.onclick.bind(this);
	}

	onclick(_: BitsMouseEvent) {
		if (this.isDisabled) return;
		this.root.prevPage();
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				role: "button",
				type: "button",
				"aria-label": "Previous",
				"aria-disabled": getAriaDisabled(this.isDisabled),
				"data-disabled": getDataDisabled(this.isDisabled),
				disabled: this.isDisabled,
				[this.root.getBitsAttr("prev-button")]: "",
				//
				onclick: this.onclick,
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarGridStateProps = WithRefProps;

export class MonthCalendarGridState {
	readonly opts: MonthCalendarGridStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;

	constructor(
		opts: MonthCalendarGridStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				tabindex: -1,
				role: "grid",
				"aria-readonly": getAriaReadonly(this.root.opts.readonly.current),
				"aria-disabled": getAriaDisabled(this.root.opts.disabled.current),
				"data-readonly": getDataReadonly(this.root.opts.readonly.current),
				"data-disabled": getDataDisabled(this.root.opts.disabled.current),
				[this.root.getBitsAttr("grid")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarGridBodyStateProps = WithRefProps;

export class MonthCalendarGridBodyState {
	readonly opts: MonthCalendarGridBodyStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;

	constructor(
		opts: MonthCalendarGridBodyStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				"data-disabled": getDataDisabled(this.root.opts.disabled.current),
				"data-readonly": getDataReadonly(this.root.opts.readonly.current),
				[this.root.getBitsAttr("grid-body")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarGridRowStateProps = WithRefProps;

export class MonthCalendarGridRowState {
	readonly opts: MonthCalendarGridRowStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;

	constructor(
		opts: MonthCalendarGridRowStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				"data-disabled": getDataDisabled(this.root.opts.disabled.current),
				"data-readonly": getDataReadonly(this.root.opts.readonly.current),
				[this.root.getBitsAttr("grid-row")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

export type MonthCalendarHeaderStateProps = WithRefProps;

export class MonthCalendarHeaderState {
	readonly opts: MonthCalendarHeaderStateProps;
	readonly root: MonthCalendarRootState | RangeMonthCalendarRootState;

	constructor(
		opts: MonthCalendarHeaderStateProps,
		root: MonthCalendarRootState | RangeMonthCalendarRootState
	) {
		this.opts = opts;
		this.root = root;
	}

	props = $derived.by(
		() =>
			({
				id: this.opts.id.current,
				"data-disabled": getDataDisabled(this.root.opts.disabled.current),
				"data-readonly": getDataReadonly(this.root.opts.readonly.current),
				[this.root.getBitsAttr("header")]: "",
				...attachRef(this.opts.ref),
			}) as const
	);
}

export const MonthCalendarRootContext = new Context<
	MonthCalendarRootState | RangeMonthCalendarRootState
>("MonthCalendar.Root | RangeCalendar.Root");

const MonthCalendarCellContext = new Context<MonthCalendarCellState>(
	"MonthCalendar.Cell | RangeMonthCalendar.Cell"
);

export function useMonthCalendarRoot(props: MonthCalendarRootStateProps) {
	return MonthCalendarRootContext.set(new MonthCalendarRootState(props));
}

export function useMonthCalendarGrid(props: MonthCalendarGridStateProps) {
	return new MonthCalendarGridState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarCell(props: MonthCalendarCellStateProps) {
	return MonthCalendarCellContext.set(
		new MonthCalendarCellState(props, MonthCalendarRootContext.get() as MonthCalendarRootState)
	);
}

export function useMonthCalendarNextButton(props: MonthCalendarNextButtonStateProps) {
	return new MonthCalendarNextButtonState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarPrevButton(props: MonthCalendarPrevButtonStateProps) {
	return new MonthCalendarPrevButtonState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarMonth(props: MonthCalendarMonthStateProps) {
	return new MonthCalendarMonthState(props, MonthCalendarCellContext.get());
}

export function useMonthCalendarGridBody(props: MonthCalendarGridBodyStateProps) {
	return new MonthCalendarGridBodyState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarGridRow(props: MonthCalendarGridRowStateProps) {
	return new MonthCalendarGridRowState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarHeader(props: MonthCalendarHeaderStateProps) {
	return new MonthCalendarHeaderState(props, MonthCalendarRootContext.get());
}

export function useMonthCalendarHeading(props: MonthCalendarHeadingStateProps) {
	return new MonthCalendarHeadingState(props, MonthCalendarRootContext.get());
}
