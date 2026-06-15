import { Button, Popover } from '@heroui/react';
import { Plus, Send, Wrench } from 'lucide-react';
import ModelSelector from '../../ModelSelector';
import styles from '../style.module.less';
import type { ActionToolbarProps } from './index.type';

function ActionToolbar({
  modelValue,
  onModelChange,
  onSend,
  disabledSend,
  capabilityCount,
  capabilityOpen,
  onCapabilityOpenChange,
  capabilityDropdownContent,
  contentPickOpen,
  onContentPickOpenChange,
  contentPickDropdownContent,
}: ActionToolbarProps) {
  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        <Popover isOpen={contentPickOpen} onOpenChange={onContentPickOpenChange}>
          <Popover.Trigger>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className={styles.toolbarCircleBtn}
              aria-label="添加内容"
            >
              <Plus size={18} />
            </Button>
          </Popover.Trigger>
          <Popover.Content className={styles.toolbarPopover} placement="top">
            <Popover.Dialog>{contentPickDropdownContent}</Popover.Dialog>
          </Popover.Content>
        </Popover>

        <Popover isOpen={capabilityOpen} onOpenChange={onCapabilityOpenChange}>
          <Popover.Trigger>
            <div className={styles.capabilityTriggerWrap}>
              {capabilityCount > 0 ? (
                <span className={styles.capabilityBadge}>{capabilityCount}</span>
              ) : null}
              <Button variant="ghost" size="sm" className={styles.capabilityButton}>
                <Wrench size={16} />
                <span>能力</span>
              </Button>
            </div>
          </Popover.Trigger>
          <Popover.Content className={styles.toolbarPopover} placement="top">
            <Popover.Dialog>{capabilityDropdownContent}</Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>

      <div className={styles.toolsRight}>
        <ModelSelector value={modelValue} onChange={onModelChange} />

        <Button
          variant="primary"
          size="sm"
          isIconOnly
          onPress={onSend}
          isDisabled={disabledSend}
          className={styles.toolbarCircleBtn}
          aria-label="发送消息"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
}

export default ActionToolbar;
