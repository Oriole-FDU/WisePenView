import type { ReactNode } from 'react';

import type { ContentStateSize } from '../ContentState';

export interface ErrorStateProps {
  action?: ReactNode;
  className?: string;
  /** 错误对象；文案由 Feedback 内部解析。 */
  error: unknown;
  icon?: ReactNode;
  size?: ContentStateSize;
  /** 有 title 时解析结果作 description；无 title 时解析结果作 title。 */
  title?: ReactNode;
}
