import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveContainerNode } from '@/domains/Drive';
import { usePickerSelection } from '@/hooks/usePickerSelection';

import DriveNavigator from '../../DriveNavigator';
import type { DriveFolderPickerModalProps } from './index.type';
import styles from './style.module.less';

function DriveFolderPickerDialog({
  isOpen,
  title,
  hint,
  rootId,
  groupId,
  disabledNodeIds,
  isNodeSelectable,
  isSubmitting = false,
  confirmText,
  cancelText,
  onOpenChange,
  onConfirm,
}: DriveFolderPickerModalProps) {
  const { t } = useTranslation('common');
  const selection = usePickerSelection<DriveContainerNode | undefined>({
    initialValue: undefined,
    getCount: (value) => (value ? 1 : 0),
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && isSubmitting) return;
    if (!open) selection.clear();
    onOpenChange(open);
  };

  const handleConfirm = () => {
    if (!selection.value || isSubmitting) return;
    onConfirm(selection.value);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      size="md"
      isDismissable={!isSubmitting}
      actions={
        <>
          <AppButton
            variant="secondary"
            isDisabled={isSubmitting}
            onPress={() => handleOpenChange(false)}
          >
            {cancelText ?? t('actions.cancel')}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={isSubmitting || !selection.canConfirm}
            aria-busy={isSubmitting || undefined}
            onPress={handleConfirm}
          >
            {confirmText ?? t('actions.confirm')}
          </AppButton>
        </>
      }
    >
      <div className={styles.wrapper}>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        <div className={styles.treeWrap}>
          <DriveNavigator
            rootId={rootId}
            groupId={groupId}
            renderableTypes={['root', 'folder']}
            selectableTypes={['root', 'folder']}
            disabledNodeIds={disabledNodeIds}
            isNodeSelectable={isNodeSelectable}
            disabled={isSubmitting}
            onNodeChange={(selected) => {
              const node = selected[0];
              selection.setValue(
                node && (node.type === 'root' || node.type === 'folder') ? node : undefined
              );
            }}
          />
        </div>
      </div>
    </AppModal>
  );
}

function DriveFolderPickerModal(props: DriveFolderPickerModalProps) {
  return props.isOpen ? <DriveFolderPickerDialog {...props} /> : null;
}

export default DriveFolderPickerModal;
