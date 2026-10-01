import { Image, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

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
import EntryIcon from '@/components/business/Icons/EntryIcon';
import {
  clearFrontendStates,
  FRONTEND_STATE_SOURCE,
  setFrontendStates,
  useFrontendStateValue,
} from '@/frontendState';

import { useChatInputStore, useChatInputStoreApi } from '../_context';
import styles from '../style.module.less';

function getUploadAttachmentState(status: 'uploading' | 'failed') {
  if (status === 'failed') return 'error';
  return 'uploading';
}

function getUploadAttachmentDescriptionKey(status: 'uploading' | 'failed') {
  if (status === 'uploading') return 'input.attachments.uploading' as const;
  return 'input.attachments.failed' as const;
}

function AttachmentStrip() {
  const { t } = useTranslation('chat');
  const store = useChatInputStoreApi();
  const resources = useFrontendStateValue('selected_resources') ?? [];
  const { attachments, uploads } = useChatInputStore(
    useShallow((state) => ({
      attachments: state.activeAttachments,
      uploads: state.pendingAttachmentUploads,
    }))
  );
  const { removeActiveAttachment, removePendingAttachmentUpload } = store.getState();
  const removeDocRef = (resourceId: string) => {
    const remaining = resources.filter((resource) => resource.resource_id !== resourceId);
    if (remaining.length === 0) {
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.INPUT });
    } else {
      setFrontendStates({
        source: FRONTEND_STATE_SOURCE.INPUT,
        entries: [{ key: 'selected_resources', value: remaining }],
      });
    }
  };

  const hasAny = resources.length > 0 || attachments.length > 0 || uploads.length > 0;

  if (!hasAny) return null;

  return (
    <div className={styles.attachmentStripShell}>
      <AttachmentGroup
        className={styles.attachmentArea}
        aria-label={t('input.attachments.contextAria')}
      >
        {resources.map((resource) => (
          <Attachment key={resource.resource_id} size="xs" className={styles.chatAttachment}>
            <AttachmentMedia>
              <EntryIcon entryType="resource" resourceType={resource.resource_type} size={14} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={resource.resource_name}>
                {resource.resource_name}
              </AttachmentTitle>
              <AttachmentDescription>
                {t('input.attachments.documentReference')}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={t('input.attachments.removeDocument', { name: resource.resource_name })}
                onPress={() => removeDocRef(resource.resource_id)}
              >
                <X size={12} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}

        {attachments.map((attachment) => (
          <Attachment key={attachment.attachmentId} size="xs" className={styles.chatAttachment}>
            <AttachmentMedia variant={attachment.thumbnailUrl ? 'image' : 'icon'}>
              {attachment.thumbnailUrl ? (
                <img src={attachment.thumbnailUrl} alt="" />
              ) : attachment.kind === 'image' ? (
                <Image size={13} aria-hidden="true" />
              ) : (
                <EntryIcon entryType="resource" size={14} />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={attachment.filename}>{attachment.filename}</AttachmentTitle>
              <AttachmentDescription>{t('input.attachments.attachment')}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={t('input.attachments.removeAttachment', { name: attachment.filename })}
                onPress={() => removeActiveAttachment(attachment.attachmentId)}
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
            <AttachmentMedia variant={upload.thumbnailUrl ? 'image' : 'icon'}>
              {upload.thumbnailUrl ? (
                <img src={upload.thumbnailUrl} alt="" />
              ) : upload.kind === 'image' ? (
                <Image size={13} aria-hidden="true" />
              ) : (
                <EntryIcon entryType="resource" size={14} />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={upload.filename}>{upload.filename}</AttachmentTitle>
              <AttachmentDescription>
                {t(getUploadAttachmentDescriptionKey(upload.status))}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                label={t('input.attachments.removeUpload', { name: upload.filename })}
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
