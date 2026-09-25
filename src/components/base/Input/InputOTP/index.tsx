import {
  InputOTP as HeroInputOTP,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from '@heroui/react';
import { clsx } from 'clsx';

import type { InputOTPProps } from './index.type';
import styles from './style.module.less';

function InputOTPRoot({ className, variant = 'secondary', ...props }: InputOTPProps) {
  return <HeroInputOTP variant={variant} className={clsx(styles.inputOtp, className)} {...props} />;
}

const InputOTP = Object.assign(InputOTPRoot, {
  Group: HeroInputOTP.Group,
  Root: InputOTPRoot,
  Separator: HeroInputOTP.Separator,
  Slot: HeroInputOTP.Slot,
});

export { InputOTP, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS };
export type { InputOTPProps };
export default InputOTP;
