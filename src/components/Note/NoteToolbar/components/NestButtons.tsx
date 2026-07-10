import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { blockHasType } from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { ToggleButtonGroup } from '@heroui/react';
import { IndentDecrease, IndentIncrease } from 'lucide-react';
import { blockHasInlineContent, getSelectedBlocks } from '../utils';
import { ToolbarToggleButton } from './ToolbarButton';

export function NestButton({ type }: { type: 'nest' | 'unnest' }) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      const selectedBlocks = getSelectedBlocks(editor);
      if (
        !editor.isEditable ||
        selectedBlocks.some((block) => blockHasType(block, editor, 'table')) ||
        !selectedBlocks.find(blockHasInlineContent)
      ) {
        return undefined;
      }
      return type === 'nest'
        ? { enabled: editor.canNestBlock() }
        : { enabled: editor.canUnnestBlock() };
    },
  });

  if (!state) {
    return null;
  }

  return (
    <ToolbarToggleButton
      id={type}
      label={type === 'nest' ? '增加缩进' : '减少缩进'}
      icon={type === 'nest' ? <IndentIncrease size={20} /> : <IndentDecrease size={20} />}
      isDisabled={!state.enabled}
      onPress={() => {
        editor.focus();
        if (type === 'nest') {
          editor.nestBlock();
        } else {
          editor.unnestBlock();
        }
      }}
    />
  );
}

export function NestButtons() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const visible = useEditorState({
    editor,
    selector: ({ editor }) => {
      const selectedBlocks = getSelectedBlocks(editor);
      return (
        editor.isEditable &&
        selectedBlocks.some(blockHasInlineContent) &&
        !selectedBlocks.some((block) => blockHasType(block, editor, 'table'))
      );
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <ToggleButtonGroup
      aria-label="缩进"
      selectionMode="multiple"
      selectedKeys={new Set()}
      orientation="horizontal"
      size="sm"
    >
      <NestButton type="nest" />
      <ToggleButtonGroup.Separator />
      <NestButton type="unnest" />
    </ToggleButtonGroup>
  );
}
