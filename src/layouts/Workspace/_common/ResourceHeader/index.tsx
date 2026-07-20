import EntryIcon from '@/components/Icons/EntryIcon';
import ResourcePermissionModal from '@/components/Resource/ResourcePermissionModal';
import { useUserService } from '@/domains';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { Button, Dropdown, Tooltip } from '@heroui/react';
import { useRequest } from 'ahooks';
import {
  ChevronRight,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  FolderInput,
  HardDrive,
  Link2,
  MessageSquare,
  Printer,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import ResourceHeaderOperations, {
  type ResourceHeaderOperationHandlers,
} from './ResourceHeaderOperations';
import type { ResourceHeaderMoreMenu, ResourceHeaderProps } from './index.type';
import styles from './style.module.less';

interface ResourceHeaderMenuItemContentProps {
  icon: LucideIcon;
  label: string;
  trailing?: ReactNode;
}

function ResourceHeaderMenuItemContent({
  icon: Icon,
  label,
  trailing,
}: ResourceHeaderMenuItemContentProps) {
  return (
    <span className={styles.menuItemContent}>
      <Icon className={styles.menuItemIcon} size={16} aria-hidden="true" />
      <span className={styles.menuItemLabel} data-slot="label">
        {label}
      </span>
      {trailing ? <span className={styles.menuItemTrailing}>{trailing}</span> : null}
    </span>
  );
}

function ResourceHeaderMore({
  menu,
  operations,
  canManagePermission,
  isDisabled,
  onOpenPermission,
}: {
  menu?: ResourceHeaderMoreMenu;
  operations: ResourceHeaderOperationHandlers;
  canManagePermission: boolean;
  isDisabled?: boolean;
  onOpenPermission: () => void;
}) {
  const handleAction = (key: React.Key) => {
    if (key === 'permission') {
      onOpenPermission();
      return;
    }
    if (key === 'create-copy') {
      operations.onCopy?.();
      return;
    }
    if (key === 'add-link') {
      operations.onCreateLink?.();
      return;
    }
    if (key === 'move-to') {
      operations.onMove?.();
      return;
    }
    if (key === 'share-to') {
      operations.onShare?.();
      return;
    }
    if (key === 'open-original') {
      operations.onOpenOriginal?.();
      return;
    }
    if (key === 'delete') {
      operations.onDelete?.();
      return;
    }
    if (key === 'comment-history') {
      menu?.onInlineCommentHistory?.();
      return;
    }
    if (key === 'print') {
      menu?.onPrint?.();
      return;
    }
    if (key === 'download') {
      menu?.download?.onAction();
    }
    if (key === 'search') {
      menu?.onSearch?.();
    }
  };

  return (
    <Dropdown>
      <Tooltip>
        <Tooltip.Trigger>
          <Dropdown.Trigger>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              isPending={menu?.isPending || operations.isLocating}
              isDisabled={isDisabled}
              aria-label="更多"
            >
              <Ellipsis size={18} aria-hidden="true" />
            </Button>
          </Dropdown.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>更多</Tooltip.Content>
      </Tooltip>
      <Dropdown.Popover placement="bottom end" className={styles.popover}>
        <div className={styles.popoverHeader}>更多操作</div>
        <Dropdown.Menu aria-label="资源更多操作" onAction={handleAction}>
          {operations.onOpenOriginal ? (
            <Dropdown.Section>
              <Dropdown.Item id="open-original" textValue="打开文件本体">
                <ResourceHeaderMenuItemContent icon={ExternalLink} label="打开文件本体" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          {operations.onCopy ? (
            <Dropdown.Section>
              <Dropdown.Item id="create-copy" textValue="创建副本">
                <ResourceHeaderMenuItemContent icon={Copy} label="创建副本" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          {operations.onCreateLink || operations.onMove || operations.onShare ? (
            <Dropdown.Section>
              {operations.onCreateLink ? (
                <Dropdown.Item id="add-link" textValue="添加链接到">
                  <ResourceHeaderMenuItemContent icon={Link2} label="添加链接到" />
                </Dropdown.Item>
              ) : null}
              {operations.onMove ? (
                <Dropdown.Item id="move-to" textValue="移动到">
                  <ResourceHeaderMenuItemContent icon={FolderInput} label="移动到" />
                </Dropdown.Item>
              ) : null}
              {operations.onShare ? (
                <Dropdown.Item id="share-to" textValue="分享到小组">
                  <ResourceHeaderMenuItemContent icon={Share2} label="分享到小组" />
                </Dropdown.Item>
              ) : null}
            </Dropdown.Section>
          ) : null}
          {canManagePermission ? (
            <Dropdown.Section>
              <Dropdown.Item id="permission" textValue="权限">
                <ResourceHeaderMenuItemContent icon={ShieldCheck} label="权限" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          {menu?.showInlineCommentHistory ? (
            <Dropdown.Section>
              <Dropdown.Item
                id="comment-history"
                textValue="历史批注"
                isDisabled={!menu.onInlineCommentHistory}
              >
                <ResourceHeaderMenuItemContent icon={MessageSquare} label="历史批注" />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
          {menu?.onSearch || menu?.searchPopover ? (
            <Dropdown.Section>
              {menu.searchPopover ? (
                <Dropdown.SubmenuTrigger>
                  <Dropdown.Item id="search" textValue="全文搜索">
                    <ResourceHeaderMenuItemContent
                      icon={Search}
                      label="全文搜索"
                      trailing={<Dropdown.SubmenuIndicator />}
                    />
                  </Dropdown.Item>
                  <Dropdown.Popover
                    placement="right top"
                    className={`${styles.popover} ${styles.searchPopover}`}
                  >
                    {menu.searchPopover}
                  </Dropdown.Popover>
                </Dropdown.SubmenuTrigger>
              ) : (
                <Dropdown.Item id="search" textValue="全文搜索">
                  <ResourceHeaderMenuItemContent icon={Search} label="全文搜索" />
                </Dropdown.Item>
              )}
            </Dropdown.Section>
          ) : null}
          {menu?.onPrint || menu?.download ? (
            <Dropdown.Section>
              {menu.onPrint ? (
                <Dropdown.Item id="print" textValue="打印">
                  <ResourceHeaderMenuItemContent icon={Printer} label="打印" />
                </Dropdown.Item>
              ) : null}
              {menu.download ? (
                <Dropdown.Item id="download" textValue={menu.download.label}>
                  <ResourceHeaderMenuItemContent icon={Download} label={menu.download.label} />
                </Dropdown.Item>
              ) : null}
            </Dropdown.Section>
          ) : null}
          {menu?.advanced ? (
            <Dropdown.Section>
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="advanced" textValue="高级">
                  <ResourceHeaderMenuItemContent
                    icon={Settings2}
                    label="高级"
                    trailing={<Dropdown.SubmenuIndicator />}
                  />
                </Dropdown.Item>
                <Dropdown.Popover
                  placement="right top"
                  className={`${styles.popover} ${styles.advancedPopover}`}
                >
                  <div className={styles.advancedPanel}>
                    <div className={styles.popoverHeader}>高级设置</div>
                    {menu.advanced}
                  </div>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            </Dropdown.Section>
          ) : null}
          {operations.onDelete ? (
            <Dropdown.Section>
              <Dropdown.Item
                id="delete"
                textValue={operations.deleteLabel ?? '删除文件'}
                variant="danger"
              >
                <ResourceHeaderMenuItemContent
                  icon={Trash2}
                  label={operations.deleteLabel ?? '删除文件'}
                />
              </Dropdown.Item>
            </Dropdown.Section>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function ResourceHeader({
  resourceId,
  resourceName,
  resourceType,
  resourceIconType,
  currentActions,
  copyVersion,
  permissionResourceType,
  ownerId,
  onPermissionSuccess,
  isDisabled,
  titleMeta,
  breadcrumbItems,
  onBreadcrumbNavigate,
  leadingActions,
  actions,
  moreMenu,
  hideBreadcrumb,
}: ResourceHeaderProps) {
  const userService = useUserService();
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const normalizedOwnerId = normalizeId(ownerId);
  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(resourceId && normalizedOwnerId),
    refreshDeps: [resourceId, normalizedOwnerId],
  });
  const canManagePermission = Boolean(
    resourceId && normalizedOwnerId && currentUser?.id === normalizedOwnerId
  );
  return (
    <>
      <div className={styles.root}>
        <div className={styles.title}>
          {!hideBreadcrumb ? (
            <nav className={styles.breadcrumb} aria-label="资源路径">
              {breadcrumbItems.map((item, index) => (
                <span key={item.nodeId} className={styles.breadcrumbSegment}>
                  <button
                    type="button"
                    className={styles.breadcrumbButton}
                    onClick={() => onBreadcrumbNavigate(item.nodeId)}
                  >
                    {index === 0 ? (
                      <HardDrive
                        className={styles.breadcrumbIcon}
                        size={14}
                        aria-hidden
                        color="var(--accent)"
                      />
                    ) : null}
                    {item.label}
                  </button>
                  <ChevronRight className={styles.breadcrumbSeparator} size={14} aria-hidden />
                </span>
              ))}
              <span className={styles.breadcrumbCurrent} aria-current="page">
                <span className={styles.titleIcon} aria-hidden="true">
                  <EntryIcon
                    entryType="resource"
                    resourceType={resourceType}
                    resourceName={resourceName}
                    resourceIconType={resourceIconType}
                  />
                </span>
                <span className={styles.titleText}>{resourceName}</span>
              </span>
            </nav>
          ) : (
            <span className={styles.breadcrumbCurrent} aria-current="page">
              <span className={styles.titleIcon} aria-hidden="true">
                <EntryIcon
                  entryType="resource"
                  resourceType={resourceType}
                  resourceName={resourceName}
                  resourceIconType={resourceIconType}
                />
              </span>
              <span className={styles.titleText}>{resourceName}</span>
            </span>
          )}
          {titleMeta ? <span className={styles.titleMeta}>{titleMeta}</span> : null}
        </div>
        <div className={styles.actions}>
          {leadingActions}
          {actions}
          {resourceId ? (
            <ResourceHeaderOperations
              resourceId={resourceId}
              resourceName={resourceName}
              resourceType={resourceType ?? permissionResourceType}
              currentActions={currentActions}
              copyVersion={copyVersion}
              onResolve={(operations) => (
                <ResourceHeaderMore
                  menu={moreMenu}
                  operations={operations}
                  canManagePermission={canManagePermission}
                  isDisabled={isDisabled}
                  onOpenPermission={() => setIsPermissionModalOpen(true)}
                />
              )}
            />
          ) : null}
        </div>
      </div>
      {resourceId && canManagePermission ? (
        <ResourcePermissionModal
          isOpen={isPermissionModalOpen}
          onOpenChange={setIsPermissionModalOpen}
          resourceId={resourceId}
          resourceType={permissionResourceType}
          onSuccess={onPermissionSuccess}
        />
      ) : null}
    </>
  );
}

export default ResourceHeader;
