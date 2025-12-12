import React, { useState } from 'react';
import { Input } from 'antd';
import ActionToolbar from './ActionToolbar';
import type { Model } from '@/components/ChatPanel/index.type';
import styles from './style.module.less';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (text: string) => void;
  sending: boolean;
  currentModelId: string;
  onModelChange: (model: Model) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  sending,
  currentModelId,
  onModelChange,
}) => {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false); 

  const handleSend = () => {
    if (!value.trim() || sending || !currentModelId) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputCard}>
        <TextArea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入消息..."
          autoSize={{ minRows: 1, maxRows: 8 }}
          className={styles.textarea}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
        />
        
        <ActionToolbar 
          modelValue={currentModelId}
          onModelChange={onModelChange}
          onSend={handleSend}
          disabledSend={!value.trim() || sending || !currentModelId}
        />
      </div>
      
      <div className={styles.footerTip}>
        AI 内容仅供参考，请仔细甄别
      </div>
    </div>
  );
};

export default ChatInput;