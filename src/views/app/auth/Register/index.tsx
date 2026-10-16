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
import { normalizeInviteCode } from '@/domains/Auth/utils/normalizeInviteCode';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH, readRegisterInviteCode } from '@/utils/navigation/appRoute';
import {
  type FieldErrors,
  hasFieldErrors,
  runFieldValidation,
} from '@/utils/validation/formValidation';
import ServiceAgreement from '@/views/app/auth/_components/ServiceAgreement/index';

import AuthIconField from '../_common/AuthIconField';
import auth from '../_common/style.module.less';

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

  /** 判断字段是否为空，用于区分「未填写」与「已填写但不合规」 */
  const isFieldEmpty = (field: RegisterField, values: RegisterFormValues): boolean => {
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

  /** 单字段校验规则，返回首个未通过的原因，供输入、失焦与提交共用 */
  const validateField = (
    field: RegisterField,
    values: RegisterFormValues,
    options: { withRequired?: boolean } = {}
  ): string | undefined => {
    // 填写过程中未填写不报红，必填提示只在提交时给出，避免满屏红框
    if (!options.withRequired && isFieldEmpty(field, values)) {
      return undefined;
    }
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
        return runFieldValidation([
          { test: () => values.password.length > 0, message: t('register.passwordRequired') },
          { test: () => values.password.length >= 9, message: t('register.passwordMinLength') },
          {
            test: () => /[a-zA-Z]/.test(values.password),
            message: t('register.passwordContainsLetter'),
          },
          {
            test: () => /[0-9]/.test(values.password),
            message: t('register.passwordContainsNumber'),
          },
        ]);
      case 'confirmPassword':
        return runFieldValidation([
          {
            test: () => values.confirmPassword.length > 0,
            message: t('register.confirmPasswordRequired'),
          },
          {
            test: () => values.confirmPassword === values.password,
            message: t('register.confirmPasswordMismatch'),
          },
        ]);
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

  /** 输入时实时校验当前字段；密码变更时同步重算确认密码，避免提示滞后 */
  const updateFormValue = (field: RegisterField, value: string) => {
    const nextValues = { ...formValues, [field]: value };
    setFormValues(nextValues);
    const fieldsToValidate: RegisterField[] =
      field === 'password' ? ['password', 'confirmPassword'] : [field];
    setFormErrors((prev) => {
      const nextErrors = { ...prev };
      fieldsToValidate.forEach((key) => {
        nextErrors[key] = validateField(key, nextValues);
      });
      return nextErrors;
    });
  };

  /** 失焦时校验当前字段；未填写的字段不报红，必填提示留到提交时 */
  const handleFieldBlur = (field: RegisterField) => {
    setFormErrors((prev) => ({ ...prev, [field]: validateField(field, formValues) }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors<RegisterField> = {
      username: validateField('username', formValues, { withRequired: true }),
      password: validateField('password', formValues, { withRequired: true }),
      confirmPassword: validateField('confirmPassword', formValues, { withRequired: true }),
      inviteCode: validateField('inviteCode', formValues, { withRequired: true }),
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
          onBlur={() => handleFieldBlur('username')}
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
          onBlur={() => handleFieldBlur('password')}
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
          onBlur={() => handleFieldBlur('confirmPassword')}
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
          onBlur={() => handleFieldBlur('inviteCode')}
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
