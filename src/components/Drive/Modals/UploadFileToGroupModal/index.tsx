import React, { useCallback, useState } from 'react';
import { Modal, Button, Steps } from 'antd';
import { useRequest } from 'ahooks';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';
import { useResourceService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import TreeNav from '@/components/Drive/TreeNav';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { UploadFileToGroupModalProps } from './index.type';
import styles from './index.module.less';

const UploadFileToGroupModal: React.FC<UploadFileToGroupModalProps> = ({
  open,
  onCancel,
  groupId,
  fileOrgLogic,
  onSuccess,
}) => {
  const resourceService = useResourceService();
  const message = useAppMessage();
  const [step, setStep] = useState(0);
  const [navRefreshKey, setNavRefreshKey] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<ResourceItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagTreeNode[]>([]);

  const handleOpenChange = useCallback((visible: boolean) => {
    setStep(0);
    setSelectedFiles([]);
    setSelectedTags([]);
    if (visible) {
      setNavRefreshKey((k) => k + 1);
    }
  }, []);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleFilesChange = useCallback((_nodes: TagTreeNode[], leaves: ResourceItem[]) => {
    setSelectedFiles(leaves);
  }, []);

  const handleTagsChange = useCallback((nodes: TagTreeNode[], _leaves: ResourceItem[]) => {
    setSelectedTags(nodes);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedFiles.length === 0) return;
    setStep(1);
  }, [selectedFiles.length]);

  const handleBack = useCallback(() => {
    setStep(0);
  }, []);

  const { loading: submitting, run: runUploadToGroup } = useRequest(
    async ({ validIds, tagIds }: { validIds: string[]; tagIds: string[] }) => {
      for (const resourceId of validIds) {
        await resourceService.updateResourceTags({
          resourceId,
          tagIds,
          groupId,
        });
      }
      return validIds.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        message.success(`已上传 ${count} 个文件`);
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '上传失败'));
      },
    }
  );

  const handleSubmit = useCallback(async () => {
    const validIds = selectedFiles
      .map((f) => f.resourceId)
      .filter((id): id is string => Boolean(id?.trim()));
    const tagIds = selectedTags.map((n) => n.tagId).filter((id) => Boolean(id?.trim()));

    if (validIds.length === 0 || tagIds.length === 0) return;

    runUploadToGroup({ validIds, tagIds });
  }, [selectedFiles, selectedTags, runUploadToGroup]);

  const hasFileIds = selectedFiles.some((f) => Boolean(f.resourceId?.trim()));
  const canNext = hasFileIds;
  const canSubmit = hasFileIds && selectedTags.length > 0;

  /** 与小组主盘一致：FOLDER → FolderService 树；TAG → TagService 树（TreeNav 内部按 viewMode 选用 Service） */
  const groupTreeViewMode = fileOrgLogic === 'FOLDER' ? 'folder' : 'tag';
  const step2Title = fileOrgLogic === 'FOLDER' ? '选择小组文件夹' : '选择小组标签';
  const step2Hint =
    fileOrgLogic === 'FOLDER' ? '选择文件要上传到的小组文件夹' : '选择文件要上传到的小组标签';

  return (
    <Modal
      title="上传文件到小组"
      open={open}
      onCancel={handleCancel}
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
            items={[{ title: '选择个人文件' }, { title: step2Title }]}
          />
        </div>

        <div className={styles.slideViewport}>
          <div className={`${styles.slideTrack} ${step === 1 ? styles.slideTrackShift : ''}`}>
            <div className={styles.slidePane}>
              <div className={styles.treeSection}>
                <div className={styles.hint}>选择要上传的文件（可多选）</div>
                <div className={styles.treeNav}>
                  <TreeNav
                    key={`personal-${navRefreshKey}`}
                    viewMode="folder"
                    selectMode="leaves"
                    refreshTrigger={navRefreshKey}
                    onChange={handleFilesChange}
                  />
                </div>
              </div>
            </div>
            <div className={styles.slidePane}>
              <div className={styles.treeSection}>
                <div className={styles.hint}>{step2Hint}</div>
                <div className={styles.treeNav}>
                  <TreeNav
                    key={`group-tree-${groupTreeViewMode}-${groupId}-${navRefreshKey}`}
                    viewMode={groupTreeViewMode}
                    selectMode="nodes"
                    groupId={groupId}
                    onChange={handleTagsChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>
          {step === 1 && (
            <Button key="back" onClick={handleBack}>
              上一步
            </Button>
          )}
          {step === 0 ? (
            <Button key="next" type="primary" onClick={handleNext} disabled={!canNext}>
              下一步
            </Button>
          ) : (
            <Button
              key="confirm"
              type="primary"
              onClick={() => void handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            >
              确定
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UploadFileToGroupModal;
