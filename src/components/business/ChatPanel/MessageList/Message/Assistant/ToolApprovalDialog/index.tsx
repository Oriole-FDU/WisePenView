import { CheckCircle2, CircleX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppAlertDialog from '@/components/business/AppAlertDialog';

import { formatToolPayload, getToolDisplayName, type RenderableToolPart } from '../traceModel';
import styles from './style.module.less';

interface ToolApprovalDialogProps {
  part: RenderableToolPart;
  submitting: boolean;
  onDecision: (approved: boolean) => void;
}

/**
 * 高危工具审批：过程行折叠后内联按钮不再可见，改为必须显式选择的危险弹窗。
 */
function ToolApprovalDialog({ part, submitting, onDecision }: ToolApprovalDialogProps) {
  const { t } = useTranslation('chat');
  const name = getToolDisplayName(part);
  const inputText = part.input === undefined ? '' : formatToolPayload(part.input);

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
