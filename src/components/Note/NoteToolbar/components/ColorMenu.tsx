import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { ColorPaletteContent } from '@/components/Note/NoteEditorMenus/colorPalette';
import { getColorItem, type ColorKey } from '@/components/Note/NoteEditorMenus/colorPaletteData';
import { Popover } from '@/components/Overlay';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button } from '@heroui/react';
import clsx from 'clsx';
import { Baseline, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import styles from '../style.module.less';
import {
  blockHasInlineContent,
  colorStyleExists,
  getSelectedBlocks,
  stopToolbarMouseDown,
  toStyleUpdate,
} from '../utils';
import type { ButtonGroupChildProps } from './ToolbarButton';

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
          className={clsx(styles.colorTrigger, open && styles.toolbarButtonActive)}
          onMouseDown={stopToolbarMouseDown}
          aria-label="颜色"
        >
          <Baseline size={20} className={selectedTextColor.textClassName} aria-hidden="true" />
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Content className={styles.colorPopover} placement="bottom">
        <Popover.Dialog>
          <ColorPaletteContent
            text={
              state.hasTextColor
                ? {
                    color: state.textColor,
                    onChange: (color) => applyColor('textColor', color),
                  }
                : undefined
            }
            background={
              state.hasBackgroundColor
                ? {
                    color: state.backgroundColor,
                    onChange: (color) => applyColor('backgroundColor', color),
                  }
                : undefined
            }
            onReset={resetColors}
          />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
