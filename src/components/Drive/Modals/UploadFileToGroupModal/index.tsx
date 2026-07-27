import DriveNavigator from '@/components/Drive/DriveNavigator';
import AppModal from '@/components/Overlay/AppModal';
import StepDots from '@/components/StepDots';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const resourceService = useResourceService();
  const [step, setStep] = useState(0);
  const [navRefreshKey, setNavRefreshKey] = useState(0);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedTargetTagId, setSelectedTargetTagId] = useState<string>();

  const resetState = () => {
    setStep(0);
    setSelectedFileIds([]);
    setSelectedTargetTagId(undefined);
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

  const handleTagsChange = (nodes: DriveSelectionItem[]) => {
    const target = nodes.find((node) => node.kind === 'folder' && Boolean(node.tagId?.trim()));
    setSelectedTargetTagId(target?.tagId);
  };

  const { loading: submitting, run: runUploadToGroup } = useRequest(
    async ({ resourceIds, tagId }: { resourceIds: string[]; tagId: string }) => {
      await resourceService.mountResourcesToGroupTag({
        resourceIds,
        groupId,
        tagId,
      });
      return resourceIds.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        toast.success(t('upload.group.success', { count }));
        onSuccess?.();
        closeModal();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (selectedFileIds.length === 0 || !selectedTargetTagId) return;
    runUploadToGroup({ resourceIds: selectedFileIds, tagId: selectedTargetTagId });
  };

  const canNext = selectedFileIds.length > 0;
  const canSubmit = canNext && Boolean(selectedTargetTagId);

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
          <Button variant="secondary" onPress={closeModal} isDisabled={submitting}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          {step === 1 && (
            <Button variant="secondary" onPress={() => setStep(0)} isDisabled={submitting}>
              {t('upload.group.previous')}
            </Button>
          )}
          {step === 0 ? (
            <Button variant="primary" onPress={() => setStep(1)} isDisabled={!canNext}>
              {t('upload.group.next')}
            </Button>
          ) : (
            <Button variant="primary" onPress={handleSubmit} isDisabled={submitting || !canSubmit}>
              {t('actions.confirm', { ns: 'common' })}
            </Button>
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
                    disabled={submitting}
                    onChange={handleTagsChange}
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
