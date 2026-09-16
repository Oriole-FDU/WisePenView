import {
  Calendar,
  DateField,
  DatePicker,
  DateRangePicker,
  Label,
  RangeCalendar,
  TimeField,
} from '@heroui/react';
import { parseDate, parseTime } from '@internationalized/date';

import styles from '../../style.module.less';

interface CourseDateRangeFieldProps {
  label: string;
  startValue: string;
  endValue: string;
  onChange: (startValue: string, endValue: string) => void;
}

interface CourseDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface CourseTimeFieldProps {
  label: string;
  value: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}

const parseDateValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return parseDate(value);
};

const parseTimeValue = (value: string) => {
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  return parseTime(value);
};

function CourseDateField({ label, value, onChange }: CourseDateFieldProps) {
  return (
    <DatePicker
      value={parseDateValue(value)}
      onChange={(nextValue) => onChange(nextValue?.toString() ?? '')}
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth variant="secondary">
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className={styles.datePickerPopover} placement="bottom end">
        <Calendar aria-label={label}>
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
      </DatePicker.Popover>
    </DatePicker>
  );
}

function CourseDateRangeField({
  label,
  startValue,
  endValue,
  onChange,
}: CourseDateRangeFieldProps) {
  const start = parseDateValue(startValue);
  const end = parseDateValue(endValue);

  return (
    <DateRangePicker
      className={styles.dateRangePicker}
      value={start && end ? { start, end } : null}
      startName="courseStartDate"
      endName="courseEndDate"
      onChange={(nextValue) =>
        onChange(nextValue?.start.toString() ?? '', nextValue?.end.toString() ?? '')
      }
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth variant="secondary">
        <DateField.Input slot="start">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateRangePicker.RangeSeparator />
        <DateField.Input slot="end">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DateRangePicker.Trigger>
            <DateRangePicker.TriggerIndicator />
          </DateRangePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DateRangePicker.Popover className={styles.dateRangePopover}>
        <RangeCalendar aria-label={label}>
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
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}

function CourseTimeField({ label, ariaLabel, value, isDisabled, onChange }: CourseTimeFieldProps) {
  return (
    <TimeField
      aria-label={ariaLabel}
      value={parseTimeValue(value)}
      hourCycle={24}
      granularity="minute"
      fullWidth
      isDisabled={isDisabled}
      onChange={(nextValue) => {
        const nextTime = nextValue
          ? `${String(nextValue.hour).padStart(2, '0')}:${String(nextValue.minute).padStart(2, '0')}`
          : '';
        onChange(nextTime);
      }}
    >
      {label ? <Label>{label}</Label> : null}
      <TimeField.Group fullWidth variant="secondary">
        <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
      </TimeField.Group>
    </TimeField>
  );
}

export { CourseDateField, CourseDateRangeField, CourseTimeField };
