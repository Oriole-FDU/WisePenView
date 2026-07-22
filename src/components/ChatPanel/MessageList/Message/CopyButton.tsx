import { copyText } from '@/utils/browser/copyText';
import { Button, toast, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import styles from './CopyButton.module.less';

const ICON_SIZE = 17;

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

function CopyButton({ text, label = '复制', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!(await copyText(text))) {
      toast.danger('复制失败');
      return;
    }

    toast.success('复制成功');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip delay={0}>
      <Button
        variant="ghost"
        isIconOnly
        size="sm"
        className={clsx(styles.copyButton, copied && styles.copyButtonCopied, className)}
        onPress={() => void handleCopy()}
        aria-label={label}
      >
        {copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
      </Button>
      <Tooltip.Content>{copied ? '已复制' : label}</Tooltip.Content>
    </Tooltip>
  );
}

export default CopyButton;
export { ICON_SIZE as MESSAGE_ACTION_ICON_SIZE };
