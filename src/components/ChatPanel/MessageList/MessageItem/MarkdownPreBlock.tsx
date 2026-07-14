import { Button, toast } from '@heroui/react';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import inputStyles from '../../ChatInput/style.module.less';
import styles from './MarkdownPreBlock.module.less';

const MESSAGE_ACTION_ICON_SIZE = 17;

async function copyPlainText(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 非安全上下文textarea 兜底。
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

interface MarkdownPreBlockProps {
  children?: ReactNode;
}

function MarkdownPreBlock({ children }: MarkdownPreBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const plainText = preRef.current?.textContent?.trim() ?? '';
    if (!plainText) {
      toast.danger('复制失败');
      return;
    }

    const ok = await copyPlainText(plainText);
    if (!ok) {
      toast.danger('复制失败');
      return;
    }

    toast.success('复制成功');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.shell}>
      <Button
        variant="ghost"
        isIconOnly
        size="sm"
        className={clsx(
          inputStyles.toolbarCircleBtn,
          styles.copyBtn,
          copied && styles.copyBtnCopied
        )}
        onPress={() => void handleCopy()}
        aria-label="复制代码块"
      >
        {copied ? (
          <Check size={MESSAGE_ACTION_ICON_SIZE} />
        ) : (
          <Copy size={MESSAGE_ACTION_ICON_SIZE} />
        )}
      </Button>
      <pre ref={preRef} className={styles.pre}>
        {children}
      </pre>
    </div>
  );
}

export default MarkdownPreBlock;
