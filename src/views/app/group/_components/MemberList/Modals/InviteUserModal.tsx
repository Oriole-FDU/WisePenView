import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { copyText } from '@/utils/browser/copyText';
import { toast } from '@heroui/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InviteUserModalProps } from './index.type';
import styles from './style.module.less';

function InviteUserModal({ isOpen, onOpenChange, inviteCode }: InviteUserModalProps) {
  const { t } = useTranslation(['group', 'common']);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setCopied(false);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  const handleCopy = async () => {
    const copied = await copyText(inviteCode ?? '');
    if (copied) {
      setCopied(true);
      toast.success(t('member.invite.copied'));
      return;
    }

    toast.danger(t('member.invite.copyFailed'));
  };

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('member.invite.title')}
      secondaryAction={{
        label: t('actions.close', { ns: 'common' }),
        onPress: handleClose,
      }}
      primaryAction={{
        label: copied ? t('member.invite.copiedAction') : t('actions.copy', { ns: 'common' }),
        icon: <Copy size={16} aria-hidden="true" />,
        onPress: handleCopy,
        isDisabled: !inviteCode,
      }}
    >
      <div className={styles.inviteContainer}>
        <div className={styles.inviteCodeWrap}>
          <div className={styles.inviteCode}>{inviteCode ?? t('member.invite.noCode')}</div>
        </div>
        <div className={styles.inviteHint}>{t('member.invite.hint')}</div>
      </div>
    </AppDisplayDialog>
  );
}

export default InviteUserModal;
