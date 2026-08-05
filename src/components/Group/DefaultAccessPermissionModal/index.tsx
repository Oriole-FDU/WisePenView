import TagPermissionActionEditor from '@/components/Drive/PermissionActionEditor';
import AppModal from '@/components/Overlay/AppModal';
import { useGroupService } from '@/domains';
import type { GroupResConfig } from '@/domains/Group';
import {
  ACCESS_CONTROL_SCOPE,
  normalizeResourceActions,
  type TagResourceAction,
} from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { Button, Tabs, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

const PRESET_LABEL_KEYS = {
  private: 'permission.preset.private',
  readonly: 'permission.preset.readonly',
  shared: 'permission.preset.shared',
} as const;

const STRATEGY_LABEL_KEYS = {
  note: 'permission.strategy.note',
  file: 'permission.strategy.file',
  drawio: 'permission.strategy.drawio',
  aiAsset: 'permission.strategy.aiAsset',
} as const;

const ACTION_LABEL_KEYS = {
  DISCOVER: 'permission.action.DISCOVER',
  VIEW: 'permission.action.VIEW',
  LOAD: 'permission.action.LOAD',
  EDIT: 'permission.action.EDIT',
  INLINE_COMMENT: 'permission.action.INLINE_COMMENT',
  DOWNLOAD_WATERMARK: 'permission.action.DOWNLOAD_WATERMARK',
  DOWNLOAD_ORIGINAL: 'permission.action.DOWNLOAD_ORIGINAL',
  FORK: 'permission.action.FORK',
  COMMENT: 'permission.action.COMMENT',
} as const;

const POLICY_SCOPE_OPTIONS = [
  { scope: ACCESS_CONTROL_SCOPE.ALL, labelKey: 'permission.scope.all' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, labelKey: 'permission.scope.adminOnly' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, labelKey: 'permission.scope.blacklist' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, labelKey: 'permission.scope.whitelist' },
] as const;

interface GroupDefaultAccessPermissionModalProps {
  isOpen: boolean;
  groupId: string;
  groupResConfig: GroupResConfig;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DefaultMemberScopePreviewProps {
  title: string;
}

function DefaultMemberScopePreview({ title }: DefaultMemberScopePreviewProps) {
  const { t } = useTranslation('group');

  return (
    <section className={styles.personnelCard} aria-label={title}>
      <div className={styles.personnelHeader}>
        <div className={styles.personnelTitle}>{title}</div>
      </div>
      <Tabs className={styles.scopeTabs} selectedKey={String(ACCESS_CONTROL_SCOPE.ALL)}>
        <Tabs.ListContainer className={styles.scopeTabsListContainer}>
          <Tabs.List
            className={styles.scopeTabsList}
            aria-label={t('permission.scopeAria', { title })}
          >
            {POLICY_SCOPE_OPTIONS.map((option) => (
              <Tabs.Tab
                key={option.scope}
                id={String(option.scope)}
                className={styles.scopeTab}
                isDisabled
              >
                {t(option.labelKey)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className={styles.memberState}>{t('permission.allMembers')}</div>
    </section>
  );
}

function GroupDefaultAccessPermissionModal({
  isOpen,
  groupId,
  groupResConfig,
  onOpenChange,
  onSuccess,
}: GroupDefaultAccessPermissionModalProps) {
  const { t } = useTranslation(['group', 'common']);
  const groupService = useGroupService();
  const [selectedActions, setSelectedActions] = useState<TagResourceAction[]>(() =>
    normalizeResourceActions(groupResConfig.defaultMemberActions)
  );

  const { loading: saving, run: runSave } = useRequest(
    async (actions: TagResourceAction[]) => {
      await groupService.updateGroupResConfig({
        groupId,
        defaultMemberActions: normalizeResourceActions(actions),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('permission.saved'));
        onOpenChange(false);
        onSuccess();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    onOpenChange(nextOpen);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('permission.accessTitle')}
      size="lg"
      containerClassName={styles.modalContainer}
      dialogClassName={styles.modalDialog}
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button variant="primary" isPending={saving} onPress={() => runSave(selectedActions)}>
            {t('actions.save', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.advancedAccessGrid}>
          <DefaultMemberScopePreview title={t('permission.accessList')} />
          <TagPermissionActionEditor
            ariaLabel={t('permission.resourceActionsAria')}
            actions={selectedActions}
            isDisabled={saving}
            labels={{
              actionHeader: t('permission.actionHeader'),
              applicable: (strategy) =>
                t('permission.strategyApplicable', {
                  strategy: t(STRATEGY_LABEL_KEYS[strategy.key]),
                }),
              basedOnPreset: t('permission.basedOnPreset'),
              currentPreset: (preset) => t('permission.currentPreset', { preset }),
              customPreset: t('permission.custom'),
              disabled: (strategy, action) =>
                t('permission.actionDisabled', {
                  strategy: t(STRATEGY_LABEL_KEYS[strategy.key]),
                  action,
                }),
              enabled: (strategy, action) =>
                t('permission.actionEnabled', {
                  strategy: t(STRATEGY_LABEL_KEYS[strategy.key]),
                  action,
                }),
              getActionLabel: (action) => t(ACTION_LABEL_KEYS[action.key]),
              getPresetLabel: (preset) => t(PRESET_LABEL_KEYS[preset]),
              toggleHeader: t('permission.enabledHeader'),
            }}
            onActionsChange={setSelectedActions}
          />
        </div>
      </div>
    </AppModal>
  );
}

export default GroupDefaultAccessPermissionModal;
