import SparkMD5 from 'spark-md5';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

const CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 浏览器端分块计算文件 MD5（十六进制小写），与文档上传初始化接口 `md5` 字段一致。
 */
export const computeFileMd5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    const loadNext = () => {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };

    fileReader.onload = (e) => {
      const result = e.target?.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(createClientError(FRONTEND_CLIENT_ERROR.FILE_READ_FAILED));
        return;
      }
      spark.append(result);
      currentChunk += 1;
      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () =>
      reject(
        createClientError(FRONTEND_CLIENT_ERROR.FILE_READ_FAILED, undefined, fileReader.error)
      );
    loadNext();
  });
};
