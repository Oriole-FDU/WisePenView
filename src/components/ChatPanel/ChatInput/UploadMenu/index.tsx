import AppIconButton from '@/components/Button/AppIconButton';
import { AppPopover } from '@/components/Overlay';
import { ListBox, ListBoxItem } from '@heroui/react';
import { Cloud, Plus, Upload } from 'lucide-react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';
import { useChatInputFiles } from '../useChatInputFiles';

function UploadMenu() {
  const { t } = useTranslation('chat');
  const { openLocalFilePicker } = useChatInputFiles();
  const store = useChatInputStoreApi();
  const open = useChatInputStore((state) => state.attachmentOpen);
  const { setAttachmentOpen, setDocumentPickerOpen } = store.getState();

  const handleAction = (key: Key) => {
    if (key === 'local-file') {
      openLocalFilePicker();
      return;
    }
    if (key === 'cloud-file') {
      setAttachmentOpen(false);
      setDocumentPickerOpen(true);
    }
  };

  return (
    <AppPopover isOpen={open} onOpenChange={setAttachmentOpen}>
      <AppIconButton
        icon={<Plus size={18} aria-hidden="true" />}
        label={t('input.uploadMenu.trigger')}
        overlayTrigger={<AppPopover.Trigger />}
      />
      <AppPopover.Content placement="top" title={t('input.uploadMenu.title')}>
        <div className={styles.popoverPanel}>
          <ListBox
            aria-label={t('input.uploadMenu.aria')}
            selectionMode="none"
            className={styles.listBox}
            onAction={handleAction}
          >
            <ListBoxItem id="local-file" textValue={t('input.uploadMenu.local')}>
              <span className={styles.listItemContent}>
                <Upload size={16} />
                <span>{t('input.uploadMenu.local')}</span>
              </span>
            </ListBoxItem>
            <ListBoxItem id="cloud-file" textValue={t('input.uploadMenu.cloud')}>
              <span className={styles.listItemContent}>
                <Cloud size={16} />
                <span>{t('input.uploadMenu.cloud')}</span>
              </span>
            </ListBoxItem>
          </ListBox>
        </div>
      </AppPopover.Content>
    </AppPopover>
  );
}

export default UploadMenu;
