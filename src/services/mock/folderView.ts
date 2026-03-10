/**
 * 文件夹视图 Mock 数据
 * 用于前端独立开发，不依赖后端 getTagTree / getUserResources
 */
import type { ResourceItem } from '@/types/resource';
import type { TagTreeResponse } from '@/services/Tag/index.type';
import type { FolderListByPathResponse } from '@/types/folder';
import { getFolderDisplayName } from '@/utils/path';

/** 深拷贝节点，用于得到可变的路径树 */
const cloneNode = (node: TagTreeResponse): TagTreeResponse => ({
  ...node,
  children: node.children?.map(cloneNode),
});

/** Mock 路径 tag 树（仅路径节点，tagName 即路径）；只读模板，用于初始化 */
const MOCK_PATH_TREE_TEMPLATE: TagTreeResponse = {
  tagId: 'path-root',
  tagName: '/',
  children: [
    {
      tagId: 'path-documents',
      parentId: 'path-root',
      tagName: '/documents',
      children: [
        {
          tagId: 'path-documents-notes',
          parentId: 'path-documents',
          tagName: '/documents/notes',
          children: [],
        },
        {
          tagId: 'path-documents-reports',
          parentId: 'path-documents',
          tagName: '/documents/reports',
          children: [],
        },
      ],
    },
    {
      tagId: 'path-images',
      parentId: 'path-root',
      tagName: '/images',
      children: [
        {
          tagId: 'path-images-2024',
          parentId: 'path-images',
          tagName: '/images/2024',
          children: [],
        },
      ],
    },
    {
      tagId: 'path-work',
      parentId: 'path-root',
      tagName: '/work',
      children: [],
    },
  ],
};

/** 可变路径树：文件夹拖拽移动后从此处读写 */
const pathTreeRoot = cloneNode(MOCK_PATH_TREE_TEMPLATE);

/**
 * 按路径生成 Mock 文件列表（数量足够触发无限滚动，每页 20 条）
 * 仅用于初始化 filesByPath，后续移动文件/文件夹会直接改写 filesByPath / pathTreeRoot
 */
const buildMockFilesForPath = (path: string): ResourceItem[] => {
  const base = path === '/' ? '根目录' : path.split('/').filter(Boolean).pop() ?? '未知';
  const count =
    path === '/' ? 55
    : path === '/documents' ? 60
    : path === '/documents/notes' || path === '/documents/reports' ? 45
    : path === '/images' ? 50
    : path === '/images/2024' ? 40
    : 55;
  return Array.from({ length: count }, (_, i) => ({
    resourceId: `mock-res-${path}-${i}`,
    resourceName: `${base} 文件 ${i + 1}${i % 3 === 0 ? '.note' : i % 3 === 1 ? '.md' : '.pdf'}`,
    resourceType: i % 3 === 0 ? 'NOTE' : i % 3 === 1 ? 'NOTE' : 'FILE',
    size: (i + 1) * 1024,
    currentTags: [path],
  }));
};

/** 初始路径列表，用于生成 filesByPath 与 move 时遍历 */
const INITIAL_PATHS = [
  '/',
  '/documents',
  '/documents/notes',
  '/documents/reports',
  '/images',
  '/images/2024',
  '/work',
] as const;

/** 可变：拖拽移动后从此处读写，getListByPathMock / moveFileToPathMock / moveFolderToFolderMock 共用 */
const filesByPath: Record<string, ResourceItem[]> = Object.fromEntries(
  INITIAL_PATHS.map((p) => [p, buildMockFilesForPath(p)])
);

/** 在树中按 path 查找节点（path 与 tagName 一致） */
const findNodeByPath = (
  node: TagTreeResponse,
  path: string
): TagTreeResponse | null => {
  const normalized = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  if ((node.tagName ?? '') === normalized) return node;
  for (const child of node.children ?? []) {
    const found = findNodeByPath(child, normalized);
    if (found) return found;
  }
  return null;
};

/** 在树中按 tagId 查找节点，并返回其父节点的 children 数组及下标（根节点无父，不返回） */
const findNodeAndParent = (
  node: TagTreeResponse,
  tagId: string,
  parent: { children: TagTreeResponse[]; index: number } | null = null
): { node: TagTreeResponse; parent: { children: TagTreeResponse[]; index: number } } | null => {
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagId === tagId) {
      return { node: child, parent: { children, index: i } };
    }
    const found = findNodeAndParent(child, tagId, { children, index: i });
    if (found) return found;
  }
  return null;
};

/**
 * 递归更新节点及其子孙的 tagName：旧路径前缀替换为新路径前缀
 * 用于移动文件夹后，被移节点及其子路径的 tagName 整体迁移（如 /documents/notes -> /work/notes）
 */
const updateNodePathPrefix = (
  node: TagTreeResponse,
  oldPrefix: string,
  newPrefix: string
): void => {
  const tagName = node.tagName ?? '';
  if (tagName.startsWith(oldPrefix)) {
    node.tagName = newPrefix + tagName.slice(oldPrefix.length);
    node.children?.forEach((ch) => updateNodePathPrefix(ch, oldPrefix, newPrefix));
  }
};

/** Mock 请求延迟（毫秒），模拟网络停顿便于看到 loading 状态 */
const MOCK_DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock 获取标签树（个人路径树）
 * @param groupId 小组 ID，有值时返回空（mock 暂不支持小组标签）
 */
export const getTagTreeMock = async (groupId?: string): Promise<TagTreeResponse[]> => {
  await delay(MOCK_DELAY_MS);
  if (groupId) return [];
  return [pathTreeRoot];
};

/**
 * Mock getListByPath：按 path 返回子文件夹 + 分页文件
 */
export const getListByPathMock = async (
  path: string,
  filePage = 1,
  filePageSize = 20
): Promise<FolderListByPathResponse> => {
  await delay(MOCK_DELAY_MS);

  const node = findNodeByPath(pathTreeRoot, path);
  const folders = node?.children ?? [];

  const allFiles = filesByPath[path] ?? [];
  const totalFiles = allFiles.length;
  const start = (filePage - 1) * filePageSize;
  const files = allFiles.slice(start, start + filePageSize);

  return { folders, files, totalFiles };
};

/**
 * Mock 移动文件到目标路径（拖拽释放后调用，会更新内存中的归属，下次 getListByPathMock 即生效）
 */
export const moveFileToPathMock = async (
  resourceId: string,
  targetPath: string
): Promise<void> => {
  await delay(MOCK_DELAY_MS);
  const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  let file: ResourceItem | undefined;
  let fromPath: string | undefined;
  for (const p of Object.keys(filesByPath)) {
    const list = filesByPath[p];
    const idx = list.findIndex((f) => f.resourceId === resourceId);
    if (idx >= 0) {
      file = list[idx];
      fromPath = p;
      list.splice(idx, 1);
      break;
    }
  }
  if (!file || !fromPath) return;
  if (!filesByPath[normalizedTarget]) {
    filesByPath[normalizedTarget] = [];
  }
  filesByPath[normalizedTarget].push({
    ...file,
    currentTags: [normalizedTarget],
  });
};

/**
 * Mock 新建路径 tag（在当前路径下新建文件夹）
 * 更新 pathTreeRoot 与 filesByPath
 */
export const createPathTagMock = async (
  parentPath: string,
  folderName: string
): Promise<TagTreeResponse> => {
  await delay(MOCK_DELAY_MS);
  const normalizedParent = parentPath === '' || !parentPath.startsWith('/') ? '/' : parentPath;
  const trimmed = folderName.trim();
  if (!trimmed) {
    throw new Error('文件夹名称不能为空');
  }
  if (trimmed.includes('/')) {
    throw new Error('文件夹名称不能包含 /');
  }
  const newPath = normalizedParent === '/' ? `/${trimmed}` : `${normalizedParent}/${trimmed}`;
  const parentNode = findNodeByPath(pathTreeRoot, normalizedParent);
  if (!parentNode) {
    throw new Error(`父路径 ${normalizedParent} 不存在`);
  }
  const exists = (parentNode.children ?? []).some(
    (c) => getFolderDisplayName(c.tagName ?? '') === trimmed
  );
  if (exists) {
    throw new Error(`「${trimmed}」已存在`);
  }
  const newTagId = `path-${newPath.replace(/\//g, '-').replace(/^-/, '') || 'root'}`;
  const newNode: TagTreeResponse = {
    tagId: newTagId,
    parentId: parentNode.tagId,
    tagName: newPath,
    children: [],
  };
  if (!parentNode.children) parentNode.children = [];
  parentNode.children.push(newNode);
  filesByPath[newPath] = [];
  return newNode;
};

/**
 * Mock 重命名路径 tag
 */
export const renamePathTagMock = async (
  tagId: string,
  newName: string
): Promise<void> => {
  await delay(MOCK_DELAY_MS);
  const trimmed = newName.trim();
  if (!trimmed || trimmed.includes('/')) {
    throw new Error('名称不能为空或包含 /');
  }
  const found = findNodeAndParent(pathTreeRoot, tagId);
  if (!found) return;
  const node = found.node;
  const oldPath = node.tagName ?? '';
  if (!oldPath || oldPath === '/') return;
  const parentPath = oldPath.split('/').slice(0, -1).join('/') || '/';
  const newPath = parentPath === '/' ? `/${trimmed}` : `${parentPath}/${trimmed}`;
  if (newPath === oldPath) return;
  const siblings = found.parent.children;
  const displayName = getFolderDisplayName(oldPath);
  if (trimmed === displayName) return;
  const exists = siblings.some(
    (c, i) => found.parent.index !== i && getFolderDisplayName(c.tagName ?? '') === trimmed
  );
  if (exists) throw new Error(`「${trimmed}」已存在`);
  updateNodePathPrefix(node, oldPath, newPath);
  const keysToMove = Object.keys(filesByPath).filter(
    (k) => k === oldPath || k.startsWith(oldPath + '/')
  );
  for (const k of keysToMove) {
    const newKey = newPath + k.slice(oldPath.length);
    filesByPath[newKey] = filesByPath[k];
    delete filesByPath[k];
  }
};

/**
 * Mock 重命名文件（更新 filesByPath 中的 resourceName）
 */
export const renameFileMock = async (
  resourceId: string,
  newName: string
): Promise<void> => {
  await delay(MOCK_DELAY_MS);
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('文件名不能为空');
  for (const list of Object.values(filesByPath)) {
    const f = list.find((x) => x.resourceId === resourceId);
    if (f) {
      f.resourceName = trimmed;
      return;
    }
  }
};

/**
 * Mock 删除文件（从 filesByPath 中移除）
 */
export const deleteFileMock = async (resourceId: string): Promise<void> => {
  await delay(MOCK_DELAY_MS);
  for (const path of Object.keys(filesByPath)) {
    const idx = filesByPath[path].findIndex((f) => f.resourceId === resourceId);
    if (idx >= 0) {
      filesByPath[path].splice(idx, 1);
      return;
    }
  }
};

/**
 * Mock 删除路径 tag（级联删除其下所有子路径及文件归属）
 */
export const removePathTagMock = async (tagId: string): Promise<void> => {
  await delay(MOCK_DELAY_MS);
  const found = findNodeAndParent(pathTreeRoot, tagId);
  if (!found) return;
  const oldPath = found.node.tagName ?? '';
  if (!oldPath || oldPath === '/') return;
  found.parent.children.splice(found.parent.index, 1);
  const keysToDelete = Object.keys(filesByPath).filter(
    (k) => k === oldPath || k.startsWith(oldPath + '/')
  );
  for (const k of keysToDelete) delete filesByPath[k];
};

/**
 * Mock 将文件夹移动到另一文件夹下（路径树重构）
 * 1）从原父 children 中移除并挂到目标节点下
 * 2）更新该节点及所有子孙的 tagName（路径前缀替换）
 * 3）迁移 filesByPath 中旧路径（及子路径）下的文件到新路径，避免文件“丢失”
 */
/**
 * Mock 将文件夹移动到另一文件夹下（路径树重构）
 * 1）从原父 children 中移除并挂到目标节点下
 * 2）更新该节点及所有子孙的 tagName（路径前缀替换）
 * 3）迁移 filesByPath 中旧路径（及子路径）下的文件到新路径，避免文件"丢失"
 * @param targetParentTagId 目标父节点 tagId，传 'path-root' 或空时移至根节点
 */
export const moveFolderToFolderMock = async (
  draggedTagId: string,
  targetParentTagId?: string
): Promise<void> => {
  await delay(MOCK_DELAY_MS);

  const root = pathTreeRoot;
  const dragged = findNodeAndParent(root, draggedTagId);
  if (!dragged) return;
  const oldPath = dragged.node.tagName ?? '';
  if (!oldPath || oldPath === '/') return;

  const segment = oldPath.split('/').filter(Boolean).pop() ?? '';
  let targetPath: string;
  let targetChildren: TagTreeResponse[];

  if (!targetParentTagId || targetParentTagId === 'path-root') {
    targetPath = '/';
    targetChildren = root.children ?? [];
  } else {
    const target = findNodeAndParent(root, targetParentTagId);
    if (!target) return;
    targetPath = target.node.tagName ?? '/';
    if (targetPath === '/') return;
    if (targetPath === oldPath || targetPath.startsWith(oldPath + '/')) return;
    targetChildren = target.node.children ?? [];
  }

  const newPath = targetPath === '/' ? `/${segment}` : `${targetPath}/${segment}`;

  const [moved] = dragged.parent.children.splice(dragged.parent.index, 1);
  updateNodePathPrefix(moved, oldPath, newPath);
  moved.parentId = targetPath === '/' ? root.tagId : targetParentTagId;
  targetChildren.push(moved);
  if (targetPath === '/') {
    root.children = targetChildren;
  }

  const keysToMove = Object.keys(filesByPath).filter(
    (k) => k === oldPath || k.startsWith(oldPath + '/')
  );
  for (const k of keysToMove) {
    const newKey = newPath + k.slice(oldPath.length);
    filesByPath[newKey] = filesByPath[k];
    delete filesByPath[k];
  }
};
