import { useAdvancedModeStore } from '@/store';
import { Switch } from 'antd';
import styles from '../style.module.less';
import type { AdvancedModeToggleProps } from './index.type';

function AdvancedModeToggle({ compact = false }: AdvancedModeToggleProps) {
  const advancedMode = useAdvancedModeStore((state) => state.advancedMode);
  const setAdvancedMode = useAdvancedModeStore((state) => state.setAdvancedMode);

  return (
    <button
      type="button"
      className={`${styles.advancedModeToggle} ${compact ? styles.compactToggle : ''}`}
      onClick={() => setAdvancedMode(!advancedMode)}
      aria-pressed={advancedMode}
    >
      <span className={styles.advancedModeText}>高级模式</span>
      <Switch
        size="small"
        checked={advancedMode}
        onChange={setAdvancedMode}
        onClick={(checked, event) => {
          event.stopPropagation();
          setAdvancedMode(checked);
        }}
      />
    </button>
  );
}

export default AdvancedModeToggle;
