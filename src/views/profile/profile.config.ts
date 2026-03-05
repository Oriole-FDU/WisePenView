import { IDENTITY_TYPE } from '@/constants/user';
import type { UpdateUserProfileRequest } from '@/services/User';

/** 基本档案字段显隐配置，按 identityType 计算 */
export const getProfileFieldConfig = (identityType: number) => {
  const isStudent = identityType === IDENTITY_TYPE.STUDENT;
  const isTeacher = identityType === IDENTITY_TYPE.TEACHER;
  const isAdmin = identityType === IDENTITY_TYPE.ADMIN;

  return {
    showProfileSection: !isAdmin,
    nickname: !isAdmin,
    realName: !isAdmin,
    sex: !isAdmin,
    university: !isAdmin,
    college: !isAdmin,
    major: isStudent,
    className: isStudent,
    enrollmentYear: isStudent,
    degreeLevel: isStudent,
    academicTitle: isTeacher,
    /** 编辑模式下为 disabled（只读）的字段 */
    disabledFields: [
      'university',
      ...(isStudent ? (['enrollmentYear', 'degreeLevel'] as const) : []),
    ] as const,
  } as const;
};

export type ProfileFieldConfig = ReturnType<typeof getProfileFieldConfig>;
export type ProfileFieldKey = keyof Omit<
  ProfileFieldConfig,
  'showProfileSection' | 'disabledFields'
>;

/** 基本档案字段列表，顺序决定 grid 布局（每行 2 个） */
export const PROFILE_FIELDS: Array<{
  key: ProfileFieldKey;
  label: string;
  type: 'input' | 'select';
  placeholder: string;
  optionsKey?: 'sex' | 'degreeLevel';
}> = [
  { key: 'nickname', label: '昵称', type: 'input', placeholder: '请输入昵称' },
  { key: 'realName', label: '真实姓名', type: 'input', placeholder: '请输入真实姓名' },
  { key: 'sex', label: '性别', type: 'select', placeholder: '请选择性别', optionsKey: 'sex' },
  { key: 'college', label: '学院', type: 'input', placeholder: '请输入学院' },
  { key: 'major', label: '专业', type: 'input', placeholder: '请输入专业' },
  { key: 'className', label: '班级', type: 'input', placeholder: '请输入班级' },
  { key: 'academicTitle', label: '职称', type: 'input', placeholder: '请输入职称' },
  { key: 'university', label: '高校', type: 'input', placeholder: '请输入高校' },
  { key: 'enrollmentYear', label: '入学年份', type: 'input', placeholder: '如：2024' },
  {
    key: 'degreeLevel',
    label: '学历层次',
    type: 'select',
    placeholder: '请选择学历层次',
    optionsKey: 'degreeLevel',
  },
];
