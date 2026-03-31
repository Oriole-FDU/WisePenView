import React, { useState } from 'react';
import { useRequest } from 'ahooks';
import { Alert, Button, Modal, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useUserService } from '@/contexts/ServicesContext';
import { usePendingVerifyEmailStore } from '@/store';
import type { ConfirmEmailVerifyRequest } from '@/services/User';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const VerifyEmail: React.FC = () => {
  const userService = useUserService();
  const message = useAppMessage();
  const clearPendingEmail = usePendingVerifyEmailStore((s) => s.clear);

  /** 首帧同步读：先 localStorage（与发起验证同源），再 URL ?email=（后端若在链接中带邮箱） */
  const [displayEmail] = useState<string | null>(() => {
    const fromStorage = usePendingVerifyEmailStore.getState().peekPendingEmail();
    if (fromStorage) return fromStorage;
    const fromUrl = new URLSearchParams(window.location.search).get('email');
    return fromUrl ? decodeURIComponent(fromUrl) : null;
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const { loading, run: runVerify } = useRequest(
    (verifyToken: string) => {
      const params: ConfirmEmailVerifyRequest = { token: verifyToken };
      return userService.confirmEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success('邮箱验证成功');
        clearPendingEmail();
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err, '验证失败'));
      },
    }
  );

  const onVerify = () => {
    if (loading || !token) {
      if (!token) message.error('链接无效或已过期');
      return;
    }
    runVerify(token);
  };

  const goToAccount = () => {
    setSuccessModalOpen(false);
    navigate('/app/profile/account', { replace: true, state: { fromVerify: true } });
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>邮箱验证</Typography.Title>
      <Alert
        className={auth.bindAlert}
        description={
          displayEmail ? (
            <>
              正在为 <Typography.Text strong>{displayEmail}</Typography.Text>{' '}
              完成验证，请点击下方按钮。
            </>
          ) : (
            '请点击下方按钮完成邮箱验证。'
          )
        }
        type="info"
        showIcon
      />
      <div style={{ marginTop: 24 }}>
        <Button
          type="primary"
          size="large"
          className={auth.submitButton}
          loading={loading}
          onClick={onVerify}
          disabled={!token}
        >
          完成验证
        </Button>
      </div>
      <Modal
        title="邮箱验证成功"
        open={successModalOpen}
        onCancel={goToAccount}
        destroyOnHidden
        footer={[
          <Button key="close" type="primary" onClick={goToAccount}>
            去账户设置
          </Button>,
        ]}
      >
        <Typography.Text>验证成功，您可前往账户设置查看。</Typography.Text>
      </Modal>
    </div>
  );
};

export default VerifyEmail;
