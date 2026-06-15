import { useAdvancedModeStore } from '@/store';
import { Switch } from '@heroui/react';
import type { AdvancedModeToggleProps } from './index.type';
import styles from './style.module.less';

function AdvancedModeToggle({ compact = false }: AdvancedModeToggleProps) {
  const advancedMode = useAdvancedModeStore((state) => state.advancedMode);
  const setAdvancedMode = useAdvancedModeStore((state) => state.setAdvancedMode);

  return (
    <Switch
      size="sm"
      isSelected={advancedMode}
      onChange={setAdvancedMode}
      aria-label="高级模式"
      className={`${styles.toggle} ${compact ? styles.compact : ''}`}
    >
      <Switch.Content className={styles.label}>高级模式</Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}

export default AdvancedModeToggle;
