import { Switch } from '@heroui/react';
import type { ReactNode } from 'react';
import styles from './style.module.less';
interface Props {
  title: string;
  description: string;
  selected: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}
export default function SettingRow({
  title,
  description,
  selected,
  onChange,
  disabled,
  children,
}: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.copy}>
        <strong>{title}</strong>
        <span>{description}</span>
        {children}
      </div>
      <Switch
        size="md"
        aria-label={title}
        isSelected={selected}
        isDisabled={disabled}
        onChange={onChange}
      >
        <Switch.Content className={styles.switchContent}>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}
