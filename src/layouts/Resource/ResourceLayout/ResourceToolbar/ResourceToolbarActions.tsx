import { Label } from '@heroui/react';
import {
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  FileText,
  FolderInput,
  Link2,
  type LucideIcon,
  MessageSquare,
  Printer,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import Dropdown from '@/components/base/Dropdown';
import { GuideAnchor, registerGuideActionHandler } from '@/components/base/Guide';
import type { EditorResourcePresentation } from '@/components/editors/editor.type';
import { GUIDE_ACTION_ID, GUIDE_TOOL_ID } from '@/constants/tour';
import type {
  ResourceAction,
  ResourceItem,
  ResourcePermissionResourceType,
} from '@/domains/Resource';

import ResourceToolbarOperations, {
  type ResourceToolbarOperationHandlers,
} from './ResourceToolbarOperations';
import styles from './style.module.scss';

interface ResourceToolbarMenuItemContentProps {
  icon: LucideIcon;
  label: string;
  trailing?: ReactNode;
}

function ResourceToolbarMenuItemContent({
  icon: Icon,
  label,
  trailing,
}: ResourceToolbarMenuItemContentProps) {
  return (
    <>
      <Icon size={16} aria-hidden="true" />
      <Label>{label}</Label>
      {trailing}
    </>
  );
}

function ResourceToolbarMore({
  menu,
  operations,
  canManagePermission,
  isDisabled,
  onOpenPermission,
}: {
  menu?: EditorResourcePresentation['moreMenu'];
  operations: ResourceToolbarOperationHandlers;
  canManagePermission: boolean;
  isDisabled?: boolean;
  onOpenPermission: () => void;
}) {
  const { t } = useTranslation('resource');
  const [open, setOpen] = useState(false);
  const isMenuPending = Boolean(menu?.isPending);
  const isPending = isMenuPending || operations.isLocating;

  /**
   * @wisepen-manual-effect
   * 执行时机：资源更多菜单挂载或展开状态变化时注册引导动作。
   * 不可替代原因：引导层直接修改菜单 open 状态，不能依赖对触发按钮的模拟点击。
   * cleanup：撤销动作处理器。
   */
  useEffect(
    () =>
      registerGuideActionHandler(GUIDE_ACTION_ID.openResourceMenu, {
        isOpen: () => open,
        open: () => setOpen(true),
        close: () => setOpen(false),
      }),
    [open]
  );
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
      return;
    }
    if (key === 'download-docx') {
      menu?.downloadDocx?.onAction();
      return;
    }
    if (key === 'search') {
      menu?.onSearch?.();
      return;
    }

    menu?.actions?.find((action) => action.id === key)?.onAction();
  };

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        isDisabled={isDisabled || isMenuPending}
        render={({ disabled, ...triggerProps }) => (
          <GuideAnchor id={GUIDE_TOOL_ID.noteMore}>
            <AppIconButton
              {...triggerProps}
              isDisabled={disabled}
              icon={<Ellipsis className={styles.moreIcon} size={22} aria-hidden="true" />}
              label={t('header.more')}
              size="sm"
              aria-busy={isPending || undefined}
            />
          </GuideAnchor>
        )}
      />
      <GuideAnchor id={GUIDE_TOOL_ID.noteMoreOpen} asChild>
        <Dropdown.Popover placement="bottom end" className={styles.popover}>
          <Dropdown.Menu aria-label={t('header.menuAria')} onAction={handleAction}>
            {operations.onOpenOriginal ? (
              <Dropdown.Section>
                <Dropdown.Item id="open-original" textValue={t('header.openOriginal')}>
                  <ResourceToolbarMenuItemContent
                    icon={ExternalLink}
                    label={t('header.openOriginal')}
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
            {operations.onCopy ? (
              <Dropdown.Section>
                <Dropdown.Item id="create-copy" textValue={t('header.createCopy')}>
                  <ResourceToolbarMenuItemContent icon={Copy} label={t('header.createCopy')} />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
            {operations.onCreateLink || operations.onMove || operations.onShare ? (
              <Dropdown.Section>
                {operations.onCreateLink ? (
                  <Dropdown.Item id="add-link" textValue={t('header.addLink')}>
                    <ResourceToolbarMenuItemContent icon={Link2} label={t('header.addLink')} />
                  </Dropdown.Item>
                ) : null}
                {operations.onMove ? (
                  <Dropdown.Item id="move-to" textValue={t('header.moveTo')}>
                    <ResourceToolbarMenuItemContent icon={FolderInput} label={t('header.moveTo')} />
                  </Dropdown.Item>
                ) : null}
                {operations.onShare ? (
                  <Dropdown.Item id="share-to" textValue={t('header.shareToGroup')}>
                    <ResourceToolbarMenuItemContent
                      icon={Share2}
                      label={t('header.shareToGroup')}
                    />
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Section>
            ) : null}
            {canManagePermission ? (
              <Dropdown.Section>
                <Dropdown.Item id="permission" textValue={t('header.permission')}>
                  <ResourceToolbarMenuItemContent
                    icon={ShieldCheck}
                    label={t('header.permission')}
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
            {menu?.showInlineCommentHistory ? (
              <Dropdown.Section>
                <Dropdown.Item
                  id="comment-history"
                  textValue={t('header.inlineCommentHistory')}
                  isDisabled={!menu.onInlineCommentHistory}
                >
                  <ResourceToolbarMenuItemContent
                    icon={MessageSquare}
                    label={t('header.inlineCommentHistory')}
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
            {menu?.onSearch ? (
              <Dropdown.Section>
                <Dropdown.Item id="search" textValue={t('header.fullTextSearch')}>
                  <ResourceToolbarMenuItemContent
                    icon={Search}
                    label={t('header.fullTextSearch')}
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
            {menu?.actions?.length ? (
              <Dropdown.Section>
                {menu.actions.map((action) => (
                  <Dropdown.Item key={action.id} id={action.id} textValue={action.label}>
                    <ResourceToolbarMenuItemContent icon={action.icon} label={action.label} />
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            ) : null}
            {menu?.onPrint || menu?.download || menu?.downloadDocx ? (
              <Dropdown.Section>
                {menu.onPrint ? (
                  <Dropdown.Item
                    id="print"
                    textValue={menu.printLabel ?? t('header.print')}
                    data-guide-tool-id={GUIDE_TOOL_ID.notePrintPdf}
                  >
                    <ResourceToolbarMenuItemContent
                      icon={menu.printIcon ?? Printer}
                      label={menu.printLabel ?? t('header.print')}
                    />
                  </Dropdown.Item>
                ) : null}
                {menu.download ? (
                  <Dropdown.Item
                    id="download"
                    textValue={menu.download.label}
                    data-guide-tool-id={GUIDE_TOOL_ID.noteDownloadMarkdown}
                  >
                    <ResourceToolbarMenuItemContent icon={Download} label={menu.download.label} />
                  </Dropdown.Item>
                ) : null}
                {menu.downloadDocx ? (
                  <Dropdown.Item
                    id="download-docx"
                    textValue={menu.downloadDocx.label}
                    data-guide-tool-id={GUIDE_TOOL_ID.noteDownloadDocx}
                  >
                    <ResourceToolbarMenuItemContent
                      icon={FileText}
                      label={menu.downloadDocx.label}
                    />
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Section>
            ) : null}
            {menu?.advanced ? (
              <Dropdown.Section>
                <Dropdown.SubmenuTrigger>
                  <Dropdown.Item id="advanced" textValue={t('header.advanced')}>
                    <ResourceToolbarMenuItemContent
                      icon={Settings2}
                      label={t('header.advanced')}
                      trailing={<Dropdown.SubmenuIndicator />}
                    />
                  </Dropdown.Item>
                  <Dropdown.Popover
                    placement="right top"
                    className={`${styles.popover} ${styles.advancedPopover}`}
                  >
                    <div className={styles.advancedPanel}>{menu.advanced}</div>
                  </Dropdown.Popover>
                </Dropdown.SubmenuTrigger>
              </Dropdown.Section>
            ) : null}
            {operations.onDelete ? (
              <Dropdown.Section>
                <Dropdown.Item
                  id="delete"
                  textValue={operations.deleteLabel ?? t('header.deleteFile')}
                  variant="danger"
                >
                  <ResourceToolbarMenuItemContent
                    icon={Trash2}
                    label={operations.deleteLabel ?? t('header.deleteFile')}
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </GuideAnchor>
    </Dropdown>
  );
}

export interface ResourceToolbarActionsProps {
  resourceId?: string;
  resourceName: string;
  resourceType?: string;
  permissionResourceType: ResourcePermissionResourceType;
  resourceInfo?: ResourceItem;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  moreMenu?: EditorResourcePresentation['moreMenu'];
  isDisabled?: boolean;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  trailingActions?: ReactNode;
  canManagePermission: boolean;
  onOpenPermission: () => void;
}

/** 资源工具栏动作区：编辑器提供的动作节点、资源管理菜单与右侧栏动作都走这里。 */
export default function ResourceToolbarActions({
  resourceId,
  resourceName,
  resourceType,
  permissionResourceType,
  resourceInfo,
  currentActions,
  copyVersion,
  moreMenu,
  isDisabled,
  leadingActions,
  actions,
  trailingActions,
  canManagePermission,
  onOpenPermission,
}: ResourceToolbarActionsProps) {
  return (
    <div className={styles.actions}>
      {leadingActions ? <div className={styles.actionGroup}>{leadingActions}</div> : null}
      {actions ? <div className={styles.actionGroup}>{actions}</div> : null}
      {resourceId || trailingActions ? (
        <div className={styles.actionGroup}>
          {resourceId ? (
            <ResourceToolbarOperations
              resourceId={resourceId}
              resourceName={resourceName}
              resourceType={resourceType ?? permissionResourceType}
              resourceInfo={resourceInfo}
              currentActions={currentActions}
              copyVersion={copyVersion}
              onResolve={(operations: ResourceToolbarOperationHandlers) => (
                <ResourceToolbarMore
                  menu={moreMenu}
                  operations={operations}
                  canManagePermission={canManagePermission}
                  isDisabled={isDisabled}
                  onOpenPermission={onOpenPermission}
                />
              )}
            />
          ) : null}
          {trailingActions}
        </div>
      ) : null}
    </div>
  );
}
