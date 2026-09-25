import { clsx } from 'clsx';

import styles from './style.module.less';

interface ColorTextIconProps {
  textClassName?: string;
}

function ColorTextIcon({ textClassName }: ColorTextIconProps) {
  return (
    <span className={styles.root} aria-hidden="true">
      <span className={clsx(styles.text, textClassName)}>A</span>
    </span>
  );
}

export default ColorTextIcon;
