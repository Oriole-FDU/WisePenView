import { useAuthService } from '@/domains';
import type { ResetPasswordRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

type ResetPasswordField = keyof ResetPasswordRequest;

const DEFAULT_RESET_PASSWORD_VALUES: ResetPasswordRequest = {
  campusNum: '',
};

function ResetPassword() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [formValues, setFormValues] = useState<ResetPasswordRequest>(DEFAULT_RESET_PASSWORD_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<ResetPasswordField>>({});

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

  const updateFormValue = (field: ResetPasswordField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<ResetPasswordField> = {
      campusNum: runFieldValidation([
        {
          test: () => formValues.campusNum.trim().length > 0,
          message: t('resetPassword.campusNumRequired'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    submitResetPassword({ campusNum: formValues.campusNum.trim() });
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
        <TextField
          aria-label={t('resetPassword.campusNumLabel')}
          value={formValues.campusNum}
          onChange={(value) => updateFormValue('campusNum', value)}
          isInvalid={formErrors.campusNum != null}
          isRequired
        >
          <Label>{t('resetPassword.campusNumLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <Mail className={auth.inputIcon} size={18} />
            <Input placeholder={t('resetPassword.campusNumPlaceholder')} />
          </div>
          {formErrors.campusNum ? <p className={auth.fieldError}>{formErrors.campusNum}</p> : null}
        </TextField>

        <div className={auth.formActions}>
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
            <Link to="/login">{t('resetPassword.backToLogin')}</Link>
          </div>
        </div>
      </Form>
    </div>
  );
}

export default ResetPassword;
