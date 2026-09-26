import { toast } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { copyText } from '@/utils/browser/copyText';

import type { CopyButtonProps } from './index.type';

const ICON_SIZE = 17;

function CopyButton({ text, label, className, isDisabled }: CopyButtonProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * @wisepen-manual-effect
   * 执行时机：组件卸载时取消尚未执行的恢复计时器。
   * 不可替代原因：计时器属于浏览器副作用，需要在生命周期结束时清理。
   * cleanup：清除恢复 copied 状态的定时器。
   */
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!(await copyText(text))) {
      toast.danger(t('copy.failed'));
      return;
    }

    toast.success(t('copy.success'));
    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 1500);
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
      isDisabled={isDisabled}
      className={className}
      onPress={() => void handleCopy()}
    />
  );
}

export default CopyButton;
export type { CopyButtonProps } from './index.type';
