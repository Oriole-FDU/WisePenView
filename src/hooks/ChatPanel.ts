// eslint-disable-next-line no-restricted-imports
import { useState, useEffect } from 'react';
import { ModelService } from '@/services/ChatPanel';
import type { Model } from '@/components/ChatPanel/index.type';

export const useModelList = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await ModelService.getModels();
        setModels(data);
      } catch (err) {
        setError('加载模型列表失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { models, loading, error };
};
