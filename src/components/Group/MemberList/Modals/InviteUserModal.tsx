import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { LuCopy } from 'react-icons/lu';
import type { InviteUserModalProps } from './index.type';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const InviteUserModal: React.FC<InviteUserModalProps> = ({ open, onCancel, inviteCode }) => {
  const message = useAppMessage();
  const [copied, setCopied] = useState(false);

  const handleCancel = () => {
    setCopied(false);
    onCancel?.();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode ?? '');
      setCopied(true);
      message.success('邀请码已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  return (
    <Modal
      title="邀请用户"
      open={open}
      onCancel={handleCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          关闭
        </Button>,
        <Button type="primary" icon={<LuCopy />} onClick={handleCopy} disabled={!inviteCode}>
          {copied ? '已复制' : '复制'}
        </Button>,
      ]}
      width={400}
    >
      <div className={styles.inviteContainer}>
        <div className={styles.inviteCodeWrap}>
          <div className={styles.inviteCode}>{inviteCode ?? '暂无邀请码'}</div>
        </div>
        <div className={styles.inviteHint}>分享此邀请码给其他用户，他们可以使用此码加入小组</div>
      </div>
    </Modal>
  );
};

export default InviteUserModal;
