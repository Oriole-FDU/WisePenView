import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import EntryIcon from '@/components/base/Icons/EntryIcon';

import TableTextCell from '../../../shared/cells/TextCell';
import type { FolderTableRow } from '../../index.type';
import type { FolderTableNameCellProps } from './index.type';
import styles from './style.module.less';

function FolderTableNameCell<T extends FolderTableRow>({
  row,
  depth,
  expanded,
  expandable,
  onToggleExpand,
  renderEntryIcon,
  renderNameContent,
}: FolderTableNameCellProps<T>) {
  const { t } = useTranslation('table');
  const ctx = { row, rowId: row.id, depth };
  const nameContent = (
    <span className={styles.nameContent}>
      <span className={styles.entryIcon}>
        {renderEntryIcon ? (
          renderEntryIcon(row, ctx)
        ) : (
          <EntryIcon
            entryType={row.entryType}
            folderVariant={row.folderVariant}
            resourceType={row.resourceType}
            resourceIconType={row.resourceIconType}
          />
        )}
      </span>
      <TableTextCell emphasis className={styles.nameText}>
        {row.name}
      </TableTextCell>
    </span>
  );
  const content = renderNameContent ? renderNameContent(nameContent, row, ctx) : nameContent;
  const nameCellStyle = {
    '--folder-table-depth-indent': `${depth * 24}px`,
  } as CSSProperties;

  return (
    <div className={styles.nameCell} style={nameCellStyle} data-name-column="true">
      {expandable ? (
        <AppIconButton
          icon={expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
          label={expanded ? t('aria.collapse') : t('aria.expand')}
          size="sm"
          className={styles.expandBtn}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand?.();
          }}
        />
      ) : (
        <span className={styles.expandPlaceholder} aria-hidden />
      )}
      {content}
    </div>
  );
}

export default FolderTableNameCell;
