import type { TagResourceAction } from '@/domains/Tag';
import { TAG_RESOURCE_ACTION } from '@/domains/Tag';
import { createEnum, type EnumValue } from '@/utils/enum';

/** 小组类型 */
export const GROUP_TYPE = createEnum([
  { value: 1, key: 'NORMAL', label: '普通组' },
  { value: 2, key: 'ADVANCED', label: '高级组' },
  { value: 3, key: 'PUBLIC', label: '集市组' },
] as const);

/** 关系类型（我加入的 / 我管理的） */
export const GROUP_ROLE_FILTER_MAP: Record<string, 'JOINED' | 'MANAGED'> = {
  joined: 'JOINED',
  managed: 'MANAGED',
};

/** 小组成员角色码：0=OWNER，1=ADMIN，2=MEMBER（与后端约定一致） */
export const ROLE = createEnum([
  { value: 0, key: 'OWNER', label: '组长' },
  { value: 1, key: 'ADMIN', label: '管理员' },
  { value: 2, key: 'MEMBER', label: '成员' },
] as const);

/** 小组文件组织模式（与后端 FileOrganizationLogic enum name 对齐） */
export const GROUP_FILE_ORG_LOGIC = createEnum([
  { value: 'FOLDER', key: 'FOLDER', label: '文件夹管理（推荐）' },
  { value: 'TAG', key: 'TAG', label: '按标签管理（Beta）' },
] as const);

export const DEFAULT_MEMBER_ACTIONS: TagResourceAction[] = [
  TAG_RESOURCE_ACTION.DISCOVER,
  TAG_RESOURCE_ACTION.VIEW,
  TAG_RESOURCE_ACTION.DOWNLOAD_WATERMARK,
];

export const FILE_ORG_LOGIC_LABEL: Record<EnumValue<typeof GROUP_FILE_ORG_LOGIC>, string> = {
  [GROUP_FILE_ORG_LOGIC.FOLDER]: '文件夹',
  [GROUP_FILE_ORG_LOGIC.TAG]: '标签',
};

export const FILE_ORG_LOGIC_INTRO: Record<EnumValue<typeof GROUP_FILE_ORG_LOGIC>, string> = {
  [GROUP_FILE_ORG_LOGIC.FOLDER]:
    '文件夹模式：用常规文件夹模式组织资源，同一份资源只能上传到一个文件夹下。',
  [GROUP_FILE_ORG_LOGIC.TAG]: '标签模式：用标签组织资源，同一份资源可以上传到多个标签下。',
};

/** 身份类型 -> 可创建的小组类型列表 */
export const ALLOWED_GROUP_TYPES_MAP: Record<number, number[]> = {
  1: [GROUP_TYPE.NORMAL],
  2: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED],
  3: [GROUP_TYPE.NORMAL, GROUP_TYPE.ADVANCED, GROUP_TYPE.PUBLIC],
};
