import { useAuthService } from '@/domains';
import type { ResetPasswordRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Alert, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { RiMailLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import auth from '../Auth.module.less';

function ResetPassword() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [form] = Form.useForm<ResetPasswordRequest>();

  const { loading, run: submitResetPassword } = useRequest(
    (values: ResetPasswordRequest) => authService.resetPassword(values),
    {
      manual: true,
      onSuccess: () => {
        toast.info(t('resetPassword.sendSuccess'));
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const onFinish = (values: ResetPasswordRequest) => {
    submitResetPassword(values);
  };

  return (
    <div className={auth.authContainer}>
      <Typography.Title>{t('resetPassword.title')}</Typography.Title>
      <Alert
        description={
          <>
            {t('resetPassword.alertPrefix')}
            <strong>{t('resetPassword.alertHighlight')}</strong>
            {t('resetPassword.alertSuffix')}
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
          label={t('resetPassword.campusNumLabel')}
          name="campusNum"
          rules={[{ required: true, message: t('resetPassword.campusNumRequired') }]}
        >
          <Input
            placeholder={t('resetPassword.campusNumPlaceholder')}
            size="large"
            prefix={<RiMailLine />}
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
            {t('resetPassword.submit')}
          </Button>
          <div className={auth.centerLinks}>
            <Typography.Text>
              <Link to="/login">{t('resetPassword.backToLogin')}</Link>
            </Typography.Text>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
}

export default ResetPassword;
