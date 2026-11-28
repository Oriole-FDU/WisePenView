export interface CourseDateRangeFieldProps {
  label: string;
  startValue: string;
  endValue: string;
  onChange: (startValue: string, endValue: string) => void;
}

export interface CourseDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export interface CourseTimeFieldProps {
  label: string;
  value: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}
