import { toast } from '@heroui/react';

import { captureException } from '@/observability';

import { parseErrorMessage } from './parseErrorMessage';
import type { WisePenError } from './WisePenError';

export type ReportToast = 'warning' | 'error' | 'info' | 'silence';

/** 唯一消费入口：可观测上报 + 用户兜底（toast）。只接受 WisePenError。 */
export const reportError = (error: WisePenError, toastLevel: ReportToast = 'error'): string => {
  const supportId = captureException(error, { detector: 'error-consumed' });
  if (toastLevel === 'silence') return supportId;

  const message = parseErrorMessage(error);
  if (toastLevel === 'warning') {
    toast.warning(message);
    return supportId;
  }
  if (toastLevel === 'info') {
    toast.info(message);
    return supportId;
  }
  toast.danger(message);
  return supportId;
};
