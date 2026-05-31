import { MODEL_TYPE } from '@/types/model';
import type { Model } from '@/components/ChatPanel/index.type';
import type { ModelListResponse } from '../service/index.type';

const VENDOR_PROVIDER_MAP: Record<string, string> = {
  openai: 'openai',
  google: 'google',
  anthropic: 'anthropic',
  xai: 'grok',
  deepseek: 'deepseek',
  doubao: 'doubao',
  meta: 'meta',
  mistral: 'mistral',
};

const inferProvider = (vendor: string): string => {
  const normalizedVendor = String(vendor ?? '')
    .trim()
    .toLowerCase();
  if (normalizedVendor && VENDOR_PROVIDER_MAP[normalizedVendor]) {
    return VENDOR_PROVIDER_MAP[normalizedVendor];
  }
  return 'openai';
};

/**
 * 将后端模型分组响应拍平并适配为当前 ChatPanel 需要的模型结构。
 */
export const mapApiModelsToFlatModels = (data?: ModelListResponse): Model[] => {
  if (!data) return [];

  const groupedModels = [...data.standard_models, ...data.advanced_models, ...data.other_models];
  return groupedModels.map((item, index) => ({
    id: String(item.id),
    name: item.name,
    vendor: item.vendor,
    provider: inferProvider(item.vendor),
    ratio: item.ratio,
    supportThinking: item.support_thinking,
    tags: [
      ...(item.is_default ? [{ text: 'Default', type: 'blue' }] : []),
      ...(item.support_thinking ? [{ text: 'Thinking', type: 'purple' }] : []),
    ],
    multiplier: item.ratio >= 1 ? `${item.ratio}x 消耗` : null,
    isDefault: item.is_default,
    vision: item.support_vision,
    usageRank: index + 1,
    category:
      item.type === MODEL_TYPE.ADVANCED_MODEL
        ? 'reasoning'
        : item.type === MODEL_TYPE.STANDARD_MODEL
          ? 'all-round'
          : 'chat',
  }));
};
