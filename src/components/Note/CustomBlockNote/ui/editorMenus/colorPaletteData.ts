import i18n from '@/i18n';
import styles from './style.module.less';

export type ColorKey =
  'default' | 'gray' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

interface ColorItem {
  key: ColorKey;
  label: string;
  value: string;
  textClassName: string;
  backgroundClassName: string;
}

export const colorItems: ColorItem[] = [
  {
    key: 'default',
    label: 'editor.color.default',
    value: '#111827',
    textClassName: styles.textDefault,
    backgroundClassName: styles.backgroundDefault,
  },
  {
    key: 'gray',
    label: 'editor.color.gray',
    value: '#9b9a97',
    textClassName: styles.textGray,
    backgroundClassName: styles.backgroundGray,
  },
  {
    key: 'brown',
    label: 'editor.color.brown',
    value: '#64473a',
    textClassName: styles.textBrown,
    backgroundClassName: styles.backgroundBrown,
  },
  {
    key: 'red',
    label: 'editor.color.red',
    value: '#e03e3e',
    textClassName: styles.textRed,
    backgroundClassName: styles.backgroundRed,
  },
  {
    key: 'orange',
    label: 'editor.color.orange',
    value: '#d9730d',
    textClassName: styles.textOrange,
    backgroundClassName: styles.backgroundOrange,
  },
  {
    key: 'yellow',
    label: 'editor.color.yellow',
    value: '#dfab01',
    textClassName: styles.textYellow,
    backgroundClassName: styles.backgroundYellow,
  },
  {
    key: 'green',
    label: 'editor.color.green',
    value: '#4d6461',
    textClassName: styles.textGreen,
    backgroundClassName: styles.backgroundGreen,
  },
  {
    key: 'blue',
    label: 'editor.color.blue',
    value: '#0b6e99',
    textClassName: styles.textBlue,
    backgroundClassName: styles.backgroundBlue,
  },
  {
    key: 'purple',
    label: 'editor.color.purple',
    value: '#6940a5',
    textClassName: styles.textPurple,
    backgroundClassName: styles.backgroundPurple,
  },
  {
    key: 'pink',
    label: 'editor.color.pink',
    value: '#ad1a72',
    textClassName: styles.textPink,
    backgroundClassName: styles.backgroundPink,
  },
];

function normalizeColor(color: string | undefined): ColorKey {
  const value = color ?? 'default';
  return colorItems.some((item) => item.key === value) ? (value as ColorKey) : 'default';
}

export function getColorItem(color: string | undefined) {
  const safeColor = normalizeColor(color);
  return colorItems.find((item) => item.key === safeColor) ?? colorItems[0];
}

export function getColorItemLabel(item: ColorItem): string {
  return i18n.t(item.label, { ns: 'note' });
}

export function findColorItemByPickerValue(value: string) {
  const normalizedValue = value.toLowerCase();
  return colorItems.find((item) => item.value.toLowerCase() === normalizedValue);
}
