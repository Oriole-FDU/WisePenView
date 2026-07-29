import {
  areResourcePermissionActionsEqualByOptions,
  filterResourcePermissionActionsByOptions,
  getResourcePermissionActionLabel,
} from '@/components/Drive/common/resourcePermissionPolicy';
import type {
  ResourceAction,
  ResourcePermissionActionOption,
  ResourcePermissionSubject,
} from '@/domains/Resource';
import type { UserSearchUser } from '@/domains/User';
import type { TFunction } from 'i18next';

export type SpecifiedUserCandidate = Pick<
  UserSearchUser,
  'userId' | 'username' | 'nickname' | 'realName' | 'avatar'
>;

export const getSupportedActionsFromOptions = (
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  actionOptions.filter((option) => option.supported).map((option) => option.action);

export const localizePermissionActionOptions = (
  actionOptions: ResourcePermissionActionOption[]
): ResourcePermissionActionOption[] =>
  actionOptions.map((option) => ({
    ...option,
    label: getResourcePermissionActionLabel(option.action),
  }));

export const getAvatarSrc = (avatar?: string): string | undefined => {
  const trimmedAvatar = avatar?.trim();
  return trimmedAvatar || undefined;
};

export const getUserCandidateDisplayName = (
  user: SpecifiedUserCandidate,
  t: TFunction<'resource'>
): string =>
  user.realName?.trim() ||
  user.nickname?.trim() ||
  user.username.trim() ||
  t('permission.userFallback', { userId: user.userId });

export const getSubjectActionsForDisplay = (
  subject: ResourcePermissionSubject
): ResourceAction[] => {
  if (subject.source === 'tag') {
    return subject.inheritedActions ?? subject.effectiveActions;
  }
  return subject.readonly ? subject.effectiveActions : subject.editableActions;
};

export const getSubjectRenderKey = (subject: ResourcePermissionSubject): string => {
  if (subject.groupId) return `group:${subject.groupId}`;
  if (subject.userId) return `user:${subject.userId}:${subject.source}`;
  return subject.id;
};

export const updateSubjectActions = (
  subjects: ResourcePermissionSubject[],
  subjectId: string,
  actions: ResourcePermissionActionOption['action'][],
  options: ResourcePermissionActionOption[]
): ResourcePermissionSubject[] =>
  subjects.map((subject) => {
    if (subject.id !== subjectId || subject.readonly) return subject;
    const nextActions = filterResourcePermissionActionsByOptions(actions, options);
    if (
      subject.source === 'resourceOverride' &&
      Array.isArray(subject.inheritedActions) &&
      areResourcePermissionActionsEqualByOptions(nextActions, subject.inheritedActions, options)
    ) {
      const inheritedActions = filterResourcePermissionActionsByOptions(
        subject.inheritedActions,
        options
      );
      return {
        ...subject,
        id: subject.groupId ? `group:${subject.groupId}:tag` : subject.id,
        source: 'tag',
        description: '',
        editableActions: inheritedActions,
        effectiveActions: inheritedActions,
        inheritedActions,
      };
    }
    if (subject.source === 'tag') {
      return {
        ...subject,
        id: subject.groupId ? `group:${subject.groupId}:override` : `${subject.id}:override`,
        source: 'resourceOverride',
        description: '',
        editableActions: nextActions,
        effectiveActions: nextActions,
      };
    }
    return {
      ...subject,
      editableActions: nextActions,
      effectiveActions: nextActions,
    };
  });

export const createSpecifiedUserSubject = (
  user: SpecifiedUserCandidate,
  t: TFunction<'resource'>
): ResourcePermissionSubject => ({
  id: `user:${user.userId}:specified`,
  kind: 'user',
  source: 'specifiedUser',
  name: getUserCandidateDisplayName(user, t),
  description: '',
  avatar: getAvatarSrc(user.avatar),
  userId: user.userId,
  effectiveActions: [],
  editableActions: [],
});
