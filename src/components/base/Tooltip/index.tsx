import { Tooltip as HeroTooltip } from '@heroui/react';
import { clsx } from 'clsx';

import type { TooltipContentProps, TooltipProps } from './index.type';
import styles from './style.module.scss';

function TooltipRoot(props: TooltipProps) {
  return <HeroTooltip {...props} />;
}

function TooltipContent({ className, ...props }: TooltipContentProps) {
  return <HeroTooltip.Content className={clsx(styles.content, className)} {...props} />;
}

export const Tooltip = Object.assign(TooltipRoot, {
  Arrow: HeroTooltip.Arrow,
  Content: TooltipContent,
  Root: TooltipRoot,
  Trigger: HeroTooltip.Trigger,
});

export default Tooltip;
