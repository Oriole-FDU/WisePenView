import EntryIcon from '@/components/Icons/EntryIcon';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  renderNameContent,
}: FolderTableNameCellProps<T>) {
  const { t } = useTranslation('table');
  const nameContent = (
    <span className={styles.nameContent}>
      <span className={styles.entryIcon}>
        <EntryIcon
          entryType={row.entryType}
          folderIconType={row.folderIconType}
          resourceType={row.resourceType}
          resourceIconType={row.resourceIconType}
        />
      </span>
      <TableTextCell emphasis className={styles.nameText}>
        {row.name}
      </TableTextCell>
    </span>
  );
  const content = renderNameContent
    ? renderNameContent(nameContent, row, { row, rowId: row.id, depth })
    : nameContent;

  return (
    <div className={styles.nameCell} data-depth={depth} data-name-column="true">
      {expandable ? (
        <button
          type="button"
          className={styles.expandBtn}
          aria-label={expanded ? t('aria.collapse') : t('aria.expand')}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand?.();
          }}
        >
          {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
        </button>
      ) : (
        <span className={styles.expandPlaceholder} aria-hidden />
      )}
      {content}
    </div>
  );
}

export default FolderTableNameCell;
