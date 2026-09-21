import type { LucideIcon } from 'lucide-react';

import type { InputProps } from '@/components/base/Input';

export interface AuthIconFieldProps extends InputProps {
  /** 输入框左侧图标，默认使用用户图标 */
  icon?: LucideIcon;
}
