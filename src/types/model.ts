/**
 * Chat 模型类型定义
 * 与 /chat/model/listModels 的响应结构对齐
 */

/** 供应商 ID（对齐后端 ProviderId 枚举值） */
export const MODEL_PROVIDER_ID = {
  ZHIZENGZENG: 1,
  APIYI: 2,
  MODELSCOPE: 3,
} as const;

export type ModelProviderId = (typeof MODEL_PROVIDER_ID)[keyof typeof MODEL_PROVIDER_ID];

/** 模型类型（对齐后端 ModelType 枚举值） */
export const MODEL_TYPE = {
  STANDARD_MODEL: 1,
  ADVANCED_MODEL: 2,
  UNKNOWN_MODEL: 3,
} as const;

export type ModelType = (typeof MODEL_TYPE)[keyof typeof MODEL_TYPE];

/** 对齐后端 ModelInfo */
export interface Model {
  id: number;
  name: string;
  vendor: string;
  type: ModelType;
  ratio: number;
  support_thinking: boolean;
  support_vision: boolean;
  is_default: boolean;
}
