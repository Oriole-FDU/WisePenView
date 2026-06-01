import clsx from 'clsx';
import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';

import type { RatingProps } from './index.type';
import styles from './style.module.less';

function Rating({
  value = 0,
  maxValue = 5,
  isDisabled = false,
  ariaLabel = 'Rating',
  className,
  onValueChange,
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [pressedValue, setPressedValue] = useState<number | null>(null);
  const values = useMemo(
    () => Array.from({ length: Math.max(maxValue, 0) }, (_, index) => index + 1),
    [maxValue]
  );
  const displayValue = hoverValue ?? value;

  const updateValue = useCallback(
    (nextValue: number) => {
      if (isDisabled) return;
      setPressedValue(nextValue);
      onValueChange?.(nextValue);
    },
    [isDisabled, onValueChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isDisabled) return;

      const currentValue = value || 0;
      const keyMap: Partial<Record<string, number>> = {
        ArrowRight: Math.min(currentValue + 1, maxValue),
        ArrowUp: Math.min(currentValue + 1, maxValue),
        ArrowLeft: Math.max(currentValue - 1, 1),
        ArrowDown: Math.max(currentValue - 1, 1),
        Home: 1,
        End: maxValue,
      };
      const nextValue = keyMap[event.key];

      if (nextValue == null) return;
      event.preventDefault();
      updateValue(nextValue);
    },
    [isDisabled, maxValue, updateValue, value]
  );

  return (
    <div
      className={clsx(styles.rating, className)}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={isDisabled || undefined}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoverValue(null)}
    >
      {values.map((itemValue) => {
        const isActive = displayValue >= itemValue;
        const isPressed = pressedValue === itemValue;

        return (
          <button
            key={itemValue}
            type="button"
            className={clsx(
              styles.item,
              isActive && styles.itemActive,
              isPressed && styles.itemPressed
            )}
            disabled={isDisabled}
            role="radio"
            aria-checked={value === itemValue}
            aria-label={`${itemValue} 分`}
            tabIndex={isDisabled ? -1 : value === itemValue || (!value && itemValue === 1) ? 0 : -1}
            onClick={() => updateValue(itemValue)}
            onAnimationEnd={() =>
              setPressedValue((current) => (current === itemValue ? null : current))
            }
            onMouseEnter={() => setHoverValue(itemValue)}
          >
            <svg className={styles.star} viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2.25c.39 0 .74.22.92.57l2.65 5.28 5.85.84c.38.06.7.32.82.68.12.37.02.77-.25 1.04l-4.24 4.1 1 5.79c.06.38-.09.76-.4.99-.31.22-.72.25-1.06.07L12 18.88l-5.29 2.73c-.34.18-.75.15-1.06-.07-.31-.23-.46-.61-.4-.99l1-5.79-4.24-4.1a1.03 1.03 0 0 1-.25-1.04c.12-.36.44-.62.82-.68l5.85-.84 2.65-5.28c.18-.35.53-.57.92-.57Z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default Rating;
