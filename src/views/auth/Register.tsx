import React, { useState } from 'react';
import { Checkbox, Form, Typography, Input, Button, Modal, message as antMessage } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { RiUserLine, RiLockLine } from 'react-icons/ri';
import Axios from '@/utils/Axios';
import styles from './Auth.module.less';
import ServiceAgreement from './ServiceAgreement';
import type { RegisterFormValues } from './index.type';

const Register: React.FC = () => {
  const [contractOpen, setContractOpen] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<RegisterFormValues>();
  const [messageApi, contextHolder] = antMessage.useMessage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterFormValues) => {

    if (!agreement) {
      messageApi.error('请接受用户协议');
      return;
    }

    try {
      setLoading(true);
      await Axios.post('/auth/register', values);
      setLoading(false);
      setContractOpen(false);
      setSuccessModalOpen(true);
    } catch (err: any) {
      messageApi.error(err.response?.data?.msg || '注册失败');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      {contextHolder}
      <Typography.Title>
        注册
      </Typography.Title>
      <Form layout="vertical"
        form={form}
        onFinish={onFinish}
        requiredMark={false}>

        <Form.Item
          label="用户名"
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder='输入用户名' size='large' prefix={<RiUserLine />} />
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
          <Input.Password placeholder='输入密码' size='large' prefix={<RiLockLine />} />
        </Form.Item>

        <Form.Item>
            <Checkbox checked={agreement} onChange={(e) => setAgreement(e.target.checked)}>
              我已阅读并接受
            </Checkbox>
            <Link to="#"
              onClick={() => setContractOpen(true)}
            >
              用户协议
            </Link>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            size='large' 
            htmlType='submit' 
            className={styles.submitButton}
            loading={loading}
          >
            注册
          </Button>
          <div className={styles.centerLinks}>
            <Typography.Text>
              已有账号？
              <Link to="/login">
                登录
              </Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
        <ServiceAgreement
          open={contractOpen}
          onCancel={() => setContractOpen(false)}
        />
        <Modal
          title="注册成功"
          open={successModalOpen}
          onCancel={() => setSuccessModalOpen(false)}
          footer={[
            <Button key="stay" onClick={() => {
              setSuccessModalOpen(false);
              form.resetFields(); 
              setAgreement(false);
            }}>
              留在当前页面
            </Button>,
            <Button key="login" type="primary" onClick={() => {
              setSuccessModalOpen(false);

              navigate('/login');
            }}>
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

