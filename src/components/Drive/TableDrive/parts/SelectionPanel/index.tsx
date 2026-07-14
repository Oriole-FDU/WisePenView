import {
  isDriveActionTarget,
  isDriveSystemFolderNode,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import {
  buildResourceOverrideActions,
  getResourcePermissionPresetActions,
  getResourcePermissionPresetOption,
  resolveResourcePermissionPolicy,
  resolveTagInheritedResourceActions,
  RESOURCE_PERMISSION_PRESET_KEYS,
  RESOURCE_PERMISSION_PRESETS,
  type ResourcePermissionPresetKey,
} from '@/components/Drive/common/resourcePermissionPolicy';
import {
  getTagMountPermissionPresetOption,
  getTagPermissionPresetOption,
  resolveTagMountPermissionPresetKeyFromTag,
  resolveTagPermissionPresetKeyFromTag,
  TAG_PERMISSION_PRESETS,
} from '@/components/Drive/common/tagPermissionPreset';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useResourceService, useTagService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import type {
  ResourceAction,
  ResourcePermissionOverview,
  ResourcePermissionResourceType,
} from '@/domains/Resource';
import {
  ACCESS_CONTROL_SCOPE,
  getTagPermissionPresetValues,
  type TagMountPermissionPresetKey,
  type TagPermissionPresetKey,
  type TagTreeNode,
} from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { resolveResourceKind } from '@/utils/navigation/resourceTarget';
import { Button, ListBox, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FolderInput, Pencil, Settings, ShieldCheck } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { TableDriveSelectionPanelProps } from './index.type';
import NodeInfoSection from './parts/NodeInfoSection';
import styles from './style.module.less';

const EMPTY_HINT = '选中左侧文件或文件夹以查看详情';
const TAG_ACCESS_PERMISSION_SIDEBAR_OPTIONS = TAG_PERMISSION_PRESETS;

const formatTagMountPermissionSummary = (
  presetKey: TagMountPermissionPresetKey,
  presetOption: ReturnType<typeof getTagMountPermissionPresetOption>,
  tag: TagTreeNode | undefined
): string => {
  if (presetKey !== 'advanced') {
    return `${presetOption.label}：${presetOption.description}`;
  }
  const scope =
    tag?.tagMountPermissionScope === ACCESS_CONTROL_SCOPE.BLACKLIST ? '黑名单' : '白名单';
  const count = tag?.tagMountSpecifiedUsers?.length ?? 0;
  return `${presetOption.label}：${scope} ${count} 人`;
};

interface ResourcePermissionPanelData {
  overview: ResourcePermissionOverview;
  inheritedActions: ResourceAction[];
}

function toActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function TableDriveSelectionPanel({
  selectedRow,
  selectedCount = 0,
  groupId,
  isTrashView = false,
  canManageTagPermission = false,
  tagPermissionRefreshToken,
  resourcePermissionRefreshToken,
  onEnter,
  onOpen,
  onRename,
  onMove,
  onDelete,
  onManageTagAccessPermission,
  onManageTagMountPermission,
  onManageResourcePermission,
  onTagPermissionChange,
}: TableDriveSelectionPanelProps) {
  const tagService = useTagService();
  const resourceService = useResourceService();
  const savingPresetKeyRef = useRef<TagPermissionPresetKey | null>(null);
  const savingResourcePresetKeyRef = useRef<ResourcePermissionPresetKey | null>(null);
  const [optimisticPresetSelection, setOptimisticPresetSelection] = useState<{
    tagId: string;
    key: TagPermissionPresetKey;
    refreshToken: number;
  } | null>(null);
  const [optimisticResourcePresetSelection, setOptimisticResourcePresetSelection] = useState<{
    resourceId: string;
    key: ResourcePermissionPresetKey;
    refreshToken: number;
  } | null>(null);

  const node = selectedRow?.node;
  const actionTarget = useMemo(() => (node ? toActionTarget(node) : null), [node]);
  const isFolder = node?.type === 'folder';
  const isFile = node?.type === 'resource' || node?.type === 'link';
  const canModifyActionTarget = actionTarget != null && !isDriveSystemFolderNode(actionTarget);
  const canRename =
    actionTarget != null && !isDriveSystemFolderNode(actionTarget) && actionTarget.type !== 'link';
  const deleteActionLabel = groupId ? '移除' : isTrashView ? '彻底删除' : '删除';
  const moveActionLabel = isTrashView ? '移动到云盘' : '移动';
  const folderTagId = node?.type === 'folder' ? node.tagId : undefined;
  const resourceId = node?.type === 'resource' ? node.resourceId : undefined;
  const resourceFallbackTagId = node?.type === 'resource' ? node.folderTagId : undefined;
  const resourcePermissionResourceType = useMemo<ResourcePermissionResourceType | undefined>(() => {
    if (node?.type !== 'resource') return undefined;
    return resolveResourceKind({
      resourceType: node.resourceType,
      resourceName: selectedRow?.name,
    }) as ResourcePermissionResourceType;
  }, [node, selectedRow?.name]);
  const canShowTagPermission = Boolean(
    canManageTagPermission && groupId && folderTagId && selectedCount <= 1
  );
  const canShowResourcePermission = Boolean(
    canManageTagPermission &&
    groupId &&
    resourceId &&
    resourcePermissionResourceType &&
    selectedCount <= 1
  );
  const {
    data: selectedTag,
    loading: tagPermissionLoading,
    mutate: mutateSelectedTag,
  } = useRequest(
    async (): Promise<TagTreeNode | undefined> => {
      if (!folderTagId || !groupId) return undefined;
      let tag = tagService.getRawTagById(folderTagId, groupId);
      if (!tag) {
        await tagService.getRawTagTree(groupId);
        tag = tagService.getRawTagById(folderTagId, groupId);
      }
      return tag;
    },
    {
      ready: canShowTagPermission,
      refreshDeps: [folderTagId, groupId, tagPermissionRefreshToken],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );
  const {
    data: resourcePermissionData,
    loading: resourcePermissionLoading,
    error: resourcePermissionError,
    refresh: refreshResourcePermission,
  } = useRequest(
    async (): Promise<ResourcePermissionPanelData | undefined> => {
      if (!resourceId || !resourcePermissionResourceType || !groupId) return undefined;

      const overview = await resourceService.getResourcePermissionOverview({
        resourceId,
        resourceType: resourcePermissionResourceType,
      });
      const initialPolicy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: resourceFallbackTagId,
        resourceType: resourcePermissionResourceType,
      });
      const tagId = initialPolicy.primaryTagId ?? resourceFallbackTagId;
      let inheritedActions = initialPolicy.inheritedActions;

      if (tagId) {
        let tag = tagService.getRawTagById(tagId, groupId);
        if (!tag) {
          await tagService.getRawTagTree(groupId);
          tag = tagService.getRawTagById(tagId, groupId);
        }
        inheritedActions = resolveTagInheritedResourceActions(tag, overview.supportedActions);
      }

      return { overview, inheritedActions };
    },
    {
      ready: canShowResourcePermission,
      refreshDeps: [
        resourceId,
        resourcePermissionResourceType,
        resourceFallbackTagId,
        groupId,
        resourcePermissionRefreshToken,
      ],
      onSuccess: () => {
        setOptimisticResourcePresetSelection(null);
      },
      onError: (err) => {
        setOptimisticResourcePresetSelection(null);
        toast.danger(parseErrorMessage(err));
      },
    }
  );
  const resolvedPresetKey = resolveTagPermissionPresetKeyFromTag(selectedTag);
  const resolvedMountPresetKey = resolveTagMountPermissionPresetKeyFromTag(selectedTag);
  const optimisticSelection = optimisticPresetSelection;
  const optimisticPresetKey =
    optimisticSelection &&
    optimisticSelection.tagId === folderTagId &&
    optimisticSelection.refreshToken === (tagPermissionRefreshToken ?? 0)
      ? optimisticSelection.key
      : undefined;
  const selectedPresetKey = optimisticPresetKey ?? resolvedPresetKey;
  const selectedPresetOption = getTagPermissionPresetOption(selectedPresetKey);
  const selectedPresetListKeys = new Set([selectedPresetKey]);
  const selectedMountPresetKey = resolvedMountPresetKey;
  const selectedMountPresetOption = getTagMountPermissionPresetOption(selectedMountPresetKey);
  const selectedMountPresetSummary = formatTagMountPermissionSummary(
    selectedMountPresetKey,
    selectedMountPresetOption,
    selectedTag
  );
  const resourcePermissionPolicy = resolveResourcePermissionPolicy({
    overview: resourcePermissionData?.overview,
    groupId,
    fallbackTagId: resourceFallbackTagId,
    inheritedActions: resourcePermissionData?.inheritedActions,
    resourceType: resourcePermissionResourceType,
  });
  const optimisticResourceSelection = optimisticResourcePresetSelection;
  const optimisticResourcePresetKey =
    optimisticResourceSelection &&
    optimisticResourceSelection.resourceId === resourceId &&
    optimisticResourceSelection.refreshToken === (resourcePermissionRefreshToken ?? 0)
      ? optimisticResourceSelection.key
      : undefined;
  const selectedResourcePresetKey =
    optimisticResourcePresetKey ?? resourcePermissionPolicy.selectedKey;
  const selectedResourcePresetOption = getResourcePermissionPresetOption(selectedResourcePresetKey);
  const selectedResourcePresetListKeys = new Set([selectedResourcePresetKey]);
  const disabledResourcePresetKeys =
    resourcePermissionLoading || resourcePermissionError ? RESOURCE_PERMISSION_PRESET_KEYS : [];

  const persistPresetKey = useCallback(
    async (presetKey: TagPermissionPresetKey): Promise<boolean> => {
      if (!folderTagId || !groupId) return false;
      const presetValues = getTagPermissionPresetValues(presetKey);
      if (!presetValues) return false;

      try {
        setOptimisticPresetSelection({
          tagId: folderTagId,
          key: presetKey,
          refreshToken: tagPermissionRefreshToken ?? 0,
        });
        savingPresetKeyRef.current = presetKey;
        await tagService.updateTag({
          groupId,
          targetTagId: folderTagId,
          taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: [],
          grantedActions: presetValues.grantedActions,
        });
        mutateSelectedTag((prev) => ({
          ...(prev ?? {
            tagId: folderTagId,
            tagName: selectedRow?.name ?? '',
            groupId,
          }),
          taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: [],
          grantedActions: presetValues.grantedActions,
        }));
        setOptimisticPresetSelection(null);
        onTagPermissionChange?.();
        toast.success('访问策略已保存');
        return true;
      } catch (err) {
        setOptimisticPresetSelection(null);
        toast.danger(parseErrorMessage(err));
        return false;
      } finally {
        savingPresetKeyRef.current = null;
      }
    },
    [
      folderTagId,
      groupId,
      mutateSelectedTag,
      onTagPermissionChange,
      selectedRow?.name,
      tagPermissionRefreshToken,
      tagService,
    ]
  );

  const handlePresetSelect = (presetKey: TagPermissionPresetKey) => {
    if (!folderTagId || !groupId) return;
    if (savingPresetKeyRef.current) return;
    if (presetKey === 'custom') {
      onManageTagAccessPermission?.(folderTagId);
      return;
    }
    if (presetKey === selectedPresetKey) return;
    void persistPresetKey(presetKey);
  };

  const handlePresetSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const [key] = [...keys];
    if (key == null) return;
    void handlePresetSelect(String(key) as TagPermissionPresetKey);
  };

  const handleMountConfigPress = () => {
    if (!folderTagId || !groupId) return;
    onManageTagMountPermission?.(folderTagId);
  };

  const handleResourcePresetSelect = async (presetKey: ResourcePermissionPresetKey) => {
    if (!resourceId || !groupId || !resourcePermissionResourceType) return;
    if (savingResourcePresetKeyRef.current) return;

    if (presetKey === 'custom') {
      onManageResourcePermission?.({
        resourceId,
        resourceType: resourcePermissionResourceType,
        resourceName: selectedRow?.name,
        fallbackTagId: resourcePermissionPolicy.primaryTagId ?? resourceFallbackTagId,
      });
      return;
    }

    if (presetKey === selectedResourcePresetKey) return;

    const presetActions =
      presetKey === 'inherit'
        ? resourcePermissionPolicy.inheritedActions
        : getResourcePermissionPresetActions(presetKey, resourcePermissionPolicy.supportedActions);
    if (!presetActions) return;

    const overrideActions =
      presetKey === 'inherit'
        ? null
        : buildResourceOverrideActions(
            presetActions,
            resourcePermissionPolicy.inheritedActions,
            resourcePermissionPolicy.supportedActions
          );

    try {
      setOptimisticResourcePresetSelection({
        resourceId,
        key: presetKey,
        refreshToken: resourcePermissionRefreshToken ?? 0,
      });
      savingResourcePresetKeyRef.current = presetKey;
      await resourceService.updateResourceActionPermission({
        resourceId,
        overrideGrantedActions: {
          [groupId]: overrideActions,
        },
      });
      toast.success('资源权限已保存');
      refreshResourcePermission();
    } catch (err) {
      setOptimisticResourcePresetSelection(null);
      toast.danger(parseErrorMessage(err));
    } finally {
      savingResourcePresetKeyRef.current = null;
    }
  };

  const handleResourcePresetSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const [key] = [...keys];
    if (key == null) return;
    void handleResourcePresetSelect(String(key) as ResourcePermissionPresetKey);
  };

  if (selectedCount > 1) {
    return (
      <aside className={styles.panel} aria-label="多选节点详情">
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <span className={styles.title}>已选 {selectedCount} 项</span>
              <span className={styles.typeLabel}>多选</span>
            </div>
          </div>
          <div className={styles.body}>
            <span className={styles.fieldLabel}>拖拽</span>
            <p className={styles.description}>拖动任一已选行到文件夹，可同时移动这些项目。</p>
            <p className={styles.descriptionMuted}>
              按住 Cmd 或 Ctrl 点击行，可继续添加或移除选择。
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedRow || !node || node.type === 'loading') {
    return (
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header} aria-hidden="true" />
          <div className={styles.emptyState}>{EMPTY_HINT}</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.iconWrap} aria-hidden="true">
              <EntryIcon
                entryType={selectedRow.entryType}
                folderIconType={selectedRow.folderIconType}
                resourceType={selectedRow.resourceType}
                resourceIconType={selectedRow.resourceIconType}
                size={18}
              />
            </span>
            <div className={styles.titleBlock}>
              <span className={styles.title}>{selectedRow.name}</span>
              <span className={styles.typeLabel}>{selectedRow.typeLabel}</span>
            </div>
            {canRename ? (
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                className={styles.renameBtn}
                aria-label="重命名"
                onPress={() => {
                  if (actionTarget) onRename(actionTarget);
                }}
              >
                <Pencil size={16} aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className={styles.body}>
            <NodeInfoSection selectedRow={selectedRow} />
            {canShowTagPermission ? (
              <section className={styles.permissionSection} aria-label="访问策略">
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <ShieldCheck size={15} aria-hidden="true" />
                    <span className={styles.sectionTitle}>访问策略</span>
                  </div>
                </div>
                <div className={styles.permissionSummary}>
                  {tagPermissionLoading
                    ? '正在加载访问策略'
                    : `${selectedPresetOption.label}：${selectedPresetOption.description}`}
                </div>
                <ListBox
                  aria-label="标签访问策略预设"
                  selectionMode="single"
                  selectedKeys={selectedPresetListKeys}
                  onSelectionChange={handlePresetSelectionChange}
                  onAction={(key) => {
                    if (String(key) === 'custom') {
                      handlePresetSelect('custom');
                    }
                  }}
                  className={styles.permissionPresetList}
                >
                  {TAG_ACCESS_PERMISSION_SIDEBAR_OPTIONS.map((preset) => (
                    <ListBox.Item
                      id={preset.key}
                      key={preset.key}
                      textValue={preset.label}
                      onPointerUp={
                        preset.key === 'custom' && selectedPresetKey === 'custom'
                          ? () => handlePresetSelect('custom')
                          : undefined
                      }
                      onKeyDown={
                        preset.key === 'custom' && selectedPresetKey === 'custom'
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handlePresetSelect('custom');
                              }
                            }
                          : undefined
                      }
                    >
                      <span className={styles.presetContent}>
                        <span className={styles.presetTitle}>{preset.label}</span>
                        <span className={styles.presetDescription}>{preset.description}</span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </section>
            ) : null}
            {canShowTagPermission ? (
              <section className={styles.permissionSection} aria-label="挂载策略">
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <FolderInput size={15} aria-hidden="true" />
                    <span className={styles.sectionTitle}>挂载策略</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    isIconOnly
                    className={styles.configBtn}
                    aria-label="配置挂载策略"
                    isDisabled={tagPermissionLoading}
                    onPress={handleMountConfigPress}
                  >
                    <Settings size={15} aria-hidden="true" />
                  </Button>
                </div>
                <div className={styles.permissionSummary}>
                  {tagPermissionLoading ? '正在加载挂载策略' : selectedMountPresetSummary}
                </div>
              </section>
            ) : null}
            {canShowResourcePermission ? (
              <section className={styles.permissionSection} aria-label="资源权限策略">
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <ShieldCheck size={15} aria-hidden="true" />
                    <span className={styles.sectionTitle}>权限策略</span>
                  </div>
                </div>
                <div className={styles.permissionSummary}>
                  {resourcePermissionLoading
                    ? '正在加载权限策略'
                    : resourcePermissionError
                      ? parseErrorMessage(resourcePermissionError)
                      : `${selectedResourcePresetOption.label}：${selectedResourcePresetOption.description}`}
                </div>
                {resourcePermissionPolicy.isInconsistentWithTag ? (
                  <div className={styles.permissionWarning}>与标签权限不一致，仅对此资源生效。</div>
                ) : null}
                <ListBox
                  aria-label="资源权限预设"
                  selectionMode="single"
                  selectedKeys={selectedResourcePresetListKeys}
                  disabledKeys={disabledResourcePresetKeys}
                  onSelectionChange={handleResourcePresetSelectionChange}
                  onAction={(key) => {
                    if (String(key) === 'custom') {
                      void handleResourcePresetSelect('custom');
                    }
                  }}
                  className={styles.permissionPresetList}
                >
                  {RESOURCE_PERMISSION_PRESETS.map((preset) => (
                    <ListBox.Item
                      id={preset.key}
                      key={preset.key}
                      textValue={preset.label}
                      onPointerUp={
                        preset.key === 'custom' && selectedResourcePresetKey === 'custom'
                          ? () => void handleResourcePresetSelect('custom')
                          : undefined
                      }
                      onKeyDown={
                        preset.key === 'custom' && selectedResourcePresetKey === 'custom'
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                void handleResourcePresetSelect('custom');
                              }
                            }
                          : undefined
                      }
                    >
                      <span className={styles.presetContent}>
                        <span className={styles.presetTitle}>{preset.label}</span>
                        <span className={styles.presetDescription}>{preset.description}</span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </section>
            ) : null}
          </div>

          {actionTarget ? (
            <div className={styles.actions}>
              {canModifyActionTarget ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.actionBtn}
                    onPress={() => onDelete(actionTarget)}
                  >
                    {deleteActionLabel}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.actionBtn}
                    onPress={() => onMove(actionTarget)}
                  >
                    <FolderInput size={16} aria-hidden="true" />
                    {moveActionLabel}
                  </Button>
                </>
              ) : null}
              {isFolder ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onEnter(node.id)}
                >
                  进入
                </Button>
              ) : null}
              {isFile ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onOpen(node)}
                >
                  打开
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

export default TableDriveSelectionPanel;
