import type { IResourceService } from '@/domains/Resource';
import type { TagTreeResponse } from '@/domains/Tag';
import { ResourceTagApi } from '../apis/ResourceApi';
import type {
  AddStickerRequest,
  DeleteStickerRequest,
  IStickerService,
  Sticker,
  UpdateResourceStickersRequest,
  UpdateStickerRequest,
} from './index.type';

export interface StickerServicesDeps {
  resourceService: IResourceService;
}

export const createStickerServices = (deps: StickerServicesDeps): IStickerService => {
  const { resourceService } = deps;

  const getStickerList = async (): Promise<Sticker[]> => {
    const data = (await ResourceTagApi.getTagTree()) as TagTreeResponse[];
    // 过滤掉路径型（`/` 开头）与系统保留前缀（`.` 开头，例如 `.Trash`）
    const stickers = (data ?? [])
      .filter((node) => {
        const name = node.tagName ?? '';
        return name !== '' && !name.startsWith('/') && !name.startsWith('.');
      })
      .map((node) => ({ tagId: node.tagId, tagName: node.tagName }));
    return stickers;
  };

  const addSticker = async (params: AddStickerRequest): Promise<void> => {
    await ResourceTagApi.addTag({
      tagName: params.stickerName,
    });
  };

  const updateSticker = async (params: UpdateStickerRequest): Promise<void> => {
    await ResourceTagApi.changeTag({
      targetTagId: params.stickerId,
      tagName: params.stickerName,
    });
  };

  const deleteSticker = async (params: DeleteStickerRequest): Promise<void> => {
    await ResourceTagApi.removeTag({
      targetTagId: params.stickerId,
    });
  };

  const updateResourceStickers = async (params: UpdateResourceStickersRequest): Promise<void> => {
    await resourceService.updateResourceTags({
      resourceId: params.resourceId,
      tagIds: params.stickerIds,
    });
  };

  return {
    getStickerList,
    addSticker,
    updateSticker,
    deleteSticker,
    updateResourceStickers,
  };
};
