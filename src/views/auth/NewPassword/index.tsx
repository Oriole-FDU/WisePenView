import React, { useState } from 'react';
import { Form, Typography, Input, Button, Modal } from 'antd';
import { RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { NewPasswordRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';

const NewPassword: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const [loading, setLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<Pick<NewPasswordRequest, 'newPassword'>>();
  const navigate = useNavigate();

  const onFinish = async (values: Pick<NewPasswordRequest, 'newPassword'>) => {
    if (loading) return;

    //token 在url中，url的格式为/new-pwd?token=xxxx
    const token = window.location.search.split('token=')[1];

    if (!token) {
      message.error('token不存在');
      return;
    }

    setLoading(true);
    try {
      await authService.newPassword({ newPassword: values.newPassword, token });
      setSuccessModalOpen(true);
    } catch (err) {
      message.error(parseErrorMessage(err, '设置失败'));
    } finally {
      setLoading(false);
    }
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
