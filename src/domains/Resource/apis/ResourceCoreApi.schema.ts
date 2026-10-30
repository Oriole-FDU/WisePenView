import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongStringSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  NullableStringSchema,
  OpaqueIdSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { ResourceActionListSchema } from '@/domains/_shared/access';
import { GroupTypeApiSchema } from '@/domains/Group/apis/GroupApi.schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

/** 后端 ResourceType 通过 @JsonValue 输出枚举名称。 */
export const ResourceTypeApiSchema = z.enum([
  'NOTE',
  'DRAWIO',
  'PDF',
  'DOC',
  'DOCX',
  'PPT',
  'PPTX',
  'XLS',
  'XLSX',
  'SKILL',
  'AGENT',
  'SINGLE_HTML_PAGE',
  'UNKNOWN',
]);

export const ResourceSortByApiSchema = z.enum(['UPDATE_TIME', 'CREATE_TIME', 'NAME', 'SIZE']);

export const ResourceSortDirApiSchema = z.enum(['ASC', 'DESC']);

export const ResourceTagQueryLogicModeApiSchema = z.enum(['OR', 'AND']);

export const ResourceSearchScopeApiSchema = z.enum(['ALL', 'DOCUMENT', 'NOTE']);

const ResourceListPageRequestSchema = PageApiRequestSchema.extend({
  size: z.number().int().min(1).max(100),
});

export const ResourceTagInfoApiSchema = z.object({
  groupId: NullableStringSchema,
  tagName: NonEmptyStringSchema,
  tagDesc: NullableStringSchema,
  tagIcon: NullableStringSchema,
  tagColor: NullableStringSchema,
  tagMetaInfo: NullableStringSchema,
  tagCreator: NullableStringSchema,
  isPath: z.boolean().nullable(),
});

export const ResourceTagBindApiSchema = z.object({
  groupId: NonEmptyStringSchema,
  primaryTagId: NonEmptyStringSchema,
  aiBillingApproved: z.boolean().nullable(),
  tags: z.record(NonEmptyStringSchema, ResourceTagInfoApiSchema.nullable()),
});

export const ResourceInteractionInfoApiSchema = z.object({
  readCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  scoreCount: z.number().int().nonnegative(),
  scoreTotal: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
});

export const ResourceUserInteractionRecordApiSchema = z.object({
  read: z.boolean(),
  liked: z.boolean(),
  score: z.number().int().nullable(),
  likedCommentIds: z.array(OpaqueIdSchema),
  resourceId: OpaqueIdSchema,
});

export const ResourceGroupDisplayApiSchema = z.object({
  groupName: NullableStringSchema,
  groupDesc: NullableStringSchema,
  groupCoverUrl: NullableStringSchema,
  groupType: GroupTypeApiSchema.nullable(),
  groupMetaInfo: NullableStringSchema,
});

export const ResourceGroupGrantedActionsApiSchema = z.object({
  groupId: NonEmptyStringSchema,
  groupInfo: ResourceGroupDisplayApiSchema.nullable(),
  grantedActions: ResourceActionListSchema.nullable(),
});

export const ResourceSpecifiedUserGrantedActionsApiSchema = z.object({
  userId: NonEmptyStringSchema,
  userInfo: UserDisplayApiSchema.nullable(),
  grantedActions: ResourceActionListSchema.nullable(),
});

/** 资源基础信息，供跨域详情投影与独立基础信息接口复用。 */
export const ResourceBaseInfoApiSchema = z.object({
  resourceId: OpaqueIdSchema,
  createTime: EpochMillisSchema,
  resourceName: NonEmptyStringSchema,
  resourceType: ResourceTypeApiSchema,
  ownerId: NonEmptyStringSchema,
  ownerInfo: UserDisplayApiSchema,
  preview: NullableStringSchema,
  size: JavaLongStringSchema.nullable(),
  resourceInteractionInfo: ResourceInteractionInfoApiSchema.nullable(),
});

/** 列表、搜索和资源叶域详情共用的完整资源项。 */
export const ResourceItemApiSchema = ResourceBaseInfoApiSchema.extend({
  myInteractionRecord: ResourceUserInteractionRecordApiSchema.nullable(),
  tagBinds: z.array(ResourceTagBindApiSchema),
  currentActions: ResourceActionListSchema,
  overrideGrantedActions: z.array(ResourceGroupGrantedActionsApiSchema).nullable(),
  specifiedUsersGrantedActions: z.array(ResourceSpecifiedUserGrantedActionsApiSchema).nullable(),
});

export const GetResourceBaseInfoApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
});

export const ListResourcesApiRequestSchema = ResourceListPageRequestSchema.extend({
  groupId: NonEmptyStringSchema.optional(),
  tagIds: z.array(NonEmptyStringSchema).min(1).optional(),
  tagQueryLogicMode: ResourceTagQueryLogicModeApiSchema,
  includeMyInteraction: z.boolean().optional(),
  resourceType: ResourceTypeApiSchema.optional(),
  sortBy: ResourceSortByApiSchema,
  sortDir: ResourceSortDirApiSchema,
});

export const ListResourcesApiResponseSchema = createPageResponseSchema(ResourceItemApiSchema);

export const RenameResourceApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  newName: NonBlankStringSchema,
});

export const RemoveResourcesApiRequestSchema = z.strictObject({
  resourceIds: z.array(OpaqueIdSchema).min(1),
});

export const ChangeResourceActionPermissionApiRequestSchema = z.strictObject({
  resourceId: OpaqueIdSchema,
  overrideGrantedActions: z
    .record(NonEmptyStringSchema, ResourceActionListSchema.nullable())
    .nullable()
    .optional(),
  specifiedUsersGrantedActions: z
    .record(NonEmptyStringSchema, ResourceActionListSchema)
    .nullable()
    .optional(),
});

export const GlobalSearchResourcesApiRequestSchema = ResourceListPageRequestSchema.extend({
  keyword: z.string(),
  scope: ResourceSearchScopeApiSchema,
  resourceTypes: z.array(ResourceTypeApiSchema).min(1).optional(),
});

export const GlobalSearchHitApiSchema = z.object({
  resourceId: OpaqueIdSchema,
  resourceType: ResourceTypeApiSchema,
  resourceName: NonEmptyStringSchema,
  highlightContent: NullableStringSchema,
  updateTime: EpochMillisSchema,
});

export const GlobalSearchResourcesApiResponseSchema =
  createPageResponseSchema(GlobalSearchHitApiSchema);

export type ResourceTypeApi = z.infer<typeof ResourceTypeApiSchema>;
export type ResourceTagInfoApi = z.infer<typeof ResourceTagInfoApiSchema>;
export type ResourceBaseInfoApi = z.infer<typeof ResourceBaseInfoApiSchema>;
export type ResourceItemApi = z.infer<typeof ResourceItemApiSchema>;
export type ResourceGroupDisplayApi = z.infer<typeof ResourceGroupDisplayApiSchema>;
export type ResourceGroupGrantedActionsApi = z.infer<typeof ResourceGroupGrantedActionsApiSchema>;
export type ResourceSpecifiedUserGrantedActionsApi = z.infer<
  typeof ResourceSpecifiedUserGrantedActionsApiSchema
>;
export type GetResourceBaseInfoApiRequest = z.infer<typeof GetResourceBaseInfoApiRequestSchema>;
export type ListResourcesApiRequest = z.infer<typeof ListResourcesApiRequestSchema>;
export type ListResourcesApiResponse = z.infer<typeof ListResourcesApiResponseSchema>;
export type RenameResourceApiRequest = z.infer<typeof RenameResourceApiRequestSchema>;
export type RemoveResourcesApiRequest = z.infer<typeof RemoveResourcesApiRequestSchema>;
export type ChangeResourceActionPermissionApiRequest = z.infer<
  typeof ChangeResourceActionPermissionApiRequestSchema
>;
export type GlobalSearchResourcesApiRequest = z.infer<typeof GlobalSearchResourcesApiRequestSchema>;
export type GlobalSearchResourcesApiResponse = z.infer<
  typeof GlobalSearchResourcesApiResponseSchema
>;
