import { useGroupService, useTagService } from '@/domains';
import type { GroupMember } from '@/domains/Group';
import type { TagTreeNode } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useState, type Key } from 'react';
import { toast } from '@heroui/react';
import type { Selection } from '@heroui/react';
import type { TagPermissionModalProps } from './index.type';
import {
  buildFormFromTag,
  buildMemberOptions,
  buildSelectionFromTag,
  DEFAULT_FORM_VALUES,
  GROUP_MEMBER_PAGE_SIZE,
  MAX_GROUP_MEMBER_PAGE_COUNT,
  mergeVisibleSelection,
  normalizeFormForMode,
  normalizeSpecifiedUsersByScope,
  type MemberOption,
  type PersonnelPolicyTarget,
  type TagPermissionFormValues,
  type TagPolicyModalMode,
} from './tagPermissionModalModel';

interface TagPolicyModalControllerProps extends TagPermissionModalProps {
  mode: TagPolicyModalMode;
  t: TFunction<'resource'>;
}

export const useTagPermissionModalController = ({
  isOpen,
  groupId,
  initialTagId,
  mode,
  onOpenChange,
  onSuccess,
  t,
}: TagPolicyModalControllerProps) => {
  const groupService = useGroupService();
  const tagService = useTagService();
  const [permissionForm, setPermissionForm] =
    useState<TagPermissionFormValues>(DEFAULT_FORM_VALUES);
  const [selectedTag, setSelectedTag] = useState<ReturnType<typeof buildSelectionFromTag> | null>(
    null
  );
  const [tagRefreshSeed, setTagRefreshSeed] = useState(0);
  const [accessMemberSearchValue, setAccessMemberSearchValue] = useState('');
  const [mountMemberSearchValue, setMountMemberSearchValue] = useState('');
  const showTagTree = !initialTagId;
  const selectedUserIds = Array.from(
    new Set([
      ...permissionForm.taggedResourceAclGrantSpecifiedUsers,
      ...permissionForm.tagMountSpecifiedUsers,
    ])
  );

  const {
    data: groupMembers = [],
    loading: groupMemberLoading,
    error: groupMemberError,
  } = useRequest(
    async () => {
      if (!groupId) return [];
      const members: GroupMember[] = [];
      let total = Number.POSITIVE_INFINITY;
      let page = 1;
      while (members.length < total && page <= MAX_GROUP_MEMBER_PAGE_COUNT) {
        const result = await groupService.fetchGroupMembers(groupId, page, GROUP_MEMBER_PAGE_SIZE);
        total = result.total;
        if (result.members.length === 0) break;
        members.push(...result.members);
        page += 1;
      }
      return members;
    },
    {
      ready: isOpen && Boolean(groupId),
      refreshDeps: [isOpen, groupId, groupService],
    }
  );
  const memberOptions = buildMemberOptions(groupMembers, selectedUserIds, t);

  const resetPermissionForm = () => {
    setPermissionForm(DEFAULT_FORM_VALUES);
  };

  const applyTagToForm = (tag: TagTreeNode) => {
    setPermissionForm(buildFormFromTag(tag));
  };

  const resolveTagById = async (tagId: string): Promise<TagTreeNode | undefined> => {
    let nextTag = tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);
    if (!nextTag) {
      await tagService.getRawTagTree(groupId);
      nextTag = tagService.getRawTagById(tagId, groupId);
    }
    if (!nextTag) {
      await tagService.getTagTree(groupId);
      nextTag = tagService.getTagById(tagId, groupId);
    }
    return nextTag;
  };

  const resolveCachedTag = (tagId: string): TagTreeNode | undefined =>
    tagService.getRawTagById(tagId, groupId) ?? tagService.getTagById(tagId, groupId);

  const { loading: tagRequestLoading } = useRequest(
    async () => {
      await tagService.getRawTagTree(groupId);
      return initialTagId ? resolveTagById(initialTagId) : undefined;
    },
    {
      ready: isOpen,
      refreshDeps: [groupId, initialTagId, isOpen],
      onBefore: () => {
        setSelectedTag(null);
        resetPermissionForm();
        setAccessMemberSearchValue('');
        setMountMemberSearchValue('');
        setTagRefreshSeed((prev) => prev + 1);
        if (!initialTagId) return;
        const cachedTag = resolveCachedTag(initialTagId);
        if (cachedTag) {
          setSelectedTag(buildSelectionFromTag(cachedTag, groupId));
          applyTagToForm(cachedTag);
        }
      },
      onSuccess: (tag) => {
        if (!tag) return;
        setSelectedTag(buildSelectionFromTag(tag, groupId));
        applyTagToForm(tag);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const initialTagLoading = Boolean(initialTagId) && tagRequestLoading;

  const handleTagChange = (nodes: ReturnType<typeof buildSelectionFromTag>[]) => {
    const nextFolder = nodes.find((node) => node.kind === 'folder');
    if (!nextFolder?.tagId) {
      setSelectedTag(null);
      resetPermissionForm();
      return;
    }
    setSelectedTag(nextFolder);
    const fillFormByTag = async () => {
      const nextTag = await resolveTagById(nextFolder.tagId!);
      if (!nextTag) {
        resetPermissionForm();
        return;
      }
      applyTagToForm(nextTag);
    };
    void fillFormByTag();
  };

  const { loading: saving, run: runSavePermission } = useRequest(
    async (values: TagPermissionFormValues) => {
      if (!selectedTag?.tagId) return;
      if (!groupId) throw createClientError(FRONTEND_CLIENT_ERROR.GROUP_ID_REQUIRED);
      if (mode === 'access') {
        await tagService.updateTag({
          groupId,
          targetTagId: selectedTag.tagId,
          taggedResourceAclGrantScope: values.taggedResourceAclGrantScope,
          taggedResourceAclGrantSpecifiedUsers: values.taggedResourceAclGrantSpecifiedUsers,
          grantedActions: values.grantedActions,
        });
        return;
      }
      await tagService.updateTag({
        groupId,
        targetTagId: selectedTag.tagId,
        tagMountPermissionScope: values.tagMountPermissionScope,
        tagMountSpecifiedUsers: values.tagMountSpecifiedUsers,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const handleSubmit = () => {
    if (!selectedTag?.tagId) return;
    runSavePermission(normalizeFormForMode(permissionForm, mode));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    if (saving) return;
    setSelectedTag(null);
    setAccessMemberSearchValue('');
    setMountMemberSearchValue('');
    resetPermissionForm();
    onOpenChange(false);
  };

  const handlePersonnelScopeChange = (target: PersonnelPolicyTarget, nextKey: Key) => {
    const nextScope = Number(nextKey) as TagPermissionFormValues['taggedResourceAclGrantScope'];
    setPermissionForm((prev) => {
      if (target === 'resourceGrant') {
        return {
          ...prev,
          taggedResourceAclGrantScope: nextScope,
          taggedResourceAclGrantSpecifiedUsers: normalizeSpecifiedUsersByScope(
            nextScope,
            prev.taggedResourceAclGrantSpecifiedUsers
          ),
        };
      }
      return {
        ...prev,
        tagMountPermissionScope: nextScope,
        tagMountSpecifiedUsers: normalizeSpecifiedUsersByScope(
          nextScope,
          prev.tagMountSpecifiedUsers
        ),
      };
    });
  };

  const handlePersonnelUsersChange = (
    target: PersonnelPolicyTarget,
    keys: Selection,
    visibleMemberOptions: MemberOption[],
    currentUserIds: string[]
  ) => {
    const userIds = mergeVisibleSelection(keys, visibleMemberOptions, currentUserIds);
    setPermissionForm((prev) =>
      target === 'resourceGrant'
        ? { ...prev, taggedResourceAclGrantSpecifiedUsers: userIds }
        : { ...prev, tagMountSpecifiedUsers: userIds }
    );
  };

  const handlePersonnelSearchChange = (target: PersonnelPolicyTarget, value: string) => {
    if (target === 'resourceGrant') {
      setAccessMemberSearchValue(value);
      return;
    }
    setMountMemberSearchValue(value);
  };

  const setGrantedActions = (actions: TagPermissionFormValues['grantedActions']) => {
    setPermissionForm((prev) => ({ ...prev, grantedActions: actions }));
  };

  return {
    accessMemberSearchValue,
    groupMemberError,
    groupMemberLoading,
    handleOpenChange,
    handlePersonnelSearchChange,
    handlePersonnelScopeChange,
    handlePersonnelUsersChange,
    handleSubmit,
    handleTagChange,
    initialTagLoading,
    memberOptions,
    mountMemberSearchValue,
    permissionForm,
    saving,
    selectedTag,
    setGrantedActions,
    showTagTree,
    tagRefreshSeed,
  };
};
