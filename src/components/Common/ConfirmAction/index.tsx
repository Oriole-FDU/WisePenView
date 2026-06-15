import { Button, Popover } from '@heroui/react';
import type { ReactElement } from 'react';
import { cloneElement, useState } from 'react';
import type { ConfirmActionProps } from './index.type';
import styles from './style.module.less';

interface ConfirmActionChildProps {
  disabled?: boolean;
  onClick?: (event: unknown) => void;
}

function ConfirmAction({
  title,
  children,
  confirmText = '确定',
  cancelText = '取消',
  isDisabled = false,
  isLoading = false,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const child = children as ReactElement<ConfirmActionChildProps>;

  const trigger = cloneElement(child, {
    disabled: isDisabled || isLoading || child.props.disabled,
    onClick: (event: unknown) => {
      child.props.onClick?.(event);
      if (!isDisabled && !isLoading) {
        setOpen(true);
      }
    },
  });

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content placement="top">
        <Popover.Dialog className={styles.dialog}>
          <p className={styles.title}>{title}</p>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" isDisabled={isLoading} onPress={() => setOpen(false)}>
              {cancelText}
            </Button>
            <Button
              variant="danger"
              size="sm"
              isDisabled={isLoading}
              onPress={() => {
                void onConfirm();
                setOpen(false);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ConfirmAction;
export type { ConfirmActionProps } from './index.type';
