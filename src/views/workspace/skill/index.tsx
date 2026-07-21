import { DriveCreate } from '@/components/Drive/Modals';
import { Empty, ResultState, Spin } from '@/components/Feedback';
import { FormField, Input, TextArea } from '@/components/Input';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import SkillEditor from '@/components/Skill/SkillEditor';
import SkillFileTree from '@/components/Skill/SkillFileTree';
import type {
  SkillFileDropPosition,
  SkillPendingCreate,
} from '@/components/Skill/SkillFileTree/index.type';
import SkillVersionDropdown from '@/components/Skill/SkillVersionDropdown';
import type { DataNode } from '@/components/Tree';
import { useInteractService, useSkillService } from '@/domains';
import type { SkillFileNode, UploadSkillAssetResult } from '@/domains/Skill';
import { SkillServicesMap } from '@/domains/Skill';
import { useEffectForce } from '@/hooks/useEffectForce';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostContext,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FolderPlus, Pencil, Plus, Save, Settings, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import SkillSaveQueueDock from './_components/SkillSaveQueueDock';
import type { SkillSaveQueueItem } from './_components/SkillSaveQueueDock/index.type';
import type { UnsavedSkillChangesMode } from './_components/UnsavedSkillChangesModal';
import UnsavedSkillChangesModal from './_components/UnsavedSkillChangesModal';
import type { SkillEditorSavePhase } from './_hooks/useSkillEditorController';
import {
  resolveSkillEditorSavePhase,
  useSkillEditorController,
} from './_hooks/useSkillEditorController';
import styles from './style.module.less';
import {
  clearSkillDraftCache,
  loadSkillDraftCache,
  saveSkillDraftCache,
} from './utils/skillDraftCache';
import { parseSkillZip } from './utils/skillZip';

interface SkillViewProps {
  resourceId?: string;
}

interface SkillLayoutConfigProps {
  children: ReactNode;
  config?: ResourceHostLayoutConfig;
}

interface SaveAssetOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface SaveSkillConfigOptions {
  showToast?: boolean;
}

interface SaveSkillFileTarget {
  file: SkillFileNode;
  content: string | Blob;
}

interface SkillConfigPanelProps {
  name: string;
  description: string;
  canEdit: boolean;
  isDirty: boolean;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}

interface MoveTreeNodeResult {
  files: SkillFileNode[];
  idMap: Map<string, string>;
  movedFiles: Array<{
    previous: SkillFileNode;
    next: SkillFileNode;
  }>;
}

const ROOT_PATH = '/';
const MAIN_SKILL_FILE_NAME = 'SKILL.md';
const SKILL_CONFIG_NODE_ID = '__skill_config__';
const LOCAL_FILE_ID_PREFIX = 'local-file:';
const LOCAL_FOLDER_ID_PREFIX = 'folder:';
const EDITABLE_SKILL_FILE_EXTENSIONS = new Set([
  'md',
  'py',
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'js',
  'jsx',
  'ts',
  'tsx',
  'css',
  'less',
  'html',
  'xml',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'bat',
  'cmd',
  'ini',
  'env',
  'java',
  'go',
  'rs',
  'rb',
  'pl',
]);
function findFile(nodes: SkillFileNode[], id: string): SkillFileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findFile(node.children, id) : null;
    if (child) return child;
  }
  return null;
}

function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function joinDirectoryPath(parentPath: string, name: string): string {
  const normalizedParent = normalizeDirectoryPath(parentPath);
  return normalizedParent === ROOT_PATH ? `${ROOT_PATH}${name}` : `${normalizedParent}/${name}`;
}

function getParentDirectoryPath(path: string): string {
  const normalizedPath = normalizeDirectoryPath(path);
  if (normalizedPath === ROOT_PATH) return ROOT_PATH;
  const lastSlashIndex = normalizedPath.lastIndexOf(ROOT_PATH);
  return lastSlashIndex <= 0 ? ROOT_PATH : normalizedPath.slice(0, lastSlashIndex);
}

function getFirstFile(nodes: SkillFileNode[]): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file') return node;
    const child = node.children ? getFirstFile(node.children) : null;
    if (child) return child;
  }
  return null;
}

function collectExpandedKeys(nodes: SkillFileNode[]): string[] {
  const keys: string[] = [];
  function walk(items: SkillFileNode[]) {
    for (const item of items) {
      if (item.kind === 'folder') keys.push(item.id);
      if (item.children) walk(item.children);
    }
  }
  walk(nodes);
  return keys;
}

function collectFileIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  if (node.kind === 'file') return [node.id];
  return (node.children ?? []).flatMap(collectFileIds);
}

function findRootMainSkillFile(nodes: SkillFileNode[]): SkillFileNode | null {
  return (
    nodes.find(
      (node) =>
        node.kind === 'file' &&
        node.name === MAIN_SKILL_FILE_NAME &&
        normalizeDirectoryPath(node.path) === ROOT_PATH
    ) ?? null
  );
}

function findSkillFileByName(
  nodes: SkillFileNode[],
  predicate: (name: string) => boolean
): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file' && predicate(node.name)) return node;
    const child = node.children ? findSkillFileByName(node.children, predicate) : null;
    if (child) return child;
  }
  return null;
}

function collectNodeIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  return [node.id, ...(node.children ?? []).flatMap(collectNodeIds)];
}

function isLocalAssetId(id: string): boolean {
  return id.startsWith(LOCAL_FILE_ID_PREFIX);
}

function isRemoteAssetId(id: string): boolean {
  return Boolean(
    id &&
    !id.startsWith(LOCAL_FILE_ID_PREFIX) &&
    !id.startsWith(LOCAL_FOLDER_ID_PREFIX) &&
    !id.includes(ROOT_PATH) &&
    !id.includes(':')
  );
}

function isLocalAssetNode(node: SkillFileNode): boolean {
  return node.kind === 'file' && isLocalAssetId(node.id);
}

function collectFileNodes(nodes: SkillFileNode[]): SkillFileNode[] {
  const result: SkillFileNode[] = [];
  function walk(items: SkillFileNode[]) {
    for (const item of items) {
      if (item.kind === 'file') result.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(nodes);
  return result;
}

function collectLocalAssetNodes(nodes: SkillFileNode[]): SkillFileNode[] {
  return collectFileNodes(nodes).filter(isLocalAssetNode);
}

function findFileByPathAndName(
  nodes: SkillFileNode[],
  path: string,
  name: string
): SkillFileNode | null {
  const normalizedPath = normalizeDirectoryPath(path);
  return (
    collectFileNodes(nodes).find(
      (node) => normalizeDirectoryPath(node.path) === normalizedPath && node.name === name
    ) ?? null
  );
}

function isSkillZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip');
}

function isEditableSkillFileName(name: string): boolean {
  const normalizedName = name.toLowerCase();
  if (normalizedName === 'dockerfile') return true;
  const ext = normalizedName.split('.').pop();
  return Boolean(ext && EDITABLE_SKILL_FILE_EXTENSIONS.has(ext));
}

function canPreviewSkillFile(file: SkillFileNode): boolean {
  return typeof file.content === 'string' || isEditableSkillFileName(file.name);
}

function removeTreeNode(nodes: SkillFileNode[], idSet: Set<string>): SkillFileNode[] {
  return nodes
    .filter((node) => !idSet.has(node.id))
    .map((node) =>
      node.children ? { ...node, children: removeTreeNode(node.children, idSet) } : node
    );
}

function updateTreeFileContent(
  nodes: SkillFileNode[],
  id: string,
  content: string,
  nextId?: string
): SkillFileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, id: nextId ?? node.id, content };
    if (node.children) {
      return { ...node, children: updateTreeFileContent(node.children, id, content, nextId) };
    }
    return node;
  });
}

function updateSavedTreeFile(
  nodes: SkillFileNode[],
  id: string,
  content: string | Blob,
  nextId?: string
): SkillFileNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return {
        ...node,
        id: nextId ?? node.id,
        content: typeof content === 'string' ? content : node.content,
        contentBlob: undefined,
      };
    }
    if (node.children) {
      return { ...node, children: updateSavedTreeFile(node.children, id, content, nextId) };
    }
    return node;
  });
}

function remapTreeNodeIds(nodes: SkillFileNode[], idMap: Map<string, string>): SkillFileNode[] {
  if (idMap.size === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) ?? node.id,
    children: node.children ? remapTreeNodeIds(node.children, idMap) : undefined,
  }));
}

function appendTreeNode(
  nodes: SkillFileNode[],
  parentFolderId: string | undefined,
  childNode: SkillFileNode
): SkillFileNode[] {
  if (!parentFolderId) return [...nodes, childNode];

  return nodes.map((node) => {
    if (node.id === parentFolderId && node.kind === 'folder') {
      return { ...node, children: [...(node.children ?? []), childNode] };
    }
    if (node.children) {
      return { ...node, children: appendTreeNode(node.children, parentFolderId, childNode) };
    }
    return node;
  });
}

function appendFileNodeByPath(nodes: SkillFileNode[], fileNode: SkillFileNode): SkillFileNode[] {
  const normalizedPath = normalizeDirectoryPath(fileNode.path);
  if (normalizedPath === ROOT_PATH) return appendTreeNode(nodes, undefined, fileNode);
  const folderNames = normalizedPath.split(ROOT_PATH).filter(Boolean);
  return appendFileNodeIntoFolderPath(nodes, folderNames, fileNode, ROOT_PATH);
}

function appendFileNodeIntoFolderPath(
  nodes: SkillFileNode[],
  folderNames: string[],
  fileNode: SkillFileNode,
  parentPath: string
): SkillFileNode[] {
  if (folderNames.length === 0) return [...nodes, fileNode];

  const [folderName, ...restFolderNames] = folderNames;
  const folderPath = joinDirectoryPath(parentPath, folderName);
  let folderFound = false;
  const nextNodes = nodes.map((node) => {
    if (node.kind !== 'folder' || normalizeDirectoryPath(node.path) !== folderPath) return node;
    folderFound = true;
    return {
      ...node,
      children: appendFileNodeIntoFolderPath(
        node.children ?? [],
        restFolderNames,
        fileNode,
        folderPath
      ),
    };
  });

  if (folderFound) return nextNodes;

  const folder = createLocalFolderNode(folderName, parentPath);
  return [
    ...nextNodes,
    {
      ...folder,
      children: appendFileNodeIntoFolderPath([], restFolderNames, fileNode, folderPath),
    },
  ];
}

function removeTreeNodeWithResult(
  nodes: SkillFileNode[],
  id: string
): { nodes: SkillFileNode[]; removed: SkillFileNode | null } {
  let removed: SkillFileNode | null = null;
  const nextNodes: SkillFileNode[] = [];

  for (const node of nodes) {
    if (node.id === id) {
      removed = node;
      continue;
    }

    if (node.children) {
      const childResult = removeTreeNodeWithResult(node.children, id);
      if (childResult.removed) {
        removed = childResult.removed;
        nextNodes.push({ ...node, children: childResult.nodes });
        continue;
      }
    }

    nextNodes.push(node);
  }

  return { nodes: nextNodes, removed };
}

function insertTreeNodeByDrop(
  nodes: SkillFileNode[],
  dropId: string,
  dropPosition: SkillFileDropPosition,
  movedNode: SkillFileNode
): SkillFileNode[] {
  const nextNodes: SkillFileNode[] = [];

  for (const node of nodes) {
    if (node.id === dropId && dropPosition !== 'inside') {
      if (dropPosition === 'before') nextNodes.push(movedNode);
      nextNodes.push(node);
      if (dropPosition === 'after') nextNodes.push(movedNode);
      continue;
    }

    if (node.id === dropId && dropPosition === 'inside' && node.kind === 'folder') {
      nextNodes.push({ ...node, children: [...(node.children ?? []), movedNode] });
      continue;
    }

    if (node.children) {
      nextNodes.push({
        ...node,
        children: insertTreeNodeByDrop(node.children, dropId, dropPosition, movedNode),
      });
      continue;
    }

    nextNodes.push(node);
  }

  return nextNodes;
}

function updateMovedNodePaths(
  node: SkillFileNode,
  parentPath: string,
  idMap: Map<string, string>,
  movedFiles: MoveTreeNodeResult['movedFiles']
): SkillFileNode {
  const normalizedParentPath = normalizeDirectoryPath(parentPath);

  if (node.kind === 'file') {
    const nextNode = { ...node, path: normalizedParentPath };
    movedFiles.push({ previous: node, next: nextNode });
    return nextNode;
  }

  const nextPath = joinDirectoryPath(normalizedParentPath, node.name);
  const nextId = `folder:${nextPath}`;
  if (node.id !== nextId) idMap.set(node.id, nextId);

  return {
    ...node,
    id: nextId,
    path: nextPath,
    children: (node.children ?? []).map((child) =>
      updateMovedNodePaths(child, nextPath, idMap, movedFiles)
    ),
  };
}

function resolveMoveParentPath(
  dropNode: SkillFileNode,
  dropPosition: SkillFileDropPosition
): string {
  if (dropPosition === 'inside' && dropNode.kind === 'folder') {
    return normalizeDirectoryPath(dropNode.path);
  }
  if (dropNode.kind === 'file') return normalizeDirectoryPath(dropNode.path);
  return getParentDirectoryPath(dropNode.path);
}

function getDirectChildren(nodes: SkillFileNode[], parentPath: string): SkillFileNode[] {
  const normalizedParentPath = normalizeDirectoryPath(parentPath);
  const result: SkillFileNode[] = [];

  function walk(items: SkillFileNode[]) {
    for (const item of items) {
      const itemParentPath =
        item.kind === 'file'
          ? normalizeDirectoryPath(item.path)
          : getParentDirectoryPath(item.path);
      if (itemParentPath === normalizedParentPath) result.push(item);
      if (item.children) walk(item.children);
    }
  }

  walk(nodes);
  return result;
}

function hasMoveNameConflict(
  nodes: SkillFileNode[],
  movingNode: SkillFileNode,
  targetParentPath: string
): boolean {
  const movingIdSet = new Set(collectNodeIds(movingNode));
  return getDirectChildren(nodes, targetParentPath).some(
    (node) => node.name === movingNode.name && !movingIdSet.has(node.id)
  );
}

function moveTreeNode(
  nodes: SkillFileNode[],
  dragId: string,
  dropId: string,
  dropPosition: SkillFileDropPosition
): MoveTreeNodeResult | null {
  if (dragId === dropId) return null;

  const dragNode = findFile(nodes, dragId);
  const dropNode = findFile(nodes, dropId);
  if (!dragNode || !dropNode) return null;
  if (collectNodeIds(dragNode).includes(dropId)) return null;

  const targetParentPath = resolveMoveParentPath(dropNode, dropPosition);
  if (hasMoveNameConflict(nodes, dragNode, targetParentPath)) return null;

  const removeResult = removeTreeNodeWithResult(nodes, dragId);
  if (!removeResult.removed) return null;

  const idMap = new Map<string, string>();
  const movedFiles: MoveTreeNodeResult['movedFiles'] = [];
  const movedNode = updateMovedNodePaths(removeResult.removed, targetParentPath, idMap, movedFiles);

  return {
    files: insertTreeNodeByDrop(removeResult.nodes, dropId, dropPosition, movedNode),
    idMap,
    movedFiles,
  };
}

function createLocalFileNode(name: string, path = ROOT_PATH): SkillFileNode {
  const normalizedPath = normalizeDirectoryPath(path);

  return {
    id: `local-file:${Date.now()}:${normalizedPath}:${name}`,
    name,
    path: normalizedPath,
    kind: 'file',
    language: name.endsWith('.py') ? 'python' : 'markdown',
    content: '',
  };
}

function createLocalFolderNode(name: string, parentPath = ROOT_PATH): SkillFileNode {
  const path = joinDirectoryPath(parentPath, name);

  return {
    id: `folder:${path}`,
    name,
    path,
    kind: 'folder',
    children: [],
  };
}

function SkillLayoutConfig({ children, config }: SkillLayoutConfigProps) {
  const frameConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      ...(config ?? {}),
    }),
    [config]
  );
  useResourceHostLayoutConfig(frameConfig);

  return <>{children}</>;
}

function formatSaveStatus(status?: SkillEditorSavePhase): string | null {
  if (status === 'dirty') return '有未保存修改';
  if (status === 'saving') return '保存中...';
  if (status === 'failed') return '保存失败';
  if (status === 'clean') return '已经保存到云端';
  return null;
}

function SkillConfigPanel({
  name,
  description,
  canEdit,
  isDirty,
  isLoading,
  onNameChange,
  onDescriptionChange,
  onReset,
  onSave,
}: SkillConfigPanelProps) {
  const nameMissing = name.trim().length === 0;
  const descriptionMissing = description.trim().length === 0;
  const hasMissingConfig = nameMissing || descriptionMissing;

  return (
    <>
      <header className={styles.editorHeader}>
        <span className={styles.editorFileName}>Config</span>
      </header>
      <div className={styles.editorBody}>
        <section className={styles.configPage} aria-label="Skill 配置">
          <div className={styles.configIntro}>
            <h2>Skill Info</h2>
            <p>
              请填写 name 和 description。它们用于帮助模型识别这个 Skill 的用途；缺失时不能发布。
            </p>
          </div>

          <div className={styles.configForm}>
            <FormField
              aria-label="Skill name"
              value={name}
              onChange={onNameChange}
              isDisabled={!canEdit || isLoading}
              isRequired
              label="name"
              description="用于模型识别 Skill，建议使用稳定的英文名，例如 planning_with_files。"
              errorMessage={nameMissing ? '请填写 name。' : undefined}
            >
              <Input placeholder="planning_with_files" />
            </FormField>

            <FormField
              aria-label="Skill description"
              value={description}
              onChange={onDescriptionChange}
              isDisabled={!canEdit || isLoading}
              isRequired
              label="description"
              description="说明这个 Skill 适合处理什么任务。描述越清晰，模型越容易正确选择。"
              errorMessage={descriptionMissing ? '请填写 description。' : undefined}
            >
              <TextArea
                className={styles.configDescriptionInput}
                rows={5}
                placeholder="说明这个 Skill 适合处理什么任务"
              />
            </FormField>
          </div>

          <footer className={styles.configFooter}>
            <span className={styles.configFooterText}>
              {hasMissingConfig
                ? '补全 name 和 description 后，才允许发布 Skill。'
                : isDirty
                  ? '配置修改尚未更新'
                  : '配置已更新'}
            </span>
            {canEdit ? (
              <span className={styles.configFooterActions}>
                <Button variant="secondary" isDisabled={!isDirty || isLoading} onPress={onReset}>
                  重置
                </Button>
                <Button
                  variant="primary"
                  isDisabled={!isDirty || hasMissingConfig || isLoading}
                  aria-busy={isLoading || undefined}
                  onPress={onSave}
                >
                  更新配置
                </Button>
              </span>
            ) : null}
          </footer>
        </section>
      </div>
    </>
  );
}

function SkillView({ resourceId = '' }: SkillViewProps = {}) {
  const navigate = useNavigate();
  const { getNavigationScope, openResource } = useResourceHostContext();
  const skillService = useSkillService();
  const interactService = useInteractService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftCacheWriteVersionRef = useRef(0);
  const restoredEditorDraftRef = useRef<{
    fileId: string;
    editorContent: string;
    savedContent: string;
  } | null>(null);
  const { state: editorState, actions: editorActions } = useSkillEditorController();
  const {
    files: localFiles,
    selectedFileId,
    selectedTreeNodeId,
    editing,
    editorContent,
    savedContent,
    viewingVersion,
    saveQueueItems,
    configName,
    configDescription,
    savedConfigName,
    savedConfigDescription,
    pendingIntent,
  } = editorState;
  const {
    setFiles: setLocalFiles,
    setSelectedFileId,
    setSelectedTreeNodeId,
    setEditing,
    setEditorContent,
    setSavedContent,
    setViewingVersion,
    setSaveQueueItems,
    setConfigName,
    setConfigDescription,
    setSavedConfigName,
    setSavedConfigDescription,
    setPendingIntent,
    initialize: initializeEditor,
    restoreDraft,
    discardLocalChanges,
  } = editorActions;
  const [pendingCreate, setPendingCreate] = useState<SkillPendingCreate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillFileNode | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(!resourceId);
  const [isTreeDragOver, setIsTreeDragOver] = useState(false);
  const [draftCacheReady, setDraftCacheReady] = useState(false);

  const invalidateDraftCacheWrites = useCallback(() => {
    draftCacheWriteVersionRef.current += 1;
  }, []);

  const clearDraftCache = useCallback(
    (targetResourceId: string) => {
      invalidateDraftCacheWrites();
      return clearSkillDraftCache(targetResourceId).catch(() => undefined);
    },
    [invalidateDraftCacheWrites]
  );

  const {
    data: skill,
    loading,
    error,
    refresh: refreshSkill,
  } = useRequest(() => skillService.getSkillDetail(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  useRequest(() => interactService.recordResourceRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const { loading: contentLoading, run: runLoadFileContent } = useRequest(
    async (file: SkillFileNode) => {
      if (!skill?.resourceId || !file.objectKey) return null;
      const content = await skillService.loadAssetContent(
        skill.resourceId,
        file.objectKey,
        viewingVersion ?? undefined
      );
      return { fileId: file.id, content };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setLocalFiles((prev) => updateTreeFileContent(prev, result.fileId, result.content));
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  /**
   * skill 详情刷新后重置本地文件树；文件树是用户编辑草稿的临时视图，不能只靠渲染派生。
   */
  useEffectForce(() => {
    if (!skill) return;
    let disposed = false;

    invalidateDraftCacheWrites();
    setDraftCacheReady(false);
    initializeEditor(skill);
    setPendingCreate(null);

    void loadSkillDraftCache(skill.resourceId)
      .then((snapshot) => {
        if (disposed) return;
        if (!snapshot || snapshot.draftVersion !== skill.draftVersion) {
          setDraftCacheReady(true);
          return;
        }
        restoredEditorDraftRef.current = snapshot.selectedFileId
          ? {
              fileId: snapshot.selectedFileId,
              editorContent: snapshot.editorContent,
              savedContent: snapshot.savedContent,
            }
          : null;
        restoreDraft(snapshot, skill);
        setDraftCacheReady(true);
        toast.warning('已恢复上次未保存的 Skill 草稿');
      })
      .catch(() => {
        if (!disposed) setDraftCacheReady(true);
      });

    return () => {
      disposed = true;
    };
  }, [initializeEditor, invalidateDraftCacheWrites, restoreDraft, skill]);

  const activeFiles = localFiles;
  const isConfigSelected = selectedTreeNodeId === SKILL_CONFIG_NODE_ID;
  const selectedFile = useMemo(() => {
    if (isConfigSelected) return null;
    if (selectedFileId) return findFile(activeFiles, selectedFileId);
    return getFirstFile(activeFiles);
  }, [activeFiles, isConfigSelected, selectedFileId]);
  const selectedTreeNode = useMemo(
    () => (selectedTreeNodeId ? findFile(activeFiles, selectedTreeNodeId) : null),
    [activeFiles, selectedTreeNodeId]
  );

  /**
   * 文件树或选中文件变化时同步 Monaco 内容；后端只返回 objectKey，缺少 content 时按需从 OSS 加载。
   */
  useEffectForce(() => {
    const canPreviewSelectedFile = selectedFile ? canPreviewSkillFile(selectedFile) : true;
    const content = selectedFile?.content ?? '';
    if (selectedFileId && !selectedFile) setSelectedFileId('');
    const restoredEditorDraft = restoredEditorDraftRef.current;
    if (
      restoredEditorDraft &&
      selectedFile &&
      selectedFile.id === restoredEditorDraft.fileId &&
      canPreviewSelectedFile
    ) {
      setEditorContent(restoredEditorDraft.editorContent);
      setSavedContent(restoredEditorDraft.savedContent);
      restoredEditorDraftRef.current = null;
    } else {
      setEditorContent(canPreviewSelectedFile ? content : '');
      setSavedContent(canPreviewSelectedFile ? content : '');
    }
    if (
      selectedFile &&
      canPreviewSelectedFile &&
      selectedFile.content === undefined &&
      selectedFile.objectKey
    ) {
      runLoadFileContent(selectedFile);
    }
  }, [runLoadFileContent, selectedFile, selectedFileId, viewingVersion]);

  /**
   * 进入无 resourceId 的兼容路由时自动打开创建弹窗；关闭时回到云盘。
   */
  useEffectForce(() => {
    if (!resourceId) setCreateModalOpen(true);
  }, [resourceId]);

  const expandedKeys = useMemo(() => collectExpandedKeys(activeFiles), [activeFiles]);
  const isViewingDraft = skill ? viewingVersion === skill.draftVersion : false;
  const canEdit = Boolean(skill?.isOwner && isViewingDraft);
  const isDirty = canEdit && editorContent !== savedContent;
  const localAssetNodes = useMemo(() => collectLocalAssetNodes(activeFiles), [activeFiles]);
  const canPreviewSelectedFile = selectedFile ? canPreviewSkillFile(selectedFile) : false;
  const hasUnsavedLocalAssets = canEdit && localAssetNodes.length > 0;
  const hasFailedSaveItems = saveQueueItems.some((item) => item.phase === 'failed');
  const hasSaveableChanges = isDirty || hasUnsavedLocalAssets || hasFailedSaveItems;
  const isConfigDirty =
    canEdit && (configName !== savedConfigName || configDescription !== savedConfigDescription);
  const hasConfigValuesMissing =
    configName.trim().length === 0 || configDescription.trim().length === 0;
  const hasSavedConfigMissing =
    savedConfigName.trim().length === 0 || savedConfigDescription.trim().length === 0;
  const hasMissingConfig = canEdit && hasConfigValuesMissing;
  const configTreeBadgeText = hasConfigValuesMissing ? '必填' : isConfigDirty ? '未保存' : '完成';
  const configTreeNodes = useMemo<DataNode[]>(
    () => [
      {
        key: SKILL_CONFIG_NODE_ID,
        draggable: false,
        isLeaf: true,
        title: (
          <span className={styles.configTreeNode}>
            <span className={styles.configTreeTitle}>
              <span className={styles.configTreeIcon} aria-hidden="true">
                <Settings size={14} />
              </span>
              <span className={styles.configTreeName}>Config</span>
            </span>
            <span className={styles.configTreeBadge}>{configTreeBadgeText}</span>
          </span>
        ),
      },
    ],
    [configTreeBadgeText]
  );
  const isSaveQueueActive = saveQueueItems.some(
    (item) => item.phase === 'preparing' || item.phase === 'uploading'
  );
  const pendingLocalSaveQueueItems = useMemo<SkillSaveQueueItem[]>(
    () =>
      localAssetNodes.map((file) => ({
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        phase: 'pending',
        progress: 0,
      })),
    [localAssetNodes]
  );
  const visibleSaveQueueItems =
    saveQueueItems.length > 0 ? saveQueueItems : pendingLocalSaveQueueItems;
  const hasUnsavedSkillChanges =
    canEdit && (isDirty || hasUnsavedLocalAssets || hasFailedSaveItems);
  const hasUnsafeNavigation = hasUnsavedSkillChanges || isConfigDirty || isSaveQueueActive;
  const hasRecoverableDraft = hasUnsavedSkillChanges || isConfigDirty;
  const navigationBlocker = useBlocker(hasUnsafeNavigation);

  /**
   * React Router 只在导航实际被阻塞后暴露目标位置，因此此处把外部 blocker 状态同步为唯一页面 intent。
   */
  useEffectForce(() => {
    if (navigationBlocker.state === 'blocked') {
      setPendingIntent({ type: 'leave' });
    } else if (pendingIntent?.type === 'leave') {
      setPendingIntent(null);
    }
  }, [navigationBlocker.state, pendingIntent?.type, setPendingIntent]);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsafeNavigation) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [hasUnsafeNavigation]
    ),
    { capture: true }
  );

  /**
   * 未保存的 Skill 草稿包含本地文件与 Blob，必须用 IndexedDB 才能在强制刷新后恢复。
   */
  useEffectForce(() => {
    if (!skill || !draftCacheReady || !canEdit || !hasRecoverableDraft) return;
    const cacheWriteVersion = draftCacheWriteVersionRef.current;
    const timer = window.setTimeout(() => {
      if (draftCacheWriteVersionRef.current !== cacheWriteVersion) return;
      const filesForCache =
        selectedFile && canPreviewSkillFile(selectedFile)
          ? updateTreeFileContent(localFiles, selectedFile.id, editorContent)
          : localFiles;
      const cacheToken = `${skill.resourceId}:${cacheWriteVersion}:${Date.now()}`;
      const snapshot = {
        resourceId: skill.resourceId,
        draftVersion: skill.draftVersion,
        cacheToken,
        files: filesForCache,
        selectedFileId,
        selectedTreeNodeId,
        editorContent,
        savedContent,
        viewingVersion,
        saveQueueItems,
        configName,
        configDescription,
        savedConfigName,
        savedConfigDescription,
        updatedAt: Date.now(),
      };
      void saveSkillDraftCache(snapshot)
        .then(() => {
          if (draftCacheWriteVersionRef.current === cacheWriteVersion) return;
          void loadSkillDraftCache(snapshot.resourceId)
            .then((cachedSnapshot) => {
              if (cachedSnapshot?.cacheToken === cacheToken) {
                void clearSkillDraftCache(snapshot.resourceId);
              }
            })
            .catch(() => undefined);
        })
        .catch(() => {
          // IndexedDB 失败不阻断页面编辑，只是不提供本地草稿恢复。
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    canEdit,
    configDescription,
    configName,
    draftCacheReady,
    editorContent,
    hasRecoverableDraft,
    localFiles,
    saveQueueItems,
    savedContent,
    savedConfigDescription,
    savedConfigName,
    selectedFile,
    selectedFileId,
    selectedTreeNodeId,
    skill,
    viewingVersion,
  ]);

  /**
   * 草稿已回到干净状态时清理恢复缓存，避免下次进入页面恢复过期内容。
   */
  useEffectForce(() => {
    if (!skill || !draftCacheReady || hasRecoverableDraft) return;
    void clearDraftCache(skill.resourceId);
  }, [clearDraftCache, draftCacheReady, hasRecoverableDraft, skill]);

  const versionItems = useMemo(() => {
    if (!skill) return [];
    const items = [
      {
        key: `v${skill.draftVersion}`,
        version: skill.draftVersion,
        current: viewingVersion === skill.draftVersion,
      },
    ];
    for (let version = skill.version; version >= 1; version -= 1) {
      items.push({
        key: `v${version}`,
        version,
        current: viewingVersion === version,
      });
    }
    return items;
  }, [skill, viewingVersion]);

  const disabledVersionKeys = useMemo(
    () => (skill?.isOwner ? new Set<string>() : new Set(versionItems.map((item) => item.key))),
    [skill?.isOwner, versionItems]
  );

  const handleCreateSuccess = (newResourceId: string) => {
    setCreateModalOpen(false);
    openResource({
      resourceId: newResourceId,
      resourceType: RESOURCE_KIND.SKILL,
      driveLocation: { scope: getNavigationScope() },
      replace: true,
    });
  };

  const resolveCreateParent = useCallback(() => {
    const node = selectedTreeNode ?? (selectedFileId ? selectedFile : null);
    if (!node) {
      return { parentFolderId: undefined, parentPath: ROOT_PATH };
    }
    if (node.kind === 'folder') {
      return { parentFolderId: node.id, parentPath: normalizeDirectoryPath(node.path) };
    }

    const filePath = normalizeDirectoryPath(node.path);
    return {
      parentFolderId: filePath === ROOT_PATH ? undefined : `folder:${filePath}`,
      parentPath: filePath,
    };
  }, [selectedFile, selectedFileId, selectedTreeNode]);

  const applyTreeSelection = useCallback(
    (nodeId: string) => {
      const node = findFile(activeFiles, nodeId);
      if (!node) return;
      setSelectedTreeNodeId(nodeId);
      if (node.kind === 'file') {
        setSelectedFileId(nodeId);
      }
    },
    [activeFiles, setSelectedFileId, setSelectedTreeNodeId]
  );

  const applyConfigSelection = useCallback(() => {
    setSelectedTreeNodeId(SKILL_CONFIG_NODE_ID);
    setSelectedFileId('');
    setPendingCreate(null);
    setEditing(false);
  }, [setEditing, setSelectedFileId, setSelectedTreeNodeId]);

  const resetConfigDraft = useCallback(() => {
    setConfigName(savedConfigName);
    setConfigDescription(savedConfigDescription);
  }, [savedConfigDescription, savedConfigName, setConfigDescription, setConfigName]);

  const discardLocalSkillChanges = useCallback(() => {
    setPendingCreate(null);
    if (skill) discardLocalChanges(skill);
  }, [discardLocalChanges, skill]);

  const handleConfigSelect = () => {
    if (isSaveQueueActive) {
      toast.warning('正在保存 Skill，请稍后再切换配置');
      return;
    }
    if (isConfigSelected) return;
    if (isDirty) {
      setPendingIntent({ type: 'switchConfig' });
      return;
    }
    applyConfigSelection();
  };

  const handleTreeSelect = (nodeId: string) => {
    if (nodeId === SKILL_CONFIG_NODE_ID) {
      handleConfigSelect();
      return;
    }
    if (isSaveQueueActive) {
      toast.warning('正在保存 Skill，请稍后再切换文件');
      return;
    }
    const node = findFile(activeFiles, nodeId);
    if (!node) return;
    if (isConfigSelected && isConfigDirty) {
      if (node.kind === 'file') {
        setPendingIntent({ type: 'switchFile', fileId: node.id });
        return;
      }
      toast.warning('请先更新或重置配置后再切换目录');
      return;
    }
    if (node.kind === 'file' && node.id !== selectedFileId && isDirty) {
      setPendingIntent({ type: 'switchFile', fileId: node.id });
      return;
    }
    applyTreeSelection(nodeId);
  };

  const handleStartCreate = (kind: 'file' | 'folder') => {
    const { parentFolderId } = resolveCreateParent();
    setPendingCreate({ kind, parentFolderId });
  };

  const buildAllSaveTargets = useCallback((): SaveSkillFileTarget[] => {
    if (!canEdit) return [];
    const targetMap = new Map<string, SaveSkillFileTarget>();

    localAssetNodes.forEach((file) => {
      targetMap.set(file.id, {
        file,
        content: file.contentBlob ?? file.content ?? '',
      });
    });

    if (selectedFile && isDirty) {
      targetMap.set(selectedFile.id, {
        file: selectedFile,
        content: editorContent,
      });
    }

    return [...targetMap.values()];
  }, [canEdit, editorContent, isDirty, localAssetNodes, selectedFile]);

  const buildCurrentSaveTarget = useCallback((): SaveSkillFileTarget[] => {
    if (!selectedFile || !canEdit) return [];
    if (!isDirty && !isLocalAssetNode(selectedFile)) return [];
    if (!canPreviewSkillFile(selectedFile)) {
      if (!isLocalAssetNode(selectedFile) || !selectedFile.contentBlob) return [];
      return [
        {
          file: selectedFile,
          content: selectedFile.contentBlob,
        },
      ];
    }
    return [
      {
        file: selectedFile,
        content: editorContent,
      },
    ];
  }, [canEdit, editorContent, isDirty, selectedFile]);

  const { loading: saveLoading, runAsync: runSaveTargetsAsync } = useRequest(
    async (targets: SaveSkillFileTarget[], options?: SaveAssetOptions) => {
      if (!skill || targets.length === 0) return { options, failedCount: 0 };

      setSaveQueueItems(
        targets.map(({ file }) => ({
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          phase: 'preparing',
          progress: 0,
        }))
      );

      const currentSelectedFileId = selectedFile?.id;
      let results: UploadSkillAssetResult[];
      try {
        results = await skillService.uploadAssets(
          skill.resourceId,
          skill.draftVersion,
          targets.map(({ file, content }) => ({
            clientId: file.id,
            name: file.name,
            path: file.path,
            content,
            size: file.size,
          })),
          {
            onProgress: ({ clientId, progress }) => {
              setSaveQueueItems((prev) =>
                prev.map((item) =>
                  item.id === clientId ? { ...item, phase: 'uploading', progress } : item
                )
              );
            },
          }
        );
      } catch (err) {
        const errorMessage = parseErrorMessage(err);
        setSaveQueueItems((prev) =>
          prev.map((item) =>
            item.phase === 'preparing' || item.phase === 'uploading'
              ? { ...item, phase: 'failed', errorMessage }
              : item
          )
        );
        throw err;
      }

      const targetById = new Map(targets.map((target) => [target.file.id, target]));
      const resultById = new Map(results.map((result) => [result.clientId, result]));
      const failedResults = results.filter((result) => result.error);
      const successResults = results.filter((result) => !result.error);

      if (successResults.length > 0) {
        setLocalFiles((prev) =>
          successResults.reduce((tree, result) => {
            const target = targetById.get(result.clientId);
            if (!target) return tree;
            return updateSavedTreeFile(tree, target.file.id, target.content, result.assetId);
          }, prev)
        );

        successResults.forEach((result) => {
          const assetId = result.assetId;
          if (!assetId) return;
          setSelectedFileId((prev) => (prev === result.clientId ? assetId : prev));
          setSelectedTreeNodeId((prev) => (prev === result.clientId ? assetId : prev));
          if (pendingIntent?.type === 'switchFile' && pendingIntent.fileId === result.clientId) {
            setPendingIntent({ type: 'switchFile', fileId: assetId });
          }
        });

        const selectedTarget = currentSelectedFileId ? targetById.get(currentSelectedFileId) : null;
        const selectedResult = currentSelectedFileId ? resultById.get(currentSelectedFileId) : null;
        if (
          selectedTarget &&
          selectedResult &&
          !selectedResult.error &&
          typeof selectedTarget.content === 'string'
        ) {
          setSavedContent(selectedTarget.content);
        }
      }

      setSaveQueueItems((prev) =>
        prev.map((item) => {
          const result = resultById.get(item.id);
          if (!result) {
            if (item.phase === 'preparing' || item.phase === 'uploading') {
              return { ...item, phase: 'failed', errorMessage: '保存结果缺失，请重试' };
            }
            return item;
          }
          if (result.error) {
            return {
              ...item,
              phase: 'failed',
              progress: item.progress,
              errorMessage: parseErrorMessage(result.error),
            };
          }
          return {
            ...item,
            phase: 'done',
            progress: 100,
          };
        })
      );

      if (failedResults.length > 0) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_BATCH_SAVE_FAILED, {
          failedCount: failedResults.length,
        });
      }

      return { options, failedCount: 0 };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setSaveQueueItems([]);
        setEditing(false);
        if (skill) void clearDraftCache(skill.resourceId);
        if (result.options?.showToast !== false) {
          toast.success('保存成功');
        }
        if (result.options?.refresh === true) {
          void refreshSkill();
        }
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const saveTargets = useCallback(
    async (targets: SaveSkillFileTarget[], options?: SaveAssetOptions) => {
      if (targets.length === 0) {
        setSaveQueueItems((prev) => (prev.some((item) => item.phase === 'failed') ? [] : prev));
        return;
      }
      await runSaveTargetsAsync(targets, options);
    },
    [runSaveTargetsAsync, setSaveQueueItems]
  );

  const { loading: configLoading, runAsync: runUpdateConfigAsync } = useRequest(
    async (options?: SaveSkillConfigOptions) => {
      if (!skill) return null;
      const name = configName.trim();
      const description = configDescription.trim();
      if (!name || !description) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CONFIG_REQUIRED);
      }
      await skillService.updateSkillInfo(skill.resourceId, name, description);
      return { name, description, options };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setConfigName(result.name);
        setConfigDescription(result.description);
        setSavedConfigName(result.name);
        setSavedConfigDescription(result.description);
        if (result.options?.showToast !== false) {
          toast.success('配置已更新');
        }
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const savePendingChanges = useCallback(
    async (options?: SaveAssetOptions & SaveSkillConfigOptions) => {
      if (isConfigDirty) {
        await runUpdateConfigAsync(options);
      }
      await saveTargets(buildAllSaveTargets(), options);
    },
    [buildAllSaveTargets, isConfigDirty, runUpdateConfigAsync, saveTargets]
  );

  const { loading: publishLoading, run: runPublish } = useRequest(
    async () => {
      if (!skill) return;
      await skillService.publishVersion(skill.resourceId);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('发布成功');
        void refreshSkill();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: versionLoading, run: runSwitchVersion } = useRequest(
    async (version: number) => {
      if (!skill) return null;
      return skillService.getSkillVersionFiles(skill.resourceId, version);
    },
    {
      manual: true,
      onSuccess: (data, params) => {
        if (!data) return;
        setViewingVersion(params[0]);
        setLocalFiles(data.files);
        setSaveQueueItems([]);
        setPendingIntent(null);
        setEditing(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: deleteLoading, run: runDelete } = useRequest(
    async (target: SkillFileNode) => {
      if (!skill) return null;
      const ids = collectFileIds(target);
      const remoteAssetIds = ids.filter(isRemoteAssetId);
      if (remoteAssetIds.length > 0) {
        await skillService.deleteAssets(skill.resourceId, skill.draftVersion, remoteAssetIds);
      }
      return { target, ids };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        const removeIds = new Set<string>([result.target.id, ...result.ids]);
        setLocalFiles((prev) => removeTreeNode(prev, removeIds));
        setSaveQueueItems((prev) => prev.filter((item) => !removeIds.has(item.id)));
        if (removeIds.has(selectedFileId)) setSelectedFileId('');
        if (removeIds.has(selectedTreeNodeId)) setSelectedTreeNodeId('');
        setDeleteTarget(null);
        toast.success('删除成功');
        void refreshSkill();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSave = useCallback(() => {
    if (!canEdit) return;
    void saveTargets(buildAllSaveTargets());
  }, [buildAllSaveTargets, canEdit, saveTargets]);

  const saveCurrentFile = useCallback(
    async (options?: SaveAssetOptions) => {
      if (!canEdit) return;
      await saveTargets(buildCurrentSaveTarget(), options);
    },
    [buildCurrentSaveTarget, canEdit, saveTargets]
  );

  const handlePublish = useCallback(() => {
    if (isSaveQueueActive) {
      toast.warning('正在保存 Skill，请稍后再发布');
      return;
    }
    const mainSkillFile = findRootMainSkillFile(activeFiles);
    if (!mainSkillFile) {
      toast.warning('发布前需要在根目录下创建并保存大写的 SKILL.md');
      return;
    }
    if (hasMissingConfig) {
      toast.warning('发布前需要填写 Config 中的 name 和 description');
      if (!isDirty) applyConfigSelection();
      return;
    }
    if (hasUnsavedSkillChanges || isConfigDirty || isLocalAssetId(mainSkillFile.id)) {
      setPendingIntent({ type: 'publish' });
      return;
    }
    runPublish();
  }, [
    activeFiles,
    applyConfigSelection,
    hasMissingConfig,
    hasUnsavedSkillChanges,
    isConfigDirty,
    isDirty,
    isSaveQueueActive,
    runPublish,
    setPendingIntent,
  ]);

  const handleSaveAndPublish = async () => {
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      setPendingIntent(null);
      runPublish();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndPublish = () => {
    discardLocalSkillChanges();
    if (skill) void clearDraftCache(skill.resourceId);
    if (hasSavedConfigMissing) {
      setPendingIntent(null);
      toast.warning('发布前需要填写 Config 中的 name 和 description');
      if (!isDirty) applyConfigSelection();
      return;
    }
    setPendingIntent(null);
    runPublish();
  };

  const handleCancelLeave = () => {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
    setPendingIntent(null);
  };

  const handleDiscardAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked') return;
    discardLocalSkillChanges();
    if (skill) await clearDraftCache(skill.resourceId);
    navigationBlocker.proceed();
  };

  const handleSaveAndLeave = async () => {
    if (navigationBlocker.state !== 'blocked') return;
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      navigationBlocker.proceed();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndSwitchConfig = () => {
    setPendingIntent(null);
    setEditorContent(savedContent);
    setEditing(false);
    applyConfigSelection();
  };

  const handleSaveAndSwitchConfig = async () => {
    try {
      await saveCurrentFile({ refresh: false, showToast: false });
      setPendingIntent(null);
      applyConfigSelection();
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleDiscardAndSwitchFile = () => {
    const nextFileId = pendingIntent?.type === 'switchFile' ? pendingIntent.fileId : '';
    setPendingIntent(null);
    if (isConfigSelected) {
      resetConfigDraft();
    } else {
      setEditorContent(savedContent);
    }
    if (nextFileId) applyTreeSelection(nextFileId);
    setEditing(false);
  };

  const handleSaveAndSwitchFile = async () => {
    const nextFileId = pendingIntent?.type === 'switchFile' ? pendingIntent.fileId : '';
    if (!nextFileId) return;
    try {
      if (isConfigSelected) {
        await runUpdateConfigAsync({ showToast: false });
      } else {
        await saveCurrentFile({ refresh: false, showToast: false });
      }
      setPendingIntent(null);
      applyTreeSelection(nextFileId);
      setEditing(false);
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleVersionSelect = useCallback(
    (version: number) => {
      if (version === viewingVersion) return;
      if (isSaveQueueActive) {
        toast.warning('正在保存 Skill，请稍后再切换版本');
        return;
      }
      if (hasUnsafeNavigation) {
        setPendingIntent({ type: 'switchVersion', version });
        return;
      }
      runSwitchVersion(version);
    },
    [hasUnsafeNavigation, isSaveQueueActive, runSwitchVersion, setPendingIntent, viewingVersion]
  );

  const handleDiscardAndSwitchVersion = () => {
    const nextVersion = pendingIntent?.type === 'switchVersion' ? pendingIntent.version : null;
    setPendingIntent(null);
    discardLocalSkillChanges();
    if (skill) void clearDraftCache(skill.resourceId);
    if (nextVersion != null) runSwitchVersion(nextVersion);
  };

  const handleSaveAndSwitchVersion = async () => {
    const nextVersion = pendingIntent?.type === 'switchVersion' ? pendingIntent.version : null;
    if (nextVersion == null) return;
    try {
      await savePendingChanges({ refresh: false, showToast: false });
      setPendingIntent(null);
      runSwitchVersion(nextVersion);
    } catch {
      // useRequest 已统一 toast 错误信息。
    }
  };

  const handleToggleEditing = useCallback(() => {
    if (editing) {
      setEditorContent(savedContent);
      setEditing(false);
      return;
    }
    setEditing(true);
  }, [editing, savedContent, setEditing, setEditorContent]);

  const selectNewLocalFile = useCallback(
    (fileId: string) => {
      if (isDirty) {
        setPendingIntent({ type: 'switchFile', fileId });
        return;
      }
      setSelectedFileId(fileId);
      setSelectedTreeNodeId(fileId);
      setEditing(true);
    },
    [isDirty, setEditing, setPendingIntent, setSelectedFileId, setSelectedTreeNodeId]
  );

  const { loading: moveLoading, run: runMoveFile } = useRequest(
    async ({
      dragId,
      dropId,
      dropPosition,
    }: {
      dragId: string;
      dropId: string;
      dropPosition: SkillFileDropPosition;
    }) => {
      if (!skill || !canEdit) return null;
      if (isSaveQueueActive) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_SAVE_IN_PROGRESS);
      }
      if (isDirty) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_UNSAVED_MOVE_BLOCKED);
      }

      const moveResult = moveTreeNode(activeFiles, dragId, dropId, dropPosition);
      if (!moveResult) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_MOVE_CONFLICT);
      }

      const idMap = new Map(moveResult.idMap);
      const remotePathMoves = moveResult.movedFiles.filter(
        ({ previous, next }) => previous.path !== next.path && isRemoteAssetId(previous.id)
      );
      const missingContentFile = remotePathMoves.find(
        ({ previous }) => typeof previous.content !== 'string'
      );

      if (missingContentFile) {
        throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CONTENT_NOT_LOADED);
      }

      const previousAssetIds: string[] = [];
      for (const { previous, next } of remotePathMoves) {
        const assetId = await skillService.saveAsset(skill.resourceId, skill.draftVersion, {
          name: next.name,
          path: next.path,
          content: previous.content ?? '',
        });
        if (assetId) idMap.set(previous.id, assetId);
        previousAssetIds.push(previous.id);
      }

      if (previousAssetIds.length > 0) {
        await skillService.deleteAssets(skill.resourceId, skill.draftVersion, previousAssetIds);
      }

      return { moveResult, idMap };
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (!result) return;
        setLocalFiles(remapTreeNodeIds(result.moveResult.files, result.idMap));
        if (result.idMap.size > 0) {
          setSelectedFileId((prev) => result.idMap.get(prev) ?? prev);
          setSelectedTreeNodeId((prev) => result.idMap.get(prev) ?? prev);
        }
        toast.success('移动成功');
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const canEditTree = canEdit && !moveLoading && !saveLoading && !isSaveQueueActive;

  const handleCommitCreate = (name: string, kind: 'file' | 'folder') => {
    if (!canEdit) {
      setPendingCreate(null);
      return;
    }
    const parentFolder = pendingCreate?.parentFolderId
      ? findFile(activeFiles, pendingCreate.parentFolderId)
      : null;
    const parentPath = parentFolder?.kind === 'folder' ? parentFolder.path : ROOT_PATH;

    if (kind === 'folder') {
      const folder = createLocalFolderNode(name, parentPath);
      setLocalFiles((prev) => appendTreeNode(prev, pendingCreate?.parentFolderId, folder));
      setSelectedTreeNodeId(folder.id);
    } else {
      const file = createLocalFileNode(name, parentPath);
      setLocalFiles((prev) => appendTreeNode(prev, pendingCreate?.parentFolderId, file));
      selectNewLocalFile(file.id);
    }
    setPendingCreate(null);
  };

  const handleAddLocalFiles = async (files: File[]) => {
    if (!canEditTree || files.length === 0) return;
    if (isDirty) {
      toast.warning('请先保存或放弃当前修改后再上传文件');
      return;
    }

    const zipFiles = files.filter(isSkillZipFile);
    if (zipFiles.length > 0) {
      if (files.length > 1 || zipFiles.length > 1) {
        toast.warning('导入 zip 压缩包时请单独上传一个文件');
        return;
      }
      try {
        const parsedFiles = await parseSkillZip(zipFiles[0], {
          mainSkillFileName: MAIN_SKILL_FILE_NAME,
        });
        const conflicts = parsedFiles.filter((file) =>
          findFileByPathAndName(activeFiles, file.path, file.name)
        );
        if (conflicts.length > 0) {
          throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_ZIP_IMPORT_CONFLICT, {
            fileNames: conflicts
              .slice(0, 3)
              .map((file) => file.name)
              .join('、'),
          });
        }

        const nextFiles = parsedFiles.map((file) => ({
          ...createLocalFileNode(file.name, file.path),
          content: file.content,
          contentBlob: file.contentBlob,
          size: file.size,
        }));
        setLocalFiles((prev) =>
          nextFiles.reduce((tree, fileNode) => appendFileNodeByPath(tree, fileNode), prev)
        );
        const mainFile = nextFiles.find(
          (file) =>
            file.name === MAIN_SKILL_FILE_NAME && normalizeDirectoryPath(file.path) === ROOT_PATH
        );
        const selectedZipFile = mainFile ?? nextFiles[0];
        if (selectedZipFile) {
          setSelectedFileId(selectedZipFile.id);
          setSelectedTreeNodeId(selectedZipFile.id);
          setEditing(false);
        }
        toast.success('zip 压缩包已导入，保存后生效');
      } catch (err) {
        toast.danger(parseErrorMessage(err));
      }
      return;
    }

    try {
      const { parentFolderId, parentPath } = resolveCreateParent();
      const nextFiles: SkillFileNode[] = [];

      for (const file of files) {
        const canPreviewUploadedFile = isEditableSkillFileName(file.name);
        nextFiles.push({
          ...createLocalFileNode(file.name, parentPath),
          content: canPreviewUploadedFile ? await file.text() : undefined,
          contentBlob: canPreviewUploadedFile ? undefined : file,
          size: file.size,
        });
      }

      setLocalFiles((prev) =>
        nextFiles.reduce((tree, fileNode) => appendTreeNode(tree, parentFolderId, fileNode), prev)
      );
      const lastFile = nextFiles[nextFiles.length - 1];
      if (lastFile) {
        setSelectedFileId(lastFile.id);
        setSelectedTreeNodeId(lastFile.id);
        setEditing(false);
      }
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleAddLocalFiles(Array.from(event.target.files ?? []));
    } finally {
      event.target.value = '';
    }
  };

  const handleTreeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canEditTree ? 'copy' : 'none';
    if (canEditTree) setIsTreeDragOver(true);
  };

  const handleTreeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setIsTreeDragOver(false);
    }
  };

  const handleTreeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsTreeDragOver(false);
    if (!canEditTree) return;
    void handleAddLocalFiles(Array.from(event.dataTransfer.files));
  };

  const handleTreeWrapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.wisepen-tree__item')) return;
    if (isSaveQueueActive) {
      toast.warning('正在保存 Skill，请稍后再取消选择');
      return;
    }
    if (isDirty) {
      toast.warning('请先保存或放弃当前修改后再取消选择');
      return;
    }
    if (isConfigSelected && isConfigDirty) {
      toast.warning('请先更新或重置配置后再取消选择');
      return;
    }
    setSelectedTreeNodeId('');
    setSelectedFileId('');
  };

  const pendingIntentMode: UnsavedSkillChangesMode | null = pendingIntent?.type ?? null;
  const pendingIntentLoading =
    saveLoading ||
    (pendingIntent?.type !== 'switchConfig' && configLoading) ||
    (pendingIntent?.type === 'publish' && publishLoading);

  const handleCancelPendingIntent = () => {
    if (pendingIntent?.type === 'leave') {
      handleCancelLeave();
      return;
    }
    setPendingIntent(null);
  };

  const handleDiscardPendingIntent = () => {
    if (pendingIntent?.type === 'publish') handleDiscardAndPublish();
    if (pendingIntent?.type === 'leave') void handleDiscardAndLeave();
    if (pendingIntent?.type === 'switchFile') handleDiscardAndSwitchFile();
    if (pendingIntent?.type === 'switchConfig') handleDiscardAndSwitchConfig();
    if (pendingIntent?.type === 'switchVersion') handleDiscardAndSwitchVersion();
  };

  const handleConfirmPendingIntent = () => {
    if (pendingIntent?.type === 'publish') void handleSaveAndPublish();
    if (pendingIntent?.type === 'leave') void handleSaveAndLeave();
    if (pendingIntent?.type === 'switchFile') void handleSaveAndSwitchFile();
    if (pendingIntent?.type === 'switchConfig') void handleSaveAndSwitchConfig();
    if (pendingIntent?.type === 'switchVersion') void handleSaveAndSwitchVersion();
  };

  const savePhase = resolveSkillEditorSavePhase({
    isFileDirty: isDirty,
    isConfigDirty,
    hasUnsavedLocalAssets,
    saveQueueItems,
    isSaving: saveLoading || configLoading || isSaveQueueActive,
  });

  const handleCloseCreateModal = (open: boolean) => {
    setCreateModalOpen(open);
    if (!open && !resourceId) {
      navigate('/app/drive', { replace: true });
    }
  };

  const headerSaveStatusText = formatSaveStatus(canEdit ? savePhase : undefined);

  const headerConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      sidePanel: skill?.resourceInfo
        ? { resource: skill.resourceInfo, onResourceChanged: refreshSkill }
        : undefined,
      header: {
        resource: {
          resourceId: skill?.resourceId ?? resourceId,
          resourceName: skill?.title || 'Skill',
          resourceIconType: 'skill',
          currentActions: skill?.currentActions,
          copyVersion: skill?.version,
          permissionResourceType: RESOURCE_KIND.SKILL,
          ownerId: skill?.ownerId,
          onPermissionSuccess: refreshSkill,
          titleMeta: headerSaveStatusText ? (
            <span
              className={`${styles.toolbarSaveStatus} ${
                savePhase === 'dirty' || savePhase === 'failed' ? styles.toolbarSaveStatusDirty : ''
              }`}
            >
              {headerSaveStatusText}
            </span>
          ) : undefined,
          actions: skill ? (
            <div className={styles.topBarActions}>
              {canEdit ? (
                <>
                  <Button
                    variant="secondary"
                    onPress={handleToggleEditing}
                    isDisabled={
                      !canPreviewSelectedFile ||
                      contentLoading ||
                      saveLoading ||
                      configLoading ||
                      isSaveQueueActive ||
                      moveLoading
                    }
                  >
                    <Pencil size={16} />
                    <span>{editing ? '取消' : '编辑'}</span>
                  </Button>
                  {editing || hasSaveableChanges ? (
                    <Button
                      variant="secondary"
                      onPress={handleSave}
                      isDisabled={
                        !hasSaveableChanges ||
                        contentLoading ||
                        saveLoading ||
                        configLoading ||
                        isSaveQueueActive ||
                        moveLoading
                      }
                    >
                      <Save size={16} />
                      <span>保存</span>
                    </Button>
                  ) : null}
                  <Button
                    variant="primary"
                    onPress={handlePublish}
                    isDisabled={
                      publishLoading ||
                      contentLoading ||
                      saveLoading ||
                      configLoading ||
                      isSaveQueueActive ||
                      moveLoading
                    }
                  >
                    <Upload size={16} />
                    <span>发布</span>
                  </Button>
                </>
              ) : null}
              <SkillVersionDropdown
                items={versionItems}
                disabledKeys={disabledVersionKeys}
                formatVersion={SkillServicesMap.formatVersion}
                onSelect={handleVersionSelect}
              />
            </div>
          ) : undefined,
        },
      },
    }),
    [
      canEdit,
      canPreviewSelectedFile,
      configLoading,
      contentLoading,
      disabledVersionKeys,
      editing,
      handlePublish,
      handleSave,
      handleToggleEditing,
      handleVersionSelect,
      hasSaveableChanges,
      headerSaveStatusText,
      isSaveQueueActive,
      moveLoading,
      publishLoading,
      refreshSkill,
      resourceId,
      savePhase,
      saveLoading,
      skill,
      versionItems,
    ]
  );

  if (!resourceId) {
    return (
      <SkillLayoutConfig config={headerConfig}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="info"
            title="创建 Skill"
            extra={
              <Button variant="primary" onPress={() => setCreateModalOpen(true)}>
                创建新 Skill
              </Button>
            }
          />
        </div>
        <DriveCreate
          type="skill"
          isOpen={createModalOpen}
          onOpenChange={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      </SkillLayoutConfig>
    );
  }

  if (error) {
    return (
      <SkillLayoutConfig config={headerConfig}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="无法打开 Skill"
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </SkillLayoutConfig>
    );
  }

  if (loading && !skill) {
    return (
      <SkillLayoutConfig config={headerConfig}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span>正在加载 Skill...</span>
          </div>
        </div>
      </SkillLayoutConfig>
    );
  }

  return (
    <SkillLayoutConfig config={headerConfig}>
      <div className={styles.page}>
        <div className={styles.mainArea}>
          {skill ? (
            <div className={styles.contentRow}>
              <div className={styles.middlePanelSlot}>
                <section className={styles.middlePanel}>
                  <div className={styles.middlePanelHeader}>
                    <span className={styles.middlePanelLabel}>文件</span>
                    {canEditTree ? (
                      <div className={styles.middlePanelActions}>
                        <button
                          type="button"
                          className={styles.iconBtnSm}
                          aria-label="新建文件夹"
                          onClick={() => handleStartCreate('folder')}
                        >
                          <FolderPlus size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtnSm}
                          aria-label="新建文件"
                          onClick={() => handleStartCreate('file')}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtnSm}
                          aria-label="上传文件"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`${styles.treeWrap} ${isTreeDragOver ? styles.treeWrapDragOver : ''}`}
                    onDragOver={handleTreeDragOver}
                    onDragLeave={handleTreeDragLeave}
                    onDrop={handleTreeDrop}
                    onClick={handleTreeWrapClick}
                  >
                    {canEditTree && isTreeDragOver ? (
                      <div className={styles.treeDropHint}>释放以上传文件或 zip 压缩包</div>
                    ) : null}
                    <SkillFileTree
                      files={activeFiles}
                      prependNodes={configTreeNodes}
                      selectedFileId={selectedFileId}
                      selectedNodeId={selectedTreeNodeId}
                      expandedKeys={expandedKeys}
                      pendingCreate={pendingCreate}
                      isOwner={canEditTree}
                      onSelect={handleTreeSelect}
                      onCommitCreate={handleCommitCreate}
                      onCancelCreate={() => setPendingCreate(null)}
                      onDeleteFile={(fileId) => setDeleteTarget(findFile(activeFiles, fileId))}
                      onMoveFile={runMoveFile}
                    />
                    {activeFiles.length === 0 && !pendingCreate ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={canEdit ? '暂无文件，请上传或新建' : '暂无文件'}
                        className={styles.emptyBlock}
                      />
                    ) : null}
                  </div>
                  <SkillSaveQueueDock items={visibleSaveQueueItems} onRetry={handleSave} />
                </section>
              </div>

              <div className={styles.rightPanelSlot}>
                <main className={styles.rightPanel}>
                  {isConfigSelected ? (
                    <SkillConfigPanel
                      name={configName}
                      description={configDescription}
                      canEdit={canEdit}
                      isDirty={isConfigDirty}
                      isLoading={configLoading}
                      onNameChange={setConfigName}
                      onDescriptionChange={setConfigDescription}
                      onReset={resetConfigDraft}
                      onSave={() => void runUpdateConfigAsync()}
                    />
                  ) : selectedFile ? (
                    <>
                      <header className={styles.editorHeader}>
                        <span className={styles.editorFileName}>{selectedFile.name}</span>
                      </header>
                      <div className={styles.editorBody}>
                        {canPreviewSkillFile(selectedFile) ? (
                          <SkillEditor
                            content={editorContent}
                            fileName={selectedFile.name}
                            readOnly={
                              !editing ||
                              !canEdit ||
                              contentLoading ||
                              saveLoading ||
                              isSaveQueueActive ||
                              versionLoading ||
                              moveLoading
                            }
                            onSave={handleSave}
                            onChange={setEditorContent}
                          />
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="该文件类型暂不支持预览，保存时会保留原文件内容"
                            className={styles.emptyBlock}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="请选择文件进行编辑"
                      className={styles.emptyBlock}
                    />
                  )}
                </main>
              </div>
            </div>
          ) : (
            <div className={styles.middleOverlay}>
              <ResultState status="warning" title="无法打开 Skill" />
            </div>
          )}
        </div>
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === 'folder' ? '删除文件夹' : '删除文件'}
        description={
          deleteTarget?.kind === 'folder'
            ? `确定删除该文件夹「${deleteTarget?.name}」及其所有内容吗？此操作不可撤销。`
            : `确定删除该文件「${deleteTarget?.name}」吗？此操作不可撤销。`
        }
        confirmText="删除"
        onConfirm={() => {
          if (deleteTarget) runDelete(deleteTarget);
        }}
        isConfirmLoading={deleteLoading}
        isDismissable={!deleteLoading}
      />

      <UnsavedSkillChangesModal
        isOpen={pendingIntentMode != null}
        mode={pendingIntentMode ?? 'leave'}
        isLoading={pendingIntentLoading}
        onCancel={handleCancelPendingIntent}
        onDiscard={handleDiscardPendingIntent}
        onConfirm={handleConfirmPendingIntent}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void handleFileChange(event)}
      />
      <DriveCreate
        type="skill"
        isOpen={createModalOpen}
        onOpenChange={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </SkillLayoutConfig>
  );
}

export default SkillView;
