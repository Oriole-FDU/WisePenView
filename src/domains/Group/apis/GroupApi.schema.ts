import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdListSchema,
  JavaLongIdSchema,
  NonBlankStringSchema,
  NonEmptyStringSchema,
  NullableStringSchema,
  OptionalStringSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { ResourceActionListSchema } from '@/domains/_shared/access';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

import {
  GROUP_FILE_ORG_LOGIC,
  GROUP_ROLE_FILTER,
  GROUP_TYPE,
  GROUP_TYPE_QUERY,
  ROLE,
} from '../enum';

/** 后端 GroupType 通过 @JsonValue 输出数字 code。 */
export const GroupTypeApiSchema = z.literal(GROUP_TYPE.options.map((option) => option.value));

/** 查询参数仍由 Spring 按枚举名转换，与 JSON body/response 的数字值不同。 */
export const GroupTypeQueryApiSchema = z.enum(
  GROUP_TYPE_QUERY.options.map((option) => option.value)
);

export const GroupRoleFilterApiSchema = z.enum(
  GROUP_ROLE_FILTER.options.map((option) => option.value)
);

/** 包含 NOT_MEMBER，供“我的角色”接口使用。 */
export const GroupRoleApiSchema = z.union([
  z.literal(ROLE.options.map((option) => option.value)),
  z.literal(-1),
]);

/** 成员列表与成员变更只允许真实成员角色。 */
export const GroupMemberRoleApiSchema = z.literal(ROLE.options.map((option) => option.value));

export const GroupFileOrgLogicApiSchema = z.enum(
  GROUP_FILE_ORG_LOGIC.options.map((option) => option.value)
);

export const GroupItemApiSchema = z.object({
  groupId: JavaLongIdSchema,
  groupName: NonEmptyStringSchema,
  groupDesc: z.string(),
  groupCoverUrl: z.string(),
  groupMetaInfo: NullableStringSchema,
  groupType: GroupTypeApiSchema,
  ownerId: JavaLongIdSchema,
  ownerInfo: UserDisplayApiSchema.nullable(),
  memberCount: z.number().int().nonnegative(),
  createTime: EpochMillisSchema.nullable(),
});

export const GroupDetailApiSchema = GroupItemApiSchema.extend({
  inviteCode: NonEmptyStringSchema,
  tokenUsed: z.number().int().nonnegative(),
  tokenBalance: z.number().int().nonnegative(),
});

export const ListGroupApiRequestSchema = z.strictObject({
  groupRoleFilter: GroupRoleFilterApiSchema,
  groupType: GroupTypeQueryApiSchema.optional(),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
});

export const ListGroupApiResponseSchema = createPageResponseSchema(GroupItemApiSchema);

export const GroupIdentityApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
});

export const AddGroupApiRequestSchema = z.strictObject({
  groupName: NonBlankStringSchema,
  groupType: GroupTypeApiSchema,
  groupDesc: NonBlankStringSchema,
  groupCoverUrl: OptionalStringSchema,
  groupMetaInfo: OptionalStringSchema,
});

export const ChangeGroupApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  groupName: NonBlankStringSchema,
  groupDesc: NonBlankStringSchema,
  groupCoverUrl: z.string(),
  groupMetaInfo: OptionalStringSchema,
  groupType: GroupTypeApiSchema,
});

export const JoinGroupApiRequestSchema = z.strictObject({
  inviteCode: NonBlankStringSchema,
});

export const GetGroupConfigApiRequestSchema = GroupIdentityApiRequestSchema;

export const GroupConfigApiSchema = z.object({
  groupId: NonBlankStringSchema,
  fileOrgLogic: GroupFileOrgLogicApiSchema,
  defaultMemberActions: ResourceActionListSchema,
});

export const ChangeGroupConfigApiRequestSchema = z.strictObject({
  groupId: NonBlankStringSchema,
  fileOrgLogic: GroupFileOrgLogicApiSchema,
  defaultMemberActions: ResourceActionListSchema.optional(),
});

export const ListGroupMemberApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  page: z.number().int().min(1),
  size: z.number().int().min(1),
});

export const GroupMemberDetailApiSchema = z.object({
  role: GroupMemberRoleApiSchema,
  joinTime: EpochMillisSchema,
  tokenLimit: z.number().int().nonnegative(),
  tokenUsed: z.number().int().nonnegative(),
  groupId: JavaLongIdSchema,
  memberId: JavaLongIdSchema,
  memberInfo: UserDisplayApiSchema.nullable(),
});

export const ListGroupMemberApiResponseSchema = createPageResponseSchema(
  GroupMemberDetailApiSchema
);

export const GetMyGroupMemberInfoApiResponseSchema = GroupMemberDetailApiSchema;

export const ChangeGroupMemberRoleApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  targetUserIds: JavaLongIdListSchema.min(1),
  role: GroupMemberRoleApiSchema,
});

export const KickGroupMembersApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  targetUserIds: JavaLongIdListSchema.min(1),
});

export const ChangeGroupMemberTokenLimitApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  targetUserIds: JavaLongIdListSchema.min(1),
  newTokenLimit: z.number().int().nonnegative(),
});

export const GetAllMyGroupTokenInfoApiRequestSchema = PageApiRequestSchema;

export const GroupTokenInfoApiSchema = z.object({
  groupDisplayBase: z.object({
    groupName: NonEmptyStringSchema,
    groupType: GroupTypeApiSchema,
  }),
  tokenLimit: z.number().int().nonnegative(),
  tokenUsed: z.number().int().nonnegative(),
});

export const GetAllMyGroupTokenInfoApiResponseSchema =
  createPageResponseSchema(GroupTokenInfoApiSchema);

export type GroupTypeApi = z.infer<typeof GroupTypeApiSchema>;
export type GroupRoleApi = z.infer<typeof GroupRoleApiSchema>;
export type GroupItemApi = z.infer<typeof GroupItemApiSchema>;
export type GroupDetailApi = z.infer<typeof GroupDetailApiSchema>;
export type ListGroupApiRequest = z.infer<typeof ListGroupApiRequestSchema>;
export type ListGroupApiResponse = z.infer<typeof ListGroupApiResponseSchema>;
export type GroupIdentityApiRequest = z.infer<typeof GroupIdentityApiRequestSchema>;
export type AddGroupApiRequest = z.infer<typeof AddGroupApiRequestSchema>;
export type ChangeGroupApiRequest = z.infer<typeof ChangeGroupApiRequestSchema>;
export type JoinGroupApiRequest = z.infer<typeof JoinGroupApiRequestSchema>;
export type GetGroupConfigApiResponse = z.infer<typeof GroupConfigApiSchema>;
export type ChangeGroupConfigApiRequest = z.infer<typeof ChangeGroupConfigApiRequestSchema>;
export type ListGroupMemberApiRequest = z.infer<typeof ListGroupMemberApiRequestSchema>;
export type GroupMemberDetailApi = z.infer<typeof GroupMemberDetailApiSchema>;
export type ListGroupMemberApiResponse = z.infer<typeof ListGroupMemberApiResponseSchema>;
export type GroupTokenInfoApi = z.infer<typeof GroupTokenInfoApiSchema>;
export type ChangeGroupMemberRoleApiRequest = z.infer<typeof ChangeGroupMemberRoleApiRequestSchema>;
export type KickGroupMembersApiRequest = z.infer<typeof KickGroupMembersApiRequestSchema>;
export type ChangeGroupMemberTokenLimitApiRequest = z.infer<
  typeof ChangeGroupMemberTokenLimitApiRequestSchema
>;
export type GetAllMyGroupTokenInfoApiResponse = z.infer<
  typeof GetAllMyGroupTokenInfoApiResponseSchema
>;
