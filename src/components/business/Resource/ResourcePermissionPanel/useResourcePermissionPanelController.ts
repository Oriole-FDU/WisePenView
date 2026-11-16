import { toast } from '@heroui/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResourceAccessService, useUserService } from '@/domains';
import { updateResourceActionSelection } from '@/domains/_shared/access';
import {
  canEditResourcePermissionSubject,
  type ResourcePermissionActionOption,
  type ResourcePermissionSubject,
} from '@/domains/ResourceAccess';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import type { ResourcePermissionPanelProps } from './index.type';
import {
  applyResourcePermissionSubjectDrafts,
  createSpecifiedUserSubject,
  getSubjectActionsForDisplay,
  getSubjectRenderKey,
  getSupportedActionsFromOptions,
  localizePermissionActionOptions,
  type SpecifiedUserCandidate,
  updateSubjectActions,
} from './resourcePermissionPanelModel';

const EMPTY_ACTION_OPTIONS: ResourcePermissionActionOption[] = [];
const GROUP_PERMISSION_PAGE_SIZE = 10;

const resolveVisibleGroupIds = (
  subjects: ResourcePermissionSubject[],
  limit: number
): Set<string> => {
  const groupIds = new Set<string>();
  for (const subject of subjects) {
    if (!subject.groupId || groupIds.has(subject.groupId)) continue;
    groupIds.add(subject.groupId);
    if (groupIds.size >= limit) break;
  }
  return groupIds;
};

export const useResourcePermissionPanelController = ({
  resourceId,
  resourceType,
  onSuccess,
}: ResourcePermissionPanelProps) => {
  const { t } = useTranslation('resource');
  const resourceAccessService = useResourceAccessService();
  const userService = useUserService();
  const savePendingRef = useRef(false);
  const [subjectDrafts, setSubjectDrafts] = useState(
    () => new Map<string, ResourcePermissionSubject | null>()
  );
  const [groupHydrationLimit, setGroupHydrationLimit] = useState(GROUP_PERMISSION_PAGE_SIZE);
  const [newUserKeyword, setNewUserKeyword] = useState('');
  const {
    data: permissionOverview,
    loading,
    error,
    refresh: refreshPermissionOverview,
  } = useApi(
    () =>
      resourceAccessService.getResourcePermissionOverview({
        resourceId,
        resourceType,
        groupHydrationLimit,
      }),
    {
      ready: Boolean(resourceId && resourceType),
      refreshDeps: [groupHydrationLimit],
      showErrorToast: false,
    }
  );
  const subjects = applyResourcePermissionSubjectDrafts(
    permissionOverview?.subjects ?? [],
    subjectDrafts
  );
  const actionOptions = localizePermissionActionOptions(
    permissionOverview?.actionOptions ?? EMPTY_ACTION_OPTIONS
  );
  const inheritedSubjects = subjects.filter((subject) => subject.source !== 'specifiedUser');
  const specifiedUserSubjects = subjects.filter((subject) => subject.source === 'specifiedUser');
  const visibleGroupIds = resolveVisibleGroupIds(inheritedSubjects, groupHydrationLimit);
  const visibleInheritedSubjects = inheritedSubjects.filter(
    (subject) => !subject.groupId || visibleGroupIds.has(subject.groupId)
  );
  const canLoadMoreGroups = inheritedSubjects.some(
    (subject) => subject.groupId && !visibleGroupIds.has(subject.groupId)
  );
  const existingSpecifiedUserIds = new Set(
    specifiedUserSubjects
      .map((subject) => subject.userId)
      .filter((userId): userId is string => Boolean(userId))
  );

  const {
    loading: saving,
    error: saveError,
    run: saveSubjects,
  } = useApi(
    async (nextSubjects: ResourcePermissionSubject[]) => {
      await resourceAccessService.updateResourcePermissionSubjects({
        resourceId,
        subjects: nextSubjects,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
      },
      onErrorEffect: () => {
        refreshPermissionOverview();
      },
      onFinally: () => {
        savePendingRef.current = false;
      },
    }
  );
  const hasUnknownActions = !subjects.every(canEditResourcePermissionSubject);
  const hasFailedActions = subjects.some((subject) => subject.inheritance?.status === 'failed');
  const hasFailedGroupInfo = subjects.some((subject) => subject.groupInfoStatus === 'failed');
  const editingDisabled =
    loading || saving || Boolean(error) || !permissionOverview || hasUnknownActions;

  const persistPermissionSubjects = (nextSubjects: ResourcePermissionSubject[]) => {
    if (editingDisabled || savePendingRef.current) return;
    savePendingRef.current = true;
    saveSubjects(nextSubjects);
  };

  const commitSubjectDraft = (key: string, subject: ResourcePermissionSubject | null) => {
    if (editingDisabled || savePendingRef.current) return;
    const nextDrafts = new Map(subjectDrafts).set(key, subject);
    setSubjectDrafts(nextDrafts);
    persistPermissionSubjects(
      applyResourcePermissionSubjectDrafts(permissionOverview?.subjects ?? [], nextDrafts)
    );
  };

  const handleActionToggle = (
    changedSubject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => {
    const currentSelectedSubject = subjects.find((subject) => subject.id === changedSubject.id);
    if (!currentSelectedSubject || currentSelectedSubject.readonly) return;
    const currentActions = getSubjectActionsForDisplay(currentSelectedSubject);
    const nextActions = updateResourceActionSelection(
      currentActions,
      action,
      !currentActions.includes(action),
      getSupportedActionsFromOptions(actionOptions)
    );
    const nextSubject = updateSubjectActions(currentSelectedSubject, nextActions, actionOptions);
    commitSubjectDraft(getSubjectRenderKey(currentSelectedSubject), nextSubject);
  };

  const addSpecifiedUserCandidate = (user: SpecifiedUserCandidate) => {
    if (editingDisabled || savePendingRef.current) return;
    const currentSubjects = subjects;
    const userId = user.userId.trim();
    if (!userId) {
      toast.warning(t('permission.feedback.invalidUser'));
      return;
    }
    if (currentSubjects.some((subject) => subject.userId === userId)) {
      toast.warning(t('permission.feedback.duplicateUser'));
      return;
    }
    const nextSubject = createSpecifiedUserSubject({ ...user, userId }, t);
    commitSubjectDraft(getSubjectRenderKey(nextSubject), nextSubject);
    setNewUserKeyword('');
  };

  const handleUserSearchEmpty = () => {
    const keyword = newUserKeyword.trim();
    toast.warning(
      keyword ? t('permission.feedback.userNotFound') : t('permission.feedback.userRequired')
    );
  };

  const handleUserSearchError = (err: unknown) => {
    toast.danger(parseErrorMessage(err));
  };

  const handleRemoveSpecifiedUser = (subject: ResourcePermissionSubject) => {
    if (subject.source !== 'specifiedUser') return;
    commitSubjectDraft(getSubjectRenderKey(subject), null);
  };

  const queryUserCandidates = (keyword: string) =>
    userService.queryUserSearchCandidates({ keyword, size: 6 });

  const loadMoreGroups = () => {
    setGroupHydrationLimit((limit) => limit + GROUP_PERMISSION_PAGE_SIZE);
  };

  return {
    actionOptions,
    addSpecifiedUserCandidate,
    canLoadMoreGroups,
    error,
    editingDisabled,
    existingSpecifiedUserIds,
    handleActionToggle,
    handleRemoveSpecifiedUser,
    handleUserSearchEmpty,
    handleUserSearchError,
    inheritedSubjects: visibleInheritedSubjects,
    hasUnknownActions,
    hasFailedActions,
    hasFailedGroupInfo,
    isUpdating: saving,
    loadMoreGroups,
    loading: loading && !permissionOverview,
    loadingMoreGroups: loading && Boolean(permissionOverview),
    newUserKeyword,
    permissionOverview,
    refreshPermissionOverview,
    retrySave: () => persistPermissionSubjects(subjects),
    saveError,
    queryUserCandidates,
    setNewUserKeyword,
    shouldShowInviteDivider:
      visibleInheritedSubjects.length > 0 && specifiedUserSubjects.length > 0,
    specifiedUserSubjects,
  };
};
