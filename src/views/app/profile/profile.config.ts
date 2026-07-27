import { IDENTITY } from '@/domains/User';

/** 基本档案字段显隐配置，按 identityType 计算 */
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

/** 基本档案字段列表，顺序决定 grid 布局（每行 2 个） */
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
    key: 'academicTitle',
    labelKey: 'form.field.academicTitle.label',
    type: 'input',
    placeholderKey: 'form.field.academicTitle.placeholder',
  },
  {
    key: 'university',
    labelKey: 'form.field.university.label',
    type: 'input',
    placeholderKey: 'form.field.university.placeholder',
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
];
