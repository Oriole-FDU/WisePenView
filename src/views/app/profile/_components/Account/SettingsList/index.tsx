import type { SettingsListProps } from './index.type';
import styles from './style.module.scss';

function SettingsList({ items, className }: SettingsListProps) {
  return (
    <dl className={[styles.list, className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div key={item.key} className={styles.row}>
          <dt className={styles.label}>{item.label}</dt>
          <dd
            className={[styles.value, item.empty ? styles.valueEmpty : '']
              .filter(Boolean)
              .join(' ')}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default SettingsList;
export type { SettingsListItem, SettingsListProps } from './index.type';
