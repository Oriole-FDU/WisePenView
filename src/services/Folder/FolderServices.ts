import { TagServices } from '@/services/Tag';
import type { TagTreeNode } from '@/services/Tag';

// folder service是对tag service的封装，用于操作文件夹

/**
 * 重命名文件夹
 * @param folder 待重命名的文件夹节点
 * @param newName 新名称（不含路径）
 */
const renameFolder = async (
  folder: TagTreeNode,
  newName: string
): Promise<void> => {
  const tagName = (folder.tagName ?? '').trim();
  if (!tagName || tagName === '/') return;
  const parts = tagName.split('/').filter(Boolean);
  parts[parts.length - 1] = newName.trim();
  const newPath = '/' + parts.join('/');
  await TagServices.changeTag({
    targetTagId: folder.tagId,
    tagName: newPath,
  });
};

/**
 * 删除文件夹（级联删除其子孙节点）
 */
const deleteFolder = async (folder: TagTreeNode): Promise<void> => {
  await TagServices.removeTag({ targetTagId: folder.tagId });
};

/**
 * 在指定路径下创建子文件夹
 * @param parentPath 父路径，如 '/' 或 '/a/b'
 * @param folderName 新文件夹名称
 */
const createFolder = async (
  parentPath: string,
  folderName: string
): Promise<void> => {
  const parentNode = await TagServices.getPathTagNode(parentPath);
  if (!parentNode?.tagId) {
    throw new Error('父路径不存在');
  }
  const newPath =
    parentPath === '/' || !parentPath ? `/${folderName}` : `${parentPath}/${folderName}`;
  await TagServices.addTag({
    parentId: parentNode.tagId,
    tagName: newPath,
  });
};

export const FolderServices = {
  renameFolder,
  deleteFolder,
  createFolder,
};
