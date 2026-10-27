import { parseDate, parseTime } from '@internationalized/date';

import { DatePickerField, DateRangeField, TimeField } from '@/components/base/Input';

import styles from '../../style.module.scss';

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
    <DatePickerField
      label={label}
      value={parseDateValue(value)}
      popoverClassName={styles.datePickerPopover}
      onChange={(nextValue) => onChange(nextValue?.toString() ?? '')}
    />
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
    <DateRangeField
      label={label}
      className={styles.dateRangePicker}
      value={start && end ? { start, end } : null}
      startName="courseStartDate"
      endName="courseEndDate"
      popoverClassName={styles.dateRangePopover}
      onChange={(nextValue) =>
        onChange(nextValue?.start.toString() ?? '', nextValue?.end.toString() ?? '')
      }
    />
  );
}

function CourseTimeField({ label, ariaLabel, value, isDisabled, onChange }: CourseTimeFieldProps) {
  return (
    <TimeField
      label={label}
      ariaLabel={ariaLabel}
      value={parseTimeValue(value)}
      isDisabled={isDisabled}
      onChange={(nextValue) => {
        const nextTime = nextValue
          ? `${String(nextValue.hour).padStart(2, '0')}:${String(nextValue.minute).padStart(2, '0')}`
          : '';
        onChange(nextTime);
      }}
    />
  );
}

export { CourseDateField, CourseDateRangeField, CourseTimeField };
