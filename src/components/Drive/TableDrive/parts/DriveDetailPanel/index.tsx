import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/_shadcn';
import type { ResourcePermissionModalTarget } from '@/components/Drive/Modals';
import EntryIcon from '@/components/Icons/EntryIcon';
import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  resolveResourceKind,
  resolveResourceViewer,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
import { Button, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { FolderInput, FolderOpen, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isDriveActionTarget,
  isDriveSystemFolderNode,
  type DriveActionTarget,
} from '../../../common/driveComponentModel';
import type { DriveTableRow } from '../../index.type';
import styles from './style.module.less';

interface DriveDetailPanelProps {
  selectedRow?: DriveTableRow;
  isEditMode: boolean;
  selectedCount: number;
  groupId?: string;
  isTrashView: boolean;
  showManagePermission: boolean;
  onActivate: (row: DriveTableRow, viewer?: ResourceViewer) => void;
  onRename: (node: DriveActionTarget) => void;
  onMoveNodes: (nodes: DriveActionTarget[]) => void;
  onDelete: (node: DriveActionTarget) => void;
  onOpenTagAccessPermission: (tagId: string) => void;
  onOpenTagMountPermission: (tagId: string) => void;
  onOpenResourcePermission: (target: ResourcePermissionModalTarget) => void;
}

function DriveDetailPanel({
  selectedRow,
  isEditMode,
  selectedCount,
  groupId,
  isTrashView,
  showManagePermission,
  onActivate,
  onRename,
  onMoveNodes,
  onDelete,
  onOpenTagAccessPermission,
  onOpenTagMountPermission,
  onOpenResourcePermission,
}: DriveDetailPanelProps) {
  const { t } = useTranslation(['drive', 'resource', 'common']);
  const [selectedViewer, setSelectedViewer] = useState<ResourceViewer>(() => {
    if (selectedRow && (selectedRow.node.type === 'resource' || selectedRow.node.type === 'link')) {
      return (
        resolveResourceViewer({ resourceType: selectedRow.node.resourceType }) ??
        RESOURCE_VIEWER.PDF_PREVIEW
      );
    }
    return RESOURCE_VIEWER.PDF_PREVIEW;
  });

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

  const actionTarget = isDriveActionTarget(selectedRow.node) ? selectedRow.node : null;
  const modifiableActionTarget =
    actionTarget && !isDriveSystemFolderNode(actionTarget) ? actionTarget : undefined;
  const activateLabel =
    selectedRow.node.type === 'root' || selectedRow.node.type === 'folder'
      ? t('table.enter')
      : t('table.open');
  const deleteLabel = groupId
    ? t('delete.remove')
    : isTrashView
      ? t('delete.permanent')
      : selectedRow.node.type === 'link'
        ? t('delete.deleteLink')
        : t('delete.moveToTrash');
  const resourceKind =
    selectedRow.node.type === 'resource' || selectedRow.node.type === 'link'
      ? resolveResourceKind(selectedRow.node.resourceType)
      : undefined;
  const isFileResource = resourceKind === RESOURCE_KIND.FILE;
  const permissionTarget =
    showManagePermission &&
    !isTrashView &&
    (actionTarget?.type === 'folder' || actionTarget?.type === 'resource')
      ? actionTarget
      : undefined;

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon} aria-hidden="true">
          <EntryIcon
            entryType={selectedRow.entryType}
            folderIconType={selectedRow.folderIconType}
            resourceType={selectedRow.resourceType}
            resourceIconType={selectedRow.resourceIconType}
          />
        </span>
        <div className={styles.detailTitleBlock}>
          <span className={styles.detailTitle}>{selectedRow.name}</span>
          <span className={styles.detailType}>{selectedRow.typeLabel}</span>
        </div>
      </div>
      <div className={styles.detailBody}>
        <Accordion multiple defaultValue={['details']} className={styles.detailAccordion}>
          <AccordionItem value="details" className={styles.detailSection}>
            <AccordionTrigger className={styles.detailSectionTrigger}>
              {t('table.details')}
            </AccordionTrigger>
            <AccordionContent className={styles.detailSectionContent}>
              <dl className={styles.detailMeta}>
                <div>
                  <dt>{t('table.nodeId')}</dt>
                  <dd>{selectedRow.node.id}</dd>
                </div>
                <div>
                  <dt>{t('table.columns.size')}</dt>
                  <dd>{selectedRow.sizeLabel ?? '—'}</dd>
                </div>
              </dl>
            </AccordionContent>
          </AccordionItem>

          {permissionTarget ? (
            <AccordionItem value="permission" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>
                {t('table.permission')}
              </AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                {permissionTarget.type === 'folder' ? (
                  <div className={styles.detailSectionActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onOpenTagAccessPermission(permissionTarget.tagId)}
                    >
                      <ShieldCheck size={16} aria-hidden="true" />
                      {t('permission.accessPermission', { ns: 'resource' })}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onOpenTagMountPermission(permissionTarget.tagId)}
                    >
                      <FolderInput size={16} aria-hidden="true" />
                      {t('permission.mountPermission', { ns: 'resource' })}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.detailSectionButton}
                    onPress={() =>
                      onOpenResourcePermission({
                        resourceId: permissionTarget.resourceId,
                        resourceType: resolveResourceKind(permissionTarget.resourceType),
                        resourceName: selectedRow.name,
                        fallbackTagId: permissionTarget.folderTagId,
                      })
                    }
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    {t('permission.resourcePermission', { ns: 'resource' })}
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {modifiableActionTarget ? (
            <AccordionItem value="operations" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>
                {t('table.operations')}
              </AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                <div className={styles.detailSectionActions}>
                  {modifiableActionTarget.type !== 'link' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onRename(modifiableActionTarget)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      {t('actions.rename', { ns: 'common' })}
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => onMoveNodes([modifiableActionTarget])}
                  >
                    <FolderInput size={16} aria-hidden="true" />
                    {isTrashView ? t('move.titleToDrive') : t('table.move')}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {isFileResource ? (
            <AccordionItem value="open-with" className={styles.detailSection}>
              <AccordionTrigger className={styles.detailSectionTrigger}>
                {t('table.openWith')}
              </AccordionTrigger>
              <AccordionContent className={styles.detailSectionContent}>
                <ToggleButtonGroup
                  aria-label={t('table.openWith')}
                  selectionMode="single"
                  selectedKeys={new Set([selectedViewer])}
                  onSelectionChange={(keys) => {
                    const [key] = [...keys];
                    if (key != null) setSelectedViewer(String(key) as ResourceViewer);
                  }}
                  orientation="horizontal"
                  size="sm"
                  fullWidth
                  disallowEmptySelection
                  className={styles.openWithOptions}
                >
                  <ToggleButton id={RESOURCE_VIEWER.PDF_PREVIEW}>
                    {t('table.pdfPreview')}
                  </ToggleButton>
                  <ToggleButton id={RESOURCE_VIEWER.OFFICE}>Office</ToggleButton>
                </ToggleButtonGroup>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </div>
      <div className={styles.detailActions}>
        <Button
          variant="primary"
          size="sm"
          onPress={() => onActivate(selectedRow, isFileResource ? selectedViewer : undefined)}
        >
          <FolderOpen size={16} aria-hidden="true" />
          {activateLabel}
        </Button>
        {modifiableActionTarget ? (
          <Button variant="danger" size="sm" onPress={() => onDelete(modifiableActionTarget)}>
            <Trash2 size={16} aria-hidden="true" />
            {deleteLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default DriveDetailPanel;
