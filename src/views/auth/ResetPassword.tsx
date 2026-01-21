import React, { useState } from 'react';
import { Alert, Form, Typography, Input, Button, message as antMessage } from 'antd';
import { Link } from 'react-router-dom';
import { RiMailLine } from 'react-icons/ri';
import Axios from '@/utils/Axios';
import styles from './Auth.module.less';
import type { ResetPasswordFormValues } from './index.type';

const ResetPassword: React.FC = () => {
    const [form] = Form.useForm<ResetPasswordFormValues>();
    const [messageApi, contextHolder] = antMessage.useMessage();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: ResetPasswordFormValues) => {
        try {
            setLoading(true);
            await Axios.post('/auth/forgot-password/email', values);
            setLoading(false);
            messageApi.info("邮件将发送至您的学工号邮箱，请注意查收。");
        } catch (err: any) {
            messageApi.error(err.response?.data?.msg || '发送失败');
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            {contextHolder}
            <Typography.Title>
                找回密码
            </Typography.Title>
            <Alert
                description={
                    <>
                        找回密码：<strong>您需要登录校内邮箱查收密码重置链接，校内邮箱将默认为您的学号数字邮箱（与别名邮箱不冲突）。</strong>如因意外无法登录校内邮箱，请联系管理员协助重置你的密码。
                    </>
                }
                type="warning"
                showIcon
            />
            <Form layout="vertical"
                form={form}
                onFinish={onFinish}
                initialValues={{ email: '@m.fudan.edu.cn' }}
                requiredMark={false}>
                <Form.Item
                    label="学工号"
                    name="campusNum"
                    rules={[{ required: true, message: '请输入学工号' }]}
                >
                    <Input
                        placeholder='输入学工号'
                        size='large'
                        prefix={<RiMailLine />}
                    />
                </Form.Item>

                <Form.Item>
                    <Button 
                        type="primary" 
                        size='large' 
                        htmlType='submit' 
                        className={styles.submitButton}
                        loading={loading}
                    >
                        发送验证码
                    </Button>
                    <div className={styles.centerLinks}>
                        <Typography.Text>
                            <Link to="/login">
                                返回登录
                            </Link>
                        </Typography.Text>
                    </div>
                </Form.Item>
            </Form>
        </div>
    );
};

export default ResetPassword;

