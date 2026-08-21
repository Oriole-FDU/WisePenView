export interface EmojiPickerProps {
  label: string;
  disabled?: boolean;
  onSelect(emoji: string): void;
}
