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
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import { type FieldErrors, hasFieldErrors } from '@/utils/validation/formValidation';

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

  const isFieldEmpty = (field: NewPasswordField, values: NewPasswordFormValues): boolean => {
    switch (field) {
      case 'newPassword':
        return values.newPassword.length === 0;
      case 'confirmPassword':
        return values.confirmPassword.length === 0;
      default:
        return false;
    }
  };

  const validateField = (
    field: NewPasswordField,
    values: NewPasswordFormValues,
    options: { withRequired?: boolean } = {}
  ): string | undefined => {
    if (!options.withRequired && isFieldEmpty(field, values)) return undefined;

    switch (field) {
      case 'newPassword':
        return validatePasswordField(
          values.newPassword,
          {
            required: t('newPassword.passwordRequired'),
            minLength: t('newPassword.passwordMinLength'),
            containsLetter: t('newPassword.passwordContainsLetter'),
            containsNumber: t('newPassword.passwordContainsNumber'),
          },
          options
        );
      case 'confirmPassword':
        return validateConfirmPasswordField(
          values.confirmPassword,
          values.newPassword,
          {
            required: t('newPassword.confirmPasswordRequired'),
            mismatch: t('newPassword.confirmPasswordMismatch'),
          },
          options
        );
      default:
        return undefined;
    }
  };

  const updateFormValue = (field: NewPasswordField, value: string) => {
    const nextValues = { ...formValues, [field]: value };
    setFormValues(nextValues);
    const fieldsToValidate: NewPasswordField[] =
      field === 'newPassword' ? ['newPassword', 'confirmPassword'] : [field];
    setFormErrors((prev) => {
      const nextErrors = { ...prev };
      fieldsToValidate.forEach((key) => {
        nextErrors[key] = validateField(key, nextValues);
      });
      return nextErrors;
    });
  };

  const handleFieldBlur = (field: NewPasswordField) => {
    setFormErrors((prev) => ({ ...prev, [field]: validateField(field, formValues) }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<NewPasswordField> = {
      newPassword: validateField('newPassword', formValues, { withRequired: true }),
      confirmPassword: validateField('confirmPassword', formValues, { withRequired: true }),
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
          onBlur={() => handleFieldBlur('newPassword')}
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
          onBlur={() => handleFieldBlur('confirmPassword')}
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
