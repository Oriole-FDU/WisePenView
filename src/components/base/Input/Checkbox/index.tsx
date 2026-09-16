import { Checkbox as HeroCheckbox } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { CheckboxProps } from './index.type';
import styles from './style.module.less';

function Checkbox({
  children,
  className,
  onClick,
  variant = 'secondary',
  ...props
}: CheckboxProps) {
  return (
    <HeroCheckbox variant={variant} className={cn(styles.checkbox, className)} {...props}>
      {(state) => (
        <HeroCheckbox.Content>
          <span className={styles.clickTarget} onClick={onClick}>
            <HeroCheckbox.Control>
              <HeroCheckbox.Indicator />
            </HeroCheckbox.Control>
            {typeof children === 'function' ? children(state) : children}
          </span>
        </HeroCheckbox.Content>
      )}
    </HeroCheckbox>
  );
}

export type { CheckboxProps };
export default Checkbox;
