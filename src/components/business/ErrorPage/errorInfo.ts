import { isRouteErrorResponse } from 'react-router-dom';

import i18n from '@/i18n';
import { FRONTEND_DOMAIN_ERROR, isWisePenError } from '@/utils/error';

export interface AppErrorInfo {
  status: 'error' | 'warning' | '404' | '403' | '500' | 'success' | 'info';
  title: string;
  /** 非 WisePenError 时的静态副文案；WisePenError 交给 ResultState 的 error 解析。 */
  subTitle?: string;
  useErrorObject: boolean;
}

export const buildAppErrorInfo = (error: unknown): AppErrorInfo => {
  if (isRouteErrorResponse(error)) {
    const status =
      error.status === 404
        ? '404'
        : error.status === 403
          ? '403'
          : error.status >= 500
            ? '500'
            : 'warning';
    return {
      status,
      title:
        error.status >= 500
          ? i18n.t('page.genericTitle', { ns: 'errors' })
          : i18n.t('page.requestError', { ns: 'errors', status: error.status }),
      subTitle: error.statusText || i18n.t('page.loadFailed', { ns: 'errors' }),
      useErrorObject: false,
    };
  }

  if (isWisePenError(error)) {
    const isInternal =
      error.code === FRONTEND_DOMAIN_ERROR.INTERNAL_STATE ||
      error.code === FRONTEND_DOMAIN_ERROR.UNKNOWN;
    return {
      status: isInternal ? '500' : 'warning',
      title: isInternal
        ? i18n.t('page.pageError', { ns: 'errors' })
        : i18n.t('page.operationIncomplete', { ns: 'errors' }),
      useErrorObject: true,
    };
  }

  if (error instanceof Error) {
    return {
      status: '500',
      title: i18n.t('page.genericTitle', { ns: 'errors' }),
      subTitle: i18n.t('page.unexpected', { ns: 'errors' }),
      useErrorObject: false,
    };
  }

  return {
    status: '500',
    title: i18n.t('page.genericTitle', { ns: 'errors' }),
    subTitle: i18n.t('page.unknown', { ns: 'errors' }),
    useErrorObject: false,
  };
};
