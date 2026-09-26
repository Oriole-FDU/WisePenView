import { ButtonGroup, ToggleButtonGroup } from '@heroui/react';
import { useUnmount } from 'ahooks';
import {
  Paintbrush,
  PanelLeft,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppPopover from '@/components/base/AppPopover';
import { ColorPaletteContent } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPalette';
import {
  type ButtonGroupChildProps,
  ToolbarButton,
  ToolbarToggleButton,
} from '@/components/business/Note/CustomBlockNote/ui/toolbar/components/ToolbarButton';

import { useTableToolbarContext } from './_context';
import styles from './TableToolbar.module.less';

export function TableStructureActions() {
  const { t } = useTranslation('note');
  const { mergeOrSplit, state, toggleHeader } = useTableToolbarContext();
  if (!state) return null;

  const isSplitAction = state.mergeAction === 'split';
  const selectedKeys = new Set<string>([
    ...(state.canToggleHeaderRow && state.isHeaderRow ? ['table-header-row'] : []),
    ...(state.canToggleHeaderColumn && state.isHeaderColumn ? ['table-header-column'] : []),
    ...(isSplitAction ? ['split-cell'] : []),
  ]);
  const actions: Array<'header-row' | 'header-column' | 'merge'> = [
    ...(state.canToggleHeaderRow ? (['header-row'] as const) : []),
    ...(state.canToggleHeaderColumn ? (['header-column'] as const) : []),
    ...(state.mergeAction ? (['merge'] as const) : []),
  ];
  if (!actions.length) return null;

  return (
    <ToggleButtonGroup
      aria-label={t('table.cells')}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      orientation="horizontal"
      size="sm"
    >
      {actions.map((action) => {
        if (action === 'header-row') {
          return (
            <ToolbarToggleButton
              key={action}
              id="table-header-row"
              label={t(state.isHeaderRow ? 'table.unsetHeaderRow' : 'table.setHeaderRow')}
              icon={<PanelTop size={20} />}
              onPress={() => toggleHeader('row')}
            />
          );
        }
        if (action === 'header-column') {
          return (
            <ToolbarToggleButton
              key={action}
              id="table-header-column"
              label={t(state.isHeaderColumn ? 'table.unsetHeaderColumn' : 'table.setHeaderColumn')}
              icon={<PanelLeft size={20} />}
              onPress={() => toggleHeader('column')}
            />
          );
        }
        return (
          <ToolbarToggleButton
            key={action}
            id={isSplitAction ? 'split-cell' : 'merge-cells'}
            label={t(isSplitAction ? 'table.unmerge' : 'table.merge')}
            icon={isSplitAction ? <TableCellsSplit size={20} /> : <TableCellsMerge size={20} />}
            onPress={mergeOrSplit}
          />
        );
      })}
    </ToggleButtonGroup>
  );
}

export function TableCellBackgroundAction(buttonGroupProps: ButtonGroupChildProps) {
  const { t } = useTranslation('note');
  const { applyBackgroundColor, state } = useTableToolbarContext();
  const [open, setOpen] = useState(false);
  if (!state) return null;

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <ToolbarButton
        {...buttonGroupProps}
        icon={<Paintbrush size={20} aria-hidden="true" />}
        isActive={open}
        label={t('editor.color.cellBackground')}
      />

      <AppPopover.Content placement="bottom" bodyPadding="none">
        <ColorPaletteContent
          background={{
            color: state.backgroundColor,
            onChange: applyBackgroundColor,
          }}
          onReset={() => applyBackgroundColor('default')}
        />
      </AppPopover.Content>
    </AppPopover>
  );
}

export function TableDeleteAction() {
  const { t } = useTranslation('note');
  const { deleteRailSelection, setDeletePreview, state } = useTableToolbarContext();
  const orientation = state?.railOrientation;

  useUnmount(() => setDeletePreview(false));

  if (!orientation) return null;
  const label = t(orientation === 'row' ? 'table.deleteRow' : 'table.deleteColumn');

  return (
    <ButtonGroup size="sm" variant="ghost" aria-label={label}>
      <ToolbarButton
        className={styles.deleteButton}
        icon={<Trash2 size={20} aria-hidden="true" />}
        label={label}
        onHoverChange={setDeletePreview}
        onPress={deleteRailSelection}
      />
    </ButtonGroup>
  );
}
