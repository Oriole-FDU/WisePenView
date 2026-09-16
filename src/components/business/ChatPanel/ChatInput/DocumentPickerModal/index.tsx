import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import { usePickerSelection } from '@/hooks/usePickerSelection';

import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import type { LocalResourcePayload } from '../index.type';
import styles from './style.module.less';

function mapDriveSelectionToDocRef(item: DriveSelectionItem): LocalResourcePayload | null {
  if ((item.kind !== 'resource' && item.kind !== 'link') || !item.resourceId) return null;
  return {
    resourceId: item.resourceId,
    resourceName: item.label || item.resourceId,
    resourceType: item.resourceType ?? '',
    enabled: true,
  };
}

function DocumentPickerContent() {
  const { t } = useTranslation(['chat', 'common']);
  const { addDocRefs, setDocumentPickerOpen } = useChatInputStoreApi().getState();
  const selection = usePickerSelection<LocalResourcePayload[]>({
    initialValue: [],
    getCount: (value) => value.length,
  });

  function handleSelectionChange(items: DriveSelectionItem[]): void {
    selection.setValue(
      items
        .map((item) => mapDriveSelectionToDocRef(item))
        .filter((item): item is LocalResourcePayload => item != null)
    );
  }

  function handleClose(): void {
    selection.clear();
    setDocumentPickerOpen(false);
  }

  function handleConfirm(): void {
    addDocRefs(selection.value);
    handleClose();
  }

  return (
    <>
      <AppModal.Body>
        <div className={styles.wrapper}>
          <div className={styles.treeSection}>
            <div className={styles.hint}>{t('input.documentPicker.hint')}</div>
            <div className={styles.navTree}>
              <DriveNavigator
                scopeMode="all"
                selectableTypes={['resource', 'link']}
                multiple
                onChange={handleSelectionChange}
              />
            </div>
          </div>
        </div>
      </AppModal.Body>
      <AppModal.Footer>
        <AppButton variant="secondary" onPress={handleClose}>
          {t('actions.cancel', { ns: 'common' })}
        </AppButton>
        <AppButton variant="primary" onPress={handleConfirm} isDisabled={!selection.canConfirm}>
          {t('actions.confirm', { ns: 'common' })}
        </AppButton>
      </AppModal.Footer>
    </>
  );
}

function DocumentPickerModal() {
  const { t } = useTranslation(['chat', 'common']);
  const open = useChatInputStore((state) => state.documentPickerOpen);
  const { setDocumentPickerOpen } = useChatInputStoreApi().getState();

  function handleOpenChange(visible: boolean): void {
    if (visible) return;
    setDocumentPickerOpen(false);
  }

  return (
    <AppModal
      isOpen={open}
      onOpenChange={handleOpenChange}
      title={t('input.documentPicker.title')}
      size="md"
      contentMode="dialog"
    >
      <AppModal.DeferredContent
        fallback={
          <>
            <AppModal.Body>
              <div className={styles.wrapper}>
                <div className={styles.treeSection}>
                  <div className={styles.hint}>{t('input.documentPicker.hint')}</div>
                  <div className={styles.navTree} />
                </div>
              </div>
            </AppModal.Body>
            <AppModal.Footer>
              <AppButton variant="secondary" onPress={() => setDocumentPickerOpen(false)}>
                {t('actions.cancel', { ns: 'common' })}
              </AppButton>
              <AppButton variant="primary" isDisabled>
                {t('actions.confirm', { ns: 'common' })}
              </AppButton>
            </AppModal.Footer>
          </>
        }
      >
        {() => <DocumentPickerContent />}
      </AppModal.DeferredContent>
    </AppModal>
  );
}

export default DocumentPickerModal;
