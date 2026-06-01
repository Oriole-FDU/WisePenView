export interface RatingProps {
  value?: number;
  maxValue?: number;
  isDisabled?: boolean;
  ariaLabel?: string;
  className?: string;
  onValueChange?: (value: number) => void;
}
