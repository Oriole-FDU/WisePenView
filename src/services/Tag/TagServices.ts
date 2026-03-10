import type { ResourceItem } from '@/types/resource';
import type { FolderListByPathResponse } from '@/types/folder';
import type { ApiResponse } from '@/types/api';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { getFolderDisplayName } from '@/utils/path';
import { ResourceServices } from '@/services/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource/index.type';
import {
  getTagTreeMock,
  getListByPathMock,
  createPathTagMock,
  renamePathTagMock,
  removePathTagMock,
  moveFolderToFolderMock,
} from '@/services/mock/folderView';
import type {
  GetTagTreeRequest,
  GetListByPathRequest,
  TagTreeNode,
  AddTagRequest,
  ChangeTagRequest,
  RemoveTagRequest,
  UpdateTagRequest,
  MoveTagRequest,
} from './index.type';

/** 启用 mock 时，Tag 相关接口使用 folderView mock 数据，不请求后端 */
const USE_TAG_MOCK = true;

const isPathTag = (tagName: string): boolean => tagName.startsWith('/');

/** 递归过滤：只保留 tagName 不以 / 开头的节点（用户可见标签） */
const filterNonPathTags = (nodes: TagTreeNode[]): TagTreeNode[] => {
  return nodes
    .filter((node) => !isPathTag(node.tagName ?? ''))
    .map((node) => ({
      ...node,
      children: node.children?.length
        ? filterNonPathTags(node.children)
        : undefined,
    }));
};

/** 递归过滤：只保留 tagName 以 / 开头的节点（路径 tag 树） */
const filterPathTagsOnly = (nodes: TagTreeNode[]): TagTreeNode[] => {
  return nodes
    .filter((node) => isPathTag(node.tagName ?? ''))
    .map((node) => ({
      ...node,
      children: node.children?.length
        ? filterPathTagsOnly(node.children)
        : undefined,
    }));
};

/** 在树中按 path 查找节点（path 与 tagName 对应，如 '/' 或 '/a/b'） */
const findNodeByPath = (
  nodes: TagTreeNode[],
  path: string
): TagTreeNode | null => {
  const normalized = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  for (const node of nodes) {
    if ((node.tagName ?? '') === normalized) return node;
    if (node.children?.length) {
      const found = findNodeByPath(node.children, normalized);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 获取完整标签树（内部函数，含路径 tag 与用户 tag）
 * 获取个人或小组的标签树，不传 groupId 则获取个人标签树
 * 外部应使用 getUserTagTree（用户可见）或 getPathTagTree（文件夹导航）
 */
const getTagTree = async (
  params?: GetTagTreeRequest
): Promise<TagTreeNode[]> => {
  if (USE_TAG_MOCK) {
    return getTagTreeMock(params?.groupId);
  }
  const res = (await Axios.get('/resource/tag/getTagTree', {
    params: params?.groupId != null ? { groupId: params.groupId } : undefined,
  })) as ApiResponse<TagTreeNode[]>;
  checkResponse(res);
  return res.data ?? [];
};

/**
 * 用户可见的 tag 树（TagTree 展示用）
 * 调用 getTagTree，递归过滤掉 tagName 以 / 开头的节点
 */
const getUserTagTree = async (
  params?: GetTagTreeRequest
): Promise<TagTreeNode[]> => {
  const raw = await getTagTree(params);
  return filterNonPathTags(raw);
};

/**
 * 路径 tag 树（文件夹视图导航用）
 * 调用 getTagTree 不传 groupId，递归只保留 / 前缀节点
 */
const getPathTagTree = async (): Promise<TagTreeNode[]> => {
  const raw = await getTagTree();
  return filterPathTagsOnly(raw);
};

/**
 * 按路径获取路径 tag 节点（用于新建文件夹获取 parentId、移动文件获取 targetTagId）
 */
const getPathTagNode = async (path: string): Promise<TagTreeNode | null> => {
  const pathTree = await getPathTagTree();
  return findNodeByPath(pathTree, path);
};

/**
 * 某路径下的子文件夹 + 文件列表
 * 1）getPathTagTree 解析 2）ResourceServices 按 tagId 查文件 3）拼接返回
 * 支持 filePage/filePageSize 实现无限滚动
 */
const getListByPath = async (
  params: GetListByPathRequest
): Promise<FolderListByPathResponse> => {
  if (USE_TAG_MOCK) {
    return getListByPathMock(
      params.path,
      params.filePage ?? 1,
      params.filePageSize ?? 20
    );
  }
  // 获取子tag作为子文件夹
  const pathTree = await getPathTagTree();
  const node = findNodeByPath(pathTree, params.path);

  const folders = node?.children ?? [];

  const filePage = params.filePage ?? 1;
  const filePageSize = params.filePageSize ?? 20;
  const tagId = node?.tagId;

  // 获取当前路径文件列表
  let files: ResourceItem[] = [];
  let totalFiles = 0;

  if (tagId != null) {
    const res = await ResourceServices.getUserResources({
      page: filePage,
      size: filePageSize,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: [tagId],
      tagQueryLogicMode: 'AND',
    });
    files = res.list;
    totalFiles = res.total;
  }

  return { folders, files, totalFiles };
};

/**
 * 更新标签（兼容旧接口 tagId）
 * 与 OpenAPI TagUpdateRequest 对应
 */
const updateTag = async (params: UpdateTagRequest): Promise<void> => {
  if (USE_TAG_MOCK) {
    if (isPathTag(params.tagName ?? '')) {
      await renamePathTagMock(params.targetTagId, getFolderDisplayName(params.tagName ?? ''));
    }
    return;
  }
  const res = (await Axios.post('/tag/update', params)) as ApiResponse;
  checkResponse(res);
};

/**
 * 创建标签，返回新创建的 tagId
 * 与 OpenAPI addTag 对应
 */
const addTag = async (params: AddTagRequest): Promise<string> => {
  if (USE_TAG_MOCK) {
    if (isPathTag(params.tagName ?? '')) {
      const tagName = params.tagName ?? '';
      const parts = tagName.split('/').filter(Boolean);
      const parentPath = parts.length > 1 ? '/' + parts.slice(0, -1).join('/') : '/';
      const folderName = getFolderDisplayName(tagName);
      const node = await createPathTagMock(parentPath, folderName);
      return node.tagId;
    }
    return `mock-tag-${Date.now()}`;
  }
  const res = (await Axios.post('/tag/add', params)) as ApiResponse<string>;
  checkResponse(res);
  return res.data ?? '';
};

/**
 * 修改标签（使用 targetTagId）
 * 与 OpenAPI changeTag 对应
 */
const changeTag = async (params: ChangeTagRequest): Promise<void> => {
  if (USE_TAG_MOCK) {
    if (isPathTag(params.tagName ?? '')) {
      await renamePathTagMock(params.targetTagId, getFolderDisplayName(params.tagName ?? ''));
    }
    return;
  }
  const res = (await Axios.post('/tag/change', params)) as ApiResponse;
  checkResponse(res);
};

/**
 * 删除标签
 * 与 OpenAPI removeTag 对应
 */
const removeTag = async (params: RemoveTagRequest): Promise<void> => {
  if (USE_TAG_MOCK) {
    await removePathTagMock(params.targetTagId);
    return;
  }
  const res = (await Axios.post('/tag/remove', params)) as ApiResponse;
  checkResponse(res);
};

/**
 * 移动/拖拽标签到新父节点
 * 与 OpenAPI TagMoveRequest 对应
 */
const moveTag = async (params: MoveTagRequest): Promise<void> => {
  if (USE_TAG_MOCK) {
    await moveFolderToFolderMock(
      params.targetTagId,
      params.newParentId || 'path-root'
    );
    return;
  }
  const res = (await Axios.post('/tag/move', params)) as ApiResponse;
  checkResponse(res);
};

export const TagServices = {
  getUserTagTree,
  getPathTagTree,
  getPathTagNode,
  getListByPath,
  updateTag,
  addTag,
  changeTag,
  removeTag,
  moveTag,
};
