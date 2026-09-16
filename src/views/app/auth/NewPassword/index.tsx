import { getCurrentRouteSearch } from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/Button';
import { FormField, PasswordInput } from '@/components/Input';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useAuthService } from '@/domains';
import type { NewPasswordRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { Form, toast } from '@heroui/react';

import { hasFieldErrors, runFieldValidation, type FieldErrors } from '@/utils/formValidation';
import { useMount } from 'ahooks';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../_common/style.module.less';

type NewPasswordFormValues = Pick<NewPasswordRequest, 'newPassword'> & {
  confirmPassword: string;
};
type NewPasswordField = keyof NewPasswordFormValues;

const DEFAULT_NEW_PASSWORD_VALUES: NewPasswordFormValues = {
  newPassword: '',
  confirmPassword: '',
};

function NewPassword() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [token, setToken] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<NewPasswordFormValues>(DEFAULT_NEW_PASSWORD_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<NewPasswordField>>({});
  const navigate = useNavigate();

  useMount(() => {
    const queryToken = new URLSearchParams(getCurrentRouteSearch()).get('token') ?? '';
    setToken(queryToken);
  });

  const { loading, run: submitNewPassword } = useApi(
    async (values: NewPasswordFormValues) =>
      authService.newPassword({ newPassword: values.newPassword, token }),
    {
      manual: true,
      onSuccess: () => {
        setSuccessModalOpen(true);
      },
    }
  );

  const updateFormValue = (field: NewPasswordField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<NewPasswordField> = {
      newPassword: runFieldValidation([
        {
          test: () => formValues.newPassword.length > 0,
          message: t('newPassword.passwordRequired'),
        },
        {
          test: () => formValues.newPassword.length >= 9,
          message: t('newPassword.passwordMinLength'),
        },
        {
          test: () => /[a-zA-Z]/.test(formValues.newPassword),
          message: t('newPassword.passwordContainsLetter'),
        },
        {
          test: () => /[0-9]/.test(formValues.newPassword),
          message: t('newPassword.passwordContainsNumber'),
        },
      ]),
      confirmPassword: runFieldValidation([
        {
          test: () => formValues.confirmPassword.length > 0,
          message: t('newPassword.confirmPasswordRequired'),
        },
        {
          test: () => formValues.confirmPassword === formValues.newPassword,
          message: t('newPassword.confirmPasswordMismatch'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (!token) {
      toast.danger(t('newPassword.tokenMissing'));
      return;
    }
    submitNewPassword(formValues);
  };

  const resetForm = () => {
    setFormValues(DEFAULT_NEW_PASSWORD_VALUES);
    setFormErrors({});
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('newPassword.title')}</h1>
      <Form onSubmit={handleSubmit} className={auth.form}>
        <FormField
          aria-label={t('newPassword.passwordLabel')}
          label={t('newPassword.passwordLabel')}
          name="newPassword"
          value={formValues.newPassword}
          onChange={(value) => updateFormValue('newPassword', value)}
          description={t('common.passwordRules')}
          errorMessage={formErrors.newPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('newPassword.passwordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('newPassword.confirmPasswordLabel')}
          label={t('newPassword.confirmPasswordLabel')}
          name="confirmPassword"
          value={formValues.confirmPassword}
          onChange={(value) => updateFormValue('confirmPassword', value)}
          errorMessage={formErrors.confirmPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('newPassword.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
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
            {t('newPassword.submit')}
          </AppButton>
          <div className={auth.centerLinks}>
            <Link to={APP_ROUTE_PATH.AUTH_LOGIN}>{t('newPassword.backToLogin')}</Link>
          </div>
        </div>
      </Form>
      <AppDisplayDialog
        isOpen={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        title={t('newPassword.successTitle')}
        secondaryAction={{
          label: t('newPassword.stayHere'),
          onPress: () => {
            setSuccessModalOpen(false);
            resetForm();
          },
        }}
        primaryAction={{
          label: t('newPassword.goToLogin'),
          onPress: () => {
            setSuccessModalOpen(false);
            navigate(APP_ROUTE_PATH.AUTH_LOGIN);
          },
        }}
      >
        <p>{t('newPassword.successDescription')}</p>
      </AppDisplayDialog>
    </div>
  );
}

export default NewPassword;
