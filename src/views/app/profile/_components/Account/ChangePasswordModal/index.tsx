import { Form } from '@heroui/react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { FormField, PasswordInput } from '@/components/base/Input';
import AppDisplayDialog from '@/components/business/AppDisplayDialog';
import { useAuthService } from '@/domains';
import type { ChangePasswordRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { useFormValidation } from '@/hooks/useFormValidation';
import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import {
  validateConfirmPasswordField,
  validatePasswordField,
} from '@/views/app/auth/_common/passwordValidation';

import type { ChangePasswordModalProps } from './index.type';
import styles from './style.module.scss';

type ChangePasswordFormValues = ChangePasswordRequest & {
  confirmPassword: string;
};
type ChangePasswordField = keyof ChangePasswordFormValues;

const CHANGE_PASSWORD_FORM_ID = 'change-password-form';

const DEFAULT_CHANGE_PASSWORD_VALUES: ChangePasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function ChangePasswordModal({ isOpen, onOpenChange }: ChangePasswordModalProps) {
  const authService = useAuthService();
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const validateField = (
    field: ChangePasswordField,
    values: ChangePasswordFormValues
  ): string | undefined => {
    switch (field) {
      case 'oldPassword':
        return values.oldPassword.length > 0
          ? undefined
          : t('auth:changePassword.oldPasswordRequired');
      case 'newPassword':
        return validatePasswordField(values.newPassword, {
          required: t('auth:changePassword.passwordRequired'),
          minLength: t('auth:changePassword.passwordMinLength'),
          containsLetter: t('auth:changePassword.passwordContainsLetter'),
          containsNumber: t('auth:changePassword.passwordContainsNumber'),
        });
      case 'confirmPassword':
        return validateConfirmPasswordField(values.confirmPassword, values.newPassword, {
          required: t('auth:changePassword.confirmPasswordRequired'),
          mismatch: t('auth:changePassword.confirmPasswordMismatch'),
        });
      default:
        return undefined;
    }
  };
  const isFieldEmpty = (field: ChangePasswordField, values: ChangePasswordFormValues) => {
    switch (field) {
      case 'oldPassword':
        return values.oldPassword.length === 0;
      case 'newPassword':
        return values.newPassword.length === 0;
      case 'confirmPassword':
        return values.confirmPassword.length === 0;
      default:
        return false;
    }
  };

  const validation = useFormValidation<ChangePasswordFormValues, ChangePasswordField>({
    initialValues: DEFAULT_CHANGE_PASSWORD_VALUES,
    fields: ['oldPassword', 'newPassword', 'confirmPassword'],
    validateField,
    isFieldEmpty,
  });
  const formValues = validation.values;
  const resetForm = () => validation.reset();
  const { loading, run: submitChangePassword } = useApi(
    (values: ChangePasswordRequest) => authService.changePassword(values),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
        setSuccessModalOpen(true);
      },
    }
  );

  const updateFormValue = (field: ChangePasswordField, value: string) => {
    validation.changeField(field, value, field === 'newPassword' ? ['confirmPassword'] : []);
  };

  const handleFormSubmit = () => {
    if (loading || !validation.validateForm()) return;
    submitChangePassword({
      oldPassword: formValues.oldPassword,
      newPassword: formValues.newPassword,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleFormSubmit();
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  if (successModalOpen) {
    return (
      <AppDisplayDialog
        isOpen
        onOpenChange={setSuccessModalOpen}
        isDismissable={false}
        showCloseTrigger={false}
        title={t('auth:changePassword.successTitle')}
        primaryAction={{
          label: t('auth:changePassword.goToLogin'),
          onPress: () => {
            setSuccessModalOpen(false);
            authSessionCoordinator.publish('logout');
            navigate(APP_ROUTE_PATH.AUTH_LOGIN, { replace: true });
          },
        }}
      >
        <p>{t('auth:changePassword.successDescription')}</p>
      </AppDisplayDialog>
    );
  }

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('auth:changePassword.title')}
      size="md"
      isDismissable={!loading}
      actions={
        <>
          <AppButton type="button" variant="secondary" isDisabled={loading} onPress={handleClose}>
            {t('common:actions.cancel')}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            isDisabled={loading}
            isPending={loading}
            aria-busy={loading || undefined}
            onPress={handleFormSubmit}
          >
            {t('auth:changePassword.submit')}
          </AppButton>
        </>
      }
    >
      <Form id={CHANGE_PASSWORD_FORM_ID} onSubmit={handleSubmit} className={styles.form}>
        <FormField
          aria-label={t('auth:changePassword.oldPasswordLabel')}
          label={t('auth:changePassword.oldPasswordLabel')}
          name="oldPassword"
          value={formValues.oldPassword}
          onChange={(value) => updateFormValue('oldPassword', value)}
          onBlur={() => validation.blurField('oldPassword')}
          errorMessage={validation.errors.oldPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('auth:changePassword.oldPasswordPlaceholder')}
            autoComplete="current-password"
            showPasswordLabel={t('auth:common.showPassword')}
            hidePasswordLabel={t('auth:common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('auth:changePassword.passwordLabel')}
          label={t('auth:changePassword.passwordLabel')}
          name="newPassword"
          value={formValues.newPassword}
          onChange={(value) => updateFormValue('newPassword', value)}
          onBlur={() => validation.blurField('newPassword')}
          errorMessage={validation.errors.newPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('auth:changePassword.passwordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('auth:common.showPassword')}
            hidePasswordLabel={t('auth:common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('auth:changePassword.confirmPasswordLabel')}
          label={t('auth:changePassword.confirmPasswordLabel')}
          name="confirmPassword"
          value={formValues.confirmPassword}
          onChange={(value) => updateFormValue('confirmPassword', value)}
          onBlur={() => validation.blurField('confirmPassword')}
          errorMessage={validation.errors.confirmPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('auth:changePassword.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('auth:common.showPassword')}
            hidePasswordLabel={t('auth:common.hidePassword')}
          />
        </FormField>
      </Form>
    </AppModal>
  );
}

export default ChangePasswordModal;
