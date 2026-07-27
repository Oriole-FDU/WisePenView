import { InputOTP, REGEXP_ONLY_DIGITS_AND_CHARS } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { useGroupService } from '@/domains';
import type { JoinGroupRequest } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JoinGroupModalProps } from './index.type';

import styles from './index.module.less';

const INVITE_CODE_LENGTH = 8;
const OTP_GROUPS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
];

/** 将邀请码规范为 8 位大写字母数字 */
const normalizeInviteCode = (raw = ''): string =>
  raw
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
    .toUpperCase();

function JoinGroupModal({ isOpen, onOpenChange, onSuccess }: JoinGroupModalProps) {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeError, setInviteCodeError] = useState('');
  const isSubmitDisabled = normalizeInviteCode(inviteCode).length !== INVITE_CODE_LENGTH;
  const resetForm = () => {
    setInviteCode('');
    setInviteCodeError('');
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const { loading, run: runJoinGroup } = useRequest(
    async (params: JoinGroupRequest) => groupService.joinGroup(params),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('join.success'));
        resetForm();
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    const normalizedInviteCode = normalizeInviteCode(inviteCode);
    if (normalizedInviteCode.length !== INVITE_CODE_LENGTH) {
      setInviteCodeError(t('join.invalidCode'));
      return;
    }
    runJoinGroup({
      inviteCode: normalizedInviteCode,
    });
  };

  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
      title={t('join.title')}
      onCancel={handleCancel}
      onSubmit={handleConfirm}
      isSubmitting={loading}
      isSubmitDisabled={isSubmitDisabled || loading}
      isDismissable={!loading}
    >
      <div className={styles.field}>
        <label
          className={styles.fieldLabel}
          id="join-group-invite-code-label"
          htmlFor="join-group-invite-code"
        >
          {t('join.inviteCode')}
        </label>
        <InputOTP
          id="join-group-invite-code"
          aria-labelledby="join-group-invite-code-label"
          aria-describedby="join-group-invite-code-hint"
          aria-errormessage={inviteCodeError ? 'join-group-invite-code-error' : undefined}
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
            <React.Fragment key={group.join('-')}>
              {groupIndex > 0 ? <InputOTP.Separator className={styles.codeSeparator} /> : null}
              <InputOTP.Group className={styles.codeGroup}>
                {group.map((slotIndex) => (
                  <InputOTP.Slot key={slotIndex} className={styles.codeSlot} index={slotIndex} />
                ))}
              </InputOTP.Group>
            </React.Fragment>
          ))}
        </InputOTP>
        <p id="join-group-invite-code-hint" className={styles.hint}>
          {t('join.hint')}
        </p>
        {inviteCodeError ? (
          <p id="join-group-invite-code-error" className={styles.fieldError}>
            {inviteCodeError}
          </p>
        ) : null}
      </div>
    </AppFormDialog>
  );
}

export default JoinGroupModal;
