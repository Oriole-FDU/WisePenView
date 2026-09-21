import { Form, toast } from '@heroui/react';
import { Gift } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  appendRedirectParam,
  buildRegisterOnboardingPath,
  readRedirectParam,
} from '@/bootstrap/authContinuation';
import { AppButton } from '@/components/base/Button';
import { Checkbox, FormField, PasswordInput } from '@/components/base/Input';
import { useAuthService } from '@/domains';
import type { RegisterRequest } from '@/domains/Auth';
import { useApi } from '@/hooks/useApi';
import { type FieldErrors, hasFieldErrors, runFieldValidation } from '@/utils/formValidation';
import { APP_ROUTE_PATH, readRegisterInviteCode } from '@/utils/navigation/appRoute';
import { normalizeInviteCode } from '@/utils/normalize/normalizeInviteCode';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';

import AuthIconField from '../_common/AuthIconField';
import auth from '../_common/style.module.less';

const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,20}$/;
const INVITE_CODE_MAX_LENGTH = 16;
const INVITE_CODE_PATTERN = /^[A-Z0-9]{4,16}$/;
type RegisterFormValues = Omit<RegisterRequest, 'inviteCode'> & {
  confirmPassword: string;
  /** 表单内邀请码始终为字符串，提交时再决定是否携带 */
  inviteCode: string;
};
type RegisterField = keyof RegisterFormValues;

const DEFAULT_REGISTER_VALUES: RegisterFormValues = {
  username: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
};

function Register() {
  const authService = useAuthService();
  const { t } = useTranslation('auth');
  const [agreement, setAgreement] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = readRedirectParam(location.search);
  /** 邀请链接携带的邀请码，用于初始化表单 */
  const linkedInviteCode = readRegisterInviteCode(location.search);
  const [formValues, setFormValues] = useState<RegisterFormValues>(() => ({
    ...DEFAULT_REGISTER_VALUES,
    inviteCode: linkedInviteCode,
  }));
  const [formErrors, setFormErrors] = useState<FieldErrors<RegisterField>>({});

  const { run: submitLogin } = useApi(
    (values: RegisterRequest) =>
      authService.login({
        account: values.username,
        password: values.password,
      }),
    {
      manual: true,
      onSuccess: () => {
        navigate(buildRegisterOnboardingPath(redirectPath), { replace: true });
      },
      onErrorEffect: () => {
        navigate(APP_ROUTE_PATH.AUTH_LOGIN, { replace: true });
      },
    }
  );

  const { loading, run: submitRegister } = useApi(
    async (values: RegisterRequest) => {
      await authService.register(values);
      return values;
    },
    {
      manual: true,
      onSuccess: (values) => {
        toast.success(t('register.registerSuccess'));
        submitLogin(values);
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
      confirmPassword: runFieldValidation([
        {
          test: () => formValues.confirmPassword.length > 0,
          message: t('register.confirmPasswordRequired'),
        },
        {
          test: () => formValues.confirmPassword === formValues.password,
          message: t('register.confirmPasswordMismatch'),
        },
      ]),
      inviteCode: runFieldValidation([
        {
          test: () => {
            const inviteCode = normalizeInviteCode(formValues.inviteCode);
            return inviteCode.length === 0 || INVITE_CODE_PATTERN.test(inviteCode);
          },
          message: t('register.inviteCodeInvalid'),
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
    const inviteCode = normalizeInviteCode(formValues.inviteCode);
    submitRegister({
      username: formValues.username.trim(),
      password: formValues.password,
      ...(inviteCode ? { inviteCode } : {}),
    });
  };

  return (
    <div className={auth.authContainer}>
      <h1 className={auth.title}>{t('register.title')}</h1>
      <Form onSubmit={handleSubmit} className={auth.form}>
        <FormField
          aria-label={t('register.usernameLabel')}
          label={t('register.usernameLabel')}
          name="username"
          value={formValues.username}
          onChange={(value) => updateFormValue('username', value)}
          errorMessage={formErrors.username}
          isRequired
        >
          <AuthIconField
            placeholder={t('register.usernamePlaceholder')}
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="username"
          />
        </FormField>

        <FormField
          aria-label={t('register.passwordLabel')}
          label={t('register.passwordLabel')}
          name="password"
          value={formValues.password}
          onChange={(value) => updateFormValue('password', value)}
          description={t('common.passwordRules')}
          errorMessage={formErrors.password}
          isRequired
        >
          <PasswordInput
            placeholder={t('register.passwordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('register.confirmPasswordLabel')}
          label={t('register.confirmPasswordLabel')}
          name="confirmPassword"
          value={formValues.confirmPassword}
          onChange={(value) => updateFormValue('confirmPassword', value)}
          errorMessage={formErrors.confirmPassword}
          isRequired
        >
          <PasswordInput
            placeholder={t('register.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            showPasswordLabel={t('common.showPassword')}
            hidePasswordLabel={t('common.hidePassword')}
          />
        </FormField>

        <FormField
          aria-label={t('register.inviteCodeLabel')}
          label={t('register.inviteCodeLabel')}
          name="inviteCode"
          value={formValues.inviteCode}
          onChange={(value) => updateFormValue('inviteCode', normalizeInviteCode(value))}
          errorMessage={formErrors.inviteCode}
        >
          <AuthIconField
            icon={Gift}
            placeholder={t('register.inviteCodePlaceholder')}
            maxLength={INVITE_CODE_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
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
            {t('register.submit')}
          </AppButton>
          <div className={auth.centerLinks}>
            <span>
              {t('register.hasAccount')}
              <Link to={appendRedirectParam(APP_ROUTE_PATH.AUTH_LOGIN, redirectPath)}>
                {t('register.toLogin')}
              </Link>
            </span>
          </div>
        </div>
      </Form>

      <div className={auth.leftBottomLinks}>
        <Checkbox isSelected={agreement} onChange={setAgreement}>
          {t('register.agreementCheckedPrefix')}
        </Checkbox>
        <Link to="#" onClick={() => setContractOpen(true)}>
          {t('register.agreementLink')}
        </Link>
      </div>

      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
    </div>
  );
}

export default Register;
