export {
  /** @deprecated 使用 FRONTEND_DOMAIN_ERROR */
  FRONTEND_CLIENT_ERROR,
  FRONTEND_COMPONENT_ERROR,
  FRONTEND_DOMAIN_ERROR,
  FRONTEND_NETWORK_ERROR,
  /** @deprecated 使用 FrontendDomainErrorCode */
  type FrontendClientErrorCode,
  type FrontendComponentErrorCode,
  type FrontendDomainErrorCode,
  type FrontendNetworkErrorCode,
} from './codes';
export { createComponentError } from './createComponentError';
export { createDomainError } from './createDomainError';
/** @deprecated 使用 createDomainError / createComponentError */
export { createClientError } from './createClientError';
export { reportError } from './reportError';
export {
  isWisePenError,
  WisePenError,
  type WisePenErrorOptions,
  type WisePenErrorSource,
} from './WisePenError';
