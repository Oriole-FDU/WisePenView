import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { Popover } from '@/components/Overlay';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button, ColorSwatchPicker } from '@heroui/react';
import { Baseline, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import styles from '../style.module.less';
import {
  blockHasInlineContent,
  colorStyleExists,
  cx,
  getSelectedBlocks,
  stopToolbarMouseDown,
  toStyleUpdate,
} from '../utils';
import type { ButtonGroupChildProps } from './ToolbarButton';

type ColorKey =
  'default' | 'gray' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

interface ColorItem {
  key: ColorKey;
  label: string;
  value: string;
  textClassName: string;
  backgroundClassName: string;
}

const colorItems: ColorItem[] = [
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
    value: '#8a8f98',
    textClassName: styles.textGray,
    backgroundClassName: styles.backgroundGray,
  },
  {
    key: 'brown',
    label: '棕色',
    value: '#8b5e3c',
    textClassName: styles.textBrown,
    backgroundClassName: styles.backgroundBrown,
  },
  {
    key: 'red',
    label: '红色',
    value: '#ef4444',
    textClassName: styles.textRed,
    backgroundClassName: styles.backgroundRed,
  },
  {
    key: 'orange',
    label: '橙色',
    value: '#f97316',
    textClassName: styles.textOrange,
    backgroundClassName: styles.backgroundOrange,
  },
  {
    key: 'yellow',
    label: '黄色',
    value: '#eab308',
    textClassName: styles.textYellow,
    backgroundClassName: styles.backgroundYellow,
  },
  {
    key: 'green',
    label: '绿色',
    value: '#22c55e',
    textClassName: styles.textGreen,
    backgroundClassName: styles.backgroundGreen,
  },
  {
    key: 'blue',
    label: '蓝色',
    value: '#3b82f6',
    textClassName: styles.textBlue,
    backgroundClassName: styles.backgroundBlue,
  },
  {
    key: 'purple',
    label: '紫色',
    value: '#7c3aed',
    textClassName: styles.textPurple,
    backgroundClassName: styles.backgroundPurple,
  },
  {
    key: 'pink',
    label: '粉色',
    value: '#ec4899',
    textClassName: styles.textPink,
    backgroundClassName: styles.backgroundPink,
  },
];

function normalizeColor(color: string | undefined): ColorKey {
  const value = color ?? 'default';
  return colorItems.some((item) => item.key === value) ? (value as ColorKey) : 'default';
}

function getColorItem(color: string | undefined) {
  const safeColor = normalizeColor(color);
  return colorItems.find((item) => item.key === safeColor) ?? colorItems[0];
}

function findColorItemByPickerValue(value: string) {
  const normalizedValue = value.toLowerCase();
  return colorItems.find((item) => item.value.toLowerCase() === normalizedValue);
}

function ColorSection({
  title,
  selectedColor,
  mode,
  onSelect,
}: {
  title: string;
  selectedColor?: string;
  mode: 'text' | 'background';
  onSelect: (color: ColorKey) => void;
}) {
  const selectedItem = getColorItem(selectedColor);

  return (
    <div className={styles.colorSection}>
      <div className={styles.colorSectionTitle}>{title}</div>
      <ColorSwatchPicker
        aria-label={title}
        className={styles.colorSwatchPicker}
        layout="grid"
        value={selectedItem.value}
        onChange={(color) => {
          const item = findColorItemByPickerValue(color.toString('hex'));
          if (item) {
            onSelect(item.key);
          }
        }}
      >
        {colorItems.map((item) => (
          <ColorSwatchPicker.Item
            key={`${mode}-${item.key}`}
            color={item.value}
            aria-label={`${title}${item.label}`}
            className={({ isSelected }) =>
              cx(styles.colorSwatchItem, isSelected && styles.colorSwatchSelected)
            }
            onPress={() => onSelect(item.key)}
          >
            {mode === 'text' ? (
              <Baseline
                size={20}
                className={cx(styles.colorTextPreview, item.textClassName)}
                aria-hidden="true"
              />
            ) : (
              <span className={cx(styles.colorBackgroundPreview, item.backgroundClassName)} />
            )}
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </div>
  );
}

export function ColorMenu(buttonGroupProps: ButtonGroupChildProps) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const [open, setOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable || !getSelectedBlocks(editor).find(blockHasInlineContent)) {
        return undefined;
      }
      const hasTextColor = colorStyleExists(editor, 'textColor');
      const hasBackgroundColor = colorStyleExists(editor, 'backgroundColor');
      if (!hasTextColor && !hasBackgroundColor) {
        return undefined;
      }
      const activeStyles = editor.getActiveStyles();
      return {
        textColor: hasTextColor ? String(activeStyles.textColor ?? 'default') : undefined,
        backgroundColor: hasBackgroundColor
          ? String(activeStyles.backgroundColor ?? 'default')
          : undefined,
        hasTextColor,
        hasBackgroundColor,
      };
    },
  });

  if (!state) {
    return null;
  }

  const refocusEditor = () => {
    window.setTimeout(() => editor.focus());
  };

  const applyColor = (target: 'textColor' | 'backgroundColor', color: ColorKey) => {
    if (color === 'default') {
      editor.removeStyles(toStyleUpdate({ [target]: color }));
    } else {
      editor.addStyles(toStyleUpdate({ [target]: color }));
    }
    refocusEditor();
  };

  const resetColors = () => {
    if (state.hasTextColor) {
      editor.removeStyles(toStyleUpdate({ textColor: 'default' }));
    }
    if (state.hasBackgroundColor) {
      editor.removeStyles(toStyleUpdate({ backgroundColor: 'default' }));
    }
    setOpen(false);
    refocusEditor();
  };
  const selectedTextColor = getColorItem(state.textColor);

  return (
    <Popover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <Popover.Trigger>
        <Button
          {...buttonGroupProps}
          variant="ghost"
          size="sm"
          isIconOnly
          className={cx(styles.colorTrigger, open && styles.toolbarButtonActive)}
          onMouseDown={stopToolbarMouseDown}
          aria-label="颜色"
        >
          <Baseline size={20} className={selectedTextColor.textClassName} aria-hidden="true" />
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.colorPopover} placement="bottom">
        <Popover.Dialog>
          <div className={styles.colorPanel}>
            {state.hasTextColor ? (
              <ColorSection
                title="字体颜色"
                selectedColor={state.textColor}
                mode="text"
                onSelect={(color) => applyColor('textColor', color)}
              />
            ) : null}
            {state.hasBackgroundColor ? (
              <ColorSection
                title="背景颜色"
                selectedColor={state.backgroundColor}
                mode="background"
                onSelect={(color) => applyColor('backgroundColor', color)}
              />
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className={styles.resetColorButton}
              onPress={resetColors}
            >
              恢复默认
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
