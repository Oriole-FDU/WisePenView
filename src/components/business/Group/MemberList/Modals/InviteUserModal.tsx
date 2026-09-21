import { toast } from '@heroui/react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppDisplayDialog from '@/components/business/AppDisplayDialog';
import { buildAbsoluteAppUrl, copyText } from '@/utils/browser';
import { buildInvitePath } from '@/utils/navigation/appRoute';

import type { InviteUserModalProps } from './index.type';
import styles from './style.module.less';

const buildInviteUrl = (inviteCode?: string): string =>
  inviteCode ? buildAbsoluteAppUrl(buildInvitePath(inviteCode)) : '';

function InviteUserModal({ isOpen, onOpenChange, inviteCode }: InviteUserModalProps) {
  const { t } = useTranslation(['group', 'common']);
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'link' | null>(null);
  const inviteUrl = buildInviteUrl(inviteCode);

  const handleClose = () => {
    setCopiedTarget(null);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleCopyCode = async () => {
    const copied = await copyText(inviteCode ?? '');
    if (copied) {
      setCopiedTarget('code');
      toast.success(t('member.invite.copied'));
      return;
    }

    toast.danger(t('member.invite.copyFailed'));
  };

  const handleCopyLink = async () => {
    const copied = await copyText(inviteUrl);
    if (copied) {
      setCopiedTarget('link');
      toast.success(t('member.invite.linkCopied'));
      return;
    }

    toast.danger(t('member.invite.copyFailed'));
  };

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('member.invite.title')}
      footerClassName={styles.inviteFooter}
      actions={
        <div className={styles.inviteActions}>
          <AppButton variant="primary" isDisabled={!inviteCode} onPress={handleCopyLink}>
            <LinkIcon size={16} aria-hidden="true" />
            {copiedTarget === 'link'
              ? t('member.invite.copiedAction')
              : t('member.invite.copyLink')}
          </AppButton>
          <AppButton variant="secondary" isDisabled={!inviteCode} onPress={handleCopyCode}>
            <Copy size={16} aria-hidden="true" />
            {copiedTarget === 'code'
              ? t('member.invite.copiedAction')
              : t('member.invite.copyCode')}
          </AppButton>
          <AppButton variant="secondary" onPress={handleClose}>
            {t('actions.close', { ns: 'common' })}
          </AppButton>
        </div>
      }
    >
      <div className={styles.inviteContainer}>
        <div className={styles.inviteCodeWrap}>
          <div className={styles.inviteCode}>{inviteCode ?? t('member.invite.noCode')}</div>
        </div>
        <div className={styles.inviteHint}>{t('member.invite.hint')}</div>
        {inviteUrl ? <div className={styles.inviteLink}>{inviteUrl}</div> : null}
      </div>
    </AppDisplayDialog>
  );
}

export default InviteUserModal;
