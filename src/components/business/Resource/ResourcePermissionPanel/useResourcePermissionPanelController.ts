import { toast } from '@heroui/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResourcePermissionService, useResourceService, useUserService } from '@/domains';
import {
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
  type ResourcePermissionSubject,
  updateResourceActionSelection,
} from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import type { ResourcePermissionPanelProps } from './index.type';
import {
  createSpecifiedUserSubject,
  getSubjectActionsForDisplay,
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
  const resourceService = useResourceService();
  const resourcePermissionService = useResourcePermissionService();
  const userService = useUserService();
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSubjectsRef = useRef<ResourcePermissionSubject[]>([]);
  const [subjectDrafts, setSubjectDrafts] = useState<ResourcePermissionSubject[] | null>(null);
  const [groupHydrationState, setGroupHydrationState] = useState<{
    resourceId: string;
    resourceType: string;
    limit: number;
  } | null>(null);
  const [newUserKeyword, setNewUserKeyword] = useState('');
  const [pendingUpdateCount, setPendingUpdateCount] = useState(0);
  const groupHydrationLimit =
    groupHydrationState?.resourceId === resourceId &&
    groupHydrationState.resourceType === resourceType
      ? groupHydrationState.limit
      : GROUP_PERMISSION_PAGE_SIZE;
  const {
    data: permissionOverview,
    loading,
    error,
    refresh: refreshPermissionOverview,
  } = useApi(
    () =>
      resourcePermissionService.getResourcePermissionOverview({
        resourceId,
        resourceType,
        groupHydrationLimit,
      }),
    {
      ready: Boolean(resourceId && resourceType),
      refreshDeps: [resourceId, resourceType, groupHydrationLimit],
      onSuccess: (overview: ResourcePermissionOverview) => {
        latestSubjectsRef.current = overview.subjects;
        setSubjectDrafts(overview.subjects);
      },
    }
  );
  const subjects = subjectDrafts ?? permissionOverview?.subjects ?? [];
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

  const persistPermissionSubjects = (nextSubjects: ResourcePermissionSubject[]) => {
    setPendingUpdateCount((count) => count + 1);
    updateQueueRef.current = updateQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await resourceService.updateResourcePermissionSubjects({
          resourceId,
          subjects: nextSubjects,
        });
        onSuccess?.();
      })
      .catch((err) => {
        toast.danger(parseErrorMessage(err));
        refreshPermissionOverview();
      })
      .finally(() => {
        setPendingUpdateCount((count) => Math.max(0, count - 1));
      });
  };

  const commitSubjectDrafts = (nextSubjects: ResourcePermissionSubject[]) => {
    latestSubjectsRef.current = nextSubjects;
    setSubjectDrafts(nextSubjects);
    persistPermissionSubjects(nextSubjects);
  };

  const handleActionToggle = (
    changedSubject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => {
    const currentSubjects = latestSubjectsRef.current;
    const currentSelectedSubject = currentSubjects.find(
      (subject) => subject.id === changedSubject.id
    );
    if (!currentSelectedSubject || currentSelectedSubject.readonly) return;
    const currentActions = getSubjectActionsForDisplay(currentSelectedSubject);
    const nextActions = updateResourceActionSelection(
      currentActions,
      action,
      !currentActions.includes(action),
      getSupportedActionsFromOptions(actionOptions)
    );
    const nextSubjects = updateSubjectActions(
      currentSubjects,
      currentSelectedSubject.id,
      nextActions,
      actionOptions
    );
    commitSubjectDrafts(nextSubjects);
  };

  const addSpecifiedUserCandidate = (user: SpecifiedUserCandidate) => {
    const currentSubjects = latestSubjectsRef.current;
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
    commitSubjectDrafts([...currentSubjects, nextSubject]);
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
    const nextSubjects = latestSubjectsRef.current.filter(
      (currentSubject) => currentSubject.id !== subject.id
    );
    commitSubjectDrafts(nextSubjects);
  };

  const queryUserCandidates = (keyword: string) =>
    userService.queryUserSearchCandidates({ keyword, size: 6 });

  const loadMoreGroups = () => {
    setGroupHydrationState({
      resourceId,
      resourceType,
      limit: groupHydrationLimit + GROUP_PERMISSION_PAGE_SIZE,
    });
  };

  return {
    actionOptions,
    addSpecifiedUserCandidate,
    canLoadMoreGroups,
    error,
    existingSpecifiedUserIds,
    handleActionToggle,
    handleRemoveSpecifiedUser,
    handleUserSearchEmpty,
    handleUserSearchError,
    inheritedSubjects: visibleInheritedSubjects,
    isUpdating: pendingUpdateCount > 0,
    loadMoreGroups,
    loading: loading && !permissionOverview,
    loadingMoreGroups: loading && Boolean(permissionOverview),
    newUserKeyword,
    permissionOverview,
    queryUserCandidates,
    setNewUserKeyword,
    shouldShowInviteDivider:
      visibleInheritedSubjects.length > 0 && specifiedUserSubjects.length > 0,
    specifiedUserSubjects,
  };
};
