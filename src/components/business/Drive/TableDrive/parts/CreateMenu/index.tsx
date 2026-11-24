import { Label } from '@heroui/react';
import { CloudUpload, FileInput, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import Dropdown from '@/components/base/Dropdown';
import { GuideAnchor } from '@/components/base/Guide';
import EntryIcon from '@/components/business/Icons/EntryIcon';
import { GUIDE_TOOL_ID } from '@/constants/tour';

import type { CreateMenuItem, CreateMenuProps } from './index.type';
import styles from './style.module.scss';
import { useCreateMenuGuide } from './useCreateMenuGuide';

function CreateMenuIcon({ id }: { id: CreateMenuItem['id'] }) {
  switch (id) {
    case 'folder':
      return <EntryIcon entryType="folder" size={16} color="currentColor" />;
    case 'drawio':
      return (
        <EntryIcon entryType="resource" resourceIconType="drawio" size={16} color="currentColor" />
      );
    case 'note':
      return (
        <EntryIcon entryType="resource" resourceIconType="note" size={16} color="currentColor" />
      );
    case 'importNote':
      return <FileInput size={16} color="var(--accent)" aria-hidden="true" />;
    case 'skill':
      return (
        <EntryIcon entryType="resource" resourceIconType="skill" size={16} color="currentColor" />
      );
    case 'agent':
      return (
        <EntryIcon entryType="resource" resourceIconType="agent" size={16} color="currentColor" />
      );
    case 'upload':
      return <CloudUpload size={16} color="var(--accent)" aria-hidden="true" />;
  }
}

function CreateMenu({ disabled = false, items, onSelect }: CreateMenuProps) {
  const { t } = useTranslation('drive');
  const [open, setOpen] = useState(false);

  useCreateMenuGuide({ open, setOpen });

  if (items.length === 0) {
    return null;
  }

  const handleSelect = (id: CreateMenuItem['id']) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <GuideAnchor id={GUIDE_TOOL_ID.driveCreate}>
        <AppButton variant="secondary" size="sm" isDisabled={disabled}>
          <Plus size={16} aria-hidden="true" />
          {t('create.menu')}
        </AppButton>
      </GuideAnchor>

      <GuideAnchor id={GUIDE_TOOL_ID.driveCreateOpen} asChild>
        <Dropdown.Popover className={styles.menuPopover} placement="bottom start">
          <Dropdown.Menu
            aria-label={t('create.menuAria')}
            onAction={(key) => handleSelect(String(key) as CreateMenuItem['id'])}
          >
            {items.map((item) => (
              <Dropdown.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                isDisabled={item.disabled}
              >
                <CreateMenuIcon id={item.id} />
                <Label>{item.label}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </GuideAnchor>
    </Dropdown>
  );
}

export default CreateMenu;
