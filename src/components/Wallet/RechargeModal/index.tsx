/**
 * 通用充值弹窗（点卡核销）。
 *
 * 交互要点（与需求文档一致）：
 * - 展示格式：每满 4 位自动插入横杠，最多 16 位字母数字。
 * - 强制大写：输入阶段即转大写，避免用户混淆。
 * - 提交：剔除横杠与空格，仅传 16 位纯字符。
 * - 防重复提交：进行中按钮文案为「充值中...」并禁用。
 */
import { Button, InputOTP, Modal, REGEXP_ONLY_DIGITS_AND_CHARS } from '@heroui/react';
import { useRequest, useUpdateEffect } from 'ahooks';
import React, { useRef, useState } from 'react';
import type { RechargeModalProps } from './index.type';
import styles from './style.module.less';

/** 将用户输入规范为 16 位大写字母数字 */
const normalizeVoucherCode = (raw: string): string =>
  raw
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, 16)
    .toUpperCase();

const OTP_GROUPS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
];

function RechargeModal({ open, onCancel, groupDisplayName, onSubmit }: RechargeModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  const title =
    groupDisplayName != null && groupDisplayName.length > 0
      ? `为「${groupDisplayName}」充值`
      : '个人充值';

  const { loading: submitting, run: runRecharge } = useRequest(
    async (code: string) => onSubmit(code),
    {
      manual: true,
      onSuccess: () => {
        handleCancel();
      },
    }
  );

  const handleOk = () => {
    const code = normalizeVoucherCode(value);
    if (code.length !== 16) {
      return;
    }
    runRecharge(code);
  };

  const canSubmit = value.length === 16 && !submitting;

  useUpdateEffect(() => {
    if (!open) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [open, value.length]);

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <Modal.Backdrop isDismissable={!submitting}>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <InputOTP
                ref={inputRef}
                className={styles.codeInput}
                inputClassName={styles.codeInputHidden}
                value={value}
                onChange={(nextValue) => setValue(normalizeVoucherCode(nextValue))}
                maxLength={16}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                autoComplete="one-time-code"
                inputMode="text"
                isDisabled={submitting}
                pasteTransformer={normalizeVoucherCode}
                pushPasswordManagerStrategy="none"
                textAlign="center"
              >
                {OTP_GROUPS.map((group, groupIndex) => (
                  <React.Fragment key={group.join('-')}>
                    {groupIndex > 0 ? (
                      <InputOTP.Separator className={styles.codeSeparator} />
                    ) : null}
                    <InputOTP.Group className={styles.codeGroup}>
                      {group.map((slotIndex) => (
                        <InputOTP.Slot
                          key={slotIndex}
                          className={styles.codeSlot}
                          index={slotIndex}
                        />
                      ))}
                    </InputOTP.Group>
                  </React.Fragment>
                ))}
              </InputOTP>
              <p className={styles.hint}>请输入 16 位兑换码，将自动转为大写并分段显示。</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={submitting} onPress={handleCancel}>
                取消
              </Button>
              <Button variant="primary" isDisabled={!canSubmit} onPress={() => void handleOk()}>
                {submitting ? '充值中...' : '确认充值'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default RechargeModal;
