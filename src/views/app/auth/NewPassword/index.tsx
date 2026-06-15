import { useAuthService } from '@/domains';
import type { NewPasswordRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, Form, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { useMount, useRequest } from 'ahooks';
import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

type NewPasswordFormValues = Pick<NewPasswordRequest, 'newPassword'>;
type NewPasswordField = keyof NewPasswordFormValues;

const DEFAULT_NEW_PASSWORD_VALUES: NewPasswordFormValues = {
  newPassword: '',
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
        <TextField
          aria-label={t('newPassword.passwordLabel')}
          value={formValues.newPassword}
          onChange={(value) => updateFormValue('newPassword', value)}
          isInvalid={formErrors.newPassword != null}
          isRequired
        >
          <Label>{t('newPassword.passwordLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <Lock className={auth.inputIcon} size={18} />
            <Input
              type="password"
              placeholder={t('newPassword.passwordPlaceholder')}
              autoComplete="new-password"
            />
          </div>
          {formErrors.newPassword ? (
            <p className={auth.fieldError}>{formErrors.newPassword}</p>
          ) : null}
        </TextField>

        <div className={auth.formActions}>
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
            <Link to="/login">{t('newPassword.backToLogin')}</Link>
          </div>
        </div>
      </Form>
      <Modal isOpen={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{t('newPassword.successTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p>{t('newPassword.successDescription')}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => {
                    setSuccessModalOpen(false);
                    resetForm();
                  }}
                >
                  {t('newPassword.stayHere')}
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    setSuccessModalOpen(false);
                    navigate('/login');
                  }}
                >
                  {t('newPassword.goToLogin')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export default NewPassword;
