import type { TFunction } from 'i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';

import type { useSkillFileActionsController } from '../_controllers/useSkillFileActionsController';
import type { useSkillNavigationController } from '../_controllers/useSkillNavigationController';
import UnsavedSkillChangesModal from './UnsavedSkillChangesModal';

type SkillFileActions = ReturnType<typeof useSkillFileActionsController>;
type SkillNavigation = ReturnType<typeof useSkillNavigationController>;

interface SkillActionDialogsProps {
  fileActions: SkillFileActions;
  navigation: SkillNavigation;
  t: TFunction<'skill'>;
}

function SkillActionDialogs({ fileActions, navigation, t }: SkillActionDialogsProps) {
  return (
    <>
      <AppAlertDialog
        type="danger"
        isOpen={!!fileActions.deleteTarget}
        onOpenChange={() => fileActions.setDeleteTarget(null)}
        title={t(
          fileActions.deleteTarget?.kind === 'folder' ? 'delete.folderTitle' : 'delete.fileTitle'
        )}
        description={
          fileActions.deleteDirtyCount > 0
            ? t(
                fileActions.deleteTarget?.kind === 'folder'
                  ? 'delete.dirtyFolderDescription'
                  : 'delete.dirtyFileDescription',
                {
                  name: fileActions.deleteTarget?.name,
                  count: fileActions.deleteDirtyCount,
                }
              )
            : fileActions.deleteTarget?.kind === 'folder'
              ? t('delete.folderDescription', { name: fileActions.deleteTarget?.name })
              : t('delete.fileDescription', { name: fileActions.deleteTarget?.name })
        }
        confirmText={t('delete.confirm')}
        onConfirm={fileActions.handleConfirmDelete}
        isConfirmLoading={fileActions.deleteLoading}
        isDismissable={!fileActions.deleteLoading}
      />

      <AppAlertDialog
        type="confirm"
        isOpen={fileActions.pendingMove != null}
        onOpenChange={(open) => {
          if (!open) fileActions.setPendingMove(null);
        }}
        title={t('move.dirtyTitle')}
        description={t('move.dirtyDescription')}
        confirmText={t('move.confirm')}
        onConfirm={fileActions.handleConfirmMove}
        isConfirmLoading={fileActions.moveLoading}
        isDismissable={!fileActions.moveLoading}
      />

      <UnsavedSkillChangesModal
        isOpen={navigation.pendingIntentMode != null}
        mode={navigation.pendingIntentMode ?? 'leave'}
        isLoading={navigation.pendingIntentLoading}
        onCancel={navigation.handleCancelPendingIntent}
        onDiscard={navigation.handleDiscardPendingIntent}
        onConfirm={navigation.handleConfirmPendingIntent}
      />
    </>
  );
}

export default SkillActionDialogs;
