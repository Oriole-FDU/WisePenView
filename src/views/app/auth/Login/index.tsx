import { Form } from '@heroui/react';
import { User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { appendRedirectParam, readRedirectParam } from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/base/Button';
import { FormField, Input, PasswordInput } from '@/components/base/Input';
import { useAuthService } from '@/domains';
import type { LoginRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { type FieldErrors, hasFieldErrors, runFieldValidation } from '@/utils/formValidation';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';

import auth from '../Auth.module.less';

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
  const location = useLocation();
  const redirectPath = readRedirectParam(location.search);

  const { loading, run: submitLogin } = useApi(
    (values: LoginRequest) => authService.login(values),
    {
      manual: true,
      onSuccess: () => {
        navigate(redirectPath, { replace: true });
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
        <FormField
          aria-label={t('login.accountLabel')}
          label={t('login.accountLabel')}
          value={formValues.account}
          onChange={(value) => updateFormValue('account', value)}
          errorMessage={formErrors.account}
          isRequired
        >
          <div className={auth.inputWithIcon}>
            <User className={auth.inputIcon} size={18} aria-hidden="true" />
            <Input placeholder={t('login.accountPlaceholder')} autoComplete="username" />
          </div>
        </FormField>

        <FormField
          aria-label={t('login.passwordLabel')}
          label={t('login.passwordLabel')}
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          errorMessage={formErrors.password}
          isRequired
        >
          <PasswordInput
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
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
            {t('login.submit')}
          </AppButton>
          <div className={auth.rightLinks}>
            <Link to={appendRedirectParam(APP_ROUTE_PATH.AUTH_REGISTER, redirectPath)}>
              {t('login.register')}
            </Link>
            <Link to={APP_ROUTE_PATH.AUTH_PASSWORD_FORGOT}>{t('login.forgotPassword')}</Link>
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
