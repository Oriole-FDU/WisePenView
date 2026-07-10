import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { getSafeTableCellSelection } from '@/components/Note/tableHandlesSafe';
import {
  blockHasType,
  defaultProps,
  mapTableCell,
  type InlineContentSchema,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { ToggleButtonGroup } from '@heroui/react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { Fragment } from 'react';
import { getSelectedBlocks, toBlockUpdate } from '../utils';
import { ToolbarToggleButton } from './ToolbarButton';

const textAlignButtons = [
  { key: 'left', label: '左对齐', icon: AlignLeft },
  { key: 'center', label: '居中对齐', icon: AlignCenter },
  { key: 'right', label: '右对齐', icon: AlignRight },
] as const;

type TextAlignment = (typeof textAlignButtons)[number]['key'];

export function TextAlignButtons() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }
      const selectedBlocks = getSelectedBlocks(editor);
      const firstBlock = selectedBlocks[0];
      if (
        blockHasType(firstBlock, editor, firstBlock.type, {
          textAlignment: defaultProps.textAlignment,
        })
      ) {
        return {
          kind: 'blocks' as const,
          textAlignment: firstBlock.props.textAlignment as TextAlignment,
          blocks: selectedBlocks,
        };
      }

      if (selectedBlocks.length === 1 && blockHasType(firstBlock, editor, 'table')) {
        const cellSelection = getSafeTableCellSelection(editor);
        if (!cellSelection) {
          return undefined;
        }
        const tableContent = firstBlock.content as TableContent<InlineContentSchema, StyleSchema>;
        return {
          kind: 'table' as const,
          textAlignment: mapTableCell(tableContent.rows[0].cells[0]).props
            .textAlignment as TextAlignment,
          block: firstBlock,
          cellSelection,
        };
      }
      return undefined;
    },
  });

  if (!state) {
    return null;
  }

  const setTextAlignment = (alignment: TextAlignment) => {
    editor.focus();
    if (state.kind === 'blocks') {
      for (const block of state.blocks) {
        if (
          blockHasType(block, editor, block.type, {
            textAlignment: defaultProps.textAlignment,
          })
        ) {
          editor.updateBlock(block, toBlockUpdate({ props: { textAlignment: alignment } }));
        }
      }
      return;
    }

    const tableContent = state.block.content as TableContent<InlineContentSchema, StyleSchema>;
    const rows = tableContent.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => mapTableCell(cell)),
    }));
    for (const cell of state.cellSelection.cells) {
      const targetCell = rows[cell.row]?.cells[cell.col];
      if (targetCell) {
        targetCell.props.textAlignment = alignment;
      }
    }
    editor.updateBlock(
      state.block,
      toBlockUpdate({
        type: 'table',
        content: {
          ...tableContent,
          type: 'tableContent',
          rows,
        },
      })
    );
    editor.setTextCursorPosition(state.block);
  };

  return (
    <ToggleButtonGroup
      aria-label="文本对齐"
      selectionMode="single"
      selectedKeys={new Set([state.textAlignment])}
      onSelectionChange={(keys) => {
        const [key] = [...keys];
        if (key != null) {
          setTextAlignment(String(key) as TextAlignment);
        }
      }}
      orientation="horizontal"
      size="sm"
      disallowEmptySelection
    >
      {textAlignButtons.map((item, index) => {
        const Icon = item.icon;
        return (
          <Fragment key={item.key}>
            {index > 0 ? <ToggleButtonGroup.Separator /> : null}
            <ToolbarToggleButton id={item.key} label={item.label} icon={<Icon size={20} />} />
          </Fragment>
        );
      })}
    </ToggleButtonGroup>
  );
}
