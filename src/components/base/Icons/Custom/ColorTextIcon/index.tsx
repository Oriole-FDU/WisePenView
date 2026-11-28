import { clsx } from 'clsx';

import type { ColorTextIconProps } from './index.type';
import styles from './style.module.scss';

function ColorTextIcon({ textClassName }: ColorTextIconProps) {
  return (
    <span className={styles.root} aria-hidden="true">
      <span className={clsx(styles.text, textClassName)}>A</span>
    </span>
  );
}

export default ColorTextIcon;
