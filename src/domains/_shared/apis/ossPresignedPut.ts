import { FRONTEND_NETWORK_ERROR, WisePenError } from '@/utils/error';

export interface OssPresignedPutParams {
  putUrl: string;
  body: Blob;
  /** 与预签名一致的 x-oss-callback 值（Base64 策略串） */
  callbackHeader: string;
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
}

const DEFAULT_OSS_PUT_TIMEOUT_MS = 90_000;

/**
 * 向 OSS 预签名 PUT URL 上传字节流（跨域，不使用 Axios Cookie）。
 * 请求头与 AliyunOssProvider.generateUploadTicket 约定一致。
 */
export const putOssPresignedUrl = (params: OssPresignedPutParams): Promise<void> => {
  const {
    putUrl,
    body,
    callbackHeader,
    onProgress,
    timeoutMs = DEFAULT_OSS_PUT_TIMEOUT_MS,
  } = params;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', putUrl);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('x-oss-callback', callbackHeader);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new WisePenError({
            code: FRONTEND_NETWORK_ERROR.HTTP,
            source: 'http',
            meta: { status: xhr.status },
          })
        );
      }
    };
    xhr.onerror = () =>
      reject(new WisePenError({ code: FRONTEND_NETWORK_ERROR.NETWORK, source: 'network' }));
    xhr.ontimeout = () =>
      reject(new WisePenError({ code: FRONTEND_NETWORK_ERROR.TIMEOUT, source: 'network' }));
    xhr.onabort = () =>
      reject(new WisePenError({ code: FRONTEND_NETWORK_ERROR.CANCELED, source: 'network' }));
    xhr.send(body);
  });
};
