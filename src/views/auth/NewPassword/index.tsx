import React, { useState } from 'react';
import { useMount, useRequest } from 'ahooks';
import { Form, Typography, Input, Button, Modal } from 'antd';
import { RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { NewPasswordRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';

type NewPasswordFormValues = Pick<NewPasswordRequest, 'newPassword'>;

const NewPassword: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const [token, setToken] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<NewPasswordFormValues>();
  const navigate = useNavigate();

  useMount(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(queryToken);
  });

  const { loading, run: submitNewPassword } = useRequest(
    async (values: NewPasswordFormValues) =>
      authService.newPassword({ newPassword: values.newPassword, token }),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '设置失败'));
      },
    }
  );

  const onFinish = (values: NewPasswordFormValues) => {
    if (!token) {
      message.error('token不存在');
      return;
    }
    submitNewPassword(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>设置新密码</Typography.Title>
      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 9, message: '密码至少长度为9位' },
            { pattern: /[a-zA-Z]/, message: '密码必须包含字母' },
            { pattern: /[0-9]/, message: '密码必须包含数字' },
          ]}
        >
          <Input.Password placeholder="输入新密码" size="large" prefix={<RiLockLine />} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={auth.submitButton}
            loading={loading}
          >
            确认
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              <Link to="/login">返回登录</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
      <Modal
        title="密码设置成功"
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        destroyOnHidden
        footer={[
          <Button
            key="stay"
            onClick={() => {
              setSuccessModalOpen(false);
              form.resetFields(); // 清空表单
            }}
          >
            留在当前页面
          </Button>,
          <Button
            key="login"
            type="primary"
            onClick={() => {
              setSuccessModalOpen(false);
              navigate('/login');
            }}
          >
            去登录
          </Button>,
        ]}
      >
        <Typography.Text>恭喜您，密码设置成功！请前往登录页面登录。</Typography.Text>
      </Modal>
    </div>
  );
};

export default NewPassword;
