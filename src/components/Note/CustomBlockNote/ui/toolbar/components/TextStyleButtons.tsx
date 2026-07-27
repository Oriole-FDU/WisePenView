import { blockNoteSchema } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { ToggleButtonGroup } from '@heroui/react';
import { Bold, Code, Italic, Strikethrough, Underline } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  basicStyleExists,
  blockHasInlineContent,
  getSelectedBlocks,
  toStyleUpdate,
} from '../utils';
import { ToolbarToggleButton } from './ToolbarButton';

const textStyleButtons = [
  { key: 'bold', icon: Bold, strokeWidth: 2.5 },
  { key: 'strike', icon: Strikethrough },
  { key: 'italic', icon: Italic },
  { key: 'underline', icon: Underline },
  { key: 'code', icon: Code },
] as const;

type BasicTextStyle = (typeof textStyleButtons)[number]['key'];

export function TextStyleButtons() {
  const { t } = useTranslation('note');
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
      aria-label={t('editor.textStyle.label')}
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
              label={t(`editor.textStyle.${item.key}`)}
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
