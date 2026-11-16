import type { TFunction } from 'i18next';

import {
  areResourcePermissionActionsEqualByOptions,
  filterResourcePermissionActionsByOptions,
  getResourcePermissionActionLabel,
} from '@/components/business/Drive/common/resourcePermissionPolicy';
import type { ResourceAction } from '@/domains/_shared/access';
import type {
  ResourcePermissionActionOption,
  ResourcePermissionSubject,
} from '@/domains/ResourceAccess';
import type { UserSearchUser } from '@/domains/User';

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
    return subject.inheritance?.status === 'ready'
      ? subject.inheritance.actions
      : subject.effectiveActions;
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
      subject.inheritance?.status === 'ready' &&
      areResourcePermissionActionsEqualByOptions(nextActions, subject.inheritance.actions, options)
    ) {
      const inheritedActions = filterResourcePermissionActionsByOptions(
        subject.inheritance.actions,
        options
      );
      return {
        ...subject,
        id: subject.groupId ? `group:${subject.groupId}:tag` : subject.id,
        source: 'tag',
        description: '',
        editableActions: inheritedActions,
        effectiveActions: inheritedActions,
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

/** 查询负责最新补全资料；本地修改只覆盖动作与明确移除的用户。 */
export const applyResourcePermissionSubjectDrafts = (
  subjects: ResourcePermissionSubject[],
  drafts: ReadonlyMap<string, ResourcePermissionSubject | null>
): ResourcePermissionSubject[] => {
  const remainingDrafts = new Map(drafts);
  const result = subjects.flatMap((subject) => {
    const key = getSubjectRenderKey(subject);
    const draft = remainingDrafts.get(key);
    remainingDrafts.delete(key);
    if (draft === null) return [];
    if (!draft) return [subject];
    const actions =
      draft.source === 'tag' && subject.inheritance?.status === 'ready'
        ? subject.inheritance.actions
        : draft.editableActions;
    return [
      {
        ...subject,
        id: draft.id,
        source: draft.source,
        editableActions: actions,
        effectiveActions: actions,
      },
    ];
  });
  remainingDrafts.forEach((draft) => {
    if (draft) result.push(draft);
  });
  return result;
};

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
