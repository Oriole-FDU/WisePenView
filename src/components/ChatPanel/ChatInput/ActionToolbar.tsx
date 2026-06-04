import { Button } from '@heroui/react';
import { Send } from 'lucide-react';

import type { Model } from '@/components/ChatPanel/index.type';
import ModelSelector from '../ModelSelector';
import styles from './style.module.less';

interface ActionToolbarProps {
  modelValue: string;
  onModelChange: (model: Model) => void;
  onSend: () => void;
  disabledSend: boolean;
}

function ActionToolbar({ modelValue, onModelChange, onSend, disabledSend }: ActionToolbarProps) {
  return (
    <div className={styles.actionToolbar}>
      {/* 左侧功能区 */}
      <div className={styles.toolsLeft}>{/* TODO: 左侧功能按钮待接入 */}</div>

      {/* 右侧功能区 */}
      <div className={styles.toolsRight}>
        <ModelSelector value={modelValue} onChange={onModelChange} />

        <Button
          variant="primary"
          isIconOnly
          size="sm"
          onPress={onSend}
          isDisabled={disabledSend}
          className={styles.sendBtn}
        >
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}

export default ActionToolbar;
