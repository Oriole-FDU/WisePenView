/**
 * 图床 / 对象存储代理上传（对齐 WisePenCloud `POST /storage/imageUpload`）
 */

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MAX_SIZE_LABEL } from '@/utils/image/uploadLimit';

/**
 * 与后端图床代理 `max-small-file-size` 一致；超过则抛错，供 `uploadImage` 与业务层复用。
 */
export function assertImageProxyUploadLimit(file: File): void {
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_FILE_TOO_LARGE, {
      maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL,
    });
  }
}

/** 上传成功后的存储记录（与后端 StorageRecordDTO 核心字段对齐） */
export interface ImageStorageRecord {
  fileId?: number;
  domain: string;
  objectKey: string;
  md5?: string;
  size?: number;
}

export interface ImageUploadRequest {
  /** 须 ≤ {@link IMAGE_UPLOAD_MAX_BYTES}；`uploadImage` 内会再次校验，便于未走 UI 拦截的调用方 */
  file: File;
  /** 存储业务场景，需与后端 StorageSceneEnum 对齐 */
  scene: ImageStorageScene;
  /** 业务隔离标识，可用于细分同场景下的存储路径 */
  bizTag?: string;
}

export interface ImageUploadResult {
  record: ImageStorageRecord;
  /**
   * 便于直接写入 `groupCoverUrl` 等字段：`domain` + `objectKey`
   * 若 Bucket 为私有读，需改走后端预签名 URL，勿依赖此拼接 URL 长期有效
   */
  publicUrl: string;
}

export interface IImageService {
  /** 图床代理上传（需登录态，由 Axios 携带 Cookie） */
  uploadImage(params: ImageUploadRequest): Promise<ImageUploadResult>;
}

/** 后端 StorageSceneEnum */
export type ImageStorageScene =
  | 'PUBLIC_IMAGE_FOR_USER'
  | 'PUBLIC_IMAGE_FOR_GROUP'
  | 'PRIVATE_IMAGE_FOR_NOTE';

/** 由存储域名与 objectKey 拼公开访问地址（去重斜杠） */
export function buildImagePublicUrl(
  record: Pick<ImageStorageRecord, 'domain' | 'objectKey'>
): string {
  const base = record.domain.replace(/\/+$/, '');
  const path = record.objectKey.replace(/^\/+/, '');
  return `${base}/${path}`;
}
