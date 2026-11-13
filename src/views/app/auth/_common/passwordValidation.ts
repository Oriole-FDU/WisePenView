import { runFieldValidation } from '@/utils/validation/formValidation';

type PasswordValidationMessages = {
  required: string;
  minLength: string;
  containsLetter: string;
  containsNumber: string;
};

type ConfirmPasswordValidationMessages = {
  required: string;
  mismatch: string;
};

/** 认证页面共用密码输入规则；空值即必填错误。 */
export function validatePasswordField(
  password: string,
  messages: PasswordValidationMessages
): string | undefined {
  return runFieldValidation([
    { test: () => password.length > 0, message: messages.required },
    { test: () => password.length >= 9, message: messages.minLength },
    { test: () => /[a-zA-Z]/.test(password), message: messages.containsLetter },
    { test: () => /[0-9]/.test(password), message: messages.containsNumber },
  ]);
}

/** 认证页面共用第二次密码输入规则；空值即必填错误。 */
export function validateConfirmPasswordField(
  confirmPassword: string,
  password: string,
  messages: ConfirmPasswordValidationMessages
): string | undefined {
  return runFieldValidation([
    { test: () => confirmPassword.length > 0, message: messages.required },
    { test: () => confirmPassword === password, message: messages.mismatch },
  ]);
}
