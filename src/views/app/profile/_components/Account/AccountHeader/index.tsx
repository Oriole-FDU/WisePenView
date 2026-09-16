import { toast, Tooltip } from '@heroui/react';
import { Camera, Check, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import AppAvatar from '@/components/base/Avatar';
import { AppButton } from '@/components/base/Button';
import { UploadZone } from '@/components/base/Input';
import { useImageService, useUserService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { IDENTITY, USER_STATUS } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { TOOLTIP_FOCUS_PASSTHROUGH_PROPS } from '@/layouts/_common/a11y/tooltipFocusPassthrough';
import { parseErrorMessage } from '@/utils/error';
import { IMAGE_UPLOAD_MAX_SIZE_LABEL } from '@/utils/image/uploadLimit';

import type { AccountHeaderProps } from './index.type';
import styles from './style.module.less';
function AccountHeader({ user, onUserInfoReload }: AccountHeaderProps) {
  const { t } = useTranslation(['profile', 'shell', 'common']);
  const userService = useUserService();
  const imageService = useImageService();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { loading: avatarSubmitting, run: runUpdateAvatar } = useApi(
    async (raw: File, currentUser: NonNullable<AccountHeaderProps['user']>) => {
      const { publicUrl } = await imageService.uploadImage({
        file: raw,
        scene: 'PUBLIC_IMAGE_FOR_USER',
        bizTag: 'user/avatar',
      });
      await userService.updateUserInfo({
        nickname: currentUser.userInfo.nickname ?? undefined,
        realName: currentUser.userInfo.realName ?? undefined,
        avatar: publicUrl,
      });
      await onUserInfoReload();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('header.avatarUpdated'));
        setAvatarFile(null);
        setAvatarModalOpen(false);
      },
    }
  );

  const openAvatarModal = () => {
    setAvatarFile(null);
    setAvatarModalOpen(true);
  };

  const handleAvatarModalClose = () => {
    if (avatarSubmitting) return;
    setAvatarFile(null);
    setAvatarModalOpen(false);
  };

  const handleAvatarModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleAvatarModalClose();
      return;
    }
    setAvatarModalOpen(true);
  };

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) {
      setAvatarFile(null);
      return;
    }
    try {
      assertImageProxyUploadLimit(file);
      setAvatarFile(file);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
      setAvatarFile(null);
    }
  };

  const handleAvatarModalOk = () => {
    if (!avatarFile) {
      toast.warning(t('header.selectAvatar'));
      return;
    }
    if (!user) {
      toast.danger(t('header.userNotLoaded'));
      return;
    }
    runUpdateAvatar(avatarFile, user);
  };

  const nickname =
    user?.userInfo?.nickname ?? user?.userInfo?.username ?? t('header.nicknameUnset');
  const avatarLetter = (user?.userInfo?.nickname ?? user?.userInfo?.username ?? '?')
    .charAt(0)
    .toUpperCase();
  const identityKey =
    user?.userInfo?.identityType != null ? IDENTITY.getKey(user.userInfo.identityType) : undefined;
  const identityLabel = identityKey ? t(`role.${identityKey}`, { ns: 'shell' }) : '';
  const verificationMode = user?.userInfo?.verificationMode ?? null;
  const verifiedText = verificationMode
    ? t(`header.verification.${verificationMode}`)
    : t('header.verification.verified');
  const statusText =
    user?.userInfo?.status === USER_STATUS.UNVERIFIED
      ? t('header.status.unverified')
      : user?.userInfo?.status === USER_STATUS.BANNED
        ? t('header.status.banned')
        : verifiedText;

  const statusToneClass =
    user?.userInfo?.status === USER_STATUS.BANNED
      ? styles.statusBadgeBanned
      : user?.userInfo?.status === USER_STATUS.UNVERIFIED
        ? styles.statusBadgeUnverified
        : styles.statusBadgeVerified;

  return (
    <>
      <header className={styles.accountHeader}>
        <Tooltip>
          <Tooltip.Trigger {...TOOLTIP_FOCUS_PASSTHROUGH_PROPS}>
            <span
              className={styles.avatarWrap}
              role="button"
              tabIndex={0}
              aria-label={t('header.changeAvatar')}
              onClick={openAvatarModal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openAvatarModal();
                }
              }}
            >
              <AppAvatar aria-label={nickname} className={styles.avatar}>
                {user?.userInfo?.avatar && (
                  <AppAvatar.Image alt={nickname} draggable={false} src={user.userInfo.avatar} />
                )}
                <AppAvatar.Fallback className={styles.avatarFallback}>
                  {avatarLetter}
                </AppAvatar.Fallback>
              </AppAvatar>
              <span className={styles.avatarOverlay} aria-hidden="true">
                <Camera size={20} strokeWidth={1.75} />
                <span className={styles.avatarOverlayLabel}>{t('header.changeAvatar')}</span>
              </span>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('header.changeAvatar')}</Tooltip.Content>
        </Tooltip>

        <div className={styles.accountInfo}>
          <h2 className={styles.nickname}>{nickname}</h2>
          {user?.userInfo?.username != null ? (
            <p className={styles.username}>@{user.userInfo.username}</p>
          ) : null}
          {(identityLabel || user?.userInfo?.status != null) && (
            <div className={styles.tagRow}>
              {identityLabel ? <span className={styles.identityTag}>{identityLabel}</span> : null}
              {user?.userInfo?.status != null ? (
                <span className={[styles.statusBadge, statusToneClass].join(' ')}>
                  <span className={styles.statusIcon} aria-hidden="true">
                    {user.userInfo.status === USER_STATUS.BANNED ? (
                      <X size={14} />
                    ) : user.userInfo.status === USER_STATUS.UNVERIFIED ? (
                      <TriangleAlert size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                  {statusText}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <AppModal
        isOpen={avatarModalOpen}
        onOpenChange={handleAvatarModalOpenChange}
        title={t('header.changeAvatarTitle')}
        isDismissable={!avatarSubmitting}
        actions={
          <>
            <AppButton
              variant="secondary"
              isDisabled={avatarSubmitting}
              onPress={handleAvatarModalClose}
            >
              {t('actions.cancel', { ns: 'common' })}
            </AppButton>
            <AppButton
              variant="primary"
              isDisabled={!avatarFile || avatarSubmitting}
              aria-busy={avatarSubmitting || undefined}
              onPress={handleAvatarModalOk}
            >
              {t('header.uploadAndSave')}
            </AppButton>
          </>
        }
      >
        <p className={styles.avatarModalHint}>
          {t('header.avatarHint', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL })}
        </p>
        <UploadZone
          file={avatarFile}
          disabled={avatarSubmitting}
          accept="image/*"
          label={t('header.avatarUpload')}
          description={t('header.avatarHint', { maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL })}
          onFileChange={handleAvatarFileChange}
        />
      </AppModal>
    </>
  );
}

export default AccountHeader;
