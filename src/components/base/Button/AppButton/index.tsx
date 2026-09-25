import { Button as HeroButton } from '@heroui/react';
import { clsx } from 'clsx';

import type { AppButtonProps } from './index.type';

function AppButton({ variant = 'secondary', className, ...props }: AppButtonProps) {
  return <HeroButton variant={variant} className={clsx(className)} {...props} />;
}

export default AppButton;
export type { AppButtonProps } from './index.type';
