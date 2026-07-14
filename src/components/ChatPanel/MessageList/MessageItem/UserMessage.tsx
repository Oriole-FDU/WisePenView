import type { Message } from '@/components/ChatPanel/index.type';
import { Button, toast } from '@heroui/react';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import inputStyles from '../../ChatInput/style.module.less';
import MessageContent from './MessageContent';
import styles from './UserMessage.module.less';

const MESSAGE_ACTION_ICON_SIZE = 17;

interface UserMessageProps {
  message: Message;
  onEdit?: (content: string) => void;
}

function UserMessage({ message }: UserMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.danger('复制失败');
    }
  };

  return (
    <div className={styles.userRow}>
      <div className={styles.contentCol}>
        <div className={styles.bubbleWrap}>
          <div className={styles.bubble}>
            <MessageContent content={message.content} />
          </div>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(
                inputStyles.toolbarCircleBtn,
                styles.actionBtn,
                copied && styles.actionBtnCopied
              )}
              onPress={handleCopy}
              aria-label="复制"
            >
              {copied ? (
                <Check size={MESSAGE_ACTION_ICON_SIZE} />
              ) : (
                <Copy size={MESSAGE_ACTION_ICON_SIZE} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserMessage;
