import { Form, toast } from '@heroui/react';
import { useMount } from 'ahooks';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { getCurrentRouteSearch } from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/base/Button';
import { FormField, PasswordInput } from '@/components/base/Input';
import AppDisplayDialog from '@/components/business/AppDisplayDialog';
import { useAuthService } from '@/domains';
import type { NewPasswordRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { useFormValidation } from '@/hooks/useFormValidation';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { validateConfirmPasswordField, validatePasswordField } from '../_common/passwordValidation';
import auth from '../_common/style.module.scss';

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
  const navigate = useNavigate();

  useMount(() => {
    const queryToken = new URLSearchParams(getCurrentRouteSearch()).get('token') ?? '';
    setToken(queryToken);
  });

  const validateField = (
    field: NewPasswordField,
    values: NewPasswordFormValues
  ): string | undefined => {
    switch (field) {
      case 'newPassword':
        return validatePasswordField(values.newPassword, {
          required: t('newPassword.passwordRequired'),
          minLength: t('newPassword.passwordMinLength'),
          containsLetter: t('newPassword.passwordContainsLetter'),
          containsNumber: t('newPassword.passwordContainsNumber'),
        });
      case 'confirmPassword':
        return validateConfirmPasswordField(values.confirmPassword, values.newPassword, {
          required: t('newPassword.confirmPasswordRequired'),
          mismatch: t('newPassword.confirmPasswordMismatch'),
        });
      default:
        return undefined;
    }
  };
  const isFieldEmpty = (field: NewPasswordField, values: NewPasswordFormValues) => {
    switch (field) {
      case 'newPassword':
        return values.newPassword.length === 0;
      case 'confirmPassword':
        return values.confirmPassword.length === 0;
      default:
        return false;
    }
  };

  const validation = useFormValidation<NewPasswordFormValues, NewPasswordField>({
    initialValues: DEFAULT_NEW_PASSWORD_VALUES,
    fields: ['newPassword', 'confirmPassword'],
    validateField,
    isFieldEmpty,
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
  const formValues = validation.values;

  const updateFormValue = (field: NewPasswordField, value: string) => {
    validation.changeField(field, value, field === 'newPassword' ? ['confirmPassword'] : []);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.validateForm()) return;
    if (!token) {
      toast.danger(t('newPassword.tokenMissing'));
      return;
    }
    submitNewPassword(formValues);
  };

  const resetForm = () => {
    validation.reset();
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
          onBlur={() => validation.blurField('newPassword')}
          errorMessage={validation.errors.newPassword}
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
          onBlur={() => validation.blurField('confirmPassword')}
          errorMessage={validation.errors.confirmPassword}
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
