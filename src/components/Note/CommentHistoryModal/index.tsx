import { Button, Modal } from '@heroui/react';

import type { CommentHistoryModalProps } from './index.type';
import styles from './style.module.less';

function CommentHistoryModal({ isOpen, onOpenChange, children }: CommentHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>历史批注</Modal.Heading>
            </Modal.Header>
            <Modal.Body className={styles.historyBody}>
              {children ? (
                <div className={styles.historyContent}>{children}</div>
              ) : (
                <p className={styles.placeholder}>
                  已解决的批注将在此展示，编辑器批注功能接入后可见。
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default CommentHistoryModal;
