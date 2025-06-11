import type { DateValue } from "@internationalized/date";
import type { OnChangeFn, WithChild, Without } from "$lib/internal/types.js";
import type {
	BitsPrimitiveButtonAttributes,
	BitsPrimitiveDivAttributes,
	BitsPrimitiveHeaderAttributes,
	BitsPrimitiveTableAttributes,
	BitsPrimitiveTbodyAttributes,
	BitsPrimitiveTdAttributes,
	BitsPrimitiveTrAttributes,
} from "$lib/shared/attributes.js";
import type { DateMatcher, Year } from "$lib/shared/date/types.js";

export type MonthCalendarRootSnippetProps = {
	years: Year<DateValue>[];
};

type MonthCalendarBaseRootPropsWithoutHTML = {
	/**
	 * The placeholder date, used to control the view of the
	 * calendar when no value is present.
	 *
	 * @defaultValue the current date
	 */
	placeholder?: DateValue;

	/**
	 * A callback function called when the placeholder value
	 * changes.
	 */
	onPlaceholderChange?: OnChangeFn<DateValue>;

	/**
	 * Whether or not users can deselect a date once selected
	 * without selecting another date.
	 *
	 * @defaultValue false
	 */
	preventDeselect?: boolean;

	/**
	 * The minimum date that can be selected in the calendar.
	 */
	minValue?: DateValue;

	/**
	 * The maximum date that can be selected in the calendar.
	 */
	maxValue?: DateValue;

	/**
	 * Whether or not the calendar is disabled.
	 *
	 * @defaultValue false
	 */
	disabled?: boolean;

	/**
	 * Applicable only when `numberOfYears` is greater than 1.
	 *
	 * Controls whether to use paged navigation for the next and previous buttons in the
	 * date picker. With paged navigation set to `true`, clicking the next/prev buttons
	 * changes all months in view. When set to `false`, it shifts the view by a single month.
	 *
	 * For example, with `pagedNavigation` set to `true` and 2 months displayed (January and
	 * February), clicking the next button changes the view to March and April. If `pagedNavigation`
	 * is `false`, the view shifts to February and March.
	 *
	 * @defaultValue false
	 */
	pagedNavigation?: boolean;

	/**
	 * How the string representation of the weekdays provided via the `weekdays` state store
	 * should be formatted.
	 *
	 * ```md
	 * - "long": "Sunday", "Monday", "Tuesday", etc.
	 * - "short": "Sun", "Mon", "Tue", etc.
	 * - "narrow": "S", "M", "T", etc.
	 *```
	 *
	 * @defaultValue "narrow"
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#weekday
	 */
	monthFormat?: Intl.DateTimeFormatOptions["month"];

	/**
	 * A function that receives a date and returns `true` or `false` to indicate whether
	 * the date is disabled.
	 *
	 * @remarks
	 * Disabled dates cannot be focused or selected. Additionally, they are tagged
	 * with a data attribute to enable custom styling.
	 *
	 * `[data-disabled]` - applied to disabled dates
	 *
	 */
	isDateDisabled?: DateMatcher;

	/**
	 * Dates matching the provided matchers are marked as "unavailable." Unlike disabled dates,
	 * users can still focus and select unavailable dates. However, selecting an unavailable date
	 * renders the date picker as invalid.
	 *
	 * For example, in a calendar for booking appointments, you might mark already booked dates as
	 * unavailable. These dates could become available again before the appointment date, allowing
	 * users to select them to learn more about the appointment.
	 *
	 * `[data-unavailable]` - applied to unavailable dates
	 *
	 */
	isDateUnavailable?: DateMatcher;

	/**
	 * Determines the number of months to display on the calendar simultaneously.
	 * For navigation between months, refer to the `pagedNavigation` prop.
	 *
	 * @defaultValue 1
	 */
	numberOfYears?: number;

	/**
	 * This label is exclusively used for accessibility, remaining hidden from the page.
	 * It's read by screen readers when the calendar is opened. The current month and year
	 * are automatically appended to the label, so you only need to provide the base label.
	 *
	 * For instance:
	 * - 'Date of birth' will be read as 'Date of birth, January 2021' if the current month is January 2021.
	 * - 'Appointment date' will be read as 'Appointment date, January 2021' if the current month is January 2021.
	 * - 'Booking date' will be read as 'Booking date, January 2021' if the current month is January 2021.
	 */
	calendarLabel?: string;

	/**
	 * The default locale setting.
	 *
	 * @defaultValue 'en'
	 */
	locale?: string;

	/**
	 * Whether the calendar is readonly. When true, the user will be able
	 * to focus and navigate the calendar, but will not be able to select
	 * dates. @see disabled for a similar prop that prevents focusing
	 * and selecting dates.
	 *
	 * @defaultValue false
	 */
	readonly?: boolean;

	/**
	 * If `true`, the calendar will focus the selected day, today, or the first day of the month
	 * in that order depending on what is visible when the calendar is mounted.
	 */
	initialFocus?: boolean;
};

export type MonthCalendarSingleRootPropsWithoutHTML = {
	/**
	 * The type of calendar. If set to `'single'`, the calendar will
	 * only allow a single date to be selected. If set to `'multiple'`,
	 * the calendar will allow multiple dates to be selected.
	 */
	type: "single";

	/**
	 * The value of the selected date in the calendar.
	 */
	value?: DateValue;

	/**
	 * A callback function called when the value changes.
	 */
	onValueChange?: OnChangeFn<DateValue | undefined>;
};

export type MonthCalendarMultipleRootPropsWithoutHTML = {
	/**
	 * The type of calendar. If set to `'single'`, the calendar will
	 * only allow a single date to be selected. If set to `'multiple'`,
	 * the calendar will allow multiple dates to be selected.
	 */
	type: "multiple";

	/**
	 * The value of the selected dates in the calendar.
	 */
	value?: DateValue[];

	/**
	 * A callback function called when the value changes.
	 */
	onValueChange?: OnChangeFn<DateValue[]>;
};

export type _MonthCalendarSingleRootPropsWithoutHTML = MonthCalendarBaseRootPropsWithoutHTML &
	MonthCalendarSingleRootPropsWithoutHTML;

export type MonthCalendarSingleRootProps = _MonthCalendarSingleRootPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, _MonthCalendarSingleRootPropsWithoutHTML>;

export type _MonthCalendarMultipleRootPropsWithoutHTML = MonthCalendarBaseRootPropsWithoutHTML &
	MonthCalendarMultipleRootPropsWithoutHTML;

export type MonthCalendarMultipleRootProps = _MonthCalendarMultipleRootPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, _MonthCalendarMultipleRootPropsWithoutHTML>;

export type MonthCalendarRootPropsWithoutHTML = MonthCalendarBaseRootPropsWithoutHTML &
	(
		| WithChild<MonthCalendarSingleRootPropsWithoutHTML, MonthCalendarRootSnippetProps>
		| WithChild<MonthCalendarMultipleRootPropsWithoutHTML, MonthCalendarRootSnippetProps>
	);

export type MonthCalendarRootProps = MonthCalendarRootPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, MonthCalendarRootPropsWithoutHTML>;

export type MonthCalendarCellSnippetProps = {
	disabled: boolean;
	unavailable: boolean;
	selected: boolean;
};

export type MonthCalendarCellPropsWithoutHTML = WithChild<
	{
		/**
		 * The month value of the cell.
		 *
		 * @required
		 */
		month: DateValue;

		/**
		 * The month DateValue that this cell is being rendered in.
		 */
		year: DateValue;
	},
	MonthCalendarCellSnippetProps
>;

export type MonthCalendarCellProps = MonthCalendarCellPropsWithoutHTML &
	Without<BitsPrimitiveTdAttributes, MonthCalendarCellPropsWithoutHTML>;

export type MonthCalendarGridPropsWithoutHTML = WithChild;

export type MonthCalendarGridProps = MonthCalendarGridPropsWithoutHTML &
	Without<BitsPrimitiveTableAttributes, MonthCalendarGridPropsWithoutHTML>;

export type MonthCalendarGridBodyPropsWithoutHTML = WithChild;

export type MonthCalendarGridBodyProps = MonthCalendarGridBodyPropsWithoutHTML &
	Without<BitsPrimitiveTbodyAttributes, MonthCalendarGridBodyPropsWithoutHTML>;

export type MonthCalendarGridRowPropsWithoutHTML = WithChild;

export type MonthCalendarGridRowProps = MonthCalendarGridRowPropsWithoutHTML &
	Without<BitsPrimitiveTrAttributes, MonthCalendarGridRowPropsWithoutHTML>;

export type MonthCalendarHeaderPropsWithoutHTML = WithChild;

export type MonthCalendarHeaderProps = MonthCalendarHeaderPropsWithoutHTML &
	Without<BitsPrimitiveHeaderAttributes, MonthCalendarHeaderPropsWithoutHTML>;

export type MonthCalendarHeadingSnippetProps = {
	headingValue: string;
};

export type MonthCalendarHeadingPropsWithoutHTML = WithChild<{}, MonthCalendarHeadingSnippetProps>;

export type MonthCalendarMonthSnippetProps = {
	disabled: boolean;
	unavailable: boolean;
	selected: boolean;
	month: string;
};

export type MonthCalendarMonthPropsWithoutHTML = WithChild<{}, MonthCalendarMonthSnippetProps>;

export type MonthCalendarMonthProps = MonthCalendarMonthPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, MonthCalendarMonthPropsWithoutHTML>;

export type MonthCalendarHeadingProps = MonthCalendarHeadingPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, MonthCalendarHeadingPropsWithoutHTML>;

export type MonthCalendarNextButtonPropsWithoutHTML = WithChild;

export type MonthCalendarNextButtonProps = MonthCalendarNextButtonPropsWithoutHTML &
	Without<BitsPrimitiveButtonAttributes, MonthCalendarNextButtonPropsWithoutHTML>;

export type MonthCalendarPrevButtonPropsWithoutHTML = WithChild;

export type MonthCalendarPrevButtonProps = MonthCalendarPrevButtonPropsWithoutHTML &
	Without<BitsPrimitiveButtonAttributes, MonthCalendarPrevButtonPropsWithoutHTML>;
