import { Dropdown, Header, Label } from '@heroui/react';
import { Cloud, Plus, Upload } from 'lucide-react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';

import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
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
    <Dropdown isOpen={open} onOpenChange={setAttachmentOpen}>
      <AppIconButton
        icon={<Plus size={18} aria-hidden="true" />}
        label={t('input.uploadMenu.trigger')}
        overlayTrigger={<Dropdown.Trigger />}
      />
      <Dropdown.Popover placement="top">
        <Dropdown.Menu aria-label={t('input.uploadMenu.aria')} onAction={handleAction}>
          <Dropdown.Section>
            <Header>{t('input.uploadMenu.title')}</Header>
            <Dropdown.Item id="local-file" textValue={t('input.uploadMenu.local')}>
              <Upload size={16} />
              <Label>{t('input.uploadMenu.local')}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="cloud-file" textValue={t('input.uploadMenu.cloud')}>
              <Cloud size={16} />
              <Label>{t('input.uploadMenu.cloud')}</Label>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default UploadMenu;
