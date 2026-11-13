import type { TextFieldProps } from '@heroui/react';
import type { ReactNode } from 'react';

import type { FieldHelpProps } from '@/components/base/FieldHelp';

export interface FormFieldProps extends Omit<TextFieldProps, 'children' | 'className'> {
  label?: ReactNode;
  help?: FieldHelpProps;
  errorMessage?: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
}
