import { z } from 'zod';

import {
  createTreeSchema,
  JavaLongIdListSchema,
  JavaLongIdSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  NullableStringSchema,
  OpaqueIdSchema,
  OptionalStringSchema,
} from '@/apis/schema';
import { AccessControlScopeSchema, ResourceActionListSchema } from '@/domains/_shared/access';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

/** 标签内资源默认授权与标签自身挂载范围是相互独立的策略。 */
export const TagPolicyApiSchema = z.object({
  taggedResourceAclGrantScope: AccessControlScopeSchema.nullable(),
  taggedResourceAclGrantSpecifiedUsers: JavaLongIdListSchema.nullable(),
  tagMountPermissionScope: AccessControlScopeSchema.nullable(),
  tagMountSpecifiedUsers: JavaLongIdListSchema.nullable(),
});

const TagTreeApiNodeFieldsSchema = z.object({
  tagId: OpaqueIdSchema,
  parentId: OpaqueIdSchema,
  groupId: OpaqueIdSchema,
  tagName: NonEmptyStringSchema,
  tagDesc: NullableStringSchema,
  tagIcon: NullableStringSchema,
  tagColor: NullableStringSchema,
  tagMetaInfo: NullableStringSchema,
  tagCreator: JavaLongIdSchema.nullable(),
  isPath: z.boolean(),
  creatorInfo: UserDisplayApiSchema.nullable(),
  ...TagPolicyApiSchema.shape,
  grantedActions: ResourceActionListSchema,
});

const TagTreeApiNodeSchema = createTreeSchema(TagTreeApiNodeFieldsSchema.shape);

export const TagTreeApiResponseSchema = z.array(TagTreeApiNodeSchema);

export const GetGroupTagTreeApiRequestSchema = z.strictObject({
  groupId: OpaqueIdSchema,
});

/** 旧通用接口的兼容请求；新读取路径不得继续依赖空 groupId 猜测作用域。 */
export const GetTagTreeApiRequestSchema = z.strictObject({
  groupId: OpaqueIdSchema.optional(),
});

const TagPolicyCommandShape = {
  taggedResourceAclGrantScope: AccessControlScopeSchema.optional(),
  taggedResourceAclGrantSpecifiedUsers: JavaLongIdListSchema.optional(),
  tagMountPermissionScope: AccessControlScopeSchema.optional(),
  tagMountSpecifiedUsers: JavaLongIdListSchema.optional(),
  grantedActions: ResourceActionListSchema.optional(),
};

export const AddTagApiRequestSchema = z.strictObject({
  groupId: OpaqueIdSchema.optional(),
  parentId: OpaqueIdSchema.optional(),
  tagName: NonBlankStringSchema,
  tagDesc: OptionalStringSchema,
  tagIcon: OptionalStringSchema,
  tagColor: OptionalStringSchema,
  tagMetaInfo: OptionalStringSchema,
  ...TagPolicyCommandShape,
});

export const ChangeTagApiRequestSchema = z.strictObject({
  groupId: OpaqueIdSchema.optional(),
  targetTagId: OpaqueIdSchema,
  tagName: NonBlankStringSchema.optional(),
  tagDesc: OptionalStringSchema,
  tagIcon: OptionalStringSchema,
  tagColor: OptionalStringSchema,
  tagMetaInfo: OptionalStringSchema,
  ...TagPolicyCommandShape,
});

export const RemoveTagsApiRequestSchema = z.strictObject({
  groupId: OpaqueIdSchema.optional(),
  targetTagIds: z.array(OpaqueIdSchema).min(1),
});

export const MoveTagsApiRequestSchema = RemoveTagsApiRequestSchema.extend({
  newParentId: OpaqueIdSchema.optional(),
});

export type TagPolicyApi = z.infer<typeof TagPolicyApiSchema>;
export type TagTreeApiResponse = z.infer<typeof TagTreeApiResponseSchema>;
export type GetGroupTagTreeApiRequest = z.infer<typeof GetGroupTagTreeApiRequestSchema>;
export type GetTagTreeApiRequest = z.infer<typeof GetTagTreeApiRequestSchema>;
export type AddTagApiRequest = z.infer<typeof AddTagApiRequestSchema>;
export type ChangeTagApiRequest = z.infer<typeof ChangeTagApiRequestSchema>;
export type RemoveTagsApiRequest = z.infer<typeof RemoveTagsApiRequestSchema>;
export type MoveTagsApiRequest = z.infer<typeof MoveTagsApiRequestSchema>;
