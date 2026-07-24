import AppIconButton from '@/components/Button/AppIconButton';
import { copyText } from '@/utils/browser/copyText';
import { toast } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { CopyButtonProps } from './index.type';

const ICON_SIZE = 17;

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
    <AppIconButton
      icon={
        copied ? (
          <Check size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <Copy size={ICON_SIZE} aria-hidden="true" />
        )
      }
      label={copied ? '已复制' : label}
      isActive={copied}
      className={className}
      onPress={() => void handleCopy()}
    />
  );
}

export default CopyButton;
export { ICON_SIZE as MESSAGE_ACTION_ICON_SIZE };
