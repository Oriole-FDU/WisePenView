import data, { type EmojiMartData } from '@emoji-mart/data';
import en from '@emoji-mart/data/i18n/en.json';
import zh from '@emoji-mart/data/i18n/zh.json';
import { useMemoizedFn } from 'ahooks';
import { Picker } from 'emoji-mart';
import zhEmojiData from 'emojibase-data/zh/data.json';
import { SmilePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppPopover from '@/components/base/AppPopover';
import AppIconButton from '@/components/base/Button/AppIconButton';

import styles from './style.module.less';

interface EmojiMartSelection {
  native?: string;
}

interface EmojibaseItem {
  emoji?: string;
  label?: string;
  tags?: string[];
}

const localizedDataCache = new Map<string, EmojiMartData>();
const emojiMartData = data as unknown as EmojiMartData;
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

function normalizeEmoji(value: string): string {
  return value.replace(/[\uFE0E\uFE0F]/g, '');
}

function toRgbChannels(value: string): string | undefined {
  const color = value.trim();
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const normalized =
      hex.length <= 4
        ? hex
            .slice(0, 3)
            .split('')
            .map((channel) => `${channel}${channel}`)
            .join('')
        : hex.slice(0, 6);
    return [0, 2, 4]
      .map((index) => Number.parseInt(normalized.slice(index, index + 2), 16))
      .join(', ');
  }

  const rgb = color.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (!rgb) return undefined;
  const channels = rgb
    .split(/[,\s/]+/)
    .slice(0, 3)
    .map((channel) => Number.parseFloat(channel));
  return channels.length === 3 && channels.every(Number.isFinite) ? channels.join(', ') : undefined;
}

function getPickerData(locale: 'en' | 'zh'): EmojiMartData {
  if (locale === 'en') return emojiMartData;

  const cachedData = localizedDataCache.get(locale);
  if (cachedData) return cachedData;

  const localizedItems = new Map(
    (zhEmojiData as EmojibaseItem[])
      .filter((item): item is EmojibaseItem & { emoji: string } => Boolean(item.emoji))
      .map((item) => [normalizeEmoji(item.emoji), item])
  );
  const localizedEmojis = Object.fromEntries(
    Object.entries(emojiMartData.emojis).map(([id, emoji]) => {
      const localizedItem = localizedItems.get(normalizeEmoji(emoji.skins[0].native));
      if (!localizedItem) return [id, emoji];

      return [
        id,
        {
          ...emoji,
          name: localizedItem.label ?? emoji.name,
          keywords: [
            ...new Set([
              ...emoji.keywords,
              emoji.name,
              localizedItem.label ?? '',
              ...(localizedItem.tags ?? []),
            ]),
          ].filter(Boolean),
        },
      ];
    })
  );
  const localizedData = { ...emojiMartData, emojis: localizedEmojis } as EmojiMartData;
  localizedDataCache.set(locale, localizedData);
  return localizedData;
}

export interface EmojiPickerContentProps {
  ariaLabel?: string;
  onSelect(emojiId: string): void | Promise<void>;
}

export function EmojiPickerContent({ ariaLabel, onSelect }: EmojiPickerContentProps) {
  const { i18n, t } = useTranslation('common');
  const emojiLocale = i18n.resolvedLanguage === 'en-US' ? 'en' : 'zh';
  const emojiTranslations = emojiLocale === 'en' ? en : zh;

  const handleSelect = useMemoizedFn((emoji: EmojiMartSelection) => {
    const emojiId = emoji.native?.trim();
    if (!emojiId) return;
    void onSelect(emojiId);
  });

  const mountPicker = useMemoizedFn((container: HTMLDivElement | null) => {
    if (!container) return;
    const picker = new Picker({
      data: getPickerData(emojiLocale),
      i18n: emojiTranslations,
      locale: emojiLocale,
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
      onEmojiSelect: handleSelect,
    }) as unknown as HTMLElement;
    picker.className = styles.picker;
    const accent = toRgbChannels(getComputedStyle(container).getPropertyValue('--accent'));
    if (accent) {
      picker.style.setProperty('--rgb-accent', accent);
    }
    container.replaceChildren(picker);
  });

  return (
    <div
      key={emojiLocale}
      ref={mountPicker}
      className={styles.host}
      aria-label={ariaLabel ?? t('emoji.pickerAria')}
    />
  );
}

interface EmojiPickerProps {
  label: string;
  disabled?: boolean;
  onSelect(emojiId: string): void | Promise<void>;
}

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
          onSelect={(emojiId) => {
            setOpen(false);
            return onSelect(emojiId);
          }}
        />
      </AppPopover.Content>
    </AppPopover>
  );
}

export default EmojiPicker;
