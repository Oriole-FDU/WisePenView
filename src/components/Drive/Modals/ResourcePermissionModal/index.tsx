import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  buildResourceOverrideActions,
  buildResourcePermissionActionKeySet,
  buildResourcePermissionActionOptions,
  filterResourcePermissionActionsByOptions,
  getResourcePermissionActionLabel,
  resolveResourcePermissionPolicy,
  resolveTagInheritedResourceActions,
} from '@/components/Drive/common/resourcePermissionPolicy';
import { Spin } from '@/components/Feedback';
import AppModal from '@/components/Overlay/AppModal';
import { useResourceService, useTagService } from '@/domains';
import {
  areResourcePermissionActionsEqual,
  updateResourceActionSelection,
  type ResourceAction,
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
} from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Button, ListBox, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResourcePermissionModalProps } from './index.type';
import styles from './style.module.less';

interface ResourcePermissionModalData {
  overview: ResourcePermissionOverview;
  policy: ReturnType<typeof resolveResourcePermissionPolicy>;
}

const toStringKeySet = (keys: Selection): Set<string> => {
  if (keys === 'all') return new Set();
  return new Set([...keys].map((key) => String(key)));
};

const getSupportedActionsFromOptions = (
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  actionOptions.filter((option) => option.supported).map((option) => option.action);

const readSelectedActionsFromKeys = (
  keys: Set<string>,
  actionOptions: ResourcePermissionActionOption[]
): ResourceAction[] =>
  filterResourcePermissionActionsByOptions(
    actionOptions.filter((option) => keys.has(option.key)).map((option) => option.action),
    actionOptions
  );

function ResourcePermissionModal({
  isOpen,
  groupId,
  target,
  onOpenChange,
  onSuccess,
}: ResourcePermissionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  const resourceService = useResourceService();
  const tagService = useTagService();
  const [selectedActions, setSelectedActions] = useState<ResourceAction[]>([]);

  const {
    data,
    loading,
    error,
    refresh: refreshPermission,
  } = useRequest(
    async (): Promise<ResourcePermissionModalData> => {
      if (!target || !groupId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING);
      }

      const overview = await resourceService.getResourcePermissionOverview({
        resourceId: target.resourceId,
        resourceType: target.resourceType,
      });
      const initialPolicy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
        resourceType: target.resourceType,
      });
      const tagId = initialPolicy.primaryTagId;
      let inheritedActions = initialPolicy.inheritedActions;

      if (tagId) {
        let tag = tagService.getRawTagById(tagId, groupId);
        if (!tag) {
          await tagService.getRawTagTree(groupId);
          tag = tagService.getRawTagById(tagId, groupId);
        }
        inheritedActions = resolveTagInheritedResourceActions(tag, overview.supportedActions);
      }

      const policy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
        inheritedActions,
        resourceType: target.resourceType,
      });

      return { overview, policy };
    },
    {
      ready: Boolean(isOpen && target && groupId),
      refreshDeps: [
        isOpen,
        target?.resourceId,
        target?.resourceType,
        target?.fallbackTagId,
        groupId,
      ],
      onSuccess: ({ policy }) => {
        setSelectedActions(policy.activeActions);
      },
    }
  );

  const policy = data?.policy;
  const rawActionOptions = data?.overview.actionOptions.length
    ? data.overview.actionOptions
    : buildResourcePermissionActionOptions(policy?.supportedActions ?? []);
  const actionOptions = rawActionOptions.map((option) => ({
    ...option,
    label: getResourcePermissionActionLabel(option.action),
  }));
  const selectedActionKeys = buildResourcePermissionActionKeySet(selectedActions, actionOptions);
  const draftInconsistent = Boolean(
    policy &&
    !areResourcePermissionActionsEqual(
      selectedActions,
      policy.inheritedActions,
      policy.supportedActions
    )
  );

  const { loading: saving, run: runSave } = useRequest(
    async () => {
      if (!target || !groupId || !policy) return;
      const overrideActions = buildResourceOverrideActions(
        selectedActions,
        policy.inheritedActions,
        policy.supportedActions
      );
      await resourceService.updateResourceActionPermission({
        resourceId: target.resourceId,
        overrideGrantedActions: {
          [groupId]: overrideActions,
        },
      });
    },
    {
      manual: true,
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
        refreshPermission();
      },
    }
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      setSelectedActions([]);
      onOpenChange(false);
    }
  };

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') {
      setSelectedActions(
        filterResourcePermissionActionsByOptions(
          actionOptions.map((option) => option.action),
          actionOptions
        )
      );
      return;
    }
    const nextActionKeys = toStringKeySet(keys);
    const addedKey = [...nextActionKeys].find((key) => !selectedActionKeys.has(key));
    const removedKey = [...selectedActionKeys].find((key) => !nextActionKeys.has(key));
    const changedKey = addedKey ?? removedKey;
    const changedOption = actionOptions.find((option) => option.key === changedKey);

    if (!changedOption) {
      setSelectedActions(readSelectedActionsFromKeys(nextActionKeys, actionOptions));
      return;
    }

    setSelectedActions(
      updateResourceActionSelection(
        selectedActions,
        changedOption.action,
        Boolean(addedKey),
        getSupportedActionsFromOptions(actionOptions)
      )
    );
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('permission.editor.title')}
      description={target?.resourceName}
      size="md"
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="primary"
            isDisabled={saving || loading || Boolean(error) || !policy}
            aria-busy={saving || undefined}
            onPress={() => runSave()}
          >
            {t('actions.save', { ns: 'common' })}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className={styles.state} aria-busy="true">
          <Spin size="large" tip={t('permission.editor.loading')} />
        </div>
      ) : error ? (
        <div className={styles.state}>{parseErrorMessage(error)}</div>
      ) : policy ? (
        <div className={styles.content}>
          <div className={draftInconsistent ? styles.warning : styles.inheritHint}>
            {draftInconsistent
              ? t('permission.editor.inconsistent')
              : t('permission.editor.inherited')}
          </div>
          <ListBox
            aria-label={t('permission.editor.actionsAria')}
            selectionMode="multiple"
            selectedKeys={selectedActionKeys}
            onSelectionChange={handleSelectionChange}
            className={styles.actionList}
          >
            {actionOptions.map((option) => (
              <ListBox.Item id={option.key} key={option.key} textValue={option.label}>
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
        </div>
      ) : (
        <div className={styles.state}>{t('permission.editor.empty')}</div>
      )}
    </AppModal>
  );
}

export default ResourcePermissionModal;
