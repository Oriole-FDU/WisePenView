import { AppPopover } from '@/components/Overlay';
import { CloudUpload, FileInput, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/Button/AppIconButton';
import type { DriveActionTarget } from '@/components/Drive/common/driveComponentModel';
import EntryIcon from '@/components/Icons/EntryIcon';
import type { DriveNode, FolderNode, RootNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './style.module.less';

export type SidebarDriveCreateAction =
  'folder' | 'note' | 'importNote' | 'drawio' | 'skill' | 'agent' | 'upload';

interface SidebarDriveNodeTitleProps {
  node: DriveNode;
  scopeSwitcher?: ReactNode;
  onCreateNode: (node: RootNode | FolderNode, action: SidebarDriveCreateAction) => void;
  onRenameNode: (node: DriveActionTarget) => void;
  onDeleteNode: (node: DriveActionTarget) => void;
}

function stopTreeAction(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function getNodeDisplayName(
  node: DriveNode,
  resourceName: string,
  driveName: string,
  sharedFolder: string,
  unnamedFolder: string,
  loadingLabel: string
): string {
  if (node.type === 'root') return node.name || driveName;
  if (node.type === 'folder') {
    if (node.systemType === 'shared') return sharedFolder;
    return node.name || unnamedFolder;
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || loadingLabel;
}

function SidebarDriveNodeTitle({
  node,
  scopeSwitcher,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
}: SidebarDriveNodeTitleProps) {
  const { t } = useTranslation(['drive', 'common']);
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(
    resourceId,
    fallbackName,
    t('drive:node.unnamedFile')
  );
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;
  const isSystemFolder = node.type === 'folder' && Boolean(node.systemType);
  const canCreateFolder = !isSystemFolder && (node.type === 'root' || node.type === 'folder');
  const canCreateResource =
    !isSystemFolder && (node.type === 'folder' || (node.type === 'root' && node.canMountResources));
  const canUploadDocument = canCreateResource;
  const canRename = !isSystemFolder && (node.type === 'folder' || node.type === 'resource');
  const canDelete =
    !isSystemFolder && (node.type === 'folder' || node.type === 'resource' || node.type === 'link');
  const label = getNodeDisplayName(
    node,
    resourceName,
    t('drive:node.drive'),
    t('drive:node.shared'),
    t('drive:node.unnamedFolder'),
    t('drive:node.loading')
  );
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const handleCreate = (action: SidebarDriveCreateAction) => {
    setCreateMenuOpen(false);
    if (node.type === 'root' || node.type === 'folder') onCreateNode(node, action);
  };

  return (
    <span className={styles.nodeTitle}>
      <span className={clsx(styles.nodeMain, node.type === 'root' && styles.nodeMainRoot)}>
        <span className={styles.nodeIcon} aria-hidden="true">
          <EntryIcon
            entryType={node.type}
            folderIconType={folderIconType}
            resourceType={resourceType}
            resourceIconType={resourceIconType}
            size={16}
          />
        </span>
        <span className={styles.nodeLabel} title={label}>
          {label}
        </span>
      </span>
      {canCreateFolder || canDelete ? (
        <span
          className={clsx(styles.nodeActions, node.type === 'root' && styles.nodeActionsPinned)}
          onClick={stopTreeAction}
          onKeyDown={stopTreeAction}
        >
          {canCreateFolder ? (
            <AppPopover isOpen={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <AppIconButton
                icon={<Plus size={14} aria-hidden="true" />}
                label={t('drive:sidebar.createIn', { name: label })}
                size="sm"
                className={styles.nodeActionBtn}
                tooltip={{ content: t('drive:create.menu') }}
                overlayTrigger={<AppPopover.Trigger />}
              />
              <AppPopover.Content placement="right">
                <div
                  className={styles.createMenuPanel}
                  onClick={stopTreeAction}
                  onKeyDown={stopTreeAction}
                >
                  <button
                    type="button"
                    className={styles.createMenuItem}
                    onClick={() => handleCreate('folder')}
                  >
                    <FolderPlus size={15} color="var(--primary)" aria-hidden="true" />
                    <span>{t('drive:create.folder')}</span>
                  </button>
                  {canCreateResource ? (
                    <>
                      <button
                        type="button"
                        className={styles.createMenuItem}
                        onClick={() => handleCreate('note')}
                      >
                        <EntryIcon
                          entryType="resource"
                          resourceIconType="note"
                          size={15}
                          color="var(--primary)"
                        />
                        <span>{t('drive:create.note')}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.createMenuItem}
                        onClick={() => handleCreate('importNote')}
                      >
                        <FileInput size={15} color="var(--primary)" aria-hidden="true" />
                        <span>{t('drive:create.importNote')}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.createMenuItem}
                        onClick={() => handleCreate('drawio')}
                      >
                        <EntryIcon
                          entryType="resource"
                          resourceIconType="drawio"
                          size={15}
                          color="var(--primary)"
                        />
                        <span>{t('drive:create.drawio')}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.createMenuItem}
                        onClick={() => handleCreate('skill')}
                      >
                        <EntryIcon
                          entryType="resource"
                          resourceIconType="skill"
                          size={15}
                          color="var(--primary)"
                        />
                        <span>{t('drive:create.skill')}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.createMenuItem}
                        onClick={() => handleCreate('agent')}
                      >
                        <EntryIcon entryType="resource" resourceIconType="agent" size={15} />
                        <span>{t('drive:create.agent')}</span>
                      </button>
                      {canUploadDocument ? (
                        <button
                          type="button"
                          className={styles.createMenuItem}
                          onClick={() => handleCreate('upload')}
                        >
                          <CloudUpload size={15} color="var(--primary)" aria-hidden="true" />
                          <span>{t('drive:create.upload')}</span>
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </AppPopover.Content>
            </AppPopover>
          ) : null}
          {canRename ? (
            <AppIconButton
              icon={<Pencil size={14} aria-hidden="true" />}
              label={t('drive:sidebar.renameNode', { name: label })}
              size="sm"
              className={styles.nodeActionBtn}
              tooltip={{ content: t('common:actions.rename') }}
              onClick={() => onRenameNode(node)}
            />
          ) : null}
          {canDelete ? (
            <AppIconButton
              icon={<Trash2 size={14} aria-hidden="true" />}
              label={t('drive:sidebar.deleteNode', { name: label })}
              size="sm"
              className={styles.nodeActionBtn}
              tooltip={{ content: t('common:actions.delete') }}
              onClick={() => onDeleteNode(node)}
            />
          ) : null}
          {node.type === 'root' ? scopeSwitcher : null}
        </span>
      ) : null}
    </span>
  );
}

export default SidebarDriveNodeTitle;
