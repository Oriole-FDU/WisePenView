import React, { useState } from 'react';
import styles from './Auth.module.less';
import { Checkbox, Form, Typography, Input, Button, Flex, message as antMessage, Modal } from 'antd';
import { RiUserLine, RiLockLine, RiMailLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import request from '@/utils/request';
import ServiceAgreement from './ServiceAgreement';
import { useNavigate } from 'react-router-dom';
import { useLoading } from '@/hooks/useLoading';
interface RegisterFormValues {
  username:string;
  password:string;
}

const Register: React.FC = () => {
  const [contractOpen, setContractOpen] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<RegisterFormValues>();
  const [messageApi, contextHolder] = antMessage.useMessage();
  const navigate = useNavigate();
  const { loading, run } = useLoading();

  const onFinish = async (values: RegisterFormValues) => {
    // 未接受用户协议时，提示错误，中断提交
    if (!agreement) {
      messageApi.error('请接受用户协议');
      return;
    }

    // 密码长度必须大于8，且包含字母和数字
    const password = values.password;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length <= 8) {
      messageApi.error('密码必须大于8位');
      return;
    }

    if (!(hasLetter && hasNumber)) {
      messageApi.error('密码必须包含字母和数字');
      return;
    }

    //通过验证后，发送注册请求
    try {
      await run(
        () => request.post('/auth/register', values),
        { showMessage: true, messageText: '正在注册...', messageKey: 'registerLoading' }
      );
      setContractOpen(false);
      setSuccessModalOpen(true);
    } catch (err: any) {
      messageApi.error(err.response?.data?.msg || '注册失败');
    }
  };

  return (
    <Flex vertical className={styles.authContainer}>
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
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password placeholder='输入密码' size='large' prefix={<RiLockLine />} />
        </Form.Item>

        <Form.Item style={{ marginTop: 'var(--ant-margin-sm)' }}>
          <Flex>
            <Checkbox checked={agreement} onChange={(e) => setAgreement(e.target.checked)}>
              我已阅读并接受
            </Checkbox>
            <Link to="#"
              onClick={() => setContractOpen(true)}
            >
              用户协议
            </Link>
          </Flex>
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
          <Flex style={{ justifyContent: 'center' }}>
            <Typography.Text>
              已有账号？
              <Link to="/login">
                登录
              </Link>
            </Typography.Text>
          </Flex>
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
              form.resetFields(); // 清空表单
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
    </Flex>
  );
};

export default Register;

