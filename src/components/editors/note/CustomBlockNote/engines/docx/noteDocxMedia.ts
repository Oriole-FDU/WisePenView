import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export type NoteDocxImageType = 'bmp' | 'gif' | 'jpg' | 'png';

export interface NoteDocxImage {
  data: Uint8Array;
  height: number;
  type: NoteDocxImageType;
  width: number;
}

const DOCX_IMAGE_MAX_WIDTH = 560;

function resolveDisplaySize(width: number, height: number, maxWidth: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxWidth, height: Math.round(maxWidth * 0.62) };
  }
  const scale = Math.min(1, maxWidth / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function readBlobSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () =>
          reject(
            createError({
              code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
              source: 'client',
              meta: {
                reason: '图片尺寸读取失败',
              },
            })
          );
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
      source: 'client',
      meta: { reason: '图片转码失败' },
    });
  }
  return blob;
}

async function renderImageElementToPng(image: HTMLImageElement): Promise<Blob> {
  const width = Math.max(1, image.naturalWidth || image.width);
  const height = Math.max(1, image.naturalHeight || image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
      source: 'client',
      meta: {
        reason: '无法创建图片画布',
      },
    });
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvasToBlob(canvas);
}

async function blobToPng(blob: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(
          createError({
            code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
            source: 'client',
            meta: { reason: '图片加载失败' },
          })
        );
      element.src = url;
    });
    const pngBlob = await renderImageElementToPng(image);
    return {
      blob: pngBlob,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readImageType(blob: Blob): NoteDocxImageType | null {
  switch (blob.type.toLowerCase()) {
    case 'image/bmp':
      return 'bmp';
    case 'image/gif':
      return 'gif';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return null;
  }
}

async function normalizeImageBlob(blob: Blob) {
  const directType = readImageType(blob);
  if (directType) {
    const size = await readBlobSize(blob);
    return { blob, ...size, type: directType };
  }
  const converted = await blobToPng(blob);
  return { ...converted, type: 'png' as const };
}

/** 从远程地址读取并归一化为 Word 可嵌入的位图。 */
export async function loadDocxImageFromUrl(
  url: string,
  requestedWidth?: number
): Promise<NoteDocxImage | undefined> {
  if (!url.trim()) return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const normalized = await normalizeImageBlob(await response.blob());
    const displaySize = resolveDisplaySize(
      normalized.width,
      normalized.height,
      Math.min(requestedWidth ?? DOCX_IMAGE_MAX_WIDTH, DOCX_IMAGE_MAX_WIDTH)
    );
    return {
      data: new Uint8Array(await normalized.blob.arrayBuffer()),
      type: normalized.type,
      ...displaySize,
    };
  } catch {
    return undefined;
  }
}

/** Mermaid 等运行时生成 SVG 后转为 PNG，避免不同 Word 版本对 SVG 支持不一致。 */
export async function loadDocxImageFromSvg(svgMarkup: string): Promise<NoteDocxImage | undefined> {
  try {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const normalized = await blobToPng(svgBlob);
    const displaySize = resolveDisplaySize(
      normalized.width,
      normalized.height,
      DOCX_IMAGE_MAX_WIDTH
    );
    return {
      data: new Uint8Array(await normalized.blob.arrayBuffer()),
      type: 'png',
      ...displaySize,
    };
  } catch {
    return undefined;
  }
}
