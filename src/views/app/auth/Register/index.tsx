import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/domains';
import type { RegisterRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, Form, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Lock, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;
type RegisterField = keyof RegisterRequest;

const DEFAULT_REGISTER_VALUES: RegisterRequest = {
  username: '',
  password: '',
};

function Register() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [agreement, setAgreement] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<RegisterRequest>(DEFAULT_REGISTER_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<RegisterField>>({});
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

  const updateFormValue = (field: RegisterField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const username = formValues.username.trim();
    const nextErrors: FieldErrors<RegisterField> = {
      username: runFieldValidation([
        { test: () => username.length > 0, message: t('register.usernameRequired') },
        { test: () => USERNAME_PATTERN.test(username), message: t('register.usernamePattern') },
      ]),
      password: runFieldValidation([
        { test: () => formValues.password.length > 0, message: t('register.passwordRequired') },
        { test: () => formValues.password.length >= 9, message: t('register.passwordMinLength') },
        {
          test: () => /[a-zA-Z]/.test(formValues.password),
          message: t('register.passwordContainsLetter'),
        },
        {
          test: () => /[0-9]/.test(formValues.password),
          message: t('register.passwordContainsNumber'),
        },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (!agreement) {
      toast.danger(t('register.agreementRequired'));
      return;
    }
    submitRegister({
      username: formValues.username.trim(),
      password: formValues.password,
    });
  };

  const resetForm = () => {
    setFormValues(DEFAULT_REGISTER_VALUES);
    setFormErrors({});
    setAgreement(false);
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('register.title')}</h1>
      <Form onSubmit={handleSubmit} className={auth.form}>
        <TextField
          aria-label={t('register.usernameLabel')}
          value={formValues.username}
          onChange={(value) => updateFormValue('username', value)}
          isInvalid={formErrors.username != null}
          isRequired
        >
          <Label>{t('register.usernameLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <User className={auth.inputIcon} size={18} />
            <Input
              placeholder={t('register.usernamePlaceholder')}
              maxLength={USERNAME_MAX_LENGTH}
              autoComplete="username"
            />
          </div>
          {formErrors.username ? <p className={auth.fieldError}>{formErrors.username}</p> : null}
        </TextField>

        <TextField
          aria-label={t('register.passwordLabel')}
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          isInvalid={formErrors.password != null}
          isRequired
        >
          <Label>{t('register.passwordLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <Lock className={auth.inputIcon} size={18} />
            <Input
              type="password"
              placeholder={t('register.passwordPlaceholder')}
              autoComplete="new-password"
            />
          </div>
          {formErrors.password ? <p className={auth.fieldError}>{formErrors.password}</p> : null}
        </TextField>

        <div className={auth.agreementRow}>
          <Checkbox isSelected={agreement} onChange={(isSelected) => setAgreement(isSelected)}>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>{t('register.agreementCheckedPrefix')}</Checkbox.Content>
          </Checkbox>
          <Link to="#" onClick={() => setContractOpen(true)}>
            {t('register.agreementLink')}
          </Link>
        </div>

        <div className={auth.formActions}>
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
            <span>
              {t('register.hasAccount')}
              <Link to="/login">{t('register.toLogin')}</Link>
            </span>
          </div>
        </div>
      </Form>
      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
      <Modal isOpen={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{t('register.registerSuccessTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p>{t('register.registerSuccessDescription')}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => {
                    setSuccessModalOpen(false);
                    resetForm();
                  }}
                >
                  {t('register.stayHere')}
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    setSuccessModalOpen(false);
                    navigate('/login');
                  }}
                >
                  {t('register.goToLogin')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export default Register;
