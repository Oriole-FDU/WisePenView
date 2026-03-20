import React from 'react';
import { LuCopy, LuPencil, LuCheck } from 'react-icons/lu';
import { Button } from 'antd';
import MessageContent from './MessageContent';
import styles from './UserMessage.module.less';
import type { Message } from '@/components/ChatPanel/index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

interface UserMessageProps {
  message: Message;
  onEdit?: (content: string) => void;
}

const UserMessage: React.FC<UserMessageProps> = ({ message, onEdit }) => {
  const messageApi = useAppMessage();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      messageApi.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      messageApi.error('复制失败');
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.content);
    } else {
      messageApi.warning('暂未实现编辑功能');
    }
  };

  return (
    <div className={styles.userRow}>
      <div className={styles.contentCol}>
        {/* 左侧悬浮操作栏 */}
        <div className={styles.actions}>
          <Button
            type="text"
            shape="circle"
            size="small"
            className={styles.actionBtn}
            icon={<LuPencil size={14} />}
            onClick={handleEdit}
            title="编辑"
          />
          <Button
            type="text"
            shape="circle"
            size="small"
            className={styles.actionBtn}
            icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
            onClick={handleCopy}
            title="复制"
            style={copied ? { color: 'var(--ant-color-success)' } : undefined}
          />
        </div>

        {/* 气泡 */}
        <div className={styles.bubble}>
          <MessageContent content={message.content} />
        </div>
      </div>
    </div>
  );
};

export default UserMessage;
