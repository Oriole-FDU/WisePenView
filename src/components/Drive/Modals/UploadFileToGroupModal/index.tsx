import StepDots from '@/components/Common/StepDots';
import DriveNav from '@/components/Drive/DriveNav';
import { useResourceService } from '@/domains';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import type { DriveSelectionItem } from '../../common/driveComponentModel';
import styles from './index.module.less';
import type { UploadFileToGroupModalProps } from './index.type';

function UploadFileToGroupModal({
  isOpen,
  onOpenChange,
  groupId,
  onSuccess,
}: UploadFileToGroupModalProps) {
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
    async ({ resourceIds, tagIds }: { resourceIds: string[]; tagIds: string[] }) => {
      await Promise.all(
        resourceIds.map((resourceId) =>
          resourceService.updateResourceTags({ resourceId, tagIds, groupId })
        )
      );
      return resourceIds.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        toast.success(`已上传 ${count} 个文件`);
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleSubmit = () => {
    if (selectedFileIds.length === 0 || !selectedTargetTagId) return;
    runUploadToGroup({ resourceIds: selectedFileIds, tagIds: [selectedTargetTagId] });
  };

  const canNext = selectedFileIds.length > 0;
  const canSubmit = canNext && Boolean(selectedTargetTagId);

  // TODO: refactor
  useEffectForce(() => {
    if (!isOpen) return;
    resetState();
    setNavRefreshKey((k) => k + 1);
  }, [isOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (submitting) return;
      resetState();
      onOpenChange(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!submitting}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>上传文件到小组</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.wrapper}>
                <div className={styles.stepsRow}>
                  <StepDots
                    current={step}
                    items={[{ title: '选择个人文件' }, { title: '选择目标文件夹' }]}
                  />
                </div>

                <div className={styles.slideViewport}>
                  <div
                    className={`${styles.slideTrack} ${step === 1 ? styles.slideTrackShift : ''}`}
                  >
                    <div className={styles.slidePane}>
                      <div className={styles.treeSection}>
                        <div className={styles.hint}>选择要上传的文件（可多选）</div>
                        <div className={styles.navTree}>
                          <DriveNav
                            key={`personal-${navRefreshKey}`}
                            renderableTypes={['folder', 'resource', 'link']}
                            selectableTypes={['resource', 'link']}
                            multiple
                            refreshTrigger={navRefreshKey}
                            onChange={handleFilesChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.slidePane}>
                      <div className={styles.treeSection}>
                        <div className={styles.hint}>
                          选择文件要上传到的小组文件夹（只能选择一个）
                        </div>
                        <div className={styles.navTree}>
                          <DriveNav
                            key={`group-tree-tag-${groupId}-${navRefreshKey}`}
                            scope={{ type: 'group', groupId }}
                            renderableTypes={['folder']}
                            selectableTypes={['folder']}
                            onChange={handleTagsChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={() => onOpenChange(false)}
                isDisabled={submitting}
              >
                取消
              </Button>
              {step === 1 && (
                <Button variant="secondary" onPress={() => setStep(0)} isDisabled={submitting}>
                  上一步
                </Button>
              )}
              {step === 0 ? (
                <Button variant="primary" onPress={() => setStep(1)} isDisabled={!canNext}>
                  下一步
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                  isDisabled={submitting || !canSubmit}
                >
                  确定
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default UploadFileToGroupModal;
