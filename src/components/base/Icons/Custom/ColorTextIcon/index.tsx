import { cn } from '@/utils/cn';

import styles from './style.module.less';

interface ColorTextIconProps {
  textClassName?: string;
}

function ColorTextIcon({ textClassName }: ColorTextIconProps) {
  return (
    <span className={styles.root} aria-hidden="true">
      <span className={cn(styles.text, textClassName)}>A</span>
    </span>
  );
}

export default ColorTextIcon;
