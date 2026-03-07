import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import { toNumberIds } from '@/utils/number';
import { API_MY_ROLE_MAP, type Group, type GroupMember, type MemberListPage } from '@/types/group';
import type { ApiResponse } from '@/types/api';
import type {
  FetchGroupListRequest,
  FetchGroupListResponse,
  CreateGroupRequest,
  EditGroupRequest,
  DeleteGroupRequest,
  JoinGroupRequest,
  QuitGroupRequest,
  UpdateMemberRoleRequest,
  KickMembersRequest,
} from './index.type';

const fetchGroupList = async (
  params: FetchGroupListRequest
): Promise<{ groups: Group[]; total: number }> => {
  const { relationType, page, pageSize } = params;
  const res = (await Axios.get('/group/list', {
    params: { relationType, page, size: pageSize },
  })) as ApiResponse<FetchGroupListResponse>;
  checkResponse(res);
  const payload = res.data;
  return {
    groups: payload?.list ?? [],
    total: payload?.total ?? 0,
  };
};

const fetchGroupInfo = async (groupId: string): Promise<Group> => {
  const res = (await Axios.get('/group/info', {
    params: { groupId: toNumberIds(groupId) },
  })) as ApiResponse<Group>;
  checkResponse(res);
  if (!res.data) throw new Error('获取小组详情失败');
  return res.data;
};

const createGroup = async (params: CreateGroupRequest) => {
  const res = (await Axios.post('/group/new', params)) as ApiResponse;
  checkResponse(res);
};

const editGroup = async (params: EditGroupRequest) => {
  const res = (await Axios.post('/group/edit', params)) as ApiResponse;
  checkResponse(res);
};

const deleteGroup = async (params: DeleteGroupRequest) => {
  const res = (await Axios.post('/group/delete', params)) as ApiResponse;
  checkResponse(res);
};

const fetchGroupMembers = async (
  groupId: string | number,
  page: number,
  size: number
): Promise<{ members: GroupMember[]; total: number }> => {
  const res = (await Axios.get('/group/member/list', {
    params: { groupId: toNumberIds(groupId), page, size },
  })) as ApiResponse<MemberListPage>;
  checkResponse(res);
  const data = res.data;
  return {
    members: data?.list ?? [],
    total: data?.total ?? 0,
  };
};

const fetchMyRoleInGroup = async (groupId: string): Promise<'OWNER' | 'ADMIN' | 'MEMBER'> => {
  const res = (await Axios.get('/group/member/my-role', {
    params: { groupId: toNumberIds(groupId) },
  })) as ApiResponse<number | { role: number }>;
  checkResponse(res);
  // 兼容 data 直接为数字（OpenAPI schema）或 { role: number }（example 格式）
  const roleNum = typeof res.data === 'number' ? res.data : res.data?.role;
  if (roleNum == null || roleNum < 0) throw new Error('获取角色失败');
  return API_MY_ROLE_MAP[roleNum] ?? 'MEMBER';
};

const joinGroup = async (params: JoinGroupRequest) => {
  const res = (await Axios.post('/group/member/join', params)) as ApiResponse;
  checkResponse(res);
};

const quitGroup = async (params: QuitGroupRequest) => {
  const res = (await Axios.post('/group/member/quit', params)) as ApiResponse;
  checkResponse(res);
};

const updateMemberRole = async (params: UpdateMemberRoleRequest) => {
  const res = (await Axios.post('/group/member/update-role', params)) as ApiResponse;
  checkResponse(res);
};

const kickMembers = async (params: KickMembersRequest) => {
  const res = (await Axios.post('/group/member/kick', params)) as ApiResponse;
  checkResponse(res);
};

export const GroupServices = {
  fetchGroupList,
  fetchGroupInfo,
  createGroup,
  editGroup,
  deleteGroup,
  fetchGroupMembers,
  fetchMyRoleInGroup,
  joinGroup,
  quitGroup,
  updateMemberRole,
  kickMembers,
};
