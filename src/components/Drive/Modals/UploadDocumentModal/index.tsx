import type { ApiErrorBody } from '@/apis/api.type';
import { useDriveUploadQueueStore } from '@/components/Drive/_store/useDriveUploadQueueStore';
import {
  buildUploadedResourceMountTagIds,
  resolveResourcePrimaryTagId,
} from '@/components/Drive/common/driveComponentModel';
import AppModal from '@/components/Overlay/AppModal';
import UploadZone from '@/components/UploadZone';
import { useDocumentService, useDriveService, useResourceService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { parseExtension } from '@/utils/parser/extensionParser';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { AxiosError } from 'axios';
import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import styles from './index.module.less';
import type { UploadDocumentModalProps } from './index.type';

const ACCEPT_DOCUMENT_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
].join(',');

const UPLOAD_STATUS_SYNC_DELAY_MS = 3000;
const QUEUE_DONE_VISIBLE_DELAY_MS = 900;
const FOLDER_MOUNT_RETRY_DELAY_MS = 2000;
const FOLDER_MOUNT_MAX_ATTEMPTS = 15;
const QUEUE_HASH_PROGRESS_WEIGHT = 0.08;
const QUEUE_UPLOAD_PROGRESS_START = 8;
const QUEUE_UPLOAD_PROGRESS_WEIGHT = 0.32;
const QUEUE_PROCESSING_PROGRESS_START = 40;
const RESOURCE_NOT_READY_CODES = new Set([5411, 6111, 8111]);

interface SubmitUploadPayload {
  files: File[];
  mountTagId?: string;
}

/** 文档上传：MD5 -> init -> OSS PUT；可选挂载到当前文件夹 tag。 */
function UploadDocumentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  targetTagId,
  groupId,
}: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const driveService = useDriveService();
  const resourceService = useResourceService();
  const startUploads = useDriveUploadQueueStore((s) => s.startUploads);
  const updateQueuedUpload = useDriveUploadQueueStore((s) => s.updateUpload);
  const removeQueuedUpload = useDriveUploadQueueStore((s) => s.removeUpload);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const mountsToFolder = Boolean(targetTagId?.trim());

  const resetState = () => {
    setSelectedFiles([]);
  };

  const completeQueuedUpload = (
    uploadId: string,
    patch: { documentId?: string; objectKey?: string } = {}
  ) => {
    updateQueuedUpload(uploadId, {
      ...patch,
      phase: 'done',
      progress: 100,
    });
    window.setTimeout(() => {
      removeQueuedUpload(uploadId);
    }, QUEUE_DONE_VISIBLE_DELAY_MS);
  };

  const scheduleUploadStatusSync = (documentId: string, uploadId: string) => {
    window.setTimeout(() => {
      void documentService
        .syncPendingDocStatus(documentId)
        .catch(() => undefined)
        .finally(() => {
          completeQueuedUpload(uploadId);
        });
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const scheduleFolderMount = (documentId: string, mountTagId: string) => {
    const tagId = mountTagId.trim();
    if (!tagId) return;

    window.setTimeout(() => {
      void (async () => {
        await documentService.syncPendingDocStatus(documentId).catch(() => undefined);
        const mounted = groupId
          ? await mountUploadedGroupDocument(documentId, tagId)
          : await mountToPersonalFolderWhenReady(documentId, tagId);
        if (mounted) {
          onSuccess?.();
        }
      })();
    }, UPLOAD_STATUS_SYNC_DELAY_MS);
  };

  const mountToPersonalFolderWhenReady = async (
    resourceId: string,
    tagId: string,
    failureTargetName = '当前文件夹'
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= FOLDER_MOUNT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const { resourceInfo } = await documentService.getDocInfo(resourceId);
        const primaryTagId = resolveResourcePrimaryTagId(resourceInfo);
        if (primaryTagId === tagId) {
          return true;
        }
        const tagIds = buildUploadedResourceMountTagIds(resourceInfo, tagId);
        await resourceService.updateResourceTags({
          resourceId,
          tagIds,
          primaryTagId: tagId,
        });
        return true;
      } catch (err) {
        const shouldRetry = isResourceNotReadyError(err) && attempt < FOLDER_MOUNT_MAX_ATTEMPTS;
        if (!shouldRetry) {
          toast.warning(`文件已上传，但未能放入${failureTargetName}：${parseErrorMessage(err)}`);
          return false;
        }
        await delay(FOLDER_MOUNT_RETRY_DELAY_MS);
      }
    }
    return false;
  };

  const mountToGroupFolderWhenReady = async (
    resourceId: string,
    tagId: string
  ): Promise<boolean> => {
    if (!groupId) return false;

    for (let attempt = 1; attempt <= FOLDER_MOUNT_MAX_ATTEMPTS; attempt += 1) {
      try {
        await resourceService.mountResourcesToGroupTag({
          resourceIds: [resourceId],
          groupId,
          tagId,
        });
        return true;
      } catch (err) {
        const shouldRetry = isResourceNotReadyError(err) && attempt < FOLDER_MOUNT_MAX_ATTEMPTS;
        if (!shouldRetry) {
          toast.warning(`文件已上传，但未能放入当前文件夹：${parseErrorMessage(err)}`);
          return false;
        }
        await delay(FOLDER_MOUNT_RETRY_DELAY_MS);
      }
    }
    return false;
  };

  const mountUploadedGroupDocument = async (resourceId: string, groupTargetTagId: string) => {
    let sharedTagId: string;
    try {
      sharedTagId = await driveService.ensureSharedFolder();
    } catch (err) {
      toast.warning(`文件已上传，但未能准备共享文件夹：${parseErrorMessage(err)}`);
      return false;
    }
    const mountedToShared = await mountToPersonalFolderWhenReady(
      resourceId,
      sharedTagId,
      '共享文件夹'
    );
    if (!mountedToShared) return false;
    return mountToGroupFolderWhenReady(resourceId, groupTargetTagId);
  };

  const { run: submitUpload } = useRequest(
    async ({ files, mountTagId }: SubmitUploadPayload) => {
      if (files.length === 0) return 0;
      const shouldMountToFolder = Boolean(mountTagId?.trim());
      const uploadIds = files.map(createUploadId);

      startUploads(
        files.map((file, index) => ({
          id: uploadIds[index],
          filename: file.name,
          fileType: getDisplayFileType(file),
          size: file.size,
          phase: 'hashing',
          progress: 0,
        }))
      );

      const uploadResults = await Promise.allSettled(
        files.map(async (file, index) => {
          const uploadId = uploadIds[index];
          try {
            const result = await documentService.uploadDocument({
              file,
              onUploadInitialized: (payload) => {
                updateQueuedUpload(uploadId, {
                  documentId: payload.documentId,
                  objectKey: payload.objectKey,
                  phase: payload.flashUploaded ? 'confirming' : 'uploading',
                  progress: payload.flashUploaded
                    ? QUEUE_PROCESSING_PROGRESS_START
                    : QUEUE_UPLOAD_PROGRESS_START,
                });
              },
              onHashProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'hashing',
                  progress: p * QUEUE_HASH_PROGRESS_WEIGHT,
                });
              },
              onUploadProgress: (p) => {
                updateQueuedUpload(uploadId, {
                  phase: 'uploading',
                  progress: getQueueUploadProgress(p),
                });
              },
            });
            if (result.flashUploaded) {
              updateQueuedUpload(uploadId, {
                documentId: result.documentId,
                objectKey: result.objectKey,
                phase: 'confirming',
                progress: QUEUE_PROCESSING_PROGRESS_START,
              });
              scheduleUploadStatusSync(result.documentId, uploadId);
              if (shouldMountToFolder && mountTagId) {
                scheduleFolderMount(result.documentId, mountTagId);
              }
            } else {
              updateQueuedUpload(uploadId, {
                documentId: result.documentId,
                objectKey: result.objectKey,
                phase: 'confirming',
                progress: QUEUE_PROCESSING_PROGRESS_START,
              });
              scheduleUploadStatusSync(result.documentId, uploadId);
              if (shouldMountToFolder && mountTagId) {
                scheduleFolderMount(result.documentId, mountTagId);
              }
            }
          } catch (err) {
            updateQueuedUpload(uploadId, {
              phase: 'failed',
              errorMessage: parseErrorMessage(err),
            });
            throw err;
          }
        })
      );

      const failedResult = uploadResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failedResult != null) {
        throw failedResult.reason;
      }
      return files.length;
    },
    {
      manual: true,
      onSuccess: (count) => {
        if (count > 0) {
          toast.success(
            mountsToFolder ? `已开始上传 ${count} 个文件到当前文件夹` : `已完成 ${count} 个文件上传`
          );
        }
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleOk = () => {
    if (selectedFiles.length === 0) {
      toast.warning('请选择要上传的文件');
      return;
    }
    const filesToUpload = selectedFiles;
    const mountTagId = targetTagId?.trim();
    submitUpload({ files: filesToUpload, mountTagId });
    if (!mountsToFolder) {
      toast.success(`已添加 ${filesToUpload.length} 个文件到上传队列`);
    }
    resetState();
    onOpenChange(false);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="上传文档"
      description={
        mountsToFolder
          ? '文件将上传到当前文件夹，并同步显示在上传队列'
          : '上传完成后会同步刷新上传队列'
      }
      size="lg"
      containerClassName={styles.container}
      dialogClassName={styles.dialog}
      bodyClassName={styles.body}
      actions={
        <>
          <Button variant="secondary" onPress={handleClose}>
            <X size={14} strokeWidth={1.8} />
            取消
          </Button>
          <Button variant="primary" isDisabled={selectedFiles.length === 0} onPress={handleOk}>
            <CloudUpload size={15} strokeWidth={1.8} />
            {mountsToFolder ? '开始上传' : '添加到上传队列'}
          </Button>
        </>
      }
    >
      <UploadZone
        files={selectedFiles}
        multiple
        accept={ACCEPT_DOCUMENT_TYPES}
        label="点击或拖拽文档到此区域"
        description="支持一次选择多个文档，也可以逐个添加"
        onFilesChange={setSelectedFiles}
      />

      <div className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <div className={styles.statusTitle}>
            <span>支持 PDF 和 OFFICE 文档，单文件最大 100MB。</span>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function getQueueUploadProgress(value: number): number {
  return Math.min(
    QUEUE_PROCESSING_PROGRESS_START,
    QUEUE_UPLOAD_PROGRESS_START + value * QUEUE_UPLOAD_PROGRESS_WEIGHT
  );
}

function getDisplayFileType(file: File): string {
  try {
    return parseExtension(file.name);
  } catch {
    return 'unknown';
  }
}

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isResourceNotReadyError(err: unknown): boolean {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  const code = axiosErr.response?.data?.code;
  if (typeof code === 'number' && RESOURCE_NOT_READY_CODES.has(code)) {
    return true;
  }
  const message = parseErrorMessage(err);
  return message.includes('资源不存在') || message.includes('文档不存在');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default UploadDocumentModal;
