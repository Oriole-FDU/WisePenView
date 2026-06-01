import { useAuthService } from '@/domains';
import type { NewPasswordRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useMount, useRequest } from 'ahooks';
import { Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiLockLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';

type NewPasswordFormValues = Pick<NewPasswordRequest, 'newPassword'>;

function NewPassword() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [token, setToken] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [form] = Form.useForm<NewPasswordFormValues>();
  const navigate = useNavigate();

  useMount(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(queryToken);
  });

  const { loading, run: submitNewPassword } = useRequest(
    async (values: NewPasswordFormValues) =>
      authService.newPassword({ newPassword: values.newPassword, token }),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const onFinish = (values: NewPasswordFormValues) => {
    if (!token) {
      toast.danger(t('newPassword.tokenMissing'));
      return;
    }
    submitNewPassword(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('newPassword.title')}</Typography.Title>
      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label={t('newPassword.passwordLabel')}
          name="newPassword"
          rules={[
            { required: true, message: t('newPassword.passwordRequired') },
            { min: 9, message: t('newPassword.passwordMinLength') },
            { pattern: /[a-zA-Z]/, message: t('newPassword.passwordContainsLetter') },
            { pattern: /[0-9]/, message: t('newPassword.passwordContainsNumber') },
          ]}
        >
          <Input.Password
            placeholder={t('newPassword.passwordPlaceholder')}
            size="large"
            prefix={<RiLockLine />}
          />
        </Form.Item>

        <Form.Item>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            className={auth.submitButton}
            isDisabled={loading}
          >
            {t('newPassword.submit')}
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              <Link to="/login">{t('newPassword.backToLogin')}</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
      <Modal
        title={t('newPassword.successTitle')}
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        destroyOnHidden
        footer={[
          <Button
            key="stay"
            onPress={() => {
              setSuccessModalOpen(false);
              form.resetFields(); // 清空表单
            }}
          >
            {t('newPassword.stayHere')}
          </Button>,
          <Button
            key="login"
            variant="primary"
            onPress={() => {
              setSuccessModalOpen(false);
              navigate('/login');
            }}
          >
            {t('newPassword.goToLogin')}
          </Button>,
        ]}
      >
        <Typography.Text>{t('newPassword.successDescription')}</Typography.Text>
      </Modal>
    </div>
  );
}

export default NewPassword;
