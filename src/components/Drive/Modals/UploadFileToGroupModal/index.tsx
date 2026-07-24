import DriveNavigator from '@/components/Drive/DriveNavigator';
import AppModal from '@/components/Overlay/AppModal';
import StepDots from '@/components/StepDots';
import { useResourceService } from '@/domains';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
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
        toast.success(`已添加 ${count} 个文件到小组`);
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
    runUploadToGroup({ resourceIds: selectedFileIds, tagId: selectedTargetTagId });
  };

  const canNext = selectedFileIds.length > 0;
  const canSubmit = canNext && Boolean(selectedTargetTagId);

  /**
   * 弹窗每次打开都需要清空上次选择并刷新两棵选择树；
   * 这里依赖打开态变化触发，不能放到提交或关闭事件中，否则重新打开会短暂显示旧选择。
   * 本 effect 不注册外部订阅，因此不需要 cleanup。
   */
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
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="从个人云盘添加文件"
      size="md"
      isDismissable={!submitting}
      actions={
        <>
          <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={submitting}>
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
            <Button variant="primary" onPress={handleSubmit} isDisabled={submitting || !canSubmit}>
              确定
            </Button>
          )}
        </>
      }
    >
      <div className={styles.wrapper}>
        <div className={styles.stepsRow}>
          <StepDots
            current={step}
            items={[{ title: '选择个人文件' }, { title: '选择目标文件夹' }]}
          />
        </div>

        <div className={styles.slideViewport}>
          <div className={`${styles.slideTrack} ${step === 1 ? styles.slideTrackShift : ''}`}>
            <div className={styles.slidePane}>
              <div className={styles.treeSection}>
                <div className={styles.hint}>选择要添加的文件（可多选）</div>
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
                <div className={styles.hint}>选择文件要添加到的小组文件夹（只能选择一个）</div>
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
