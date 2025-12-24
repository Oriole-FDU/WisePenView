import React, { useState } from 'react';
import styles from './Auth.module.less';
import { Form, Typography, Input, Button, Flex, Modal } from 'antd';
import { RiLockLine, RiMailLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import request from '@/utils/request';
import { message as antMessage } from 'antd';
import { useLoading } from '@/hooks/useLoading';
import { useNavigate } from 'react-router-dom';
interface NewPasswordFormValue {
    newPassword:string
}

const NewPassword: React.FC = () => {
    const [form] = Form.useForm<NewPasswordFormValue>();
    const [messageApi, contextHolder] = antMessage.useMessage();
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const navigate = useNavigate();
    const { loading, run } = useLoading();

    const onFinish = async (values: NewPasswordFormValue) => {
        //token 在url中，url的格式为/new-pwd?token=xxxx
        const token = window.location.search.split('token=')[1];
        console.log(token);

        // 检查token是否存在
        if (!token) {
            messageApi.error('token不存在');
            return;
        }

        // 验证新密码长度必须大于8，且包含字母和数字
        const newPassword = values.newPassword;
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (newPassword.length <= 8) {
            messageApi.error('密码必须大于8位');
            return;
        }
        if (!(hasLetter && hasNumber)) {
            messageApi.error('密码必须包含字母和数字');
            return;
        }

        // 发送请求，设置新密码
        try {
            await run(
                () => request.post('/auth/forgot-password/reset', {
                    newPassword: values.newPassword,
                    token,
                }),
                { showMessage: true, messageText: '正在设置新密码...', messageKey: 'newPasswordLoading' }
            );
            setSuccessModalOpen(true);
        } catch (err: any) {
            messageApi.error(err.response?.data?.msg || '设置失败');
        }
    };

    return (
        <Flex vertical className={styles.authContainer}>
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
                    rules={[{ required: true, message: '请输入新密码' }]}
                >
                    <Input.Password placeholder='输入新密码' size='large' prefix={<RiLockLine />} />
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
                    <Flex style={{ justifyContent: 'center' }}>
                        <Typography.Text>
                            <Link to="/login">
                                返回登录
                            </Link>
                        </Typography.Text>
                    </Flex>
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
        </Flex>
    );
};

export default NewPassword;

