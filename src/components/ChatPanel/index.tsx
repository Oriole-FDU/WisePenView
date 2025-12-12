import React, { useState, useRef } from 'react';
import { Button } from 'antd';
import { RiAddLine } from 'react-icons/ri';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { Message, Model } from '@/components/ChatPanel/index.type';
// 引入刚刚写好的 Service
import { sendMessageStream } from '@/services/mock/ChatPanel';
import styles from './style.module.less';

const ChatPanel: React.FC = () => {
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);

  // 用于控制中断的 AbortController
  const abortCtrlRef = useRef<AbortController | null>(null);

  const handleSend = async (text: string) => {
    // 校验模型是否就绪
    if (!currentModel) return;

    // 为本次请求创建控制器
    abortCtrlRef.current = new AbortController();

    // 构建消息对象
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createAt: Date.now(),
    };

    // 获取当前模型信息，用于头像展示
    const provider = currentModel.provider || 'openai';

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      reasoningContent: '',
      createAt: Date.now(),
      loading: true,
      meta: {
        provider: provider,
      },
    };

    // 乐观更新 UI
    setMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);
    setSending(true);

    // 调用 Service (核心解耦)
    await sendMessageStream(
      text,
      {
        // 回调：更新思考过程
        onReasoning: (delta) => {
          setMessages((prev) =>
            // 使用 map 遍历，找到目标 ID 时返回一个【新对象】
            prev.map((msg) => {
              if (msg.id === aiMsgId) {
                // ...msg 复制旧属性，覆盖 reasoningContent
                return {
                  ...msg,
                  reasoningContent: (msg.reasoningContent || '') + delta,
                };
              }
              return msg;
            })
          );
        },
        // 回调：更新正文
        onContent: (delta) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMsgId) {
                return {
                  ...msg,
                  content: (msg.content || '') + delta,
                };
              }
              return msg;
            })
          );
        },
        // 回调：完成
        onComplete: (totalTime) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const target = newMsgs.find((m) => m.id === aiMsgId);
            if (target) {
              target.loading = false;
              target.meta = {
                ...target.meta,
                usage: { totalTime: totalTime },
              };
            }
            return newMsgs;
          });
          setSending(false);
          abortCtrlRef.current = null; // 清理引用
        },
      },
      abortCtrlRef.current.signal // 传入信号用于中断
    );
  };

  const startNewChat = () => {
    // 中断当前的流
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
    setMessages([]);
    setSending(false);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>新建对话</div>
        <Button type="text" icon={<RiAddLine />} onClick={startNewChat}>
          清空
        </Button>
      </div>
      <div className={styles.content}>
        <MessageList messages={messages} />
      </div>
      <div className={styles.footer}>
        <ChatInput
          currentModelId={currentModel?.id || ''}
          onModelChange={setCurrentModel}
          onSend={handleSend}
          sending={sending}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
