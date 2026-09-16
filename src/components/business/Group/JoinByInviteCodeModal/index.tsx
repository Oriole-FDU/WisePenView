import { toast } from '@heroui/react';
import { Fragment, useId, useState } from 'react';

import { InputOTP, REGEXP_ONLY_DIGITS_AND_CHARS } from '@/components/base/Input';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useApi } from '@/hooks/useApi';

import type { JoinByInviteCodeModalProps } from './index.type';
import styles from './style.module.less';

const INVITE_CODE_LENGTH = 8;
const OTP_GROUPS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
];

const normalizeInviteCode = (raw = ''): string =>
  raw
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
    .toUpperCase();

function JoinByInviteCodeModal({
  isOpen,
  onOpenChange,
  title,
  inviteCodeLabel,
  hint,
  invalidCodeMessage,
  successMessage,
  initialInviteCode,
  onJoin,
  onSuccess,
}: JoinByInviteCodeModalProps) {
  const [inviteCode, setInviteCode] = useState(() => normalizeInviteCode(initialInviteCode));
  const [inviteCodeError, setInviteCodeError] = useState('');
  const inputId = useId();
  const labelId = `${inputId}-label`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const isSubmitDisabled = normalizeInviteCode(inviteCode).length !== INVITE_CODE_LENGTH;

  const resetForm = () => {
    setInviteCode(normalizeInviteCode(initialInviteCode));
    setInviteCodeError('');
  };

  const request = useApi((code: string) => onJoin(code), {
    manual: true,
    onSuccess: () => {
      toast.success(successMessage);
      resetForm();
      onSuccess?.();
      onOpenChange(false);
    },
  });

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const normalizedInviteCode = normalizeInviteCode(inviteCode);
    if (normalizedInviteCode.length !== INVITE_CODE_LENGTH) {
      setInviteCodeError(invalidCodeMessage);
      return;
    }
    request.run(normalizedInviteCode);
  };

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
      title={title}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      isSubmitting={request.loading}
      isSubmitDisabled={isSubmitDisabled || request.loading}
      isDismissable={!request.loading}
    >
      <div className={styles.field}>
        <label className={styles.fieldLabel} id={labelId} htmlFor={inputId}>
          {inviteCodeLabel}
        </label>
        <InputOTP
          id={inputId}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          aria-errormessage={inviteCodeError ? errorId : undefined}
          value={inviteCode}
          onChange={(value) => {
            setInviteCode(normalizeInviteCode(value));
            setInviteCodeError('');
          }}
          className={styles.codeInput}
          inputClassName={styles.codeInputHidden}
          maxLength={INVITE_CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          autoComplete="one-time-code"
          inputMode="text"
          isInvalid={Boolean(inviteCodeError)}
          validationErrors={inviteCodeError ? [inviteCodeError] : undefined}
          pasteTransformer={normalizeInviteCode}
          pushPasswordManagerStrategy="none"
          textAlign="center"
        >
          {OTP_GROUPS.map((group, groupIndex) => (
            <Fragment key={group.join('-')}>
              {groupIndex > 0 ? <InputOTP.Separator className={styles.codeSeparator} /> : null}
              <InputOTP.Group className={styles.codeGroup}>
                {group.map((slotIndex) => (
                  <InputOTP.Slot key={slotIndex} className={styles.codeSlot} index={slotIndex} />
                ))}
              </InputOTP.Group>
            </Fragment>
          ))}
        </InputOTP>
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
        {inviteCodeError ? (
          <p id={errorId} className={styles.fieldError}>
            {inviteCodeError}
          </p>
        ) : null}
      </div>
    </AppFormDialog>
  );
}

export default JoinByInviteCodeModal;
