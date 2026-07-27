import type { SkillFileDropPosition } from '@/components/Skill/SkillFileTree/index.type';
import type { SkillFileNode } from '@/domains/Skill';

export const ROOT_PATH = '/';
export const MAIN_SKILL_FILE_NAME = 'SKILL.md';

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

export function findFile(nodes: SkillFileNode[], id: string): SkillFileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findFile(node.children, id) : null;
    if (child) return child;
  }
  return null;
}

export function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

export function joinDirectoryPath(parentPath: string, name: string): string {
  const normalizedParent = normalizeDirectoryPath(parentPath);
  return normalizedParent === ROOT_PATH ? `${ROOT_PATH}${name}` : `${normalizedParent}/${name}`;
}

export function getParentDirectoryPath(path: string): string {
  const normalizedPath = normalizeDirectoryPath(path);
  if (normalizedPath === ROOT_PATH) return ROOT_PATH;
  const lastSlashIndex = normalizedPath.lastIndexOf(ROOT_PATH);
  return lastSlashIndex <= 0 ? ROOT_PATH : normalizedPath.slice(0, lastSlashIndex);
}

export function getFirstFile(nodes: SkillFileNode[]): SkillFileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file') return node;
    const child = node.children ? getFirstFile(node.children) : null;
    if (child) return child;
  }
  return null;
}

export function collectExpandedKeys(nodes: SkillFileNode[]): string[] {
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

export function collectFileIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  if (node.kind === 'file') return [node.id];
  return (node.children ?? []).flatMap(collectFileIds);
}

export function findRootMainSkillFile(nodes: SkillFileNode[]): SkillFileNode | null {
  return (
    nodes.find(
      (node) =>
        node.kind === 'file' &&
        node.name === MAIN_SKILL_FILE_NAME &&
        normalizeDirectoryPath(node.path) === ROOT_PATH
    ) ?? null
  );
}

export function findSkillFileByName(
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

export function collectNodeIds(node: SkillFileNode | null): string[] {
  if (!node) return [];
  return [node.id, ...(node.children ?? []).flatMap(collectNodeIds)];
}

export function isLocalAssetId(id: string): boolean {
  return id.startsWith(LOCAL_FILE_ID_PREFIX);
}

export function isLocalAssetNode(node: SkillFileNode): boolean {
  return node.kind === 'file' && isLocalAssetId(node.id);
}

export function isRemoteAssetId(id: string): boolean {
  return Boolean(
    id &&
    !id.startsWith(LOCAL_FILE_ID_PREFIX) &&
    !id.startsWith(LOCAL_FOLDER_ID_PREFIX) &&
    !id.includes(ROOT_PATH) &&
    !id.includes(':')
  );
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

export function collectLocalAssetNodes(nodes: SkillFileNode[]): SkillFileNode[] {
  return collectFileNodes(nodes).filter(isLocalAssetNode);
}

export function findFileByPathAndName(
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

export function isSkillZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip');
}

export function isEditableSkillFileName(name: string): boolean {
  const normalizedName = name.toLowerCase();
  if (normalizedName === 'dockerfile') return true;
  const extension = normalizedName.split('.').pop();
  return Boolean(extension && EDITABLE_SKILL_FILE_EXTENSIONS.has(extension));
}

export function canPreviewSkillFile(file: SkillFileNode): boolean {
  return typeof file.content === 'string' || isEditableSkillFileName(file.name);
}

export interface MoveTreeNodeResult {
  files: SkillFileNode[];
  idMap: Map<string, string>;
  movedFiles: Array<{ previous: SkillFileNode; next: SkillFileNode }>;
}

export function removeTreeNode(nodes: SkillFileNode[], idSet: Set<string>): SkillFileNode[] {
  return nodes
    .filter((node) => !idSet.has(node.id))
    .map((node) =>
      node.children ? { ...node, children: removeTreeNode(node.children, idSet) } : node
    );
}

export function updateTreeFileContent(
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

export function updateSavedTreeFile(
  nodes: SkillFileNode[],
  id: string,
  content: string | Blob,
  nextId?: string,
  objectKey?: string
): SkillFileNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return {
        ...node,
        id: nextId ?? node.id,
        content: typeof content === 'string' ? content : node.content,
        contentBlob: node.contentBlob,
        objectKey: objectKey ?? node.objectKey,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: updateSavedTreeFile(node.children, id, content, nextId, objectKey),
      };
    }
    return node;
  });
}

export function remapTreeNodes(
  nodes: SkillFileNode[],
  idMap: Map<string, string>,
  objectKeyMap: Map<string, string>
): SkillFileNode[] {
  if (idMap.size === 0 && objectKeyMap.size === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) ?? node.id,
    objectKey: objectKeyMap.get(node.id) ?? node.objectKey,
    children: node.children ? remapTreeNodes(node.children, idMap, objectKeyMap) : undefined,
  }));
}

export function appendTreeNode(
  nodes: SkillFileNode[],
  parentFolderId: string | undefined,
  childNode: SkillFileNode
): SkillFileNode[] {
  if (!parentFolderId) return [...nodes, childNode];
  return nodes.map((node) => {
    if (node.id === parentFolderId && node.kind === 'folder') {
      return { ...node, children: [...(node.children ?? []), childNode] };
    }
    if (node.children)
      return { ...node, children: appendTreeNode(node.children, parentFolderId, childNode) };
    return node;
  });
}

export function appendFileNodeByPath(
  nodes: SkillFileNode[],
  fileNode: SkillFileNode
): SkillFileNode[] {
  const normalizedPath = normalizeDirectoryPath(fileNode.path);
  if (normalizedPath === ROOT_PATH) return appendTreeNode(nodes, undefined, fileNode);
  return appendFileNodeIntoFolderPath(
    nodes,
    normalizedPath.split(ROOT_PATH).filter(Boolean),
    fileNode,
    ROOT_PATH
  );
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
  if (dropPosition === 'inside' && dropNode.kind === 'folder')
    return normalizeDirectoryPath(dropNode.path);
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

export function moveTreeNode(
  nodes: SkillFileNode[],
  dragId: string,
  dropId: string,
  dropPosition: SkillFileDropPosition
): MoveTreeNodeResult | null {
  if (dragId === dropId) return null;
  const dragNode = findFile(nodes, dragId);
  const dropNode = findFile(nodes, dropId);
  if (!dragNode || !dropNode || collectNodeIds(dragNode).includes(dropId)) return null;
  const targetParentPath = resolveMoveParentPath(dropNode, dropPosition);
  const movingIdSet = new Set(collectNodeIds(dragNode));
  if (
    getDirectChildren(nodes, targetParentPath).some(
      (node) => node.name === dragNode.name && !movingIdSet.has(node.id)
    )
  )
    return null;
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

export function createLocalFileNode(name: string, path = ROOT_PATH): SkillFileNode {
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

export function createLocalFolderNode(name: string, parentPath = ROOT_PATH): SkillFileNode {
  const path = joinDirectoryPath(parentPath, name);
  return { id: `folder:${path}`, name, path, kind: 'folder', children: [] };
}
