import UploadZone from '@/components/Common/UploadZone';
import { useImageService, useUserService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { getVerificationModeLabel, IDENTITY, USER_STATUS } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { IMAGE_UPLOAD_MAX_SIZE_LABEL } from '@/utils/image/uploadLimit';
import { Avatar, Button, Modal, toast, Tooltip } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine } from 'react-icons/ri';
import type { AccountHeaderProps } from './index.type';
import styles from './style.module.less';

function AccountHeader({ user, onUserInfoUpdated }: AccountHeaderProps) {
  const userService = useUserService();
  const imageService = useImageService();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { loading: avatarSubmitting, run: runUpdateAvatar } = useRequest(
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
      return userService.getFullUserInfo();
    },
    {
      manual: true,
      onSuccess: (data) => {
        onUserInfoUpdated(data);
        toast.success('头像已更新');
        setAvatarFile(null);
        setAvatarModalOpen(false);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
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
      toast.warning('请选择头像图片');
      return;
    }
    if (!user) {
      toast.danger('用户信息未加载，请稍后重试');
      return;
    }
    runUpdateAvatar(avatarFile, user);
  };

  const nickname = user?.userInfo?.nickname ?? user?.userInfo?.username ?? '未设置昵称';
  const avatarLetter = (user?.userInfo?.nickname ?? user?.userInfo?.username ?? '?')
    .charAt(0)
    .toUpperCase();
  const identityLabel =
    user?.userInfo?.identityType != null ? IDENTITY.getLabel(user.userInfo.identityType) : '';
  const verifiedText = getVerificationModeLabel(user?.userInfo?.verificationMode ?? null);

  return (
    <>
      <div className={styles.accountHeader}>
        <div className={styles.accountHeaderLeft}>
          <Tooltip>
            <Tooltip.Trigger>
              <span
                className={styles.avatarWrap}
                role="button"
                tabIndex={0}
                onClick={openAvatarModal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openAvatarModal();
                  }
                }}
              >
                <Avatar aria-label={nickname} className={styles.avatar}>
                  {user?.userInfo?.avatar && (
                    <Avatar.Image alt={nickname} draggable={false} src={user.userInfo.avatar} />
                  )}
                  <Avatar.Fallback className={styles.avatarFallback}>
                    {avatarLetter}
                  </Avatar.Fallback>
                </Avatar>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>修改头像</Tooltip.Content>
          </Tooltip>
          <div className={styles.accountInfo}>
            <div className={styles.nameRow}>
              <span className={styles.nickname}>{nickname}</span>
              {user?.userInfo?.username != null && (
                <span className={styles.username}>{user.userInfo.username}</span>
              )}
            </div>
            {identityLabel && <span className={styles.identityTag}>{identityLabel}</span>}
          </div>
        </div>
        {user?.userInfo?.status != null && (
          <span className={styles.statusGroup}>
            <span className={styles.statusText}>
              {user.userInfo.status === USER_STATUS.UNVERIFIED
                ? '未认证'
                : user.userInfo.status === USER_STATUS.BANNED
                  ? '封禁'
                  : verifiedText}
            </span>
            <span
              className={styles.statusIcon}
              title={
                user.userInfo.status === USER_STATUS.UNVERIFIED
                  ? '未认证'
                  : user.userInfo.status === USER_STATUS.BANNED
                    ? '封禁'
                    : verifiedText
              }
            >
              {user.userInfo.status === USER_STATUS.BANNED ? (
                <RiCloseLine size={24} className={styles.statusIconBanned} />
              ) : user.userInfo.status === USER_STATUS.UNVERIFIED ? (
                <RiErrorWarningLine size={24} className={styles.statusIconUnverified} />
              ) : (
                <RiCheckLine size={24} className={styles.statusIconVerified} />
              )}
            </span>
          </span>
        )}
      </div>

      <Modal isOpen={avatarModalOpen} onOpenChange={handleAvatarModalOpenChange}>
        <Modal.Backdrop isDismissable={!avatarSubmitting}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>更换头像</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className={styles.avatarModalHint}>
                  支持 JPG、PNG、GIF、WebP，单张不超过 {IMAGE_UPLOAD_MAX_SIZE_LABEL}。
                </p>
                <UploadZone
                  file={avatarFile}
                  disabled={avatarSubmitting}
                  accept="image/*"
                  label="点击或拖拽头像图片到此区域"
                  description={`支持 JPG、PNG、GIF、WebP，单张不超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`}
                  onFileChange={handleAvatarFileChange}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  isDisabled={avatarSubmitting}
                  onPress={handleAvatarModalClose}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  isDisabled={!avatarFile || avatarSubmitting}
                  onPress={handleAvatarModalOk}
                >
                  上传并保存
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export default AccountHeader;
