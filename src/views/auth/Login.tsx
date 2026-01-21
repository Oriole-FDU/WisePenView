import React, { useState } from 'react';
import { Form, Typography, Input, Button, message as antMessage } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { RiUserLine, RiLockLine } from 'react-icons/ri';
import Axios from '@/utils/Axios';
import styles from './Auth.module.less';
import ServiceAgreement from './ServiceAgreement';
import type { LoginFormValues } from './index.type';

const Login: React.FC = () => {
    const [contractOpen, setContractOpen] = useState(false);
    const [form] = Form.useForm<LoginFormValues>()
    const [messageApi, contextHolder] = antMessage.useMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: LoginFormValues) => {
        try {
            setLoading(true);
            await Axios.post('/auth/login', values);
            setLoading(false);
            navigate('/app/drive');
        } catch (err: any) {
            messageApi.error(err.response?.data?.msg || '登录失败');
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.authContainer}>
            {contextHolder}

            <Typography.Title>
                登录
            </Typography.Title>

            <Form layout="vertical"
                form={form}
                onFinish={onFinish}
                requiredMark={false}>
                <Form.Item
                    label="学工号/用户名"
                    name="account"
                    rules={[{ required: true, message: '请输入学工号或用户名' }]}
                >
                    <Input placeholder='输入学工号/用户名' size='large' prefix={<RiUserLine />} />
                </Form.Item>

                <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                >
                    <Input.Password placeholder='输入密码' size='large' prefix={<RiLockLine />} />
                </Form.Item>

                <Form.Item>
                    <Button 
                        type='primary' 
                        size='large' 
                        htmlType='submit' 
                        className={styles.submitButton}
                        loading={loading}
                    >
                        登录
                    </Button>
                        <div className={styles.rightLinks}>
                            <Link to="/register">
                                注册
                            </Link>
                            <Link to="/reset-pwd">
                                忘记密码
                            </Link>
                        </div>
                </Form.Item>
            </Form>

            <div className={styles.leftBottomLinks}>
                <Typography.Text>
                    登录系统即视为接受
                </Typography.Text>
                <Link to="#"
                    onClick={() => setContractOpen(true)}
                >
                    用户协议
                </Link>
            </div>

            <ServiceAgreement
                open={contractOpen}
                onCancel={() => setContractOpen(false)}
            />
        </div>
    );
};

export default Login;