import EntryIcon from '@/components/Icons/EntryIcon';
import { Popover } from '@/components/Overlay';
import { Button } from '@heroui/react';
import { CloudUpload, FileInput, Plus } from 'lucide-react';
import { useState } from 'react';
import styles from './index.module.less';
import type { CreateMenuItem, CreateMenuProps } from './index.type';

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
      return <FileInput size={16} color="var(--primary)" aria-hidden="true" />;
    case 'skill':
      return (
        <EntryIcon entryType="resource" resourceIconType="skill" size={16} color="currentColor" />
      );
    case 'agent':
      return (
        <EntryIcon entryType="resource" resourceIconType="agent" size={16} color="currentColor" />
      );
    case 'upload':
      return <CloudUpload size={16} color="var(--primary)" aria-hidden="true" />;
  }
}

function CreateMenu({ disabled = false, items, onSelect }: CreateMenuProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const handleSelect = (id: CreateMenuItem['id']) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button variant="secondary" size="sm" isDisabled={disabled}>
          <Plus size={16} aria-hidden="true" />
          新建
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.menuPopover} placement="bottom start">
        <Popover.Dialog>
          <div role="menu" aria-label="新建菜单">
            <ul className={styles.menuList}>
              {items.map((item) => (
                <li key={item.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    disabled={item.disabled}
                    onClick={() => handleSelect(item.id)}
                  >
                    <span className={styles.menuIcon}>
                      <CreateMenuIcon id={item.id} />
                    </span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default CreateMenu;
