import type { ReactNode } from 'react';

import { Switch } from '@/components/base/Input';

import styles from './style.module.scss';

interface Props {
  columns: 1 | 2;
  children: ReactNode;
}

export default function SettingsFieldGrid({ columns, children }: Props) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {children}
    </div>
  );
}

interface SettingsSwitchFieldProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onChange: (selected: boolean) => void;
}

export function SettingsSwitchField({
  label,
  selected,
  disabled,
  onChange,
}: SettingsSwitchFieldProps) {
  return (
    <div className={styles.switchItem}>
      <Switch aria-label={label} isSelected={selected} isDisabled={disabled} onChange={onChange}>
        <span className={styles.switchLabel}>{label}</span>
      </Switch>
    </div>
  );
}
