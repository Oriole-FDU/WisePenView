import { Label } from '@heroui/react';
import { clsx } from 'clsx';
import { CloudUpload, FolderPlus, Pencil, Plus, SquareMinus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import Dropdown from '@/components/base/Dropdown';
import type {
  DriveActionTarget,
  DriveViewNode,
} from '@/components/business/Drive/common/driveComponentModel';
import {
  getDriveNodeLabel,
  resolveDriveFolderVariant,
} from '@/components/business/Drive/common/driveComponentModel';
import EntryIcon from '@/components/business/Icons/EntryIcon';
import type { FolderNode, RootNode } from '@/domains/Drive';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';

import styles from './style.module.scss';

export type SidebarDriveCreateAction = 'folder' | 'upload';

interface SidebarDriveNodeTitleProps {
  node: DriveViewNode;
  rootDisplayName?: string;
  scopeSwitcher?: ReactNode;
  onCreateNode: (node: RootNode | FolderNode, action: SidebarDriveCreateAction) => void;
  onCollapseAll?: () => void;
  onLoadMoreNode?: () => void;
  onRenameNode: (node: DriveActionTarget) => void;
  onDeleteNode: (node: DriveActionTarget) => void;
}

function stopTreeAction(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function getNodeDisplayName(
  node: DriveViewNode,
  resourceName: string,
  driveName: string,
  unnamedFolder: string,
  loadingLabel: string,
  rootDisplayName?: string
): string {
  if (node.type === 'root') return rootDisplayName || node.name || driveName;
  if (node.type === 'folder') {
    if (node.systemType) return getDriveNodeLabel(node);
    return node.name || unnamedFolder;
  }
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || loadingLabel;
}

function SidebarDriveNodeTitle({
  node,
  rootDisplayName,
  scopeSwitcher,
  onCreateNode,
  onCollapseAll,
  onLoadMoreNode,
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
  const isSystemFolder = node.type === 'folder' && Boolean(node.systemType);
  const canCreateFolder = !isSystemFolder && (node.type === 'root' || node.type === 'folder');
  const canUploadDocument =
    !isSystemFolder && (node.type === 'folder' || (node.type === 'root' && node.canMountResources));
  const canRename = !isSystemFolder && (node.type === 'folder' || node.type === 'resource');
  const canDelete =
    !isSystemFolder && (node.type === 'folder' || node.type === 'resource' || node.type === 'link');
  const label = getNodeDisplayName(
    node,
    resourceName,
    t('drive:node.drive'),
    t('drive:node.unnamedFolder'),
    t('drive:node.loading'),
    rootDisplayName
  );
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const handleCreate = (action: SidebarDriveCreateAction) => {
    setCreateMenuOpen(false);
    if (node.type === 'root' || node.type === 'folder') onCreateNode(node, action);
  };

  if (node.type === 'loading') {
    return (
      <AppPressable
        className={styles.loadMoreNode}
        onClick={(event) => {
          stopTreeAction(event);
          onLoadMoreNode?.();
        }}
      >
        {label}
      </AppPressable>
    );
  }

  return (
    <span className={styles.nodeTitle}>
      <span className={clsx(styles.nodeMain, node.type === 'root' && styles.nodeMainRoot)}>
        <span className={styles.nodeIcon} aria-hidden="true">
          <EntryIcon
            entryType={node.type}
            folderVariant={resolveDriveFolderVariant(node)}
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
            <Dropdown isOpen={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <Dropdown.Trigger
                render={({ disabled, ...triggerProps }) => (
                  <AppIconButton
                    {...triggerProps}
                    isDisabled={disabled}
                    icon={<Plus size={14} aria-hidden="true" />}
                    label={t('drive:sidebar.createIn', { name: label })}
                    size="sm"
                    className={styles.nodeActionBtn}
                    tooltip={{ content: t('drive:create.menu') }}
                  />
                )}
              />
              <Dropdown.Popover className={styles.createMenuPanel} placement="right">
                <Dropdown.Menu
                  aria-label={t('drive:sidebar.createIn', { name: label })}
                  onAction={(key) => handleCreate(String(key) as SidebarDriveCreateAction)}
                >
                  {canUploadDocument ? (
                    <Dropdown.Item id="upload" textValue={t('drive:create.upload')}>
                      <CloudUpload size={15} color="var(--accent)" aria-hidden="true" />
                      <Label>{t('drive:create.upload')}</Label>
                    </Dropdown.Item>
                  ) : null}
                  <Dropdown.Item id="folder" textValue={t('drive:create.folder')}>
                    <FolderPlus size={15} color="var(--accent)" aria-hidden="true" />
                    <Label>{t('drive:create.folder')}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
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
              variant="danger"
              className={clsx(styles.nodeActionBtn, styles.nodeActionBtnDanger)}
              tooltip={{ content: t('common:actions.delete') }}
              onClick={() => onDeleteNode(node)}
            />
          ) : null}
          {node.type === 'root' ? scopeSwitcher : null}
          {node.type === 'root' && onCollapseAll ? (
            <AppIconButton
              icon={<SquareMinus size={14} aria-hidden="true" />}
              label={t('drive:sidebar.collapseAll')}
              size="sm"
              className={styles.nodeActionBtn}
              tooltip={{ content: t('drive:sidebar.collapseAll') }}
              onClick={onCollapseAll}
            />
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export default SidebarDriveNodeTitle;
