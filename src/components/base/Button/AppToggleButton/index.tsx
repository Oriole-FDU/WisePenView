import { ToggleButton as HeroToggleButton } from '@heroui/react';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

import buttonStyles from '../shared/styles.module.scss';

function AppToggleButton({ className, ...props }: ComponentProps<typeof HeroToggleButton>) {
  return <HeroToggleButton className={clsx(buttonStyles.root, className)} {...props} />;
}

export default AppToggleButton;
