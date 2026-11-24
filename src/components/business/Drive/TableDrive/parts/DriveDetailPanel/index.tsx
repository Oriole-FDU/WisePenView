import { useTranslation } from 'react-i18next';

import EntryIcon from '@/components/business/Icons/EntryIcon';

import { resolveDriveFolderVariant } from '../../../common/driveComponentModel';
import type { DriveDetailPanelProps } from './index.type';
import styles from './style.module.scss';
import { useDriveDetailPanel } from './useDriveDetailPanel';

function DriveDetailPanel({ selectedRow, isEditMode, selectedCount }: DriveDetailPanelProps) {
  const { t } = useTranslation('drive');
  const detailMetaItems = useDriveDetailPanel(selectedRow);

  if (isEditMode) {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('table.editMode')}</span>
        </div>
        <div className={styles.detailBody}>
          <p className={styles.detailHint}>{t('table.editModeHint', { count: selectedCount })}</p>
        </div>
      </div>
    );
  }

  if (!selectedRow || selectedRow.node.type === 'loading') {
    return (
      <div className={styles.detailContent}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('table.details')}</span>
        </div>
        <div className={styles.detailEmpty}>{t('table.detailsEmpty')}</div>
      </div>
    );
  }

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon} aria-hidden="true">
          <EntryIcon
            entryType={selectedRow.node.type === 'resource' ? 'resource' : selectedRow.node.type}
            folderVariant={resolveDriveFolderVariant(selectedRow.node)}
            resourceType={
              selectedRow.node.type === 'resource' ? selectedRow.node.resourceType : undefined
            }
            resourceIconType={
              selectedRow.node.type === 'resource' || selectedRow.node.type === 'link'
                ? selectedRow.node.resourceIconType
                : undefined
            }
          />
        </span>
        <div className={styles.detailTitleBlock}>
          <span className={styles.detailTitle}>{selectedRow.name}</span>
          <span className={styles.detailType}>{selectedRow.typeLabel}</span>
        </div>
      </div>
      <div className={styles.detailBody}>
        <section className={styles.detailMetaSection} aria-labelledby="drive-detail-meta-title">
          <h2 id="drive-detail-meta-title">{t('table.details')}</h2>
          <dl className={styles.detailMetaList}>
            {detailMetaItems.map((item) => (
              <div key={item.key} className={styles.detailMetaItem}>
                <span className={styles.detailMetaIcon}>{item.icon}</span>
                <div className={styles.detailMetaText}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

export default DriveDetailPanel;
