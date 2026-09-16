import { Button as HeroButton } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { AppButtonProps } from './index.type';

function AppButton({ variant = 'secondary', className, ...props }: AppButtonProps) {
  return <HeroButton variant={variant} className={cn(className)} {...props} />;
}

export default AppButton;
export type { AppButtonProps } from './index.type';
