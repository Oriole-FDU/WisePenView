import React, { useState } from 'react';
import styles from './Auth.module.less';
import { Form, Typography, Input, Button, Flex, Checkbox } from 'antd';
import { RiUserLine, RiLockLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import request from '@/utils/request';
import ServiceAgreement from './ServiceAgreement';
import { message as antMessage } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLoading } from '@/hooks/useLoading';
interface LoginFormValues {
    account:string;
    password:string;
}

const Login: React.FC = () => {
    const [contractOpen, setContractOpen] = useState(false);
    const [form] = Form.useForm<LoginFormValues>()
    const [messageApi, contextHolder] = antMessage.useMessage();
    const navigate = useNavigate();
    const { loading, run } = useLoading();

    const onFinish = async (values: LoginFormValues) => {
        try {
            await run(
                () => request.post('/auth/login', values),
                { showMessage: true, messageText: '正在登录...', messageKey: 'loginLoading' }
            );
            navigate('/app/drive');
        } catch (err: any) {
            messageApi.error(err.response?.data?.msg || '登录失败');
        }
    }

    return (
        <Flex vertical className={styles.authContainer}>
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
                    <Flex style={{ justifyContent: 'center' }}>
                        <Flex style={{ gap: 'var(--ant-margin-sm)', marginLeft: 'auto' }}>
                            <Link to="/register">
                                注册
                            </Link>
                            <Link to="/reset-pwd">
                                忘记密码
                            </Link>
                        </Flex>
                    </Flex>
                </Form.Item>
            </Form>
            <Flex style={{ marginTop: 'var(--ant-margin-sm)' }}>
                <Typography.Text>
                    登录系统即视为接受
                </Typography.Text>
                <Link to="#"
                    onClick={() => setContractOpen(true)}
                >
                    用户协议
                </Link>
            </Flex>
            <ServiceAgreement
                open={contractOpen}
                onCancel={() => setContractOpen(false)}
            />
        </Flex>
    );
};

export default Login;