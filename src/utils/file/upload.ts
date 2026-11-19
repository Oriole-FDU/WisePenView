import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

export function fileToBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/data:(.+);base64/)?.[1] || file.type;
      if (!base64) {
        reject(
          createDomainError(FRONTEND_DOMAIN_ERROR.FILE_READ_FAILED, {
            fileName: file.name,
            reason: 'base64 解析失败',
          })
        );
        return;
      }
      resolve({ mimeType, base64 });
    };
    reader.onerror = () =>
      reject(
        createDomainError(
          FRONTEND_DOMAIN_ERROR.FILE_READ_FAILED,
          { fileName: file.name },
          reader.error
        )
      );
    reader.readAsDataURL(file);
  });
}

export function generateThumbnail(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(
          createDomainError(FRONTEND_DOMAIN_ERROR.IMAGE_THUMBNAIL_FAILED, {
            fileName: file.name,
            reason: 'canvas 初始化失败',
          })
        );
        return;
      }

      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        createDomainError(
          FRONTEND_DOMAIN_ERROR.IMAGE_THUMBNAIL_FAILED,
          { fileName: file.name },
          undefined
        )
      );
    };

    img.src = url;
  });
}

export function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new File([byteArray], filename, { type: mimeType });
}
