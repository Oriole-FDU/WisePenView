import { IDENTITY } from '@/domains/User';

/** 基本资料字段显隐配置，按 identityType 计算 */
export const getProfileFieldConfig = (identityType: number) => {
  const isStudent = identityType === IDENTITY.STUDENT;
  const isTeacher = identityType === IDENTITY.TEACHER;
  const isAdmin = identityType === IDENTITY.ADMIN;

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
  } as const;
};

export type ProfileFieldConfig = ReturnType<typeof getProfileFieldConfig>;
export type ProfileFieldKey = keyof Omit<ProfileFieldConfig, 'showProfileSection'>;

export type ProfileFieldGroupKey = 'identity' | 'academic';

/** 基本资料只读/编辑分组：身份信息与学业/任职信息 */
export const PROFILE_FIELD_GROUPS: Array<{
  key: ProfileFieldGroupKey;
  titleKey: string;
  fieldKeys: ProfileFieldKey[];
}> = [
  {
    key: 'identity',
    titleKey: 'form.group.identity',
    fieldKeys: ['nickname', 'realName', 'sex'],
  },
  {
    key: 'academic',
    titleKey: 'form.group.academic',
    fieldKeys: [
      'university',
      'college',
      'major',
      'className',
      'enrollmentYear',
      'degreeLevel',
      'academicTitle',
    ],
  },
];

/** 基本资料字段列表，顺序决定表单 grid 与只读列表展示顺序 */
export const PROFILE_FIELDS: Array<{
  key: ProfileFieldKey;
  labelKey: string;
  type: 'input' | 'select';
  placeholderKey: string;
  optionsKey?: 'sex' | 'degreeLevel';
}> = [
  {
    key: 'nickname',
    labelKey: 'form.field.nickname.label',
    type: 'input',
    placeholderKey: 'form.field.nickname.placeholder',
  },
  {
    key: 'realName',
    labelKey: 'form.field.realName.label',
    type: 'input',
    placeholderKey: 'form.field.realName.placeholder',
  },
  {
    key: 'sex',
    labelKey: 'form.field.sex.label',
    type: 'select',
    placeholderKey: 'form.field.sex.placeholder',
    optionsKey: 'sex',
  },
  {
    key: 'university',
    labelKey: 'form.field.university.label',
    type: 'input',
    placeholderKey: 'form.field.university.placeholder',
  },
  {
    key: 'college',
    labelKey: 'form.field.college.label',
    type: 'input',
    placeholderKey: 'form.field.college.placeholder',
  },
  {
    key: 'major',
    labelKey: 'form.field.major.label',
    type: 'input',
    placeholderKey: 'form.field.major.placeholder',
  },
  {
    key: 'className',
    labelKey: 'form.field.className.label',
    type: 'input',
    placeholderKey: 'form.field.className.placeholder',
  },
  {
    key: 'enrollmentYear',
    labelKey: 'form.field.enrollmentYear.label',
    type: 'input',
    placeholderKey: 'form.field.enrollmentYear.placeholder',
  },
  {
    key: 'degreeLevel',
    labelKey: 'form.field.degreeLevel.label',
    type: 'select',
    placeholderKey: 'form.field.degreeLevel.placeholder',
    optionsKey: 'degreeLevel',
  },
  {
    key: 'academicTitle',
    labelKey: 'form.field.academicTitle.label',
    type: 'input',
    placeholderKey: 'form.field.academicTitle.placeholder',
  },
];

export function getVisibleProfileFieldGroups(fieldConfig: ProfileFieldConfig) {
  return PROFILE_FIELD_GROUPS.map((group) => ({
    ...group,
    fields: PROFILE_FIELDS.filter(
      (field) => group.fieldKeys.includes(field.key) && fieldConfig[field.key]
    ),
  })).filter((group) => group.fields.length > 0);
}
