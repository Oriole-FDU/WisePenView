import { Alert, Form, toast } from '@heroui/react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { FormField } from '@/components/base/Input';
import { useAuthService } from '@/domains';
import type { ResetPasswordRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { type FieldErrors, hasFieldErrors, runFieldValidation } from '@/utils/formValidation';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import AuthIconField from '../_common/AuthIconField';
import auth from '../_common/style.module.less';

type ResetPasswordField = keyof ResetPasswordRequest;

const DEFAULT_RESET_PASSWORD_VALUES: ResetPasswordRequest = {
  username: '',
};

function ResetPassword() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [formValues, setFormValues] = useState<ResetPasswordRequest>(DEFAULT_RESET_PASSWORD_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<ResetPasswordField>>({});

  const { loading, run: submitResetPassword } = useApi(
    (values: ResetPasswordRequest) => authService.resetPassword(values),
    {
      manual: true,
      onSuccess: () => {
        toast.info(t('resetPassword.sendSuccess'));
      },
    }
  );

  const updateFormValue = (field: ResetPasswordField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<ResetPasswordField> = {
      username: runFieldValidation([
        {
          test: () => formValues.username.trim().length > 0,
          message: t('resetPassword.usernameRequired'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    submitResetPassword({ username: formValues.username.trim() });
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('resetPassword.title')}</h1>
      <Alert status="warning" className={auth.authAlert}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            {t('resetPassword.alertPrefix')}
            <strong>{t('resetPassword.alertHighlight')}</strong>
            {t('resetPassword.alertSuffix')}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <Form onSubmit={handleSubmit} className={auth.form}>
        <FormField
          aria-label={t('resetPassword.usernameLabel')}
          label={t('resetPassword.usernameLabel')}
          name="username"
          value={formValues.username}
          onChange={(value) => updateFormValue('username', value)}
          errorMessage={formErrors.username}
          isRequired
        >
          <AuthIconField
            placeholder={t('resetPassword.usernamePlaceholder')}
            autoComplete="username"
          />
        </FormField>

        <div className={auth.formActions}>
          <AppButton
            variant="primary"
            size="lg"
            type="submit"
            className={auth.submitButton}
            isDisabled={loading}
          >
            {t('resetPassword.submit')}
          </AppButton>
          <div className={auth.centerLinks}>
            <Link to={APP_ROUTE_PATH.AUTH_LOGIN}>{t('resetPassword.backToLogin')}</Link>
          </div>
        </div>
      </Form>
    </div>
  );
}

export default ResetPassword;
