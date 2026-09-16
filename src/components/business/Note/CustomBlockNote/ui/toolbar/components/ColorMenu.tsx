import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppPopover from '@/components/base/AppPopover';
import ColorTextIcon from '@/components/base/Icons/Custom/ColorTextIcon';
import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import { ColorPaletteContent } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPalette';
import {
  type ColorKey,
  getColorItem,
} from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';

import {
  blockHasInlineContent,
  colorStyleExists,
  getSelectedBlocks,
  toStyleUpdate,
} from '../utils';
import { type ButtonGroupChildProps, ToolbarButton } from './ToolbarButton';

export function ColorMenu(buttonGroupProps: ButtonGroupChildProps) {
  const { t } = useTranslation('note');
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
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppPopover.Trigger>
        <ToolbarButton
          {...buttonGroupProps}
          icon={<ColorTextIcon textClassName={selectedTextColor.textClassName} />}
          label={t('editor.color.label')}
        />
      </AppPopover.Trigger>
      <AppPopover.Content placement="bottom" bodyPadding="none">
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
      </AppPopover.Content>
    </AppPopover>
  );
}
