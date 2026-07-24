import AppIconButton from '@/components/Button/AppIconButton';
import { Popover } from '@/components/Overlay';
import data from '@emoji-mart/data';
import zh from '@emoji-mart/data/i18n/zh.json';
import { useMemoizedFn } from 'ahooks';
import { Picker } from 'emoji-mart';
import { SmilePlus } from 'lucide-react';
import { useState } from 'react';

import styles from './style.module.less';

interface EmojiPickerProps {
  label: string;
  disabled?: boolean;
  onSelect(emojiId: string): void | Promise<void>;
}

interface EmojiMartSelection {
  native?: string;
}

function EmojiPicker({ label, disabled, onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useMemoizedFn((emoji: EmojiMartSelection) => {
    const emojiId = emoji.native?.trim();
    if (!emojiId) return;
    setOpen(false);
    void onSelect(emojiId);
  });

  const mountPicker = useMemoizedFn((container: HTMLDivElement | null) => {
    if (!container) return;
    const picker = new Picker({
      data,
      i18n: zh,
      locale: 'zh',
      set: 'native',
      theme: 'auto',
      perLine: 8,
      emojiButtonRadius: '6px',
      emojiButtonSize: 34,
      emojiSize: 22,
      navPosition: 'top',
      previewPosition: 'none',
      skinTonePosition: 'search',
      onEmojiSelect: handleSelect,
    }) as unknown as HTMLElement;
    picker.className = styles.emojiMartPicker;
    container.replaceChildren(picker);
  });

  return (
    <Popover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppIconButton
        icon={<SmilePlus size={15} aria-hidden />}
        label={label}
        size="sm"
        isDisabled={disabled}
        className={styles.iconButton}
        overlayTrigger={<Popover.Trigger />}
      />
      <Popover.Content className={styles.emojiPopover} placement="bottom end">
        <Popover.Dialog>
          <div ref={mountPicker} className={styles.emojiMartHost} aria-label="选择表情" />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default EmojiPicker;
