import { MOCK_MODELS } from './mock/ChatPanel';
import type { Model } from '@/components/ChatPanel/index.type';
// import request from '@/utils/request'; // 假设以后有了 axios 封装

export const ModelService = {
  // 模拟异步获取模型列表
  getModels: async (): Promise<Model[]> => {
    // 【未来替换点】：
    // return request.get('/api/models');
    
    // 目前：模拟网络延迟 500ms
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_MODELS);
      }, 5000);
    });
  }
};