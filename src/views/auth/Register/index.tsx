import React, { useState } from 'react';
import { useRequest } from 'ahooks';
import { Checkbox, Form, Typography, Input, Button, Modal } from 'antd';
import { RiUserLine, RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/contexts/ServicesContext';
import { USERNAME_MAX_LENGTH, USERNAME_PATTERN, USERNAME_PATTERN_MESSAGE } from '@/constants/user';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { RegisterRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';

const Register: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const [agreement, setAgreement] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [form] = Form.useForm<RegisterRequest>();
  const navigate = useNavigate();

  const { loading, run: submitRegister } = useRequest(
    (values: RegisterRequest) => authService.register(values),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err, '注册失败'));
      },
    }
  );

  const onFinish = (values: RegisterRequest) => {
    if (!agreement) {
      message.error('请接受用户协议');
      return;
    }
    submitRegister(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>注册</Typography.Title>
      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { pattern: USERNAME_PATTERN, message: USERNAME_PATTERN_MESSAGE },
          ]}
        >
          <Input
            placeholder="4-20位字母、数字或下划线"
            size="large"
            prefix={<RiUserLine />}
            maxLength={USERNAME_MAX_LENGTH}
          />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 9, message: '密码至少长度为9位' },
            { pattern: /[a-zA-Z]/, message: '密码必须包含字母' },
            { pattern: /[0-9]/, message: '密码必须包含数字' },
          ]}
        >
          <Input.Password placeholder="输入密码" size="large" prefix={<RiLockLine />} />
        </Form.Item>

        <Form.Item>
          <Checkbox checked={agreement} onChange={(e) => setAgreement(e.target.checked)}>
            我已阅读并接受
          </Checkbox>
          <Link to="#" onClick={() => setContractOpen(true)}>
            用户协议
          </Link>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={auth.submitButton}
            loading={loading}
          >
            注册
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              已有账号？
              <Link to="/login">登录</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
      <ServiceAgreement open={contractOpen} onCancel={() => setContractOpen(false)} />
      <Modal
        title="注册成功"
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        destroyOnHidden
        footer={[
          <Button
            key="stay"
            onClick={() => {
              setSuccessModalOpen(false);
              form.resetFields();
              setAgreement(false);
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
        <Typography.Text>恭喜您，注册成功！请前往登录页面登录。</Typography.Text>
      </Modal>
    </div>
  );
};

export default Register;
