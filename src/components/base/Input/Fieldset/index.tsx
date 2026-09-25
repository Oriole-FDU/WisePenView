import { Fieldset as HeroFieldset } from '@heroui/react';
import { clsx } from 'clsx';

import type {
  FieldGroupProps,
  FieldsetActionsProps,
  FieldsetLegendProps,
  FieldsetProps,
} from './index.type';
import styles from './style.module.less';

function FieldsetRoot({ className, ...props }: FieldsetProps) {
  return <HeroFieldset className={clsx(styles.fieldset, className)} {...props} />;
}

function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return <HeroFieldset.Legend className={clsx(styles.legend, className)} {...props} />;
}

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return <HeroFieldset.Group className={clsx(styles.group, className)} {...props} />;
}

function FieldsetActions({ className, ...props }: FieldsetActionsProps) {
  return <HeroFieldset.Actions className={clsx(styles.actions, className)} {...props} />;
}

const Fieldset = Object.assign(FieldsetRoot, {
  Actions: FieldsetActions,
  Group: FieldGroup,
  Legend: FieldsetLegend,
  Root: FieldsetRoot,
});

export type { FieldGroupProps, FieldsetActionsProps, FieldsetLegendProps, FieldsetProps };
export default Fieldset;
