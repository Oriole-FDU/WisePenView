import AppIconButton from '@/components/Button/AppIconButton';
import type { DataNode, TreeDropPosition } from '@/components/Tree';
import Tree from '@/components/Tree';
import type { SkillFileNode } from '@/domains/Skill';
import { FileCode2, FileText, Folder, X } from 'lucide-react';
import { useMemo } from 'react';

import type { SkillFileTreeProps, SkillPendingCreate } from './index.type';
import styles from './style.module.less';

const PENDING_KEY = '__pending_create__';

interface BuildTreeOptions {
  isOwner: boolean;
  onDeleteFile: (id: string) => void;
}

function buildTreeData(nodes: SkillFileNode[], opts: BuildTreeOptions): DataNode[] {
  function mapNode(node: SkillFileNode): DataNode {
    const isFolder = node.kind === 'folder';

    return {
      key: node.id,
      draggable: opts.isOwner,
      title: (
        <span className={styles.nodeRow}>
          <span className={styles.nodeTitle}>
            <span className={styles.nodeIcon} aria-hidden="true">
              {isFolder ? (
                <Folder size={14} color="var(--warning)" />
              ) : node.language === 'python' ? (
                <FileCode2 size={14} color="var(--muted)" />
              ) : (
                <FileText size={14} color="var(--muted)" />
              )}
            </span>
            <span className={styles.nodeLabel}>{node.name}</span>
          </span>
          {opts.isOwner ? (
            <AppIconButton
              icon={<X size={12} aria-hidden="true" />}
              label={`删除 ${node.name}`}
              size="sm"
              variant="danger"
              className={styles.deleteBtn}
              onClick={(event) => {
                event.stopPropagation();
                opts.onDeleteFile(node.id);
              }}
            />
          ) : null}
        </span>
      ),
      isLeaf: !isFolder,
      children: node.children?.map(mapNode),
    };
  }

  return nodes.map(mapNode);
}

function isDescendantNode(nodes: SkillFileNode[], parentId: string, childId: string): boolean {
  const parent = findSkillNode(nodes, parentId);
  if (!parent?.children) return false;
  return Boolean(findSkillNode(parent.children, childId));
}

function findSkillNode(nodes: SkillFileNode[], id: string): SkillFileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findSkillNode(node.children, id) : null;
    if (child) return child;
  }
  return null;
}

function buildPendingNode(
  pendingCreate: SkillPendingCreate,
  onCommitCreate: SkillFileTreeProps['onCommitCreate'],
  onCancelCreate: SkillFileTreeProps['onCancelCreate']
): DataNode {
  const isFolder = pendingCreate.kind === 'folder';

  return {
    key: PENDING_KEY,
    draggable: false,
    title: (
      <span className={styles.inlineInput}>
        {isFolder ? (
          <Folder size={14} color="var(--warning)" />
        ) : (
          <FileText size={14} color="var(--muted)" />
        )}
        <input
          className={styles.inlineInputField}
          autoFocus
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value) onCommitCreate(value, pendingCreate.kind);
            else onCancelCreate();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const value = event.currentTarget.value.trim();
              if (value) onCommitCreate(value, pendingCreate.kind);
              else onCancelCreate();
            }
            if (event.key === 'Escape') onCancelCreate();
          }}
        />
      </span>
    ),
    selectable: false,
    isLeaf: !isFolder,
  };
}

function insertPendingNode(
  nodes: DataNode[],
  parentFolderId: string | undefined,
  pendingNode: DataNode
): DataNode[] {
  if (!parentFolderId) return [pendingNode, ...nodes];

  return nodes.map((node) => {
    if (String(node.key) === parentFolderId) {
      return {
        ...node,
        isLeaf: false,
        children: [...(node.children ?? []), pendingNode],
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertPendingNode(node.children, parentFolderId, pendingNode),
      };
    }
    return node;
  });
}

function SkillFileTree({
  files,
  prependNodes = [],
  selectedFileId,
  selectedNodeId,
  expandedKeys,
  pendingCreate,
  onSelect,
  onCommitCreate,
  onCancelCreate,
  isOwner = false,
  onDeleteFile,
  onMoveFile,
}: SkillFileTreeProps) {
  const opts = useMemo<BuildTreeOptions>(
    () => ({ isOwner, onDeleteFile }),
    [isOwner, onDeleteFile]
  );

  const treeData = useMemo(() => {
    const base = buildTreeData(files, opts);
    const fileNodes = pendingCreate
      ? insertPendingNode(
          base,
          pendingCreate.parentFolderId,
          buildPendingNode(pendingCreate, onCommitCreate, onCancelCreate)
        )
      : base;

    return prependNodes.length > 0 ? [...prependNodes, ...fileNodes] : fileNodes;
  }, [files, onCancelCreate, onCommitCreate, opts, pendingCreate, prependNodes]);

  const handleSelect = (keys: React.Key[]) => {
    const key = String(keys[0] ?? '');
    if (key && key !== PENDING_KEY) onSelect(key);
  };

  const handleAllowDrop = ({
    dragNode,
    dropNode,
    dropPosition,
  }: {
    dragNode: DataNode;
    dropNode: DataNode;
    dropPosition: TreeDropPosition;
  }) => {
    const dragId = String(dragNode.key);
    const dropId = String(dropNode.key);
    const target = findSkillNode(files, dropId);
    if (!target || dragId === dropId) return false;
    if (dropPosition === 'inside' && target.kind !== 'folder') return false;
    return !isDescendantNode(files, dragId, dropId);
  };

  return (
    <Tree
      key={`${files.length}:${pendingCreate?.kind ?? ''}:${pendingCreate?.parentFolderId ?? 'root'}`}
      treeData={treeData}
      blockNode
      selectable
      expandAction="click"
      selectedKeys={selectedNodeId ? [selectedNodeId] : selectedFileId ? [selectedFileId] : []}
      defaultExpandedKeys={[
        ...(expandedKeys ?? []),
        ...(pendingCreate?.parentFolderId ? [pendingCreate.parentFolderId] : []),
      ]}
      onSelect={handleSelect}
      draggable={isOwner}
      allowDrop={handleAllowDrop}
      onDrop={({ dragNode, dropNode, dropPosition }) => {
        onMoveFile?.({
          dragId: String(dragNode.key),
          dropId: String(dropNode.key),
          dropPosition,
        });
      }}
    />
  );
}

export default SkillFileTree;
