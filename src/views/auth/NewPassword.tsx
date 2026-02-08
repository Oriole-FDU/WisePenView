import React, { useState } from 'react';
import { Form, Typography, Input, Button, Modal, message as antMessage } from 'antd';
import { RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import Axios from '@/utils/Axios';
import styles from './Auth.module.less';
import type { NewPasswordProps } from './index.type.ts';

const NewPassword: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [form] = Form.useForm<NewPasswordProps>();
    const [messageApi, contextHolder] = antMessage.useMessage();
    const navigate = useNavigate();

    const onFinish = async (values: NewPasswordProps) => {
        if (loading) return;

        //token 在url中，url的格式为/new-pwd?token=xxxx
        const token = window.location.search.split('token=')[1];

        if (!token) {
            messageApi.error('token不存在');
            return;
        }

        setLoading(true);
        try {
            await Axios.post('/auth/forgot-password/reset', {
                newPassword: values.newPassword,
                token,
            });
            setSuccessModalOpen(true);
        } catch (err: any) {
            messageApi.error(err.response?.data?.msg || '设置失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            {contextHolder}
            <Typography.Title>
                设置新密码
            </Typography.Title>
            <Form layout="vertical"
                form={form}
                onFinish={onFinish}
                requiredMark={false}>
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
                    <Input.Password placeholder='输入新密码'
                        size='large'
                        prefix={<RiLockLine />}
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
                        确认
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
            <Modal
                title="密码设置成功"
                open={successModalOpen}
                onCancel={() => setSuccessModalOpen(false)}
                footer={[
                    <Button key="stay" onClick={() => {
                        setSuccessModalOpen(false);
                        form.resetFields(); // 清空表单
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
                <Typography.Text>恭喜您，密码设置成功！请前往登录页面登录。</Typography.Text>
            </Modal>
        </div>
    );
};

export default NewPassword;

