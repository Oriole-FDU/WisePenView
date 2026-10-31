import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const cacheDir = join(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'api-schema-kernel-'));

try {
  const outfile = join(tempDir, 'schema-kernel.mjs');
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export {
          ApiResponseEnvelopeSchema,
          createPageResponseSchema,
          createTreeSchema,
          DecimalStringSchema,
          EmptyApiRequestSchema,
          EmptyApiResponseSchema,
          EpochMillisSchema,
          IsoDateTimeSchema,
          JavaLongIdListSchema,
          JavaLongIdSchema,
          JavaLongStringSchema,
          NonBlankStringSchema,
          NonEmptyStringSchema,
          NullableStringSchema,
          ObjectIdStringSchema,
          OptionalStringSchema,
          PageApiRequestSchema,
        } from '@/apis/schema';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': join(root, 'src') },
  });

  const {
    ApiResponseEnvelopeSchema,
    createPageResponseSchema,
    createTreeSchema,
    DecimalStringSchema,
    EmptyApiRequestSchema,
    EmptyApiResponseSchema,
    EpochMillisSchema,
    IsoDateTimeSchema,
    JavaLongIdListSchema,
    JavaLongIdSchema,
    JavaLongStringSchema,
    NonBlankStringSchema,
    NonEmptyStringSchema,
    NullableStringSchema,
    ObjectIdStringSchema,
    OptionalStringSchema,
    PageApiRequestSchema,
  } = await import(pathToFileURL(outfile).href);

  assert(JavaLongStringSchema.safeParse('9223372036854775807').success);
  assert(JavaLongStringSchema.safeParse('-1').success);
  assert(!JavaLongStringSchema.safeParse(1).success);
  assert(!JavaLongStringSchema.safeParse('1.2').success);

  assert(NonEmptyStringSchema.safeParse('alice').success);
  assert(NonEmptyStringSchema.safeParse(' ').success);
  assert(!NonEmptyStringSchema.safeParse('').success);
  assert(!NonEmptyStringSchema.safeParse(1).success);

  assert(NullableStringSchema.safeParse(null).success);
  assert.equal(OptionalStringSchema.parse(undefined), undefined);
  assert(OptionalStringSchema.safeParse('').success);
  assert(!OptionalStringSchema.safeParse(null).success);
  assert.equal(NonBlankStringSchema.parse('  alice  '), 'alice');
  assert(!NonBlankStringSchema.safeParse('   ').success);

  assert(JavaLongIdSchema.safeParse('123').success);
  assert(!JavaLongIdSchema.safeParse('0').success);
  assert(!JavaLongIdSchema.safeParse('-1').success);
  assert(JavaLongIdListSchema.safeParse(['1', '2']).success);
  assert(!JavaLongIdListSchema.safeParse([1, 2]).success);

  assert(ObjectIdStringSchema.safeParse('507f1f77bcf86cd799439011').success);
  assert(!ObjectIdStringSchema.safeParse('resource-1').success);

  assert(EpochMillisSchema.safeParse(1_793_245_200_000).success);
  assert(!EpochMillisSchema.safeParse(String(1_793_245_200_000)).success);
  assert(!EpochMillisSchema.safeParse(1.5).success);

  assert(IsoDateTimeSchema.safeParse('2026-10-29T08:00:00Z').success);
  assert(IsoDateTimeSchema.safeParse('2026-10-29T16:00:00+08:00').success);
  assert(IsoDateTimeSchema.safeParse('2026-10-29T16:00:00').success);
  assert(!IsoDateTimeSchema.safeParse('2026-10-29 16:00:00').success);

  assert(DecimalStringSchema.safeParse('0.25').success);
  assert(DecimalStringSchema.safeParse('1').success);
  assert(DecimalStringSchema.safeParse('1E-8').success);
  assert(DecimalStringSchema.safeParse('0E-8').success);
  assert(!DecimalStringSchema.safeParse(0.25).success);
  assert(!DecimalStringSchema.safeParse('.25').success);
  assert(!DecimalStringSchema.safeParse('1E').success);

  assert(PageApiRequestSchema.safeParse({ page: 1, size: 20 }).success);
  assert(!PageApiRequestSchema.safeParse({ page: 0, size: 20 }).success);
  assert(!PageApiRequestSchema.safeParse({ page: 1, size: 20, ignored: true }).success);

  const PageResponseSchema = createPageResponseSchema(JavaLongIdSchema.transform((id) => ({ id })));
  const pageResult = PageResponseSchema.safeParse({
    list: ['1', '2'],
    total: '2',
    page: 1,
    size: 20,
    totalPage: 1,
    ignored: true,
  });
  assert(pageResult.success);
  assert.deepEqual(pageResult.data, {
    list: [{ id: '1' }, { id: '2' }],
    total: 2,
    page: 1,
    size: 20,
    totalPage: 1,
  });
  assert(!PageResponseSchema.safeParse({ ...pageResult.data, total: 2 }).success);

  const TreeSchema = createTreeSchema({
    id: JavaLongIdSchema,
  });
  assert(
    TreeSchema.safeParse({
      id: '1',
      children: [{ id: '2', children: [] }],
    }).success
  );
  assert(!TreeSchema.safeParse({ id: '1' }).success);
  assert(
    !TreeSchema.safeParse({
      id: '1',
      children: [{ id: 2, children: [] }],
    }).success
  );

  assert(EmptyApiRequestSchema.safeParse(undefined).success);
  assert(!EmptyApiRequestSchema.safeParse(null).success);
  assert(EmptyApiResponseSchema.safeParse(null).success);
  assert(!EmptyApiResponseSchema.safeParse(undefined).success);

  assert(
    ApiResponseEnvelopeSchema.safeParse({ code: 200, key: null, msg: null, data: {} }).success
  );
  assert(ApiResponseEnvelopeSchema.safeParse({ code: 200, msg: 'ok', data: null }).success);
  assert(
    !ApiResponseEnvelopeSchema.safeParse({ code: 200, key: 1, msg: 'ok', data: null }).success
  );

  console.log('共享 API Schema 内核检查通过');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
