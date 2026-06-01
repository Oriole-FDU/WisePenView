import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/domains';
import type { RegisterRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Checkbox, Form, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiLockLine, RiUserLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';

const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;

function Register() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [agreement, setAgreement] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [form] = Form.useForm<RegisterRequest>();
  const navigate = useNavigate();

  const { loading, run: submitRegister } = useRequest(
    (values: RegisterRequest) => authService.register(values),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const onFinish = (values: RegisterRequest) => {
    if (!agreement) {
      toast.danger(t('register.agreementRequired'));
      return;
    }
    submitRegister(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('register.title')}</Typography.Title>
      <Form layout="vertical" form={form} onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label={t('register.usernameLabel')}
          name="username"
          rules={[
            { required: true, message: t('register.usernameRequired') },
            { pattern: USERNAME_PATTERN, message: t('register.usernamePattern') },
          ]}
        >
          <Input
            placeholder={t('register.usernamePlaceholder')}
            size="large"
            prefix={<RiUserLine />}
            maxLength={USERNAME_MAX_LENGTH}
          />
        </Form.Item>

        <Form.Item
          label={t('register.passwordLabel')}
          name="password"
          rules={[
            { required: true, message: t('register.passwordRequired') },
            { min: 9, message: t('register.passwordMinLength') },
            { pattern: /[a-zA-Z]/, message: t('register.passwordContainsLetter') },
            { pattern: /[0-9]/, message: t('register.passwordContainsNumber') },
          ]}
        >
          <Input.Password
            placeholder={t('register.passwordPlaceholder')}
            size="large"
            prefix={<RiLockLine />}
          />
        </Form.Item>

        <Form.Item>
          <Checkbox checked={agreement} onChange={(e) => setAgreement(e.target.checked)}>
            {t('register.agreementCheckedPrefix')}
          </Checkbox>
          <Link to="#" onClick={() => setContractOpen(true)}>
            {t('register.agreementLink')}
          </Link>
        </Form.Item>

        <Form.Item>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            className={auth.submitButton}
            isDisabled={loading}
          >
            {t('register.submit')}
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              {t('register.hasAccount')}
              <Link to="/login">{t('register.toLogin')}</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
      <Modal
        title={t('register.registerSuccessTitle')}
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        destroyOnHidden
        footer={[
          <Button
            key="stay"
            onPress={() => {
              setSuccessModalOpen(false);
              form.resetFields();
              setAgreement(false);
            }}
          >
            {t('register.stayHere')}
          </Button>,
          <Button
            key="login"
            variant="primary"
            onPress={() => {
              setSuccessModalOpen(false);

              navigate('/login');
            }}
          >
            {t('register.goToLogin')}
          </Button>,
        ]}
      >
        <Typography.Text>{t('register.registerSuccessDescription')}</Typography.Text>
      </Modal>
    </div>
  );
}

export default Register;
