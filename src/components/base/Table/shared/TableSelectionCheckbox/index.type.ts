export interface TableSelectionCheckboxProps {
  ariaLabel: string;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean, shiftKey: boolean) => void;
}
