import AppIconButton from '@/components/Button/AppIconButton';
import { AppPopover } from '@/components/Overlay';
import { SmilePlus } from 'lucide-react';
import { useState } from 'react';

import EmojiPickerContent from './EmojiPickerContent';
import type { EmojiPickerProps } from './index.type';
import styles from './style.module.less';

function EmojiPicker({ label, disabled, onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppIconButton
        icon={<SmilePlus size={15} aria-hidden />}
        label={label}
        size="sm"
        isDisabled={disabled}
        className={styles.iconButton}
        overlayTrigger={<AppPopover.Trigger />}
      />
      <AppPopover.Content placement="bottom end" bodyPadding="none">
        <EmojiPickerContent
          onSelect={(emoji) => {
            setOpen(false);
            onSelect(emoji);
          }}
        />
      </AppPopover.Content>
    </AppPopover>
  );
}

export type { EmojiPickerContentProps } from './EmojiPickerContent';
export type { EmojiPickerProps } from './index.type';
export { EmojiPickerContent };
export default EmojiPicker;
