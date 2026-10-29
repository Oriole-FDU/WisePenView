import type { ApiResponse } from './api.type';
import { ApiResponseEnvelopeSchema } from './schema';

/** 运行期只确认统一响应 envelope；data 的领域形状由 API DTO 与 mapper 分层处理。 */
export const isApiResponseEnvelope = (value: unknown): value is ApiResponse<unknown> =>
  ApiResponseEnvelopeSchema.safeParse(value).success;
