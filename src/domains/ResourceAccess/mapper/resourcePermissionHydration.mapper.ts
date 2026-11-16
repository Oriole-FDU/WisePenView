import {
  areResourcePermissionActionsEqual,
  filterSupportedResourcePermissionActions,
  type ResourceAction,
} from '@/domains/_shared/access';

import type {
  ResourcePermissionActionOption,
  ResourcePermissionGroupInfo,
  ResourcePermissionHydration,
  ResourcePermissionOverview,
  ResourcePermissionSubject,
  ResourcePermissionUserInfo,
} from '../service/index.type';

const filterPermissionActionsByOptions = (
  actions: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  filterSupportedResourcePermissionActions(
    actions,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

const arePermissionActionsEqualByOptions = (
  left: ResourceAction[] | null | undefined,
  right: ResourceAction[] | null | undefined,
  actionOptions: ResourcePermissionActionOption[]
): boolean =>
  areResourcePermissionActionsEqual(
    left,
    right,
    actionOptions.filter((option) => option.supported).map((option) => option.action)
  );

const resolvePermissionUserDisplayName = (
  userInfo: ResourcePermissionUserInfo,
  fallbackName: string
): string =>
  userInfo.realName?.trim() ||
  userInfo.nickname?.trim() ||
  userInfo.username.trim() ||
  fallbackName;

const mergePermissionSubjectMetadata = (
  subject: ResourcePermissionSubject,
  userInfo: ResourcePermissionUserInfo | undefined,
  groupInfo: ResourcePermissionGroupInfo | undefined
): ResourcePermissionSubject => {
  let nextSubject = subject;
  if (userInfo) {
    const nextName = resolvePermissionUserDisplayName(userInfo, subject.name);
    const nextAvatar = userInfo.avatar?.trim() || subject.avatar;
    if (nextSubject.name !== nextName || nextSubject.avatar !== nextAvatar) {
      nextSubject = {
        ...nextSubject,
        name: nextName,
        avatar: nextAvatar,
      };
    }
  }

  if (groupInfo) {
    const groupName = groupInfo.groupName.trim();
    const groupDescription = groupInfo.groupDesc.trim();
    const nextName = groupName || nextSubject.name;
    const nextDescription =
      nextSubject.source === 'resourceOverride' && groupDescription
        ? groupDescription
        : nextSubject.description;
    const nextAvatar = groupInfo.groupCoverUrl.trim() || nextSubject.avatar;
    if (
      nextSubject.name !== nextName ||
      nextSubject.description !== nextDescription ||
      nextSubject.avatar !== nextAvatar
    ) {
      nextSubject = {
        ...nextSubject,
        name: nextName,
        description: nextDescription,
        avatar: nextAvatar,
      };
    }
  }

  return nextSubject;
};

const mergePermissionSubjectInheritedActions = (
  subject: ResourcePermissionSubject,
  inheritedActions: ResourceAction[] | undefined,
  actionOptions: ResourcePermissionActionOption[]
): ResourcePermissionSubject => {
  if (!subject.groupId || !subject.primaryTagId || !inheritedActions) return subject;
  const normalizedInheritedActions = filterPermissionActionsByOptions(
    inheritedActions,
    actionOptions
  );
  const inheritance = { status: 'ready', actions: normalizedInheritedActions } as const;

  if (subject.source === 'resourceOverride') {
    const matchesTag = arePermissionActionsEqualByOptions(
      subject.editableActions,
      normalizedInheritedActions,
      actionOptions
    );
    if (matchesTag) {
      return {
        ...subject,
        id: `group:${subject.groupId}:tag`,
        source: 'tag',
        description: '',
        editableActions: normalizedInheritedActions,
        effectiveActions: normalizedInheritedActions,
        inheritance,
      };
    }
  }

  if (subject.source === 'tag') {
    return {
      ...subject,
      description: '',
      editableActions: normalizedInheritedActions,
      effectiveActions: normalizedInheritedActions,
      inheritance,
    };
  }

  return {
    ...subject,
    inheritance,
  };
};

/** 二次补全失败时不覆盖原始字段，避免展示数据请求失败导致权限主体消失。 */
const mergeResourcePermissionSubject = (
  subject: ResourcePermissionSubject,
  hydration: ResourcePermissionHydration,
  actionOptions: ResourcePermissionActionOption[]
): ResourcePermissionSubject => {
  const groupInfo = subject.groupId ? hydration.groupInfoById.get(subject.groupId) : undefined;
  const inheritedActions = hydration.inheritedActionsBySubjectId.get(subject.id);
  const withMetadata = mergePermissionSubjectMetadata(
    subject,
    subject.userId ? hydration.userInfoById.get(subject.userId) : undefined,
    groupInfo ?? undefined
  );
  return mergePermissionSubjectInheritedActions(
    {
      ...withMetadata,
      groupInfoStatus:
        groupInfo === null ? 'failed' : groupInfo ? 'ready' : subject.groupInfoStatus,
      inheritance: inheritedActions === null ? { status: 'failed' } : subject.inheritance,
    },
    inheritedActions ?? undefined,
    actionOptions
  );
};

export const mergeResourcePermissionHydration = (
  overview: ResourcePermissionOverview,
  hydration: ResourcePermissionHydration
): ResourcePermissionOverview => {
  const actionOptions = overview.actionOptions;
  const subjects = overview.subjects.map((subject) =>
    mergeResourcePermissionSubject(subject, hydration, actionOptions)
  );
  const owner = overview.owner
    ? mergeResourcePermissionSubject(overview.owner, hydration, actionOptions)
    : overview.owner;

  return {
    ...overview,
    owner,
    subjects,
  };
};
