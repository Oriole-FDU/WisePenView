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
import UnsavedChangesDialog from '@/components/business/UnsavedChangesDialog';
import { useAuthService } from '@/domains';
import type { RegisterRequest } from '@/domains/Auth';
import { normalizeInviteCode } from '@/domains/Auth/utils/normalizeRegisterRequest';
import { useApi } from '@/hooks/useApi';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { APP_ROUTE_PATH, readRegisterInviteCode } from '@/utils/navigation/appRoute';
import { runFieldValidation } from '@/utils/validation/formValidation';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';

import AuthIconField from '../_common/AuthIconField';
import { validateConfirmPasswordField, validatePasswordField } from '../_common/passwordValidation';
import auth from '../_common/style.module.scss';

const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 20;
/** 用户名允许的字符：字母、数字或下划线 */
const USERNAME_ALLOWED_PATTERN = /^[a-zA-Z0-9_]+$/;
/** 用户名必须包含字母，用于排除纯数字（学工号） */
const USERNAME_LETTER_PATTERN = /[a-zA-Z]/;
/** 学工号格式：11 位数字，或 5 位数字 + XH + 4 位数字（与后端校验保持一致） */
const CAMPUS_NO_PATTERN = /^(\d{11}|\d{5}XH\d{4})$/;
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
  const [agreementError, setAgreementError] = useState<string>();
  const [contractOpen, setContractOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = readRedirectParam(location.search);
  /** 邀请链接携带的邀请码，用于初始化表单 */
  const linkedInviteCode = readRegisterInviteCode(location.search);

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

  const validateField = (field: RegisterField, values: RegisterFormValues): string | undefined => {
    switch (field) {
      case 'username': {
        const username = values.username.trim();
        return runFieldValidation([
          { test: () => username.length > 0, message: t('register.usernameRequired') },
          {
            test: () => !CAMPUS_NO_PATTERN.test(username),
            message: t('register.usernameIsCampusNo'),
          },
          {
            test: () =>
              username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH,
            message: t('register.usernameLength'),
          },
          {
            test: () => USERNAME_LETTER_PATTERN.test(username),
            message: t('register.usernameContainsLetter'),
          },
          {
            test: () => USERNAME_ALLOWED_PATTERN.test(username),
            message: t('register.usernamePattern'),
          },
        ]);
      }
      case 'password':
        return validatePasswordField(values.password, {
          required: t('register.passwordRequired'),
          minLength: t('register.passwordMinLength'),
          containsLetter: t('register.passwordContainsLetter'),
          containsNumber: t('register.passwordContainsNumber'),
        });
      case 'confirmPassword':
        return validateConfirmPasswordField(values.confirmPassword, values.password, {
          required: t('register.confirmPasswordRequired'),
          mismatch: t('register.confirmPasswordMismatch'),
        });
      case 'inviteCode':
        return runFieldValidation([
          {
            test: () => {
              const inviteCode = normalizeInviteCode(values.inviteCode);
              return inviteCode.length === 0 || INVITE_CODE_PATTERN.test(inviteCode);
            },
            message: t('register.inviteCodeInvalid'),
          },
        ]);
      default:
        return undefined;
    }
  };
  const isFieldEmpty = (field: RegisterField, values: RegisterFormValues) => {
    switch (field) {
      case 'username':
        return values.username.trim().length === 0;
      case 'password':
        return values.password.length === 0;
      case 'confirmPassword':
        return values.confirmPassword.length === 0;
      case 'inviteCode':
        return values.inviteCode.trim().length === 0;
      default:
        return false;
    }
  };

  const validation = useFormValidation<RegisterFormValues, RegisterField>({
    initialValues: () => ({
      ...DEFAULT_REGISTER_VALUES,
      inviteCode: linkedInviteCode,
    }),
    fields: ['username', 'password', 'confirmPassword', 'inviteCode'],
    validateField,
    isFieldEmpty,
  });
  const formValues = validation.values;
  const formErrors = validation.errors;

  /** 仅对已经失焦或在提交后需要持续反馈的字段重新校验。 */
  const updateFormValue = (field: RegisterField, value: string) => {
    validation.changeField(field, value, field === 'password' ? ['confirmPassword'] : []);
  };

  const handleAgreementChange = (selected: boolean) => {
    setAgreement(selected);
    if (selected) setAgreementError(undefined);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldsValid = validation.validateForm();
    setAgreementError(agreement ? undefined : t('register.agreementRequired'));
    if (!fieldsValid || !agreement) return;
    const inviteCode = normalizeInviteCode(formValues.inviteCode);
    submitRegister({
      username: formValues.username.trim(),
      password: formValues.password,
      ...(inviteCode ? { inviteCode } : {}),
    });
  };

  const hasDraft =
    formValues.username.length > 0 ||
    formValues.password.length > 0 ||
    formValues.confirmPassword.length > 0 ||
    (formValues.inviteCode.length > 0 && formValues.inviteCode !== linkedInviteCode) ||
    agreement;
  const leaveGuard = useUnsavedChangesGuard(hasDraft && !loading);

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
          onBlur={() => validation.blurField('username')}
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
          onBlur={() => validation.blurField('password')}
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
          onBlur={() => validation.blurField('confirmPassword')}
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
          onBlur={() => validation.blurField('inviteCode')}
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

        <div className={auth.agreement}>
          <Checkbox
            id="register-agreement"
            isSelected={agreement}
            isInvalid={Boolean(agreementError)}
            aria-describedby={agreementError ? 'register-agreement-error' : undefined}
            onChange={handleAgreementChange}
          >
            {t('register.agreementCheckedPrefix')}
          </Checkbox>
          <Link to="#" onClick={() => setContractOpen(true)}>
            {t('register.agreementLink')}
          </Link>
          {agreementError ? (
            <span id="register-agreement-error" className={auth.agreementError} role="alert">
              {agreementError}
            </span>
          ) : null}
        </div>

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

      <ServiceAgreement isOpen={contractOpen} onOpenChange={setContractOpen} />
      <UnsavedChangesDialog
        isOpen={leaveGuard.isBlocked}
        title={t('register.leaveTitle')}
        description={t('register.leaveDescription')}
        confirmText={t('register.leaveConfirm')}
        onCancel={leaveGuard.reset}
        onConfirm={leaveGuard.proceed}
      />
    </div>
  );
}

export default Register;
