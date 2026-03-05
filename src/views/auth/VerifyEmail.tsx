import React, { useState } from 'react';
import { Alert, Form, Typography, Button, Modal, message as antMessage } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserServices } from '@/services/User';
import type { ConfirmEmailVerifyRequest } from '@/services/User';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './Auth.module.less';

const VerifyEmail: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = antMessage.useMessage();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const username = searchParams.get('username') ?? 'no username';
  const campusNo = searchParams.get('campusNo') ?? 'no campusNo';

  const onVerify = async () => {
    if (loading) return;

    const token = searchParams.get('token');
    if (!token) {
      messageApi.error('链接无效或已过期');
      return;
    }

    setLoading(true);
    try {
      const params: ConfirmEmailVerifyRequest = { token };
      await UserServices.confirmEmailVerify(params);
      messageApi.success('邮箱绑定成功');
      setSuccessModalOpen(true);
    } catch (err) {
      messageApi.error(parseErrorMessage(err, '验证失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      {contextHolder}
      <Typography.Title>绑定邮箱</Typography.Title>
      <Alert
        className={styles.bindAlert}
        description={
          <>
            将为以下用户绑定邮箱：
            <br />
            <Typography.Text type="secondary">
              学工号：{campusNo} 用户名：{username}
            </Typography.Text>
          </>
        }
        type="info"
        showIcon
      />
      <Form layout="vertical" form={form} requiredMark={false}>
        <Form.Item>
          <Button
            type="primary"
            size="large"
            className={styles.submitButton}
            loading={loading}
            onClick={onVerify}
          >
            绑定
          </Button>
        </Form.Item>
      </Form>
      <Modal
        title="邮箱验证成功"
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        footer={[
          <Button key="stay" onClick={() => setSuccessModalOpen(false)}>
            留在当前页面
          </Button>,
          <Button
            key="login"
            type="primary"
            onClick={() => {
              setSuccessModalOpen(false);
              navigate('/app/profile/account', {
                replace: true,
                state: { fromVerify: true },
              });
            }}
          >
            去账户设置
          </Button>,
        ]}
      >
        <Typography.Text>恭喜您，邮箱验证成功！请前往登录页面登录。</Typography.Text>
      </Modal>
    </div>
  );
};

export default VerifyEmail;
