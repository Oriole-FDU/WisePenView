import React, { useState } from 'react';
import { Form, Typography, Input, Button } from 'antd';
import { RiUserLine, RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { LoginRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';
import { useRequest } from 'ahooks';

const Login: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const [contractOpen, setContractOpen] = useState(false);
  const [form] = Form.useForm<LoginRequest>();
  const navigate = useNavigate();

  const { loading, run: submitLogin } = useRequest(
    (values: LoginRequest) => authService.login(values),
    {
      manual: true,
      onSuccess: () => {
        navigate('/app/drive');
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err, '登录失败'));
      },
    }
  );

  const onFinish = (values: LoginRequest) => {
    submitLogin(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>登录</Typography.Title>

      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="学工号/用户名"
          name="account"
          rules={[{ required: true, message: '请输入学工号或用户名' }]}
        >
          <Input placeholder="输入学工号/用户名" size="large" prefix={<RiUserLine />} />
        </Form.Item>

        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="输入密码" size="large" prefix={<RiLockLine />} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={auth.submitButton}
            loading={loading}
          >
            登录
          </Button>
          <div className={auth.rightLinks}>
            <Link to="/register">注册</Link>
            <Link to="/reset-pwd">忘记密码</Link>
          </div>
        </Form.Item>
      </Form>

      <div className={auth.leftBottomLinks}>
        <Typography.Text>登录系统即视为接受</Typography.Text>
        <Link to="#" onClick={() => setContractOpen(true)}>
          用户协议
        </Link>
      </div>

      <ServiceAgreement open={contractOpen} onCancel={() => setContractOpen(false)} />
    </div>
  );
};

export default Login;
