export interface EmojiPickerProps {
  label: string;
  disabled?: boolean;
  onSelect(emojiId: string): void | Promise<void>;
}

export interface EmojiPickerContentProps {
  ariaLabel?: string;
  onSelect(emojiId: string): void | Promise<void>;
}
