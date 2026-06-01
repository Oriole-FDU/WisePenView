import UploadZone from '@/components/Common/UploadZone';
import { useRequest } from 'ahooks';
import { useCallback, useState } from 'react';

import { useDocumentService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, ProgressBar, toast } from '@heroui/react';

import styles from './UploadDocumentModal.module.less';

export interface UploadDocumentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** 文档上传：MD5 -> init -> OSS PUT，成功后由调用方决定后续跳转。 */
export function UploadDocumentModal({ isOpen, onOpenChange, onSuccess }: UploadDocumentModalProps) {
  const documentService = useDocumentService();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<'idle' | 'hash' | 'upload'>('idle');
  const [percent, setPercent] = useState(0);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPhase('idle');
    setPercent(0);
  }, []);

  const { loading: uploading, run: submitUpload } = useRequest(
    (file: File) =>
      documentService.uploadDocument({
        file,
        onHashProgress: (p) => {
          setPhase('hash');
          setPercent(p);
        },
        onUploadProgress: (p) => {
          setPhase('upload');
          setPercent(p);
        },
      }),
    {
      manual: true,
      onBefore: () => {
        setPhase('hash');
        setPercent(0);
      },
      onSuccess: () => {
        toast.success('上传成功');
        onSuccess?.();
        resetState();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
      onFinally: () => {
        setPhase('idle');
        setPercent(0);
      },
    }
  );

  const handleClose = () => {
    if (uploading) return;
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
    if (!selectedFile) {
      toast.warning('请选择要上传的文件');
      return;
    }
    submitUpload(selectedFile);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!uploading}>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>上传文件</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className={styles.hint}>支持 pdf、Office 文档等，单文件最大 100MB。</p>
              <UploadZone file={selectedFile} disabled={uploading} onFileChange={setSelectedFile} />
              {uploading && (
                <div className={styles.progressWrap}>
                  <div className={styles.progressLabel}>
                    {phase === 'hash' ? '正在计算文件校验值' : '正在上传至存储'}
                  </div>
                  <ProgressBar
                    aria-label="上传进度"
                    value={percent}
                    valueLabel={`${percent}%`}
                    size="sm"
                  >
                    <ProgressBar.Track className={styles.progressTrack}>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                    <ProgressBar.Output className={styles.progressOutput} />
                  </ProgressBar>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={uploading} onPress={handleClose}>
                取消
              </Button>
              <Button variant="primary" isDisabled={!selectedFile || uploading} onPress={handleOk}>
                开始上传
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
