import { z } from 'zod';

/** 没有请求体时显式表达 JSON 中不存在 payload。 */
export const EmptyApiRequestSchema = z.undefined();

/** Java R.ok() 与 Python R.success() 的空 data 均为 null。 */
export const EmptyApiResponseSchema = z.null();
