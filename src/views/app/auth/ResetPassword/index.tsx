import { AppButton } from '@/components/Button';
import { FormField } from '@/components/Input';
import { useAuthService } from '@/domains';
import type { ResetPasswordRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { Alert, Form, toast } from '@heroui/react';

import { hasFieldErrors, runFieldValidation, type FieldErrors } from '@/utils/formValidation';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AuthIconField from '../_common/AuthIconField';
import auth from '../_common/style.module.less';

type ResetPasswordField = keyof ResetPasswordRequest;

const DEFAULT_RESET_PASSWORD_VALUES: ResetPasswordRequest = {
  userName: '',
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
      userName: runFieldValidation([
        {
          test: () => formValues.userName.trim().length > 0,
          message: t('resetPassword.userNameRequired'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    submitResetPassword({ userName: formValues.userName.trim() });
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
          aria-label={t('resetPassword.userNameLabel')}
          label={t('resetPassword.userNameLabel')}
          name="userName"
          value={formValues.userName}
          onChange={(value) => updateFormValue('userName', value)}
          errorMessage={formErrors.userName}
          isRequired
        >
          <AuthIconField
            placeholder={t('resetPassword.userNamePlaceholder')}
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
