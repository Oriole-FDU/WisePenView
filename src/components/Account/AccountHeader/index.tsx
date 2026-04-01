import React, { useMemo, useState } from 'react';
import { Avatar, Button, Modal, Tooltip, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useRequest } from 'ahooks';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine } from 'react-icons/ri';
import { useImageService, useUserService } from '@/contexts/ServicesContext';
import { getIdentityTypeLabel, getVerificationModeLabel, USER_STATUS } from '@/constants/user';
import { createBeforeUploadImageWithinLimit } from '@/utils/image';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { AccountHeaderProps } from './index.type';
import styles from './style.module.less';

const AccountHeader: React.FC<AccountHeaderProps> = ({ user, onUserInfoUpdated }) => {
  const userService = useUserService();
  const imageService = useImageService();
  const message = useAppMessage();
  const beforeUploadAvatar = useMemo(
    () => createBeforeUploadImageWithinLimit((text) => message.error(text)),
    [message]
  );
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);

  const { loading: avatarSubmitting, runAsync: runUpdateAvatar } = useRequest(
    async (raw: File, currentUser: NonNullable<AccountHeaderProps['user']>) => {
      const { publicUrl } = await imageService.uploadImage({
        file: raw,
        isPublic: true,
        bizPath: 'user/avatar',
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
        message.success('头像已更新');
        setAvatarFileList([]);
        setAvatarModalOpen(false);
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err, '头像更新失败'));
      },
    }
  );

  const openAvatarModal = () => {
    setAvatarFileList([]);
    setAvatarModalOpen(true);
  };

  const handleAvatarModalCancel = () => {
    setAvatarFileList([]);
    setAvatarModalOpen(false);
  };

  const handleAvatarModalOk = async () => {
    const raw = avatarFileList[0]?.originFileObj;
    if (!(raw instanceof File)) {
      message.warning('请选择头像图片');
      return Promise.reject(new Error('no_avatar_file'));
    }
    if (!user) {
      message.error('用户信息未加载，请稍后重试');
      return Promise.reject(new Error('no_user'));
    }
    return runUpdateAvatar(raw, user);
  };

  const nickname = user?.userInfo?.nickname ?? user?.userInfo?.username ?? '未设置昵称';
  const avatarLetter = (user?.userInfo?.nickname ?? user?.userInfo?.username ?? '?')
    .charAt(0)
    .toUpperCase();
  const identityLabel =
    user?.userInfo?.identityType != null ? getIdentityTypeLabel(user.userInfo.identityType) : '';
  const verifiedText = getVerificationModeLabel(user?.userInfo?.verificationMode ?? null);

  return (
    <>
      <div className={styles.accountHeader}>
        <div className={styles.accountHeaderLeft}>
          <Tooltip title="修改头像">
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
              <Avatar
                size={96}
                draggable={false}
                className={styles.avatar}
                src={user?.userInfo?.avatar ?? undefined}
              >
                {avatarLetter}
              </Avatar>
            </span>
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

      <Modal
        title="更换头像"
        open={avatarModalOpen}
        onCancel={handleAvatarModalCancel}
        destroyOnHidden
        confirmLoading={avatarSubmitting}
        okText="上传并保存"
        cancelText="取消"
        onOk={handleAvatarModalOk}
        width={440}
      >
        <p className={styles.avatarModalHint}>支持 JPG、PNG、GIF、WebP，单张不超过 5MB。</p>
        <Upload
          name="avatar"
          accept="image/*"
          maxCount={1}
          fileList={avatarFileList}
          beforeUpload={beforeUploadAvatar}
          onChange={({ fileList }) => setAvatarFileList(fileList)}
        >
          <Button type="default">选择图片</Button>
        </Upload>
      </Modal>
    </>
  );
};

export default AccountHeader;
