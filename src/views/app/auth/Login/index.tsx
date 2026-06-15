import ServiceAgreement from '@/components/ServiceAgreement/index';
import { useAuthService } from '@/domains';
import type { LoginRequest } from '@/domains/Auth';
import { parseErrorMessage } from '@/utils/error';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Lock, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';
import { hasFieldErrors, runFieldValidation, type FieldErrors } from '../formValidation';

type LoginField = keyof LoginRequest;

const DEFAULT_LOGIN_VALUES: LoginRequest = {
  account: '',
  password: '',
};

function Login() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [contractOpen, setContractOpen] = useState(false);
  const [formValues, setFormValues] = useState<LoginRequest>(DEFAULT_LOGIN_VALUES);
  const [formErrors, setFormErrors] = useState<FieldErrors<LoginField>>({});
  const navigate = useNavigate();

  const { loading, run: submitLogin } = useRequest(
    (values: LoginRequest) => authService.login(values),
    {
      manual: true,
      onSuccess: () => {
        navigate('/app/drive');
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const updateFormValue = (field: LoginField, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<LoginField> = {
      account: runFieldValidation([
        { test: () => formValues.account.trim().length > 0, message: t('login.accountRequired') },
      ]),
      password: runFieldValidation([
        { test: () => formValues.password.length > 0, message: t('login.passwordRequired') },
      ]),
    };
    setFormErrors(nextErrors);
    return !hasFieldErrors(nextErrors);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    submitLogin({
      account: formValues.account.trim(),
      password: formValues.password,
    });
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('login.title')}</h1>

      <Form onSubmit={handleSubmit} className={auth.form}>
        <TextField
          aria-label={t('login.accountLabel')}
          value={formValues.account}
          onChange={(value) => updateFormValue('account', value)}
          isInvalid={formErrors.account != null}
          isRequired
        >
          <Label>{t('login.accountLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <User className={auth.inputIcon} size={18} />
            <Input placeholder={t('login.accountPlaceholder')} autoComplete="username" />
          </div>
          {formErrors.account ? <p className={auth.fieldError}>{formErrors.account}</p> : null}
        </TextField>

        <TextField
          aria-label={t('login.passwordLabel')}
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          isInvalid={formErrors.password != null}
          isRequired
        >
          <Label>{t('login.passwordLabel')}</Label>
          <div className={auth.inputWithIcon}>
            <Lock className={auth.inputIcon} size={18} />
            <Input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </div>
          {formErrors.password ? <p className={auth.fieldError}>{formErrors.password}</p> : null}
        </TextField>

        <div className={auth.formActions}>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            className={auth.submitButton}
            isDisabled={loading}
          >
            {t('login.submit')}
          </Button>
          <div className={auth.rightLinks}>
            <Link to="/register">{t('login.register')}</Link>
            <Link to="/reset-pwd">{t('login.forgotPassword')}</Link>
          </div>
        </div>
      </Form>

      <div className={auth.leftBottomLinks}>
        <span>{t('login.agreementPrefix')}</span>
        <Link to="#" onClick={() => setContractOpen(true)}>
          {t('login.agreementLink')}
        </Link>
      </div>

      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
    </div>
  );
}

export default Login;
