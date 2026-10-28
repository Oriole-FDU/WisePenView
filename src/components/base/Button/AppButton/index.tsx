import { Button as HeroButton } from '@heroui/react';
import { clsx } from 'clsx';

import buttonStyles from '../shared/styles.module.scss';
import type { AppButtonProps } from './index.type';

function AppButton({
  variant = 'secondary',
  className,
  disablePressScale = false,
  ...props
}: AppButtonProps) {
  return (
    <HeroButton
      variant={variant}
      className={clsx(
        buttonStyles.root,
        disablePressScale && buttonStyles.disablePressScale,
        className
      )}
      {...props}
    />
  );
}

export default AppButton;
export type { AppButtonProps } from './index.type';
