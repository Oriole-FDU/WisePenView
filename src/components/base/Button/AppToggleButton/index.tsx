import { ToggleButton as HeroToggleButton } from '@heroui/react';
import { clsx } from 'clsx';

import buttonStyles from '../shared/styles.module.scss';
import type { AppToggleButtonProps } from './index.type';

function AppToggleButton({ className, ...props }: AppToggleButtonProps) {
  return <HeroToggleButton className={clsx(buttonStyles.root, className)} {...props} />;
}

export default AppToggleButton;
