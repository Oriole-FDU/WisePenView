import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import StepDots from '@/components/base/StepDots';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import { useDriveService } from '@/domains';
import type { DriveNode, FolderNode } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';

import type { DriveSelectionItem } from '../../common/driveComponentModel';
import type { UploadFileToGroupModalProps } from './index.type';
import styles from './style.module.less';

function UploadFileToGroupModal({
  isOpen,
  onOpenChange,
  groupId,
  onSuccess,
}: UploadFileToGroupModalProps) {
  const { t } = useTranslation(['drive', 'common']);
  const driveService = useDriveService();
  const [step, setStep] = useState(0);
  const [navRefreshKey, setNavRefreshKey] = useState(0);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<FolderNode>();

  const resetState = () => {
    setStep(0);
    setSelectedFileIds([]);
    setSelectedTarget(undefined);
  };

  const closeModal = () => {
    resetState();
    setNavRefreshKey((key) => key + 1);
    onOpenChange(false);
  };

  const handleFilesChange = (nodes: DriveSelectionItem[]) => {
    const ids = nodes
      .filter((node) => node.kind === 'resource' || node.kind === 'link')
      .map((node) => node.resourceId)
      .filter((id): id is string => Boolean(id?.trim()));
    setSelectedFileIds(ids);
  };

  const handleTagsChange = (nodes: DriveNode[]) => {
    const target = nodes.find((node): node is FolderNode => node.type === 'folder');
    setSelectedTarget(target);
  };

  const { loading: submitting, run: runUploadToGroup } = useApi(
    async ({ resourceIds, target }: { resourceIds: string[]; target: FolderNode }) => {
      await driveService.addResourcesToGroup({ resourceIds, target });
      return resourceIds.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        toast.success(t('upload.group.success', { count }));
        onSuccess?.();
        closeModal();
      },
    }
  );

  const handleSubmit = () => {
    if (selectedFileIds.length === 0 || !selectedTarget) return;
    runUploadToGroup({ resourceIds: selectedFileIds, target: selectedTarget });
  };

  const canNext = selectedFileIds.length > 0;
  const canSubmit = canNext && Boolean(selectedTarget);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (submitting) return;
      closeModal();
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('upload.group.title')}
      size="md"
      isDismissable={!submitting}
      actions={
        <>
          <AppButton variant="secondary" onPress={closeModal} isDisabled={submitting}>
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          {step === 1 && (
            <AppButton variant="secondary" onPress={() => setStep(0)} isDisabled={submitting}>
              {t('upload.group.previous')}
            </AppButton>
          )}
          {step === 0 ? (
            <AppButton variant="primary" onPress={() => setStep(1)} isDisabled={!canNext}>
              {t('upload.group.next')}
            </AppButton>
          ) : (
            <AppButton
              variant="primary"
              onPress={handleSubmit}
              isDisabled={submitting || !canSubmit}
            >
              {t('actions.confirm', { ns: 'common' })}
            </AppButton>
          )}
        </>
      }
    >
      <div className={styles.wrapper}>
        <div className={styles.stepsRow}>
          <StepDots
            current={step}
            items={[
              { title: t('upload.group.selectFilesStep') },
              { title: t('upload.group.selectFolderStep') },
            ]}
          />
        </div>

        <div className={styles.slideViewport}>
          <div className={`${styles.slideTrack} ${step === 1 ? styles.slideTrackShift : ''}`}>
            <div className={styles.slidePane}>
              <div className={styles.treeSection}>
                <div className={styles.hint}>{t('upload.group.selectFilesHint')}</div>
                <div className={styles.navTree}>
                  <DriveNavigator
                    key={`personal-${navRefreshKey}`}
                    selectableTypes={['resource', 'link']}
                    multiple
                    refreshTrigger={navRefreshKey}
                    disabled={submitting}
                    onChange={handleFilesChange}
                  />
                </div>
              </div>
            </div>
            <div className={styles.slidePane}>
              <div className={styles.treeSection}>
                <div className={styles.hint}>{t('upload.group.selectFolderHint')}</div>
                <div className={styles.navTree}>
                  <DriveNavigator
                    key={`group-tree-tag-${groupId}-${navRefreshKey}`}
                    scope={{ type: 'group', groupId }}
                    selectableTypes={['folder']}
                    emptyText={t('upload.group.createFolderHint')}
                    disabled={submitting}
                    onNodeChange={handleTagsChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

export default UploadFileToGroupModal;
