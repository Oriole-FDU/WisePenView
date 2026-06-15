import { EmptyState, LoadingState } from '@/components/Common/Feedback';
import IconText from '@/components/Common/IconText';
import type { DataNode } from '@/components/Common/Tree';
import Tree from '@/components/Common/Tree';
import {
  buildDriveTreeData,
  replaceTreeNodeChildren,
} from '@/components/Drive/DriveNav/buildTreeData';
import { useDriveService, useGroupService } from '@/domains';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { useChatPageStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Folder, Users } from 'lucide-react';
import type { Key } from 'react';
import { useRef, useState } from 'react';
import type { DocumentPickerModalProps } from './index.type';
import styles from './style.module.less';

const DRIVE_ROOT_ID = 'drive-root';
const SCOPE_KEY_PREFIX = '__document_picker_scope__';
const CHILD_KEY_SEPARATOR = '>';

interface ScopeInfo {
  label: string;
  groupId?: string;
}

type RenderableType = 'folder' | 'resource' | 'link' | 'trash';
type SelectableType = 'folder' | 'resource' | 'link';

function buildScopeKey(scopeId: string): string {
  return `${SCOPE_KEY_PREFIX}:${scopeId}`;
}

function isScopeRootKey(key: string): boolean {
  return key.startsWith(SCOPE_KEY_PREFIX) && !key.includes(CHILD_KEY_SEPARATOR);
}

function buildScopedKey(scopeKey: string, driveNodeId: string): string {
  return `${scopeKey}${CHILD_KEY_SEPARATOR}${driveNodeId}`;
}

function parseDriveTreeKey(key: string): { scopeKey: string; driveNodeId: string } | null {
  const idx = key.indexOf(CHILD_KEY_SEPARATOR);
  if (idx === -1) return null;
  return {
    scopeKey: key.slice(0, idx),
    driveNodeId: key.slice(idx + CHILD_KEY_SEPARATOR.length),
  };
}

function prefixTreeKeys(scopeKey: string, nodes: DataNode[]): DataNode[] {
  return nodes.map((node) => ({
    ...node,
    key: buildScopedKey(scopeKey, String(node.key)),
    children: node.children ? prefixTreeKeys(scopeKey, node.children) : undefined,
  }));
}

function buildScopeRootNode(key: string, title: string, scopeType: 'personal' | 'group'): DataNode {
  const icon =
    scopeType === 'personal' ? (
      <Folder size={14} color="var(--warning)" />
    ) : (
      <Users size={14} color="var(--accent)" />
    );

  return {
    key,
    title: (
      <IconText className={styles.scopeTitle} icon={icon} iconSize={14} gap="4px" ellipsis>
        {title}
      </IconText>
    ),
    isLeaf: false,
    selectable: false,
    checkable: false,
  };
}

const RENDERABLE_TYPES = new Set<RenderableType>(['folder', 'resource', 'link']);
const SELECTABLE_TYPES = new Set<SelectableType>(['resource', 'link']);
const EMPTY_STRING_SET = new Set<string>();

function isSelectableNode(node: DriveNode | undefined): boolean {
  return node?.type === 'resource' || node?.type === 'link';
}

function DocumentPickerModal({ open, onClose }: DocumentPickerModalProps) {
  const driveService = useDriveService();
  const groupService = useGroupService();
  const addDocRef = useChatPageStore((s) => s.addDocRef);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const scopeMapRef = useRef<Map<string, ScopeInfo>>(new Map());
  const scopedDriveNodeMapRef = useRef<Map<string, DriveNode>>(new Map());

  function buildScopedChildren(scopeKey: string, driveNodes: DriveNode[]): DataNode[] {
    const rawNodeMap = new Map<string, DriveNode>();
    const children = buildDriveTreeData(
      driveNodes,
      {
        renderableTypes: RENDERABLE_TYPES,
        selectableTypes: SELECTABLE_TYPES,
        disabledNodeIds: EMPTY_STRING_SET,
        onLoadMoreClick: (node: LoadMoreNode) => {
          void handleLoadMore(scopeKey, node);
        },
      },
      rawNodeMap
    );

    for (const [nodeId, node] of rawNodeMap) {
      scopedDriveNodeMapRef.current.set(buildScopedKey(scopeKey, nodeId), node);
    }

    return prefixTreeKeys(scopeKey, children);
  }

  async function loadScopeChildren(scopeKey: string): Promise<void> {
    const scopeInfo = scopeMapRef.current.get(scopeKey);
    if (!scopeInfo) return;

    try {
      const rootNode = await driveService.getDriveTree({
        rootId: DRIVE_ROOT_ID,
        groupId: scopeInfo.groupId,
      });
      if (rootNode.type !== 'folder') {
        setTreeData((prev) => replaceTreeNodeChildren(prev, scopeKey, []));
        return;
      }

      const driveChildren = await driveService.loadNodeChildren({
        nodeId: rootNode.id,
        groupId: scopeInfo.groupId,
      });
      setTreeData((prev) =>
        replaceTreeNodeChildren(prev, scopeKey, buildScopedChildren(scopeKey, driveChildren))
      );
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  }

  async function loadFolderChildren(scopeKey: string, driveNodeId: string): Promise<void> {
    const scopedKey = buildScopedKey(scopeKey, driveNodeId);
    const scopeInfo = scopeMapRef.current.get(scopeKey);
    const driveNode = scopedDriveNodeMapRef.current.get(scopedKey);
    if (!driveNode || (driveNode.type !== 'folder' && driveNode.type !== 'trash')) return;

    try {
      const driveChildren = await driveService.loadNodeChildren({
        nodeId: driveNodeId,
        groupId: scopeInfo?.groupId,
      });
      setTreeData((prev) =>
        replaceTreeNodeChildren(prev, scopedKey, buildScopedChildren(scopeKey, driveChildren))
      );
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  }

  async function handleLoadMore(scopeKey: string, node: LoadMoreNode): Promise<void> {
    const scopeInfo = scopeMapRef.current.get(scopeKey);
    const parentKey = buildScopedKey(scopeKey, node.parentId);

    try {
      const driveChildren = await driveService.loadMore({
        parentNodeId: node.parentId,
        groupId: scopeInfo?.groupId,
      });
      setTreeData((prev) =>
        replaceTreeNodeChildren(prev, parentKey, buildScopedChildren(scopeKey, driveChildren))
      );
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  }

  const { loading: loadingScopes } = useRequest(
    async () => {
      scopeMapRef.current.clear();
      scopedDriveNodeMapRef.current.clear();
      setCheckedKeys([]);

      const nodes: DataNode[] = [];
      const personalKey = buildScopeKey('personal');
      scopeMapRef.current.set(personalKey, { label: '个人文件' });
      nodes.push(buildScopeRootNode(personalKey, '个人文件', 'personal'));

      try {
        const [joinedData, managedData] = await Promise.all([
          groupService.fetchGroupList({ groupRoleFilter: 'JOINED', page: 1, size: 100 }),
          groupService.fetchGroupList({ groupRoleFilter: 'MANAGED', page: 1, size: 100 }),
        ]);

        const seenGroupIds = new Set<string>();
        const allGroups = [...(joinedData?.groups ?? []), ...(managedData?.groups ?? [])].filter(
          (group) => {
            if (seenGroupIds.has(group.groupId)) return false;
            seenGroupIds.add(group.groupId);
            return true;
          }
        );

        for (const group of allGroups) {
          const groupKey = buildScopeKey(`group:${group.groupId}`);
          scopeMapRef.current.set(groupKey, { label: group.groupName, groupId: group.groupId });
          nodes.push(buildScopeRootNode(groupKey, group.groupName, 'group'));
        }
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }

      setTreeData(nodes);
    },
    { ready: open, refreshDeps: [open] }
  );

  async function handleLoadData(treeNode: DataNode): Promise<void> {
    const key = String(treeNode.key);
    if (treeNode.children) return;

    if (isScopeRootKey(key)) {
      await loadScopeChildren(key);
      return;
    }

    const parsed = parseDriveTreeKey(key);
    if (!parsed) return;
    await loadFolderChildren(parsed.scopeKey, parsed.driveNodeId);
  }

  function normalizeSelectableKeys(keys: string[]): string[] {
    return keys.filter((key) => isSelectableNode(scopedDriveNodeMapRef.current.get(key)));
  }

  function handleSelect(_keys: Key[], info: { node: DataNode; selected: boolean }): void {
    const clickedKey = String(info.node.key);
    if (!isSelectableNode(scopedDriveNodeMapRef.current.get(clickedKey))) return;

    setCheckedKeys((prev) => {
      const next = prev.includes(clickedKey)
        ? prev.filter((key) => key !== clickedKey)
        : [...prev, clickedKey];
      return normalizeSelectableKeys(next);
    });
  }

  function handleCheck(checked: Key[] | { checked: Key[]; halfChecked: Key[] }): void {
    const keys = Array.isArray(checked) ? checked.map(String) : checked.checked.map(String);
    setCheckedKeys(normalizeSelectableKeys(keys));
  }

  function resetModalState(): void {
    scopeMapRef.current.clear();
    scopedDriveNodeMapRef.current.clear();
    setTreeData([]);
    setCheckedKeys([]);
  }

  function handleClose(): void {
    resetModalState();
    onClose();
  }

  function handleOpenChange(visible: boolean): void {
    if (visible) return;
    handleClose();
  }

  function handleConfirm(): void {
    for (const key of checkedKeys) {
      const driveNode = scopedDriveNodeMapRef.current.get(key);
      if (!driveNode || (driveNode.type !== 'resource' && driveNode.type !== 'link')) continue;

      addDocRef({
        resourceId: driveNode.resourceId,
        resourceName: driveNode.title || driveNode.resourceId,
        resourceType: driveNode.resourceType,
        enabled: true,
      });
    }
    handleClose();
  }

  return (
    <Modal isOpen={open} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>文档库选择</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.wrapper}>
                <div className={styles.treeSection}>
                  <div className={styles.hint}>选择要引用的文档（可多选）</div>
                  <div className={styles.navTree}>
                    {loadingScopes && treeData.length === 0 ? (
                      <div className={styles.emptyState}>
                        <LoadingState />
                      </div>
                    ) : treeData.length === 0 ? (
                      <div className={styles.emptyState}>
                        <EmptyState title="暂无可选文档" />
                      </div>
                    ) : (
                      <Tree
                        className={styles.tree}
                        treeData={treeData}
                        blockNode
                        checkable
                        checkStrictly
                        selectable
                        multiple
                        selectedKeys={[]}
                        checkedKeys={checkedKeys}
                        onSelect={handleSelect}
                        onCheck={handleCheck}
                        loadData={handleLoadData}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={checkedKeys.length === 0}
              >
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DocumentPickerModal;
