import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import {
  FRONTEND_STATE_SOURCE,
  type SelectedResourceReference,
  setFrontendStates,
  useFrontendStateValue,
} from '@/frontendState';
import { usePickerSelection } from '@/hooks/usePickerSelection';

import { useChatInputStore, useChatInputStoreApi } from '../_context';
import styles from './style.module.less';

function mapDriveSelectionToDocRef(item: DriveSelectionItem): SelectedResourceReference | null {
  if ((item.kind !== 'resource' && item.kind !== 'link') || !item.resourceId) return null;
  return {
    resource_id: item.resourceId,
    resource_name: item.label || item.resourceId,
    resource_type: item.resourceType ?? '',
  };
}

function DocumentPickerContent() {
  const { t } = useTranslation(['chat', 'common']);
  const { setDocumentPickerOpen } = useChatInputStoreApi().getState();
  const resources = useFrontendStateValue('selected_resources') ?? [];
  const selection = usePickerSelection<SelectedResourceReference[]>({
    initialValue: [],
    getCount: (value) => value.length,
  });

  function handleSelectionChange(items: DriveSelectionItem[]): void {
    selection.setValue(
      items
        .map((item) => mapDriveSelectionToDocRef(item))
        .filter((item): item is SelectedResourceReference => item != null)
    );
  }

  function handleClose(): void {
    selection.clear();
    setDocumentPickerOpen(false);
  }

  function handleConfirm(): void {
    const existingIds = new Set(resources.map((resource) => resource.resource_id));
    const additions = selection.value.filter((resource) => !existingIds.has(resource.resource_id));
    setFrontendStates({
      source: FRONTEND_STATE_SOURCE.INPUT,
      entries: [{ key: 'selected_resources', value: [...resources, ...additions] }],
    });
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
