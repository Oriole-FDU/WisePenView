import { useRef } from 'react';

import { Checkbox } from '@/components/base/Input';

export interface TableSelectionCheckboxProps {
  ariaLabel: string;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean, shiftKey: boolean) => void;
}

function TableSelectionCheckbox({
  ariaLabel,
  isSelected,
  isIndeterminate,
  isDisabled,
  onChange,
}: TableSelectionCheckboxProps) {
  const shiftKeyRef = useRef(false);

  return (
    <Checkbox
      className="wisepen-table-selection-checkbox"
      slot="selection"
      variant="primary"
      aria-label={ariaLabel}
      data-row-click-ignore="true"
      isSelected={isSelected}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
      onPointerDownCapture={(event) => {
        shiftKeyRef.current = event.shiftKey;
      }}
      onKeyDown={(event) => {
        shiftKeyRef.current = event.shiftKey;
      }}
      onChange={(selected) => {
        onChange?.(selected, shiftKeyRef.current);
        shiftKeyRef.current = false;
      }}
    />
  );
}

export default TableSelectionCheckbox;
