import { useChatPageStore } from '@/store/zustand';
import styles from './style.module.less';

function ContextTags() {
  const activeDocRefs = useChatPageStore((state) => state.activeDocRefs);
  const activeAttachments = useChatPageStore((state) => state.activeAttachments);
  const removeDocRef = useChatPageStore((state) => state.removeDocRef);
  const removeAttachment = useChatPageStore((state) => state.removeAttachment);

  const hasAny = activeDocRefs.length > 0 || activeAttachments.length > 0;
  if (!hasAny) return null;

  return (
    <div className={styles.tags}>
      {activeDocRefs.map((ref) => (
        <span key={ref.resourceId} className={`${styles.tag} ${styles.docTag}`}>
          引用 {ref.resourceName}
          <span className={styles.tagRemove} onClick={() => removeDocRef(ref.resourceId)}>
            x
          </span>
        </span>
      ))}
      {activeAttachments.map((att) => (
        <span key={att.attachmentId} className={`${styles.tag} ${styles.attachmentTag}`}>
          附件 {att.filename}
          <span className={styles.tagRemove} onClick={() => removeAttachment(att.attachmentId)}>
            x
          </span>
        </span>
      ))}
    </div>
  );
}

export default ContextTags;
