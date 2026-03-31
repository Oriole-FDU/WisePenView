import React, { useState } from 'react';
import { useRequest } from 'ahooks';
import { Alert, Form, Typography, Input, Button } from 'antd';
import { RiMailLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { useAuthService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import auth from '../Auth.module.less';
import type { ResetPasswordRequest } from '@/services/Auth';
import { useAppMessage } from '@/hooks/useAppMessage';

const ResetPassword: React.FC = () => {
  const authService = useAuthService();
  const message = useAppMessage();
  const [form] = Form.useForm<ResetPasswordRequest>();

  const { loading, run: submitResetPassword } = useRequest(
    (values: ResetPasswordRequest) => authService.resetPassword(values),
    {
      manual: true,
      onSuccess: () => {
        message.info('邮件将发送至您的学工号邮箱，请注意查收。');
      },
      onError: (err: unknown) => {
        message.error(parseErrorMessage(err, '发送失败'));
      },
    }
  );

  const onFinish = (values: ResetPasswordRequest) => {
    submitResetPassword(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>找回密码</Typography.Title>
      <Alert
        description={
          <>
            找回密码：
            <strong>
              您需要登录校内邮箱查收密码重置链接，校内邮箱将默认为您的学号数字邮箱（与别名邮箱不冲突）。
            </strong>
            如因意外无法登录校内邮箱，请联系管理员协助重置你的密码。
          </>
        }
        type="warning"
        showIcon
      />
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{ email: '@m.fudan.edu.cn' }}
        requiredMark={false}
      >
        <Form.Item
          label="学工号"
          name="campusNum"
          rules={[{ required: true, message: '请输入学工号' }]}
        >
          <Input placeholder="输入学工号" size="large" prefix={<RiMailLine />} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={auth.submitButton}
            loading={loading}
          >
            发送验证码
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              <Link to="/login">返回登录</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ResetPassword;
