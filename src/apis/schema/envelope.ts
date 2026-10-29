import { z } from 'zod';

const responseCodeSchema = z.number().finite();

/** Java 与 Node Sidecar 的 R<T> envelope。 */
export const KeyedApiResponseEnvelopeSchema = z
  .object({
    code: responseCodeSchema,
    key: z.string().nullable(),
    msg: z.string().nullable(),
    data: z.unknown(),
  })
  .passthrough();

/** Python Cloud-AI 的 R<T> envelope。 */
export const PythonApiResponseEnvelopeSchema = z
  .object({
    code: responseCodeSchema,
    msg: z.string(),
    data: z.unknown(),
  })
  .passthrough()
  .refine((value) => !Object.hasOwn(value, 'key'), {
    message: 'Python R<T> 不应包含 key',
  });

export const ApiResponseEnvelopeSchema = z.union([
  KeyedApiResponseEnvelopeSchema,
  PythonApiResponseEnvelopeSchema,
]);
