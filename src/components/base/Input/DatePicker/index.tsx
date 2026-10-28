import {
  Calendar,
  DateField,
  DatePicker as HeroDatePicker,
  DateRangePicker as HeroDateRangePicker,
  Label,
  RangeCalendar,
  TimeField as HeroTimeField,
} from '@heroui/react';
import type { CalendarDate, DateValue, Time } from '@internationalized/date';
import type { ReactNode } from 'react';

type PopoverPlacement =
  'top' | 'bottom' | 'left' | 'right' | 'top start' | 'top end' | 'bottom start' | 'bottom end';

interface DatePickerFieldProps {
  label: ReactNode;
  value: DateValue | null;
  className?: string;
  popoverClassName?: string;
  popoverPlacement?: PopoverPlacement;
  isDisabled?: boolean;
  isRequired?: boolean;
  onChange: (value: DateValue | null) => void;
}

interface CourseDateRangeValue {
  start: CalendarDate;
  end: CalendarDate;
}

interface DateRangeFieldProps {
  label: ReactNode;
  value: CourseDateRangeValue | null;
  startName?: string;
  endName?: string;
  className?: string;
  popoverClassName?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  onChange: (value: CourseDateRangeValue | null) => void;
}

interface TimeFieldProps {
  label?: ReactNode;
  value: Time | null;
  ariaLabel?: string;
  className?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  onChange: (value: Time | null) => void;
}

export function DatePickerField({
  label,
  value,
  className,
  popoverClassName,
  popoverPlacement = 'bottom end',
  isDisabled,
  isRequired,
  onChange,
}: DatePickerFieldProps) {
  return (
    <HeroDatePicker
      className={className}
      value={value}
      isDisabled={isDisabled}
      isRequired={isRequired}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth variant="secondary">
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <HeroDatePicker.Trigger>
            <HeroDatePicker.TriggerIndicator />
          </HeroDatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <HeroDatePicker.Popover className={popoverClassName} placement={popoverPlacement}>
        <Calendar aria-label={typeof label === 'string' ? label : undefined}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </HeroDatePicker.Popover>
    </HeroDatePicker>
  );
}

export function DateRangeField({
  label,
  value,
  startName,
  endName,
  className,
  popoverClassName,
  isDisabled,
  isRequired,
  onChange,
}: DateRangeFieldProps) {
  return (
    <HeroDateRangePicker
      className={className}
      value={value}
      startName={startName}
      endName={endName}
      isDisabled={isDisabled}
      isRequired={isRequired}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth variant="secondary">
        <DateField.Input slot="start">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <HeroDateRangePicker.RangeSeparator />
        <DateField.Input slot="end">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <HeroDateRangePicker.Trigger>
            <HeroDateRangePicker.TriggerIndicator />
          </HeroDateRangePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <HeroDateRangePicker.Popover className={popoverClassName}>
        <RangeCalendar aria-label={typeof label === 'string' ? label : undefined}>
          <RangeCalendar.Header>
            <RangeCalendar.YearPickerTrigger>
              <RangeCalendar.YearPickerTriggerHeading />
              <RangeCalendar.YearPickerTriggerIndicator />
            </RangeCalendar.YearPickerTrigger>
            <RangeCalendar.NavButton slot="previous" />
            <RangeCalendar.NavButton slot="next" />
          </RangeCalendar.Header>
          <RangeCalendar.Grid>
            <RangeCalendar.GridHeader>
              {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
            </RangeCalendar.GridHeader>
            <RangeCalendar.GridBody>
              {(date) => <RangeCalendar.Cell date={date} />}
            </RangeCalendar.GridBody>
          </RangeCalendar.Grid>
          <RangeCalendar.YearPickerGrid>
            <RangeCalendar.YearPickerGridBody>
              {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
            </RangeCalendar.YearPickerGridBody>
          </RangeCalendar.YearPickerGrid>
        </RangeCalendar>
      </HeroDateRangePicker.Popover>
    </HeroDateRangePicker>
  );
}

export function TimeField({
  label,
  value,
  ariaLabel,
  className,
  isDisabled,
  isRequired,
  onChange,
}: TimeFieldProps) {
  return (
    <HeroTimeField
      aria-label={ariaLabel}
      className={className}
      value={value}
      hourCycle={24}
      granularity="minute"
      fullWidth
      isDisabled={isDisabled}
      isRequired={isRequired}
      onChange={onChange}
    >
      {label ? <Label>{label}</Label> : null}
      <HeroTimeField.Group fullWidth variant="secondary">
        <HeroTimeField.Input>
          {(segment) => <HeroTimeField.Segment segment={segment} />}
        </HeroTimeField.Input>
      </HeroTimeField.Group>
    </HeroTimeField>
  );
}

export type { DatePickerFieldProps, DateRangeFieldProps, TimeFieldProps };
