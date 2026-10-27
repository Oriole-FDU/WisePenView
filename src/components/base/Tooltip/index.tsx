import { Tooltip as HeroTooltip } from '@heroui/react';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

import styles from './style.module.scss';

function TooltipRoot(props: ComponentProps<typeof HeroTooltip>) {
  return <HeroTooltip {...props} />;
}

function TooltipContent({ className, ...props }: ComponentProps<typeof HeroTooltip.Content>) {
  return <HeroTooltip.Content className={clsx(styles.content, className)} {...props} />;
}

export const Tooltip = Object.assign(TooltipRoot, {
  Arrow: HeroTooltip.Arrow,
  Content: TooltipContent,
  Root: TooltipRoot,
  Trigger: HeroTooltip.Trigger,
});

export default Tooltip;
