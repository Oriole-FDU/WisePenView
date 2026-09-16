import { InputGroup as HeroInputGroup } from '@heroui/react';

import { cn } from '@/utils/cn';

import type { InputGroupProps } from './index.type';
import styles from './style.module.less';

function InputGroupRoot({ className, variant = 'secondary', ...props }: InputGroupProps) {
  return (
    <HeroInputGroup variant={variant} className={cn(styles.inputGroup, className)} {...props} />
  );
}

const InputGroup = Object.assign(InputGroupRoot, {
  Input: HeroInputGroup.Input,
  Prefix: HeroInputGroup.Prefix,
  Root: InputGroupRoot,
  Suffix: HeroInputGroup.Suffix,
  TextArea: HeroInputGroup.TextArea,
});

export type {
  InputGroupInputProps,
  InputGroupPrefixProps,
  InputGroupProps,
  InputGroupSuffixProps,
  InputGroupTextAreaProps,
} from './index.type';
export default InputGroup;
