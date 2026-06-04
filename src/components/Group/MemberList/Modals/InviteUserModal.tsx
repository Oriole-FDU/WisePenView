import IconText from '@/components/Common/IconText';
import { Button, Modal, toast } from '@heroui/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import type { InviteUserModalProps } from './index.type';
import styles from './style.module.less';

function InviteUserModal({ isOpen, onOpenChange, inviteCode }: InviteUserModalProps) {
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setCopied(false);
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode ?? '');
      setCopied(true);
      toast.success('邀请码已复制到剪贴板');
    } catch {
      toast.danger('复制失败，请手动复制');
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>邀请用户</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.inviteContainer}>
                <div className={styles.inviteCodeWrap}>
                  <div className={styles.inviteCode}>{inviteCode ?? '暂无邀请码'}</div>
                </div>
                <div className={styles.inviteHint}>
                  分享此邀请码给其他用户，他们可以使用此码加入小组
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                关闭
              </Button>
              <Button variant="primary" onPress={handleCopy} isDisabled={!inviteCode}>
                <IconText icon={<Copy />} iconSize={16}>
                  {copied ? '已复制' : '复制'}
                </IconText>
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default InviteUserModal;
