import TagPermissionActionEditor from '@/components/Drive/PermissionActionEditor';
import AppModal from '@/components/Overlay/AppModal';
import { useGroupService } from '@/domains';
import type { GroupResConfig } from '@/domains/Group';
import { normalizeResourceActions, type TagResourceAction } from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GroupPolicyShellCard from '../GroupPolicyShellCard';
import styles from '../style.module.less';

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

interface GroupDefaultAccessPermissionModalProps {
  isOpen: boolean;
  groupId: string;
  groupResConfig: GroupResConfig;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
          <GroupPolicyShellCard title={t('permission.accessList')} />
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
