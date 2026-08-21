import type { EmojiMartData } from '@emoji-mart/data';
import en from '@emoji-mart/data/i18n/en.json';
import zh from '@emoji-mart/data/i18n/zh.json';

interface EmojibaseItem {
  emoji?: string;
  label?: string;
  tags?: string[];
}

export type EmojiPickerLocale = 'en' | 'zh';
export type EmojiPickerTranslations = typeof en | typeof zh;

const localizedDataCache = new Map<EmojiPickerLocale, Promise<EmojiMartData>>();
let emojiMartDataPromise: Promise<EmojiMartData> | undefined;
let zhEmojiDataPromise: Promise<EmojibaseItem[]> | undefined;

export const EMOJI_PICKER_TRANSLATIONS: Record<EmojiPickerLocale, EmojiPickerTranslations> = {
  en,
  zh,
};

function normalizeEmoji(value: string): string {
  // Emoji Mart 与 Emojibase 可能对同一 emoji 使用不同的 variation selector，只在匹配 key 时归一化。
  return value.replace(/[\uFE0E\uFE0F]/g, '');
}

function loadEmojiMartData(): Promise<EmojiMartData> {
  if (!emojiMartDataPromise) {
    const dataPromise = import('@emoji-mart/data').then(
      ({ default: data }) => data as unknown as EmojiMartData
    );
    emojiMartDataPromise = dataPromise;
    void dataPromise.catch(() => {
      if (emojiMartDataPromise === dataPromise) emojiMartDataPromise = undefined;
    });
  }
  return emojiMartDataPromise;
}

function loadZhEmojiData(): Promise<EmojibaseItem[]> {
  if (!zhEmojiDataPromise) {
    const dataPromise = import('emojibase-data/zh/data.json').then(
      ({ default: data }) => data as EmojibaseItem[]
    );
    zhEmojiDataPromise = dataPromise;
    void dataPromise.catch(() => {
      if (zhEmojiDataPromise === dataPromise) zhEmojiDataPromise = undefined;
    });
  }
  return zhEmojiDataPromise;
}

async function localizeZhEmojiData(): Promise<EmojiMartData> {
  const [emojiMartData, zhEmojiData] = await Promise.all([loadEmojiMartData(), loadZhEmojiData()]);

  const localizedItems = new Map(
    zhEmojiData
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
  return { ...emojiMartData, emojis: localizedEmojis } as EmojiMartData;
}

export function getPickerData(locale: EmojiPickerLocale): Promise<EmojiMartData> {
  const cachedData = localizedDataCache.get(locale);
  if (cachedData) return cachedData;

  const dataPromise = locale === 'en' ? loadEmojiMartData() : localizeZhEmojiData();
  localizedDataCache.set(locale, dataPromise);
  void dataPromise.catch(() => {
    if (localizedDataCache.get(locale) === dataPromise) localizedDataCache.delete(locale);
  });
  return dataPromise;
}
