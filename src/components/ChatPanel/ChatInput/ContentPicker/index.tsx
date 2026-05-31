import React from 'react';
import { Menu, Switch } from 'antd';
import { RiBookShelfLine, RiUpload2Line } from 'react-icons/ri';
import { useChatPageStore } from '@/store';
import popupStyles from '@/components/ChatPanel/popupSurface.module.less';
import type { ContentPickerProps } from './index.type';
import styles from './style.module.less';

const ContentPicker: React.FC<ContentPickerProps> = ({
  open,
  onClose,
  onSelectUpload,
  onSelectLibrary,
}) => {
  const autoSaveToLibrary = useChatPageStore((s) => s.autoSaveToLibrary);
  const setAutoSaveToLibrary = useChatPageStore((s) => s.setAutoSaveToLibrary);

  if (!open) return null;

  return (
    <div className={${styles.panel} } role="dialog">
      <Menu
        mode="inline"
        selectable={false}
        className={popupStyles.menu}
        items={[
          {
            key: 'upload',
            icon: <RiUpload2Line size={16} />,
            label: <span className={popupStyles.menuLabel}>上传附件</span>,
            onClick: () => {
              onSelectUpload();
              onClose();
            },
          },
          {
            key: 'library',
            icon: <RiBookShelfLine size={16} />,
            label: <span className={popupStyles.menuLabel}>从文档库选择</span>,
            onClick: () => {
              onSelectLibrary();
              onClose();
            },
          },
        ]}
      />
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>是否将附件上传到个人文档库中</span>
        <Switch
          size="small"
          checked={autoSaveToLibrary}
          onChange={setAutoSaveToLibrary}
        />
      </div>
    </div>
  );
};

export default ContentPicker;
