import popupStyles from '@/components/ChatPanel/popupSurface.module.less';
import { useChatPageStore } from '@/store';
import { Switch } from '@heroui/react';
import { Library, Upload } from 'lucide-react';
import type { ContentPickerProps } from './index.type';
import styles from './style.module.less';

function ContentPicker({ open, onClose, onSelectUpload, onSelectLibrary }: ContentPickerProps) {
  const autoSaveToLibrary = useChatPageStore((s) => s.autoSaveToLibrary);
  const setAutoSaveToLibrary = useChatPageStore((s) => s.setAutoSaveToLibrary);

  if (!open) return null;

  return (
    <div className={`${styles.panel} ${popupStyles.surface}`} role="dialog" aria-label="添加内容">
      <div className={popupStyles.menu}>
        <button
          type="button"
          className={popupStyles.menuButton}
          onClick={() => {
            onSelectUpload();
            onClose();
          }}
        >
          <Upload size={16} />
          <span className={popupStyles.menuLabel}>上传附件</span>
        </button>
        <button
          type="button"
          className={popupStyles.menuButton}
          onClick={() => {
            onSelectLibrary();
            onClose();
          }}
        >
          <Library size={16} />
          <span className={popupStyles.menuLabel}>从文档库选择</span>
        </button>
      </div>
      <div className={styles.toggleRow}>
        <Switch
          size="sm"
          isSelected={autoSaveToLibrary}
          onChange={setAutoSaveToLibrary}
          aria-label="将附件上传到个人文档库"
          className={styles.toggle}
        >
          <Switch.Content className={styles.label}>将附件上传到个人文档库</Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch>
      </div>
    </div>
  );
}

export default ContentPicker;
