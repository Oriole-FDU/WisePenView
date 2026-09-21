import { toast } from '@heroui/react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppAvatar from '@/components/base/Avatar';
import { AppButton } from '@/components/base/Button';
import AppDisplayDialog from '@/components/business/AppDisplayDialog';
import { useUserService } from '@/domains';
import type { UserInviteRecord } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { buildAbsoluteAppUrl, copyText } from '@/utils/browser';
import { cn } from '@/utils/cn';
import { formatTimestampToDate } from '@/utils/format';
import { buildRegisterInvitePath } from '@/utils/navigation/appRoute';

import type { UserInviteModalProps } from './index.type';
import styles from './style.module.less';

/** 弹窗内预览的邀请记录条数，完整记录由后续邀请页承载 */
const INVITE_RECORD_PREVIEW_SIZE = 5;

function UserInviteModal({ isOpen, onOpenChange, inviteCode }: UserInviteModalProps) {
  const { t } = useTranslation(['shell', 'common']);
  const userService = useUserService();
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'link' | null>(null);
  const hasInviteCode = Boolean(inviteCode);
  const inviteUrl = hasInviteCode ? buildAbsoluteAppUrl(buildRegisterInvitePath(inviteCode)) : '';

  /** 每次打开弹窗拉取一次邀请记录，关闭时不再请求 */
  const {
    data: inviteRecordList,
    loading,
    error,
  } = useApi(() => userService.listInviteRecords({ page: 1, size: INVITE_RECORD_PREVIEW_SIZE }), {
    ready: isOpen,
    refreshDeps: [isOpen],
  });
  const inviteRecords = inviteRecordList?.records ?? [];

  const resolveInviteeName = (record: UserInviteRecord): string =>
    record.invitee?.nickname || record.invitee?.realName || t('userMenu.inviteRecordUnnamed');

  const handleClose = () => {
    setCopiedTarget(null);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    handleClose();
  };

  const handleCopyCode = async () => {
    const copied = await copyText(inviteCode ?? '');
    if (!copied) {
      toast.danger(t('userMenu.inviteCopyFailed'));
      return;
    }

    setCopiedTarget('code');
    toast.success(t('userMenu.inviteCodeCopied'));
  };

  const handleCopyLink = async () => {
    const copied = await copyText(inviteUrl);
    if (!copied) {
      toast.danger(t('userMenu.inviteCopyFailed'));
      return;
    }

    setCopiedTarget('link');
    toast.success(t('userMenu.inviteLinkCopied'));
  };

  const renderInviteRecords = () => {
    if (loading) {
      return <div className={styles.recordState}>{t('userMenu.inviteRecordLoading')}</div>;
    }

    if (error) {
      return <div className={styles.recordState}>{t('userMenu.inviteRecordLoadFailed')}</div>;
    }

    if (inviteRecords.length === 0) {
      return <div className={styles.recordState}>{t('userMenu.inviteRecordEmpty')}</div>;
    }

    const hasMoreRecords = (inviteRecordList?.total ?? 0) > inviteRecords.length;

    return (
      <>
        <ul className={styles.recordList}>
          {inviteRecords.map((record) => {
            const inviteeName = resolveInviteeName(record);
            return (
              <li key={record.id || record.inviteeUserId} className={styles.recordItem}>
                <AppAvatar size="sm" className={styles.recordAvatar}>
                  {record.invitee?.avatar ? (
                    <AppAvatar.Image src={record.invitee.avatar} alt={inviteeName} />
                  ) : null}
                  <AppAvatar.Fallback>{inviteeName.charAt(0).toUpperCase()}</AppAvatar.Fallback>
                </AppAvatar>
                <span className={styles.recordName}>{inviteeName}</span>
                <span
                  className={cn(
                    styles.recordStatus,
                    record.status === 'REWARDED' && styles.recordStatusRewarded
                  )}
                >
                  {t(`userMenu.inviteRecordStatus.${record.status}`)}
                </span>
                <span className={styles.recordTime}>
                  {formatTimestampToDate(record.createTime)}
                </span>
              </li>
            );
          })}
        </ul>
        {hasMoreRecords ? (
          <div className={styles.recordState}>
            {t('userMenu.inviteRecordMore', { count: inviteRecords.length })}
          </div>
        ) : null}
      </>
    );
  };

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('userMenu.invite')}
      size="md"
      footerClassName={styles.inviteFooter}
      actions={
        <div className={styles.inviteActions}>
          <AppButton variant="primary" isDisabled={!hasInviteCode} onPress={handleCopyLink}>
            <LinkIcon size={16} aria-hidden="true" />
            {copiedTarget === 'link'
              ? t('userMenu.inviteCopiedAction')
              : t('userMenu.inviteCopyLink')}
          </AppButton>
          <AppButton variant="secondary" isDisabled={!hasInviteCode} onPress={handleCopyCode}>
            <Copy size={16} aria-hidden="true" />
            {copiedTarget === 'code'
              ? t('userMenu.inviteCopiedAction')
              : t('userMenu.inviteCopyCode')}
          </AppButton>
          <AppButton variant="secondary" onPress={handleClose}>
            {t('actions.close', { ns: 'common' })}
          </AppButton>
        </div>
      }
    >
      <div className={styles.inviteContainer}>
        <div className={styles.inviteCodeBlock}>
          <span className={styles.inviteCodeLabel}>{t('userMenu.inviteCodeLabel')}</span>
          <div className={styles.inviteCode}>{inviteCode || t('userMenu.inviteNoCode')}</div>
        </div>
        <div className={styles.inviteHint}>{t('userMenu.inviteHint')}</div>
        {inviteUrl ? <div className={styles.inviteLink}>{inviteUrl}</div> : null}

        <section className={styles.recordSection} aria-label={t('userMenu.inviteRecordTitle')}>
          <div className={styles.recordHeader}>
            <span className={styles.recordTitle}>{t('userMenu.inviteRecordTitle')}</span>
            {inviteRecordList ? (
              <span className={styles.recordCount}>
                {t('userMenu.inviteRecordCount', { count: inviteRecordList.total })}
              </span>
            ) : null}
          </div>
          {renderInviteRecords()}
        </section>
      </div>
    </AppDisplayDialog>
  );
}

export default UserInviteModal;
