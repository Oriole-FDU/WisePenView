import React from 'react';
import { Menu } from 'antd';
import { RiBookShelfLine, RiUpload2Line } from 'react-icons/ri';
import popupStyles from '@/components/ChatPanel/popupSurface.module.less';
import type { ContentPickerProps } from './index.type';
import styles from './style.module.less';

const ContentPicker: React.FC<ContentPickerProps> = ({
  open,
  onClose,
  onSelectUpload,
  onSelectLibrary,
}) => {
  if (!open) return null;

  return (
    <div className={`${styles.panel} ${popupStyles.surface}`} role="dialog" aria-label="添加内容">
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
    </div>
  );
};

export default ContentPicker;
