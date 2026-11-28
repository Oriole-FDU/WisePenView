import type { ReactNode } from 'react';

import type { AppIconButtonTooltipOptions } from '@/components/base/Button/AppIconButton';

export interface FieldHelpProps {
  content: ReactNode;
  label: string;
  placement?: AppIconButtonTooltipOptions['placement'];
}
