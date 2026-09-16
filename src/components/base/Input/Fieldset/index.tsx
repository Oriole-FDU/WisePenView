import { Fieldset as HeroFieldset } from '@heroui/react';

import { cn } from '@/utils/cn';

import type {
  FieldGroupProps,
  FieldsetActionsProps,
  FieldsetLegendProps,
  FieldsetProps,
} from './index.type';
import styles from './style.module.less';

function FieldsetRoot({ className, ...props }: FieldsetProps) {
  return <HeroFieldset className={cn(styles.fieldset, className)} {...props} />;
}

function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return <HeroFieldset.Legend className={cn(styles.legend, className)} {...props} />;
}

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return <HeroFieldset.Group className={cn(styles.group, className)} {...props} />;
}

function FieldsetActions({ className, ...props }: FieldsetActionsProps) {
  return <HeroFieldset.Actions className={cn(styles.actions, className)} {...props} />;
}

const Fieldset = Object.assign(FieldsetRoot, {
  Actions: FieldsetActions,
  Group: FieldGroup,
  Legend: FieldsetLegend,
  Root: FieldsetRoot,
});

export type { FieldGroupProps, FieldsetActionsProps, FieldsetLegendProps, FieldsetProps };
export default Fieldset;
