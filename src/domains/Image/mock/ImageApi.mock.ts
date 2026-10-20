import { mockResponse } from '@/domains/_shared/mock/response';

import type { ImageApi as ImageApiContract } from '../apis/ImageApi';

export const ImageApi: typeof ImageApiContract = {
  imageUpload: async (body) => {
    const file = body.get('file');
    return mockResponse({
      fileId: String(Date.now()),
      domain: 'https://mock-cdn.example.invalid',
      objectKey: `public/images/mock/${crypto.randomUUID()}`,
      md5: 'mock-md5',
      size: String(file instanceof Blob ? file.size : 0),
    });
  },
};
