import type { BlockConfig } from '@blocknote/core';

export const HIGHLIGHT_COLOR_KEYS = [
  'default',
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
] as const;

export const HIGHLIGHT_BORDER_COLOR_KEYS = ['auto', ...HIGHLIGHT_COLOR_KEYS] as const;
export const HIGHLIGHT_TEXT_ALIGNMENT_KEYS = ['left', 'center', 'right'] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLOR_KEYS)[number];
export type HighlightBorderColor = (typeof HIGHLIGHT_BORDER_COLOR_KEYS)[number];
export type HighlightTextAlignment = (typeof HIGHLIGHT_TEXT_ALIGNMENT_KEYS)[number];

export const DEFAULT_HIGHLIGHT_ICON = '💡';

export const highlightBlockPropSchema = {
  icon: { default: DEFAULT_HIGHLIGHT_ICON },
  highlightBackgroundColor: {
    default: 'default',
    values: HIGHLIGHT_COLOR_KEYS,
  },
  highlightBorderColor: {
    default: 'auto',
    values: HIGHLIGHT_BORDER_COLOR_KEYS,
  },
  highlightTextColor: {
    default: 'default',
    values: HIGHLIGHT_COLOR_KEYS,
  },
  textAlignment: {
    default: 'left',
    values: HIGHLIGHT_TEXT_ALIGNMENT_KEYS,
  },
} as const;

export const highlightBlockConfig = {
  type: 'highlightBlock',
  propSchema: highlightBlockPropSchema,
  content: 'inline',
} as const satisfies BlockConfig<'highlightBlock', typeof highlightBlockPropSchema, 'inline'>;

export interface HighlightBlockProps {
  icon: string;
  backgroundColor: HighlightColor;
  borderColor: HighlightBorderColor;
  textColor: HighlightColor;
  textAlignment: HighlightTextAlignment;
}

export interface HighlightBlockStoredProps {
  icon: string;
  highlightBackgroundColor: HighlightColor;
  highlightBorderColor: HighlightBorderColor;
  highlightTextColor: HighlightColor;
  textAlignment: HighlightTextAlignment;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readEnumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : fallback;
}

export function readHighlightBlockProps(block: Record<string, unknown>): HighlightBlockProps {
  const props = isRecord(block.props) ? block.props : {};
  return {
    icon:
      typeof props.icon === 'string' && props.icon.trim()
        ? props.icon.trim()
        : DEFAULT_HIGHLIGHT_ICON,
    backgroundColor: readEnumValue(props.highlightBackgroundColor, HIGHLIGHT_COLOR_KEYS, 'default'),
    borderColor: readEnumValue(props.highlightBorderColor, HIGHLIGHT_BORDER_COLOR_KEYS, 'auto'),
    textColor: readEnumValue(props.highlightTextColor, HIGHLIGHT_COLOR_KEYS, 'default'),
    textAlignment: readEnumValue(props.textAlignment, HIGHLIGHT_TEXT_ALIGNMENT_KEYS, 'left'),
  };
}

export function toHighlightBlockStoredProps(props: HighlightBlockProps): HighlightBlockStoredProps {
  return {
    icon: props.icon,
    highlightBackgroundColor: props.backgroundColor,
    highlightBorderColor: props.borderColor,
    highlightTextColor: props.textColor,
    textAlignment: props.textAlignment,
  };
}

export function applyHighlightAppearance(element: HTMLElement, props: HighlightBlockProps): void {
  element.dataset.highlightBackgroundColor = props.backgroundColor;
  element.dataset.highlightBorderColor = props.borderColor;
  element.dataset.highlightTextColor = props.textColor;
  element.dataset.highlightTextAlignment = props.textAlignment;
}
