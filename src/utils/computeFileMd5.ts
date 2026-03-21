import SparkMD5 from 'spark-md5';

const CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 浏览器端分块计算文件 MD5（十六进制小写），与文档上传初始化接口 `md5` 字段一致。
 */
export const computeFileMd5 = (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> => {
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
        reject(new Error('读取文件失败'));
        return;
      }
      spark.append(result);
      currentChunk += 1;
      onProgress?.(Math.min(100, Math.round((currentChunk / chunks) * 100)));
      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () => reject(new Error('读取文件失败'));
    loadNext();
  });
};
