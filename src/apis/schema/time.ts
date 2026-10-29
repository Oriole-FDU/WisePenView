import { z } from 'zod';

/** Java LocalDateTime 当前通过全局 Jackson 配置序列化为 Unix 毫秒时间戳。 */
export const EpochMillisSchema = z.number().int().refine(Number.isSafeInteger, {
  message: '必须是安全整数毫秒时间戳',
});

/** Python 服务返回的带时区 ISO 8601 时间字符串。 */
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });

/** Decimal 在 Chat 服务中通过字符串传输，避免浮点精度损失。 */
export const DecimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, '必须是十进制数字字符串');
