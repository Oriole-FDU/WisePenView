import AppAvatar from '@/components/Avatar';
import AppIconButton from '@/components/Button/AppIconButton';
import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  areResourcePermissionActionsEqualByOptions,
  buildResourcePermissionActionKeySet,
  filterResourcePermissionActionsByOptions,
} from '@/components/Drive/common/resourcePermissionPolicy';
import { Popover } from '@/components/Overlay';
import UserSearchCombobox from '@/components/UserSearchCombobox';
import { useGroupService, useResourceService, useTagService, useUserService } from '@/domains';
import type { GroupBaseInfo } from '@/domains/Group';
import {
  type ResourceAction,
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
  type ResourcePermissionSource,
  type ResourcePermissionSubject,
  updateResourceActionSelection,
} from '@/domains/Resource';
import type { UserSearchUser } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, ListBox, Skeleton, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { ResourcePermissionPanelProps } from './index.type';
import styles from './style.module.less';

interface SubjectPermissionPopoverProps {
  subject: ResourcePermissionSubject;
  actionOptions: ResourcePermissionActionOption[];
  onActionToggle: (
    subject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => void;
}

type SpecifiedUserCandidate = Pick<
  UserSearchUser,
  'userId' | 'username' | 'nickname' | 'realName' | 'avatar'
>;

const sourceLabelMap: Record<ResourcePermissionSource, string> = {
  owner: '所有者',
  tag: '来自标签',
  resourceOverride: '资源覆盖',
  specifiedUser: '指定用户',
};
const TAG_INHERITED_DESCRIPTION = '继承自资源所在标签的权限';
const RESOURCE_OVERRIDE_DESCRIPTION = '已覆盖标签策略，仅对此资源生效';
const EMPTY_ACTION_OPTIONS: ResourcePermissionActionOption[] = [];
const PANEL_SKELETON_ROWS = ['owner', 'tag', 'override', 'specifiedUser'] as const;

const getSupportedActionsFromOptions = (
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  actionOptions.filter((option) => option.supported).map((option) => option.action);

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getAvatarSrc = (avatar?: string): string | undefined => {
  const trimmedAvatar = avatar?.trim();
  return trimmedAvatar || undefined;
};

const getUserCandidateDisplayName = (user: SpecifiedUserCandidate): string =>
  user.realName?.trim() || user.nickname?.trim() || user.username.trim() || `用户 ${user.userId}`;

const getActionLabel = (
  action: ResourcePermissionActionOption['action'],
  options: ResourcePermissionActionOption[]
): string => options.find((option) => option.action === action)?.label ?? String(action);

const formatActionSummary = (
  subject: ResourcePermissionSubject,
  options: ResourcePermissionActionOption[]
): string => {
  if (subject.source === 'owner') return '全部权限';
  if (subject.source === 'tag') return '继承自标签';
  const actions = subject.effectiveActions;
  if (actions.length === 0) {
    return '无权限';
  }
  const first = actions[0];
  return `${getActionLabel(first, options)} 等 ${actions.length} 个权限`;
};

const getSubjectActionsForDisplay = (subject: ResourcePermissionSubject) => {
  if (subject.source === 'tag') {
    return subject.inheritedActions ?? subject.effectiveActions;
  }
  return subject.readonly ? subject.effectiveActions : subject.editableActions;
};

const canCompareWithInheritedActions = (subject: ResourcePermissionSubject): boolean =>
  Array.isArray(subject.inheritedActions);

const getSubjectRenderKey = (subject: ResourcePermissionSubject): string => {
  if (subject.groupId) return `group:${subject.groupId}`;
  if (subject.userId) return `user:${subject.userId}:${subject.source}`;
  return subject.id;
};

const updateSubjectActions = (
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
      canCompareWithInheritedActions(subject) &&
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
        description: TAG_INHERITED_DESCRIPTION,
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
        description: RESOURCE_OVERRIDE_DESCRIPTION,
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

const createSpecifiedUserSubject = (user: SpecifiedUserCandidate): ResourcePermissionSubject => ({
  id: `user:${user.userId}:specified`,
  kind: 'user',
  source: 'specifiedUser',
  name: getUserCandidateDisplayName(user),
  description: '由您邀请而获得的权限',
  avatar: getAvatarSrc(user.avatar),
  userId: user.userId,
  effectiveActions: [],
  editableActions: [],
});

const hydrateUserDisplayInfo = (
  subjects: ResourcePermissionSubject[],
  userInfoById: Map<string, SpecifiedUserCandidate>
): ResourcePermissionSubject[] => {
  let changed = false;
  const nextSubjects = subjects.map((subject) => {
    if (!subject.userId) return subject;
    const userInfo = userInfoById.get(subject.userId);
    if (!userInfo) return subject;

    const nextName = getUserCandidateDisplayName(userInfo);
    const nextAvatar = getAvatarSrc(userInfo.avatar) || getAvatarSrc(subject.avatar);
    if (subject.name === nextName && subject.avatar === nextAvatar) {
      return subject;
    }

    changed = true;
    return {
      ...subject,
      name: nextName,
      avatar: nextAvatar,
    };
  });

  return changed ? nextSubjects : subjects;
};

const hydrateGroupDisplayInfo = (
  subjects: ResourcePermissionSubject[],
  groupInfoById: Map<string, GroupBaseInfo>
): ResourcePermissionSubject[] => {
  let changed = false;
  const nextSubjects = subjects.map((subject) => {
    if (!subject.groupId) return subject;
    const groupInfo = groupInfoById.get(subject.groupId);
    if (!groupInfo) return subject;

    const groupName = groupInfo.groupName.trim();
    const groupDesc = groupInfo.groupDesc.trim();
    const groupCoverUrl = groupInfo.groupCoverUrl.trim();
    const nextName = groupName ? `${groupName} 的成员` : subject.name;
    const nextDescription =
      subject.source === 'resourceOverride' && groupDesc ? groupDesc : subject.description;
    const nextAvatar = groupCoverUrl || getAvatarSrc(subject.avatar);

    if (
      subject.name === nextName &&
      subject.description === nextDescription &&
      subject.avatar === nextAvatar
    ) {
      return subject;
    }

    changed = true;
    return {
      ...subject,
      name: nextName,
      description: nextDescription,
      avatar: nextAvatar,
    };
  });

  return changed ? nextSubjects : subjects;
};

const hydrateInheritedTagActions = (
  subjects: ResourcePermissionSubject[],
  options: ResourcePermissionActionOption[],
  getInheritedActions: (subject: ResourcePermissionSubject) => ResourceAction[] | undefined
): ResourcePermissionSubject[] =>
  subjects.map((subject) => {
    if (!subject.groupId || !subject.primaryTagId) return subject;
    const inheritedActions = getInheritedActions(subject);
    if (!inheritedActions) return subject;
    const normalizedInheritedActions = filterResourcePermissionActionsByOptions(
      inheritedActions,
      options
    );

    if (subject.source === 'resourceOverride') {
      const matchesTag = areResourcePermissionActionsEqualByOptions(
        subject.editableActions,
        normalizedInheritedActions,
        options
      );
      if (matchesTag) {
        return {
          ...subject,
          id: `group:${subject.groupId}:tag`,
          source: 'tag',
          description: TAG_INHERITED_DESCRIPTION,
          editableActions: normalizedInheritedActions,
          effectiveActions: normalizedInheritedActions,
          inheritedActions: normalizedInheritedActions,
        };
      }
    }

    if (subject.source === 'tag') {
      return {
        ...subject,
        description: TAG_INHERITED_DESCRIPTION,
        editableActions: normalizedInheritedActions,
        effectiveActions: normalizedInheritedActions,
        inheritedActions: normalizedInheritedActions,
      };
    }

    return {
      ...subject,
      inheritedActions: normalizedInheritedActions,
    };
  });

function SubjectPermissionPopover({
  subject,
  actionOptions,
  onActionToggle,
}: SubjectPermissionPopoverProps) {
  const selectedActionKeys = buildResourcePermissionActionKeySet(
    getSubjectActionsForDisplay(subject),
    actionOptions
  );
  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className={styles.permissionButton}
      isDisabled={subject.readonly || actionOptions.length === 0}
      aria-label={`${subject.name} 的权限`}
    >
      <span className={styles.permissionTriggerText}>
        {formatActionSummary(subject, actionOptions)}
      </span>
      {!subject.readonly && actionOptions.length > 0 ? (
        <ChevronDown size={14} aria-hidden className={styles.permissionChevron} />
      ) : null}
    </Button>
  );

  if (subject.readonly || actionOptions.length === 0) {
    return trigger;
  }

  return (
    <Popover deferContent={false}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content className={styles.permissionPopover} placement="bottom end">
        <Popover.Dialog>
          <ListBox
            aria-label={`${subject.name} 的权限选项`}
            selectionMode="multiple"
            selectedKeys={selectedActionKeys}
            className={styles.actionList}
          >
            {actionOptions.map((option) => (
              <ListBox.Item
                id={option.key}
                key={option.key}
                textValue={option.label}
                onPress={() => onActionToggle(subject, option.action)}
              >
                <span className={styles.actionLabel}>
                  <ResourcePermissionActionIcon
                    action={option.action}
                    className={styles.actionIcon}
                  />
                  <span className={styles.actionText}>{option.label}</span>
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function PermissionPanelSkeleton() {
  return (
    <div className={styles.skeletonShell} aria-label="正在加载权限配置">
      <div className={styles.skeletonList}>
        {PANEL_SKELETON_ROWS.map((row) => (
          <div key={row} className={styles.skeletonItem}>
            <Skeleton className={styles.skeletonAvatar} />
            <div className={styles.skeletonMeta}>
              <Skeleton className={styles.skeletonName} />
              <Skeleton className={styles.skeletonDescription} />
            </div>
            <Skeleton className={styles.skeletonAction} />
          </div>
        ))}
      </div>
      <div className={styles.skeletonAddRow}>
        <Skeleton className={styles.skeletonInput} />
        <Skeleton className={styles.skeletonAddButton} />
      </div>
    </div>
  );
}

function ResourcePermissionPanel({
  resourceId,
  resourceType,
  onSuccess,
}: ResourcePermissionPanelProps) {
  const groupService = useGroupService();
  const resourceService = useResourceService();
  const tagService = useTagService();
  const userService = useUserService();
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSubjectsRef = useRef<ResourcePermissionSubject[]>([]);
  const [subjectDrafts, setSubjectDrafts] = useState<ResourcePermissionSubject[] | null>(null);
  const [newUserKeyword, setNewUserKeyword] = useState('');
  const [pendingUpdateCount, setPendingUpdateCount] = useState(0);
  const {
    data: permissionOverview,
    loading,
    error,
    refresh: refreshPermissionOverview,
  } = useRequest(
    () => resourceService.getResourcePermissionOverview({ resourceId, resourceType }),
    {
      ready: Boolean(resourceId && resourceType),
      refreshDeps: [resourceId, resourceType],
      onSuccess: (overview: ResourcePermissionOverview) => {
        latestSubjectsRef.current = overview.subjects;
        setSubjectDrafts(overview.subjects);
      },
    }
  );
  const subjects = subjectDrafts ?? permissionOverview?.subjects ?? [];
  const actionOptions = permissionOverview?.actionOptions ?? EMPTY_ACTION_OPTIONS;
  const inheritedSubjects = subjects.filter((subject) => subject.source !== 'specifiedUser');
  const specifiedUserSubjects = subjects.filter((subject) => subject.source === 'specifiedUser');
  const existingSpecifiedUserIds = new Set(
    specifiedUserSubjects
      .map((subject) => subject.userId)
      .filter((userId): userId is string => Boolean(userId))
  );
  const shouldShowInviteDivider = inheritedSubjects.length > 0 && specifiedUserSubjects.length > 0;

  const isUpdating = pendingUpdateCount > 0;

  useRequest(
    async () => {
      if (!permissionOverview) return;
      const userSubjects = permissionOverview.subjects.filter(
        (subject) => subject.userId && subject.kind !== 'group'
      );
      if (userSubjects.length === 0) return;

      const userInfoById = new Map<string, SpecifiedUserCandidate>();
      const ownerIds = new Set(
        userSubjects
          .filter((subject) => subject.source === 'owner')
          .map((subject) => subject.userId)
          .filter((userId): userId is string => Boolean(userId))
      );

      if (ownerIds.size > 0) {
        const currentUser = await userService.getUserInfo().catch(() => undefined);
        if (currentUser && ownerIds.has(currentUser.id)) {
          userInfoById.set(currentUser.id, {
            userId: currentUser.id,
            username: currentUser.username,
            nickname: currentUser.nickname,
            realName: currentUser.realName,
            avatar: currentUser.avatar,
          });
        }
      }

      await Promise.all(
        userSubjects
          .filter((subject) => subject.source !== 'owner' && subject.userId)
          .map(async (subject) => {
            const userId = subject.userId;
            if (!userId || userInfoById.has(userId)) return;
            const keywords = Array.from(
              new Set([userId, subject.name].map((keyword) => keyword.trim()).filter(Boolean))
            );
            for (const keyword of keywords) {
              const candidates = await userService
                .queryUserSearchCandidates({ keyword, size: 6 })
                .catch(() => []);
              const matchedUser = candidates.find((user) => user.userId === userId);
              if (matchedUser) {
                userInfoById.set(userId, matchedUser);
                return;
              }
            }
          })
      );

      if (userInfoById.size === 0) return;

      setSubjectDrafts((currentSubjects) => {
        const baseSubjects = currentSubjects ?? permissionOverview.subjects;
        const nextSubjects = hydrateUserDisplayInfo(baseSubjects, userInfoById);
        latestSubjectsRef.current = nextSubjects;
        return nextSubjects;
      });
    },
    {
      ready: Boolean(permissionOverview),
      refreshDeps: [permissionOverview, userService],
    }
  );

  useRequest(
    async () => {
      if (!permissionOverview) return;
      const groupIds = Array.from(
        new Set(
          permissionOverview.subjects
            .map((subject) => subject.groupId)
            .filter((groupId): groupId is string => Boolean(groupId))
        )
      );
      if (groupIds.length === 0) return;

      const groupInfos = await Promise.all(
        groupIds.map((groupId) => groupService.fetchGroupBaseInfo(groupId).catch(() => undefined))
      );
      const groupInfoById = new Map(
        groupInfos
          .filter((groupInfo): groupInfo is GroupBaseInfo => Boolean(groupInfo?.groupId))
          .map((groupInfo) => [groupInfo.groupId, groupInfo])
      );
      if (groupInfoById.size === 0) return;

      setSubjectDrafts((currentSubjects) => {
        const baseSubjects = currentSubjects ?? permissionOverview.subjects;
        const nextSubjects = hydrateGroupDisplayInfo(baseSubjects, groupInfoById);
        latestSubjectsRef.current = nextSubjects;
        return nextSubjects;
      });
    },
    {
      ready: Boolean(permissionOverview),
      refreshDeps: [permissionOverview, groupService],
    }
  );

  useRequest(
    async () => {
      if (!permissionOverview || actionOptions.length === 0) return;
      const groupIds = Array.from(
        new Set(
          permissionOverview.subjects
            .map((subject) => subject.groupId)
            .filter((groupId): groupId is string => Boolean(groupId))
        )
      );
      if (groupIds.length === 0) return;

      await Promise.all(
        groupIds.map((groupId) => tagService.getRawTagTree(groupId).catch(() => []))
      );
      setSubjectDrafts((currentSubjects) => {
        const baseSubjects = currentSubjects ?? permissionOverview.subjects;
        const nextSubjects = hydrateInheritedTagActions(baseSubjects, actionOptions, (subject) =>
          subject.primaryTagId
            ? tagService.getRawTagById(subject.primaryTagId, subject.groupId)?.grantedActions
            : undefined
        );
        latestSubjectsRef.current = nextSubjects;
        return nextSubjects;
      });
    },
    {
      ready: Boolean(permissionOverview && actionOptions.length > 0),
      refreshDeps: [permissionOverview, actionOptions, tagService],
    }
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
      toast.warning('未找到有效用户');
      return;
    }
    if (currentSubjects.some((subject) => subject.userId === userId)) {
      toast.warning('该用户已在协作者列表中');
      return;
    }
    const nextSubject = createSpecifiedUserSubject({ ...user, userId });
    const nextSubjects = [...currentSubjects, nextSubject];
    commitSubjectDrafts(nextSubjects);
    setNewUserKeyword('');
  };

  const handleUserSearchEmpty = () => {
    const keyword = newUserKeyword.trim();
    toast.warning(keyword ? '未找到可见用户，请输入完整用户名或邮箱' : '请输入完整用户名或邮箱');
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

  const queryUserCandidates = useCallback(
    (keyword: string) => userService.queryUserSearchCandidates({ keyword, size: 6 }),
    [userService]
  );

  const renderSubjectItem = (subject: ResourcePermissionSubject) => {
    const avatarSrc = getAvatarSrc(subject.avatar);

    return (
      <div key={getSubjectRenderKey(subject)} role="listitem" className={styles.subjectItem}>
        <div className={styles.subjectContent}>
          <AppAvatar aria-label={subject.name} className={styles.avatar}>
            {avatarSrc ? <AppAvatar.Image alt={subject.name} src={avatarSrc} /> : null}
            <AppAvatar.Fallback>{getDisplayInitial(subject.name)}</AppAvatar.Fallback>
          </AppAvatar>
          <div className={styles.subjectMeta}>
            <div className={styles.subjectNameRow}>
              <span className={styles.subjectName}>{subject.name}</span>
              <Chip size="sm" variant="soft" className={styles.sourceChip}>
                <Chip.Label>{sourceLabelMap[subject.source]}</Chip.Label>
              </Chip>
            </div>
            {subject.description ? (
              <span className={styles.subjectDescription}>{subject.description}</span>
            ) : null}
          </div>
          <div className={styles.subjectActions}>
            <SubjectPermissionPopover
              subject={subject}
              actionOptions={actionOptions}
              onActionToggle={handleActionToggle}
            />
            {subject.source === 'specifiedUser' ? (
              <AppIconButton
                icon={<Trash2 size={16} aria-hidden />}
                label="移除协作者"
                size="sm"
                variant="danger"
                onPress={() => handleRemoveSpecifiedUser(subject)}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.panel} aria-busy={isUpdating || undefined}>
      <div className={styles.panelBody}>
        {loading ? (
          <PermissionPanelSkeleton />
        ) : error ? (
          <div className={styles.stateText}>{parseErrorMessage(error)}</div>
        ) : permissionOverview ? (
          <div className={styles.shell}>
            <section className={styles.subjectPane} aria-label="协作者">
              <div className={styles.subjectList} role="list" aria-label="协作者权限来源">
                {inheritedSubjects.map(renderSubjectItem)}
                {shouldShowInviteDivider ? (
                  <div className={styles.inviteDivider} aria-hidden />
                ) : null}
                {specifiedUserSubjects.map(renderSubjectItem)}
              </div>
              <div className={styles.addRow}>
                <UserSearchCombobox
                  value={newUserKeyword}
                  onValueChange={setNewUserKeyword}
                  onSelect={addSpecifiedUserCandidate}
                  onEmptySubmit={handleUserSearchEmpty}
                  onError={handleUserSearchError}
                  queryUsers={queryUserCandidates}
                  excludedUserIds={existingSpecifiedUserIds}
                  placeholder="完整用户名或邮箱"
                  ariaLabel="协作者用户名或邮箱"
                  submitIcon={<UserPlus size={16} aria-hidden />}
                  submitLabel="添加"
                />
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.stateText}>暂无权限配置</div>
        )}
      </div>
    </div>
  );
}

export default ResourcePermissionPanel;
