import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { ToggleButtonGroup } from '@heroui/react';
import { Bold, Code, Italic, Strikethrough, Underline } from 'lucide-react';
import { Fragment } from 'react';
import {
  basicStyleExists,
  blockHasInlineContent,
  getSelectedBlocks,
  toStyleUpdate,
} from '../utils';
import { ToolbarToggleButton } from './ToolbarButton';

const textStyleButtons = [
  { key: 'bold', label: '加粗', icon: Bold, strokeWidth: 2.5 },
  { key: 'strike', label: '删除线', icon: Strikethrough },
  { key: 'italic', label: '斜体', icon: Italic },
  { key: 'underline', label: '下划线', icon: Underline },
  { key: 'code', label: '行内代码', icon: Code },
] as const;

type BasicTextStyle = (typeof textStyleButtons)[number]['key'];

export function TextStyleButtons() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable || !getSelectedBlocks(editor).find(blockHasInlineContent)) {
        return undefined;
      }
      const items = textStyleButtons.filter((item) => basicStyleExists(editor, item.key));
      if (items.length === 0) {
        return undefined;
      }
      const activeStyles = editor.getActiveStyles();
      return {
        items,
        selectedKeys: new Set<BasicTextStyle>(
          items.filter((item) => item.key in activeStyles).map((item) => item.key)
        ),
      };
    },
  });

  if (!state) {
    return null;
  }

  const toggleStyle = (style: BasicTextStyle) => {
    editor.focus();
    editor.toggleStyles(toStyleUpdate({ [style]: true }));
  };

  return (
    <ToggleButtonGroup
      aria-label="文字样式"
      selectionMode="multiple"
      selectedKeys={state.selectedKeys}
      onSelectionChange={(keys) => {
        const nextKeys = new Set([...keys].map(String));
        const changedItem = state.items.find(
          (item) => state.selectedKeys.has(item.key) !== nextKeys.has(item.key)
        );
        if (changedItem) {
          toggleStyle(changedItem.key);
        }
      }}
      orientation="horizontal"
      size="sm"
    >
      {state.items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Fragment key={item.key}>
            {index > 0 ? <ToggleButtonGroup.Separator /> : null}
            <ToolbarToggleButton
              id={item.key}
              label={item.label}
              icon={
                <Icon
                  size={20}
                  strokeWidth={'strokeWidth' in item ? item.strokeWidth : undefined}
                />
              }
            />
          </Fragment>
        );
      })}
    </ToggleButtonGroup>
  );
}
