import { captureException } from '@/observability';
import { FRONTEND_DOMAIN_ERROR, type FrontendDomainErrorCode } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

/** 仅允许承载 i18n 错误文案中真实引用的插值字段。 */
type DomainErrorMetaByCode = {
  [FRONTEND_DOMAIN_ERROR.IMAGE_FILE_TOO_LARGE]: { maxSize: string | number };
  [FRONTEND_DOMAIN_ERROR.DRIVE_NODE_NOT_FOUND]: { nodeId: string };
  [FRONTEND_DOMAIN_ERROR.DRIVE_UNSUPPORTED_ROOT]: { rootId: string };
  [FRONTEND_DOMAIN_ERROR.DRIVE_UNSUPPORTED_CREATE_TYPE]: { type: string };
  [FRONTEND_DOMAIN_ERROR.OFFICE_LOAD_FAILED]: { errorCode: string | number };
  [FRONTEND_DOMAIN_ERROR.SPEECH_PROVIDER_UNSUPPORTED]: { provider: string };
  [FRONTEND_DOMAIN_ERROR.SPEECH_PROVIDER_FAILED]: { providerCode: string | number };
  [FRONTEND_DOMAIN_ERROR.SKILL_BATCH_SAVE_FAILED]: { failedCount: number };
  [FRONTEND_DOMAIN_ERROR.SKILL_UPLOAD_ASSET_ID_MISSING]: { fileName: string };
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_PATH_INVALID]: { path: string };
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_PATH_UNSAFE]: { path: string };
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_DUPLICATE_FILE]: { paths: string };
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_MAIN_FILE_MISSING]: { fileName: string };
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_IMPORT_CONFLICT]: { fileNames: string };
};

type DomainErrorWithMetaCode = keyof DomainErrorMetaByCode;
type DomainErrorWithoutMetaCode = Exclude<FrontendDomainErrorCode, DomainErrorWithMetaCode>;

export interface CreateDomainErrorOptions {
  cause?: unknown;
}

const DOMAIN_ERROR_META_CODES = {
  [FRONTEND_DOMAIN_ERROR.IMAGE_FILE_TOO_LARGE]: true,
  [FRONTEND_DOMAIN_ERROR.DRIVE_NODE_NOT_FOUND]: true,
  [FRONTEND_DOMAIN_ERROR.DRIVE_UNSUPPORTED_ROOT]: true,
  [FRONTEND_DOMAIN_ERROR.DRIVE_UNSUPPORTED_CREATE_TYPE]: true,
  [FRONTEND_DOMAIN_ERROR.OFFICE_LOAD_FAILED]: true,
  [FRONTEND_DOMAIN_ERROR.SPEECH_PROVIDER_UNSUPPORTED]: true,
  [FRONTEND_DOMAIN_ERROR.SPEECH_PROVIDER_FAILED]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_BATCH_SAVE_FAILED]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_UPLOAD_ASSET_ID_MISSING]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_PATH_INVALID]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_PATH_UNSAFE]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_DUPLICATE_FILE]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_MAIN_FILE_MISSING]: true,
  [FRONTEND_DOMAIN_ERROR.SKILL_ZIP_IMPORT_CONFLICT]: true,
} satisfies Record<DomainErrorWithMetaCode, true>;

const hasDomainErrorMeta = (code: FrontendDomainErrorCode): code is DomainErrorWithMetaCode =>
  Object.hasOwn(DOMAIN_ERROR_META_CODES, code);

export function createDomainError<C extends DomainErrorWithMetaCode>(
  code: C,
  meta: DomainErrorMetaByCode[C],
  options?: CreateDomainErrorOptions
): WisePenError;
export function createDomainError(
  code?: DomainErrorWithoutMetaCode,
  options?: CreateDomainErrorOptions
): WisePenError;
/** 创建 Domain 层错误（source: domain），并在产生时立即上报。 */
export function createDomainError(
  code: FrontendDomainErrorCode = FRONTEND_DOMAIN_ERROR.VALIDATION,
  metaOrOptions?: unknown,
  options?: CreateDomainErrorOptions
): WisePenError {
  const hasMeta = hasDomainErrorMeta(code);
  const meta = hasMeta
    ? (metaOrOptions as DomainErrorMetaByCode[DomainErrorWithMetaCode])
    : undefined;
  const resolvedOptions = hasMeta
    ? options
    : (metaOrOptions as CreateDomainErrorOptions | undefined);
  const error = new WisePenError({
    code,
    source: 'domain',
    meta,
    cause: resolvedOptions?.cause,
  });
  captureException(error, { detector: 'error-created' });
  return error;
}
