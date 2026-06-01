import DriveNav from '@/components/Drive/DriveNav';
import { useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Modal, Steps } from 'antd';
import { useCallback, useState } from 'react';
import type { DriveSelectionItem } from '../../common/driveComponentModel';
import styles from './index.module.less';
import type { UploadFileToGroupModalProps } from './index.type';

function UploadFileToGroupModal({
  open,
  onCancel,
  groupId,
  onSuccess,
}: UploadFileToGroupModalProps) {
  const resourceService = useResourceService();
  const [step, setStep] = useState(0);
  const [navRefreshKey, setNavRefreshKey] = useState(0);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedTargetTagId, setSelectedTargetTagId] = useState<string>();

  const handleOpenChange = useCallback((visible: boolean) => {
    setStep(0);
    setSelectedFileIds([]);
    setSelectedTargetTagId(undefined);
    if (visible) {
      setNavRefreshKey((k) => k + 1);
    }
  }, []);

  const handleFilesChange = useCallback((nodes: DriveSelectionItem[]) => {
    const ids = nodes
      .filter((node) => node.kind === 'resource' || node.kind === 'link')
      .map((node) => node.resourceId)
      .filter((id): id is string => Boolean(id?.trim()));
    setSelectedFileIds(ids);
  }, []);

  const handleTagsChange = useCallback((nodes: DriveSelectionItem[]) => {
    const target = nodes.find((node) => node.kind === 'folder' && Boolean(node.tagId?.trim()));
    setSelectedTargetTagId(target?.tagId);
  }, []);

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
        onCancel();
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

  return (
    <Modal
      title="上传文件到小组"
      open={open}
      onCancel={onCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      width={560}
      footer={null}
    >
      <div className={styles.wrapper}>
        <div className={styles.stepsRow}>
          <Steps
            size="small"
            type="dot"
            current={step}
            items={[{ title: '选择个人文件' }, { title: '选择目标文件夹' }]}
          />
        </div>

        <div className={styles.slideViewport}>
          <div className={`${styles.slideTrack} ${step === 1 ? styles.slideTrackShift : ''}`}>
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
                <div className={styles.hint}>选择文件要上传到的小组文件夹（只能选择一个）</div>
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

        <div className={styles.footer}>
          <Button onPress={onCancel}>取消</Button>
          {step === 1 && <Button onPress={() => setStep(0)}>上一步</Button>}
          {step === 0 ? (
            <Button variant="primary" onPress={() => setStep(1)} isDisabled={!canNext}>
              下一步
            </Button>
          ) : (
            <Button variant="primary" onPress={handleSubmit} isDisabled={submitting || !canSubmit}>
              确定
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default UploadFileToGroupModal;
