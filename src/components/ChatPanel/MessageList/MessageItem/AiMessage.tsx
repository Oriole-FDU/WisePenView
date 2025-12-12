import React from 'react';
import { LuCopy, LuThumbsUp, LuThumbsDown, LuRotateCw } from 'react-icons/lu';
import { Button } from 'antd';
import { LogoFactory } from '../../ModelSelector';
import MessageContent from './MessageContent';
import ThinkingBlock from './ThinkingBlock';
import styles from './AiMessage.module.less';
import type { Message } from '@/components/ChatPanel/index.type';

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
  const hasReasoning = message.reasoningContent !== undefined;

  return (
    <div className={styles.aiRow}>
      {/* 头像 */}
      <div className={styles.avatarCol}>
        <LogoFactory provider={message.meta?.provider || 'openai'} size={28} />
      </div>

      {/* 内容 */}
      <div className={styles.contentCol}>
        {/* 思考过程块 */}
        {hasReasoning && (
          <ThinkingBlock
            content={message.reasoningContent || ''}
            duration={message.meta?.usage?.totalTime}
            // 如果消息还在 loading 且正文没开始，说明正在思考中
            loading={message.loading && !message.content}
          />
        )}
        {/* 正文内容 */}
        {/* 只有当正文有内容，或者没有思考过程时（避免空白占位），才渲染正文 */}
        {(message.content || !hasReasoning) && (
          <div className={styles.bubble}>
            <MessageContent
              content={message.content}
            />
          </div>
        )}

        {/* 底部操作栏 (非 Loading 时显示) */}
        {!message.loading && (
          <div className={styles.actions}>
            <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuThumbsUp size={14} />
            </Button>
            <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuThumbsDown size={14} />
            </Button>
            <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuRotateCw size={14} />
            </Button>
            <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuCopy size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiMessage;
