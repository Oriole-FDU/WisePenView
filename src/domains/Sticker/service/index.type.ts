/**
 * StickerService 接口与请求类型
 * Sticker = 非路径标签（用户贴纸），是 TagTreeNode 的业务语义包装
 * 装配层：组合 TagService 能力，对上屏蔽底层 Tag API 细节
 */

import type { TagTreeNode } from '@/domains/Tag';

/** 贴纸节点，TagTreeNode 的语义别名 */
export type Sticker = Pick<TagTreeNode, 'tagId' | 'tagName'>;

/** StickerService 接口：供依赖注入使用 */
export interface IStickerService {
  /** 获取当前用户的贴纸树（已过滤路径标签） */
  getStickerList(): Promise<Sticker[]>;
  /** 新增贴纸，返回新建的 tagId */
  addSticker(params: AddStickerRequest): Promise<void>;
  /** 更新贴纸名称/描述 */
  updateSticker(params: UpdateStickerRequest): Promise<void>;
  /** 删除贴纸（级联删除子节点） */
  deleteSticker(params: DeleteStickerRequest): Promise<void>;
  /** 更新资源关联的贴纸列表 */
  updateResourceStickers(params: UpdateResourceStickersRequest): Promise<void>;
}

/** 新增贴纸请求 */
export interface AddStickerRequest {
  /** 贴纸名称 */
  stickerName: string;
}

/** 更新贴纸请求 */
export interface UpdateStickerRequest {
  /** 目标贴纸 ID */
  stickerId: string;
  /** 新名称 */
  stickerName: string;
}

/** 删除贴纸请求 */
export interface DeleteStickerRequest {
  /** 目标贴纸 ID */
  stickerId: string;
}

/** 更新资源关联贴纸请求 */
export interface UpdateResourceStickersRequest {
  resourceId: string;
  stickerIds: string[];
}
