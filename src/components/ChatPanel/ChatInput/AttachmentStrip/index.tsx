import EntryIcon from '@/components/Icons/EntryIcon';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/_shadcn';
import { Image, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from '../style.module.less';

function getUploadAttachmentState(status: 'pending' | 'uploading' | 'failed') {
  if (status === 'failed') return 'error';
  if (status === 'uploading') return 'uploading';
  return 'idle';
}

function getUploadAttachmentDescription(status: 'pending' | 'uploading' | 'failed') {
  if (status === 'pending') return '附件待发送';
  if (status === 'uploading') return '上传中';
  return '上传失败';
}

function AttachmentStrip() {
  const store = useChatInputStoreApi();
  const { resources, attachments, images, uploads } = useChatInputStore(
    useShallow((state) => ({
      resources: state.activeDocRefs,
      attachments: state.activeAttachments,
      images: state.pendingImageMetas,
      uploads: state.pendingAttachmentUploads,
    }))
  );
  const {
    removeActiveAttachment,
    removeDocRef,
    removePendingAttachmentUpload,
    removePendingImageMeta,
  } = store.getState();

  const hasAny =
    resources.length > 0 || attachments.length > 0 || images.length > 0 || uploads.length > 0;

  if (!hasAny) return null;

  return (
    <div className={styles.attachmentStripShell}>
      <AttachmentGroup className={styles.attachmentArea} aria-label="输入上下文">
        {resources.map((resource) => (
          <Attachment key={resource.resourceId} size="xs" className={styles.chatAttachment}>
            <AttachmentMedia>
              <EntryIcon entryType="resource" resourceType={resource.resourceType} size={14} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={resource.resourceName}>
                {resource.resourceName}
              </AttachmentTitle>
              <AttachmentDescription>文档引用</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={`移除文档 ${resource.resourceName}`}
                onPress={() => removeDocRef(resource.resourceId)}
              >
                <X size={12} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}

        {attachments.map((attachment) => (
          <Attachment key={attachment.attachmentId} size="xs" className={styles.chatAttachment}>
            <AttachmentMedia>
              <EntryIcon entryType="resource" size={14} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={attachment.filename}>{attachment.filename}</AttachmentTitle>
              <AttachmentDescription>附件</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={`移除附件 ${attachment.filename}`}
                onPress={() => removeActiveAttachment(attachment.attachmentId)}
              >
                <X size={12} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}

        {images.map((imageMeta) => (
          <Attachment key={imageMeta.id} size="xs" state="idle" className={styles.chatAttachment}>
            <AttachmentMedia variant={imageMeta.thumbnailUrl ? 'image' : 'icon'}>
              {imageMeta.thumbnailUrl ? (
                <img src={imageMeta.thumbnailUrl} alt="" />
              ) : (
                <Image size={13} />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={imageMeta.filename}>{imageMeta.filename}</AttachmentTitle>
              <AttachmentDescription>图片待发送</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={`移除图片 ${imageMeta.filename}`}
                onPress={() => removePendingImageMeta(imageMeta.id)}
              >
                <X size={12} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}

        {uploads.map((upload) => (
          <Attachment
            key={upload.id}
            size="xs"
            state={getUploadAttachmentState(upload.status)}
            className={styles.chatAttachment}
          >
            <AttachmentMedia>
              <EntryIcon entryType="resource" size={14} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={upload.filename}>{upload.filename}</AttachmentTitle>
              <AttachmentDescription>
                {getUploadAttachmentDescription(upload.status)}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={`移除上传项 ${upload.filename}`}
                onPress={() => removePendingAttachmentUpload(upload.id)}
              >
                <X size={12} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export default AttachmentStrip;
