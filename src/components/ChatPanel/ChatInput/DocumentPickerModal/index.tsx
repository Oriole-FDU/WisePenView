import DriveNavigator from '@/components/Drive/DriveNavigator';
import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import AppModal from '@/components/Overlay/AppModal';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [selectedResources, setSelectedResources] = useState<LocalResourcePayload[]>([]);

  function handleSelectionChange(items: DriveSelectionItem[]): void {
    setSelectedResources(
      items
        .map((item) => mapDriveSelectionToDocRef(item))
        .filter((item): item is LocalResourcePayload => item != null)
    );
  }

  function handleClose(): void {
    setSelectedResources([]);
    setDocumentPickerOpen(false);
  }

  function handleConfirm(): void {
    addDocRefs(selectedResources);
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
        <Button variant="secondary" onPress={handleClose}>
          {t('actions.cancel', { ns: 'common' })}
        </Button>
        <Button
          variant="primary"
          onPress={handleConfirm}
          isDisabled={selectedResources.length === 0}
        >
          {t('actions.confirm', { ns: 'common' })}
        </Button>
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
              <Button variant="secondary" onPress={() => setDocumentPickerOpen(false)}>
                {t('actions.cancel', { ns: 'common' })}
              </Button>
              <Button variant="primary" isDisabled>
                {t('actions.confirm', { ns: 'common' })}
              </Button>
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
