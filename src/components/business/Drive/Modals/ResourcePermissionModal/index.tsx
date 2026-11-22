import { type Selection } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import ListBox from '@/components/base/ListBox';
import { Tabs } from '@/components/base/Tabs';
import ResourcePermissionActionIcon from '@/components/business/Drive/common/resourcePermissionActionIcon';
import {
  buildResourceOverrideActions,
  buildResourcePermissionActionKeySet,
  filterResourcePermissionActionsByOptions,
  getResourcePermissionActionLabel,
  getResourcePermissionPresetActions,
  resolveResourcePermissionPolicy,
  resolveResourcePermissionPresetKey,
  RESOURCE_PERMISSION_PRESETS,
  type ResourcePermissionPresetKey,
} from '@/components/business/Drive/common/resourcePermissionPolicy';
import { useResourceAccessService, useTagService } from '@/domains';
import {
  areResourcePermissionActionsEqual,
  type ResourceAction,
  updateResourceActionSelection,
} from '@/domains/_shared/access';
import {
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
} from '@/domains/ResourceAccess';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';

import type { ResourcePermissionModalProps } from './index.type';
import styles from './style.module.scss';

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

const resolveSelectedPresetKey = (
  selectedActions: ResourceAction[],
  policy: ResourcePermissionModalData['policy']
): ResourcePermissionPresetKey => {
  if (
    policy.inheritedActions !== undefined &&
    areResourcePermissionActionsEqual(
      selectedActions,
      policy.inheritedActions,
      policy.supportedActions
    )
  ) {
    return 'inherit';
  }
  return resolveResourcePermissionPresetKey(selectedActions, policy.supportedActions);
};

function ResourcePermissionEditor({
  isOpen,
  groupId,
  target,
  onOpenChange,
  onSuccess,
}: ResourcePermissionModalProps) {
  const { t } = useTranslation(['resource', 'common']);
  const resourceAccessService = useResourceAccessService();
  const tagService = useTagService();
  const [actionDraft, setSelectedActions] = useState<ResourceAction[] | null>(null);

  const {
    data,
    loading,
    error,
    refresh: refreshPermission,
  } = useApi(
    async (): Promise<ResourcePermissionModalData> => {
      if (!target || !groupId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING);
      }

      const overview = await resourceAccessService.getResourcePermissionOverview({
        resourceId: target.resourceId,
        resourceType: target.resourceType,
      });
      const initialPolicy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
      });
      const tagId = initialPolicy.primaryTagId;
      let inheritedActions = initialPolicy.inheritedActions;

      // 仅主挂载缺失时使用 Drive 提供的标签；已有主标签查询失败不能改读旧缓存。
      if (tagId && !initialPolicy.groupSubject?.primaryTagId) {
        const actionsByTag = await tagService.getTagGrantedActions(groupId).catch(() => undefined);
        inheritedActions = actionsByTag?.get(tagId);
      }

      const policy = resolveResourcePermissionPolicy({
        overview,
        groupId,
        fallbackTagId: target.fallbackTagId,
        inheritedActions,
      });

      return { overview, policy };
    },
    {
      ready: Boolean(isOpen && target && groupId),
      showErrorToast: false,
    }
  );

  const policy = data?.policy;
  const selectedActions = actionDraft ?? policy?.activeActions ?? [];
  const permissionUnknown = Boolean(policy && policy.inheritedActions === undefined);
  const groupInfoIncomplete = policy?.groupSubject?.groupInfoStatus === 'failed';
  const actionOptions = (data?.overview.actionOptions ?? []).map((option) => ({
    ...option,
    label: getResourcePermissionActionLabel(option.action),
  }));
  const selectedActionKeys = buildResourcePermissionActionKeySet(selectedActions, actionOptions);
  const selectedPresetKey = policy ? resolveSelectedPresetKey(selectedActions, policy) : 'inherit';
  const draftInconsistent = Boolean(
    policy &&
    !areResourcePermissionActionsEqual(
      selectedActions,
      policy.inheritedActions,
      policy.supportedActions
    )
  );

  const { loading: saving, run: runSave } = useApi(
    async () => {
      if (!target || !groupId || !policy) {
        throw createClientError(FRONTEND_CLIENT_ERROR.RESOURCE_PERMISSION_CONTEXT_MISSING);
      }
      const overrideActions = buildResourceOverrideActions(
        selectedActions,
        policy.inheritedActions,
        policy.supportedActions
      );
      await resourceAccessService.updateResourceActionPermission({
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
      onErrorEffect: () => {
        refreshPermission();
      },
    }
  );
  const saveDisabled = saving || loading || Boolean(error) || !policy || permissionUnknown;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return;
      onOpenChange(false);
    }
  };

  const handleSelectionChange = (keys: Selection) => {
    if (permissionUnknown || loading || saving) return;
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

  const handlePresetChange = (key: ResourcePermissionPresetKey) => {
    if (!policy || !policy.inheritedActions || key === 'custom' || loading || saving) return;
    if (key === 'inherit') {
      setSelectedActions(policy.inheritedActions);
      return;
    }
    const presetActions = getResourcePermissionPresetActions(key, policy.supportedActions);
    if (!presetActions) return;
    setSelectedActions(presetActions);
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
          <AppButton
            variant="secondary"
            isDisabled={saving}
            onPress={() => handleOpenChange(false)}
          >
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={saveDisabled}
            aria-busy={saving || undefined}
            onPress={runSave}
          >
            {t('actions.save', { ns: 'common' })}
          </AppButton>
        </>
      }
    >
      {loading && !data ? (
        <div className={styles.state} aria-busy="true">
          <Spin size="large" tip={t('permission.editor.loading')} />
        </div>
      ) : error ? (
        <div className={styles.state} role="alert">
          {parseErrorMessage(error)}
          <AppButton variant="secondary" onPress={refreshPermission}>
            {t('actions.retry', { ns: 'common' })}
          </AppButton>
        </div>
      ) : policy ? (
        <div className={styles.content}>
          {permissionUnknown || groupInfoIncomplete ? (
            <div className={styles.warning} role="status">
              <span>
                {t(
                  permissionUnknown
                    ? 'permission.incomplete.actions'
                    : 'permission.incomplete.groupInfo'
                )}
              </span>
              <AppButton
                variant="ghost"
                size="sm"
                isDisabled={loading || saving}
                aria-busy={loading || undefined}
                onPress={refreshPermission}
              >
                {t('actions.retry', { ns: 'common' })}
              </AppButton>
            </div>
          ) : null}
          {permissionUnknown && !policy.isResourceOverride ? null : (
            <>
              <Tabs
                isDisabled={permissionUnknown || loading || saving}
                variant="secondary"
                aria-label={t('permission.editor.basedOnPreset')}
                className={styles.presetTabs}
                selectedKey={selectedPresetKey}
                onSelectionChange={(key) =>
                  handlePresetChange(String(key) as ResourcePermissionPresetKey)
                }
              >
                <Tabs.ListContainer className={styles.presetTabsListContainer}>
                  <Tabs.List
                    className={styles.presetTabsList}
                    aria-label={t('permission.editor.basedOnPreset')}
                  >
                    {RESOURCE_PERMISSION_PRESETS.map((preset) => (
                      <Tabs.Tab key={preset.key} id={preset.key} className={styles.presetTab}>
                        {preset.label}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
              {!permissionUnknown ? (
                <div className={draftInconsistent ? styles.warning : styles.inheritHint}>
                  {draftInconsistent
                    ? t('permission.editor.inconsistent')
                    : t('permission.editor.inherited')}
                </div>
              ) : null}
              <ListBox
                aria-label={t('permission.editor.actionsAria')}
                disabledKeys={
                  permissionUnknown || loading || saving
                    ? actionOptions.map((option) => option.key)
                    : []
                }
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
            </>
          )}
        </div>
      ) : (
        <div className={styles.state}>{t('permission.editor.empty')}</div>
      )}
    </AppModal>
  );
}

function ResourcePermissionModal(props: ResourcePermissionModalProps) {
  const { target, groupId, isOpen } = props;
  const sessionKey = JSON.stringify([
    isOpen,
    groupId,
    target?.resourceId,
    target?.resourceType,
    target?.fallbackTagId,
  ]);
  return <ResourcePermissionEditor key={sessionKey} {...props} />;
}

export default ResourcePermissionModal;
