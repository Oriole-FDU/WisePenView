import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema, JavaLongIdSchema } from '@/apis/schema';

import {
  AddGroupApiRequestSchema,
  ChangeGroupApiRequestSchema,
  ChangeGroupConfigApiRequestSchema,
  ChangeGroupMemberRoleApiRequestSchema,
  ChangeGroupMemberTokenLimitApiRequestSchema,
  GetAllMyGroupTokenInfoApiRequestSchema,
  GetAllMyGroupTokenInfoApiResponseSchema,
  GetGroupConfigApiRequestSchema,
  GetMyGroupMemberInfoApiResponseSchema,
  GroupConfigApiSchema,
  GroupDetailApiSchema,
  GroupIdentityApiRequestSchema,
  GroupItemApiSchema,
  GroupRoleApiSchema,
  JoinGroupApiRequestSchema,
  KickGroupMembersApiRequestSchema,
  ListGroupApiRequestSchema,
  ListGroupApiResponseSchema,
  ListGroupMemberApiRequestSchema,
  ListGroupMemberApiResponseSchema,
} from './GroupApi.schema';

export const ListGroupApiContract = defineApiContract({
  name: 'ListGroupApi',
  method: 'GET',
  endpoint: '/group/list',
  requestPlacement: 'query',
  transport: 'json',
  request: ListGroupApiRequestSchema,
  response: ListGroupApiResponseSchema,
});

export const GetGroupDetailInfoApiContract = defineApiContract({
  name: 'GetGroupDetailInfoApi',
  method: 'GET',
  endpoint: '/group/getGroupDetailInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: GroupDetailApiSchema,
});

export const GetGroupBaseInfoApiContract = defineApiContract({
  name: 'GetGroupBaseInfoApi',
  method: 'GET',
  endpoint: '/group/getGroupBaseInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: GroupItemApiSchema,
});

export const AddGroupApiContract = defineApiContract({
  name: 'AddGroupApi',
  method: 'POST',
  endpoint: '/group/addGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: AddGroupApiRequestSchema,
  response: JavaLongIdSchema,
});

export const ChangeGroupApiContract = defineApiContract({
  name: 'ChangeGroupApi',
  method: 'POST',
  endpoint: '/group/changeGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeGroupApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const RemoveGroupApiContract = defineApiContract({
  name: 'RemoveGroupApi',
  method: 'POST',
  endpoint: '/group/removeGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const JoinGroupApiContract = defineApiContract({
  name: 'JoinGroupApi',
  method: 'POST',
  endpoint: '/group/joinGroup',
  requestPlacement: 'body',
  transport: 'json',
  request: JoinGroupApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GetGroupConfigApiContract = defineApiContract({
  name: 'GetGroupConfigApi',
  method: 'GET',
  endpoint: '/resource/groupConfig/getConfig',
  requestPlacement: 'query',
  transport: 'json',
  request: GetGroupConfigApiRequestSchema,
  response: GroupConfigApiSchema,
});

export const ChangeGroupConfigApiContract = defineApiContract({
  name: 'ChangeGroupConfigApi',
  method: 'POST',
  endpoint: '/resource/groupConfig/changeConfig',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeGroupConfigApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListGroupMemberApiContract = defineApiContract({
  name: 'ListGroupMemberApi',
  method: 'GET',
  endpoint: '/group/member/list',
  requestPlacement: 'query',
  transport: 'json',
  request: ListGroupMemberApiRequestSchema,
  response: ListGroupMemberApiResponseSchema,
});

export const GetMyRoleInGroupApiContract = defineApiContract({
  name: 'GetMyRoleInGroupApi',
  method: 'GET',
  endpoint: '/group/member/getMyRole',
  requestPlacement: 'query',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: GroupRoleApiSchema,
});

export const QuitGroupApiContract = defineApiContract({
  name: 'QuitGroupApi',
  method: 'POST',
  endpoint: '/group/member/quit',
  requestPlacement: 'body',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangeGroupMemberRoleApiContract = defineApiContract({
  name: 'ChangeGroupMemberRoleApi',
  method: 'POST',
  endpoint: '/group/member/changeRole',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeGroupMemberRoleApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const KickGroupMembersApiContract = defineApiContract({
  name: 'KickGroupMembersApi',
  method: 'POST',
  endpoint: '/group/member/kick',
  requestPlacement: 'body',
  transport: 'json',
  request: KickGroupMembersApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GetMyGroupMemberInfoApiContract = defineApiContract({
  name: 'GetMyGroupMemberInfoApi',
  method: 'GET',
  endpoint: '/group/member/getMyGroupMemberInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GroupIdentityApiRequestSchema,
  response: GetMyGroupMemberInfoApiResponseSchema,
});

export const ChangeGroupMemberTokenLimitApiContract = defineApiContract({
  name: 'ChangeGroupMemberTokenLimitApi',
  method: 'POST',
  endpoint: '/group/member/changeTokenLimit',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeGroupMemberTokenLimitApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const GetAllMyGroupTokenInfoApiContract = defineApiContract({
  name: 'GetAllMyGroupTokenInfoApi',
  method: 'GET',
  endpoint: '/group/member/getAllMyGroupTokenInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetAllMyGroupTokenInfoApiRequestSchema,
  response: GetAllMyGroupTokenInfoApiResponseSchema,
});

export type ListGroupApiRequest = ApiContractRequest<typeof ListGroupApiContract>;
export type ListGroupApiResponse = ApiContractResponse<typeof ListGroupApiContract>;
export type GetGroupDetailInfoApiRequest = ApiContractRequest<typeof GetGroupDetailInfoApiContract>;
export type GetGroupDetailInfoApiResponse = ApiContractResponse<
  typeof GetGroupDetailInfoApiContract
>;
export type GetGroupBaseInfoApiRequest = ApiContractRequest<typeof GetGroupBaseInfoApiContract>;
export type GetGroupBaseInfoApiResponse = ApiContractResponse<typeof GetGroupBaseInfoApiContract>;
export type AddGroupApiRequest = ApiContractRequest<typeof AddGroupApiContract>;
export type AddGroupApiResponse = ApiContractResponse<typeof AddGroupApiContract>;
export type ChangeGroupApiRequest = ApiContractRequest<typeof ChangeGroupApiContract>;
export type ChangeGroupApiResponse = ApiContractResponse<typeof ChangeGroupApiContract>;
export type RemoveGroupApiRequest = ApiContractRequest<typeof RemoveGroupApiContract>;
export type RemoveGroupApiResponse = ApiContractResponse<typeof RemoveGroupApiContract>;
export type JoinGroupApiRequest = ApiContractRequest<typeof JoinGroupApiContract>;
export type JoinGroupApiResponse = ApiContractResponse<typeof JoinGroupApiContract>;
export type GetGroupConfigApiRequest = ApiContractRequest<typeof GetGroupConfigApiContract>;
export type GetGroupConfigApiResponse = ApiContractResponse<typeof GetGroupConfigApiContract>;
export type ChangeGroupConfigApiRequest = ApiContractRequest<typeof ChangeGroupConfigApiContract>;
export type ChangeGroupConfigApiResponse = ApiContractResponse<typeof ChangeGroupConfigApiContract>;
export type ListGroupMemberApiRequest = ApiContractRequest<typeof ListGroupMemberApiContract>;
export type ListGroupMemberApiResponse = ApiContractResponse<typeof ListGroupMemberApiContract>;
export type GetMyRoleInGroupApiRequest = ApiContractRequest<typeof GetMyRoleInGroupApiContract>;
export type GetMyRoleInGroupApiResponse = ApiContractResponse<typeof GetMyRoleInGroupApiContract>;
export type QuitGroupApiRequest = ApiContractRequest<typeof QuitGroupApiContract>;
export type QuitGroupApiResponse = ApiContractResponse<typeof QuitGroupApiContract>;
export type ChangeGroupMemberRoleApiRequest = ApiContractRequest<
  typeof ChangeGroupMemberRoleApiContract
>;
export type ChangeGroupMemberRoleApiResponse = ApiContractResponse<
  typeof ChangeGroupMemberRoleApiContract
>;
export type KickGroupMembersApiRequest = ApiContractRequest<typeof KickGroupMembersApiContract>;
export type KickGroupMembersApiResponse = ApiContractResponse<typeof KickGroupMembersApiContract>;
export type GetMyGroupMemberInfoApiRequest = ApiContractRequest<
  typeof GetMyGroupMemberInfoApiContract
>;
export type GetMyGroupMemberInfoApiResponse = ApiContractResponse<
  typeof GetMyGroupMemberInfoApiContract
>;
export type ChangeGroupMemberTokenLimitApiRequest = ApiContractRequest<
  typeof ChangeGroupMemberTokenLimitApiContract
>;
export type ChangeGroupMemberTokenLimitApiResponse = ApiContractResponse<
  typeof ChangeGroupMemberTokenLimitApiContract
>;
export type GetAllMyGroupTokenInfoApiRequest = ApiContractRequest<
  typeof GetAllMyGroupTokenInfoApiContract
>;
export type GetAllMyGroupTokenInfoApiResponse = ApiContractResponse<
  typeof GetAllMyGroupTokenInfoApiContract
>;
