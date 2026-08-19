import { toRgbChannels } from '@/utils/colors';

import {
  EMOJI_PICKER_TRANSLATIONS,
  getPickerData,
  type EmojiPickerLocale,
} from './emojiPicker.data';

interface EmojiMartSelection {
  native?: string;
}

interface CreateEmojiPickerElementOptions {
  accentColor: string;
  locale: EmojiPickerLocale;
  onSelect(emoji: string): void;
}

const EMOJI_PICKER_CATEGORIES = [
  'frequent',
  'people',
  'nature',
  'foods',
  'activity',
  'places',
  'objects',
  'symbols',
  'flags',
];

export async function createEmojiPickerElement({
  accentColor,
  locale,
  onSelect,
}: CreateEmojiPickerElementOptions): Promise<HTMLElement> {
  const [{ Picker }, data] = await Promise.all([import('emoji-mart'), getPickerData(locale)]);
  const picker = new Picker({
    data,
    i18n: EMOJI_PICKER_TRANSLATIONS[locale],
    locale,
    categories: EMOJI_PICKER_CATEGORIES,
    set: 'native',
    theme: 'auto',
    perLine: 8,
    emojiButtonRadius: '6px',
    emojiButtonSize: 34,
    emojiSize: 22,
    navPosition: 'top',
    previewPosition: 'none',
    skinTonePosition: 'search',
    onEmojiSelect: (selection: EmojiMartSelection) => {
      const emoji = selection.native?.trim();
      if (emoji) onSelect(emoji);
    },
  }) as unknown as HTMLElement;
  const accent = toRgbChannels(accentColor);
  if (accent) picker.style.setProperty('--rgb-accent', accent);
  return picker;
}
