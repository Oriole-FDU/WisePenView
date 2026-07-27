import AppIconButton from '@/components/Button/AppIconButton';
import { copyText } from '@/utils/browser/copyText';
import { toast } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopyButtonProps } from './index.type';

const ICON_SIZE = 17;

function CopyButton({ text, label, className }: CopyButtonProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!(await copyText(text))) {
      toast.danger(t('copy.failed'));
      return;
    }

    toast.success(t('copy.success'));
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
      label={copied ? t('copy.copied') : (label ?? t('copy.action'))}
      isActive={copied}
      className={className}
      onPress={() => void handleCopy()}
    />
  );
}

export default CopyButton;
export { ICON_SIZE as MESSAGE_ACTION_ICON_SIZE };
