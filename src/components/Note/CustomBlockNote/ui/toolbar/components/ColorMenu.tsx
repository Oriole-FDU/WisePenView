import AppIconButton from '@/components/Button/AppIconButton';
import { blockNoteSchema } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';
import { ColorPaletteContent } from '@/components/Note/CustomBlockNote/ui/editorMenus/colorPalette';
import {
  getColorItem,
  type ColorKey,
} from '@/components/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';
import { AppPopover } from '@/components/Overlay';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Baseline } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  blockHasInlineContent,
  colorStyleExists,
  getSelectedBlocks,
  stopToolbarMouseDown,
  toStyleUpdate,
} from '../utils';
import type { ButtonGroupChildProps } from './ToolbarButton';

export function ColorMenu(_buttonGroupProps: ButtonGroupChildProps) {
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
      <AppIconButton
        icon={<Baseline size={20} className={selectedTextColor.textClassName} aria-hidden="true" />}
        label={t('editor.color.label')}
        size="sm"
        isActive={open}
        overlayTrigger={<AppPopover.Trigger />}
        onMouseDown={stopToolbarMouseDown}
      />
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
