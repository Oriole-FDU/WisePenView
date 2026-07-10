import styles from './style.module.less';

export type ColorKey =
  'default' | 'gray' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface ColorItem {
  key: ColorKey;
  label: string;
  value: string;
  textClassName: string;
  backgroundClassName: string;
}

export const colorItems: ColorItem[] = [
  {
    key: 'default',
    label: '默认',
    value: '#111827',
    textClassName: styles.textDefault,
    backgroundClassName: styles.backgroundDefault,
  },
  {
    key: 'gray',
    label: '灰色',
    value: '#9b9a97',
    textClassName: styles.textGray,
    backgroundClassName: styles.backgroundGray,
  },
  {
    key: 'brown',
    label: '棕色',
    value: '#64473a',
    textClassName: styles.textBrown,
    backgroundClassName: styles.backgroundBrown,
  },
  {
    key: 'red',
    label: '红色',
    value: '#e03e3e',
    textClassName: styles.textRed,
    backgroundClassName: styles.backgroundRed,
  },
  {
    key: 'orange',
    label: '橙色',
    value: '#d9730d',
    textClassName: styles.textOrange,
    backgroundClassName: styles.backgroundOrange,
  },
  {
    key: 'yellow',
    label: '黄色',
    value: '#dfab01',
    textClassName: styles.textYellow,
    backgroundClassName: styles.backgroundYellow,
  },
  {
    key: 'green',
    label: '绿色',
    value: '#4d6461',
    textClassName: styles.textGreen,
    backgroundClassName: styles.backgroundGreen,
  },
  {
    key: 'blue',
    label: '蓝色',
    value: '#0b6e99',
    textClassName: styles.textBlue,
    backgroundClassName: styles.backgroundBlue,
  },
  {
    key: 'purple',
    label: '紫色',
    value: '#6940a5',
    textClassName: styles.textPurple,
    backgroundClassName: styles.backgroundPurple,
  },
  {
    key: 'pink',
    label: '粉色',
    value: '#ad1a72',
    textClassName: styles.textPink,
    backgroundClassName: styles.backgroundPink,
  },
];

export function normalizeColor(color: string | undefined): ColorKey {
  const value = color ?? 'default';
  return colorItems.some((item) => item.key === value) ? (value as ColorKey) : 'default';
}

export function getColorItem(color: string | undefined) {
  const safeColor = normalizeColor(color);
  return colorItems.find((item) => item.key === safeColor) ?? colorItems[0];
}

export function findColorItemByPickerValue(value: string) {
  const normalizedValue = value.toLowerCase();
  return colorItems.find((item) => item.value.toLowerCase() === normalizedValue);
}
