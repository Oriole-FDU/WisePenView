import { Popover } from '@/components/Overlay';
import { Tooltip } from '@heroui/react';
import { CloudUpload, FileInput, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';

import { ROOT_DISPLAY } from '@/components/Drive/common/constants';
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

function getNodeDisplayName(node: DriveNode, resourceName: string): string {
  if (node.type === 'root') return node.name || ROOT_DISPLAY;
  if (node.type === 'folder') return node.name || ROOT_DISPLAY;
  if (node.type === 'resource' || node.type === 'link') return resourceName;
  return node.label || '正在加载...';
}

function SidebarDriveNodeTitle({
  node,
  scopeSwitcher,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
}: SidebarDriveNodeTitleProps) {
  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const fallbackName = node.type === 'resource' || node.type === 'link' ? node.title : undefined;
  const resourceName = useResourceDisplayName(resourceId, fallbackName, '未命名文件');
  const resourceType =
    node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;
  const canCreateFolder = node.type === 'root' || node.type === 'folder';
  const canCreateResource =
    node.type === 'folder' || (node.type === 'root' && node.canMountResources);
  const isSystemFolder = node.type === 'folder' && Boolean(node.systemType);
  const canRename = !isSystemFolder && (node.type === 'folder' || node.type === 'resource');
  const canDelete =
    !isSystemFolder && (node.type === 'folder' || node.type === 'resource' || node.type === 'link');
  const label = getNodeDisplayName(node, resourceName);
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
            resourceName={label}
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
            <Popover isOpen={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <Tooltip>
                <Tooltip.Trigger>
                  <Popover.Trigger>
                    <button
                      type="button"
                      className={styles.nodeActionBtn}
                      aria-label={`在${label}中新建`}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content>新建</Tooltip.Content>
              </Tooltip>
              <Popover.Content className={styles.createPopover} placement="right">
                <Popover.Dialog>
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
                      <span>新建文件夹</span>
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
                          <span>新建笔记</span>
                        </button>
                        <button
                          type="button"
                          className={styles.createMenuItem}
                          onClick={() => handleCreate('importNote')}
                        >
                          <FileInput size={15} color="var(--primary)" aria-hidden="true" />
                          <span>导入笔记</span>
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
                          <span>新建图表</span>
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
                          <span>新建 Skill</span>
                        </button>
                        <button
                          type="button"
                          className={styles.createMenuItem}
                          onClick={() => handleCreate('agent')}
                        >
                          <EntryIcon entryType="resource" resourceIconType="agent" size={15} />
                          <span>新建 Agent</span>
                        </button>
                        <button
                          type="button"
                          className={styles.createMenuItem}
                          onClick={() => handleCreate('upload')}
                        >
                          <CloudUpload size={15} color="var(--primary)" aria-hidden="true" />
                          <span>上传文件</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          ) : null}
          {canRename ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.nodeActionBtn}
                  aria-label={`重命名${label}`}
                  onClick={() => onRenameNode(node)}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>重命名</Tooltip.Content>
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Tooltip>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className={styles.nodeActionBtn}
                  aria-label={`删除${label}`}
                  onClick={() => onDeleteNode(node)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content>删除</Tooltip.Content>
            </Tooltip>
          ) : null}
          {node.type === 'root' ? scopeSwitcher : null}
        </span>
      ) : null}
    </span>
  );
}

export default SidebarDriveNodeTitle;
