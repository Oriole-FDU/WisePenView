import type { UpdateUserInfoRequest, UserAccountProfile } from '@/domains/User';

export function buildProfileFormValues(data: UserAccountProfile): UpdateUserInfoRequest {
  return {
    nickname: data.userInfo.nickname ?? undefined,
    realName: data.userInfo.realName ?? undefined,
    sex: data.userProfile.sex,
    university: data.userProfile.university ?? undefined,
    college: data.userProfile.college ?? undefined,
    major: data.userProfile.major ?? undefined,
    className: data.userProfile.className ?? undefined,
    enrollmentYear: data.userProfile.enrollmentYear ?? undefined,
    degreeLevel: data.userProfile.degreeLevel ?? undefined,
    academicTitle: data.userProfile.academicTitle ?? undefined,
  };
}
