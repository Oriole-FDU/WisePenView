import { useCallback } from 'react';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { ResourceItem } from '@/types/resource';
import type { Folder } from '@/types/folder';
import type { IResourceService } from '@/services/Resource';
import type { ITagService } from '@/services/Tag';
import { parseErrorMessage } from '@/utils/parseErrorMessage';

export interface UseTreeDriveDropParams {
  resourceService: IResourceService;
  tagService: ITagService;
  refresh: () => void;
}

/** 文件拖放到文件夹 */
export type OnDropFile = (file: ResourceItem, targetFolder: Folder) => Promise<void>;
/** 文件夹拖放到文件夹 */
export type OnDropFolder = (folder: Folder, targetFolder: Folder) => Promise<void>;

/**
 * TreeDrive 拖放逻辑：文件/文件夹拖到目标文件夹后的移动与刷新
 */
export function useTreeDriveDrop(params: UseTreeDriveDropParams): {
  handleDrop: OnDropFile;
  handleDropFolder: OnDropFolder;
} {
  const { resourceService, tagService, refresh } = params;
  const message = useAppMessage();

  const handleDrop = useCallback<OnDropFile>(
    async (file, targetFolder) => {
      if (file.resourceId == null || file.resourceId === '') return;
      const targetPath = targetFolder.tagName ?? '/';
      try {
        await resourceService.updateResourcePath({
          resourceId: file.resourceId,
          path: targetPath,
        });
        message.success(`已移动到 ~${targetPath === '/' ? '根目录' : targetPath}`);
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err, '移动失败'));
      }
    },
    [resourceService, refresh, message]
  );

  const handleDropFolder = useCallback<OnDropFolder>(
    async (folder, targetFolder) => {
      try {
        await tagService.moveTag({
          targetTagId: folder.tagId,
          newParentId: targetFolder.tagId,
        });
        message.success(`已将「${folder.tagName}」移动到「${targetFolder.tagName}」下`);
        refresh();
      } catch (err) {
        message.error(parseErrorMessage(err, '移动失败'));
      }
    },
    [tagService, refresh, message]
  );

  return { handleDrop, handleDropFolder };
}
