import { CheckCircle2, CircleX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppAlertDialog from '@/components/business/AppAlertDialog';

import type { ToolApprovalDialogProps } from './index.type';
import styles from './style.module.less';

function formatToolPayload(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 高危工具审批展示；目标选择、决策记录和恢复对话由 turn 域维护。
 */
function ToolApprovalDialog({ name, input, submitting, onDecision }: ToolApprovalDialogProps) {
  const { t } = useTranslation('chat');
  const inputText = input === undefined ? '' : formatToolPayload(input);

  /**
   * 审批必须落到“允许”或“拒绝”：遮罩、Esc 与关闭按钮都不产生隐式决定，
   * 因此这里忽略关闭请求，弹窗只由决策或状态推进驱动卸载。
   */
  const handleOpenChange = () => undefined;

  return (
    <AppAlertDialog
      type="danger"
      size="md"
      isOpen
      onOpenChange={handleOpenChange}
      title={t('message.tool.approval.title')}
      description={t('message.tool.approval.description')}
      isConfirmLoading={submitting}
      actions={
        <>
          <AppButton variant="secondary" isDisabled={submitting} onPress={() => onDecision(false)}>
            <CircleX size={14} aria-hidden="true" />
            {t('message.tool.approval.reject')}
          </AppButton>
          <AppButton variant="danger" isDisabled={submitting} onPress={() => onDecision(true)}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {t('message.tool.approval.allow')}
          </AppButton>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.target}>{t('message.tool.approval.target', { name })}</p>
        {inputText ? <pre className={styles.payload}>{inputText}</pre> : null}
      </div>
    </AppAlertDialog>
  );
}

export default ToolApprovalDialog;
