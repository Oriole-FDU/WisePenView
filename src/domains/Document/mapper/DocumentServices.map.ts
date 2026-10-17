import {
  assertApiArray,
  assertApiRecord,
  invalidApiResponse,
  isRecord,
  optionalApiNumber,
  optionalApiString,
} from '@/apis/runtimeContract';
import type { ResourcePermissionOverview } from '@/domains/Resource';
import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type {
  DocMetaInfoApiResponse,
  GetDocInfoApiResponse,
  ListPendingDocsApiResponse,
  OnlyOfficeEditorConfigApiResponse,
  PendingDocItemApiResponse,
  PendingDocumentStatusApiResponse,
  UploadDocApiRequest,
  UploadDocApiResponse,
} from '../apis/DocumentApi.type';
import type {
  DocDisplayInfoResponse,
  DocMetaInfo,
  DocumentProcessStatus,
  PendingDocItem,
} from '../service/index.type';

interface UploadDocRequestParams extends Omit<UploadDocApiRequest, 'mountTargetTagId'> {
  pathTagId: string;
}

const mapUploadDocToApi = ({
  filename,
  extension,
  md5,
  expectedSize,
  pathTagId,
}: UploadDocRequestParams): UploadDocApiRequest => ({
  filename,
  extension,
  md5,
  expectedSize,
  mountTargetTagId: pathTagId,
});

const normalizeOptionalId = (value: string | number | null | undefined): string | null => {
  const normalized = normalizeId(value);
  return normalized || null;
};

const mapDocumentProcessStatusFromApi = (
  data: PendingDocumentStatusApiResponse
): DocumentProcessStatus => {
  if (!isRecord(data) || typeof data.status !== 'string') invalidApiResponse('文档状态契约无效');
  return { status: data.status, errorMessage: optionalApiString(data.errorMessage) };
};

const mapDocMetaInfoFromApi = (
  data: DocMetaInfoApiResponse & { version?: number }
): DocMetaInfo => {
  const record = assertApiRecord(data, '文档元信息契约无效');
  if (
    !isRecord(record.uploadMeta) ||
    typeof record.uploadMeta.documentName !== 'string' ||
    typeof record.uploadMeta.fileType !== 'string' ||
    !isRecord(record.documentStatus) ||
    typeof record.documentStatus.status !== 'string'
  )
    invalidApiResponse('文档元信息契约无效');
  return {
    maxPreviewPages: optionalApiNumber(data.maxPreviewPages) ?? null,
    version: optionalApiNumber(data.version),
    uploadMeta: {
      documentName: data.uploadMeta.documentName,
      fileType: data.uploadMeta.fileType,
      uploaderId: normalizeOptionalId(data.uploadMeta.uploaderId),
      size: normalizeNonNegativeNumber(data.uploadMeta.size) ?? 0,
    },
    documentStatus: mapDocumentProcessStatusFromApi(data.documentStatus),
  };
};

const mapPendingDocItemFromApi = (item: PendingDocItemApiResponse): PendingDocItem => {
  if (!isRecord(item) || typeof item.documentId !== 'string')
    invalidApiResponse('待处理文档标识契约无效');
  return { documentId: item.documentId, ...mapDocMetaInfoFromApi(item) };
};

const mapListPendingDocsFromApi = (data: ListPendingDocsApiResponse): PendingDocItem[] => {
  assertApiArray(data, isRecord, '待处理文档列表契约无效');
  return data.map(mapPendingDocItemFromApi);
};

const readDocumentVersionInfoFromApi = (
  data: GetDocInfoApiResponse
): DocMetaInfoApiResponse & { version?: number } => {
  if (data.documentVersionInfo == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_VERSION_INFO_MISSING);
  }
  return data.documentVersionInfo;
};

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => {
  assertApiRecord(data, '文档信息契约无效');
  if (!isRecord(data.resourceInfo)) invalidApiResponse('文档资源信息契约无效');
  return {
    docMetaInfo: mapDocMetaInfoFromApi(readDocumentVersionInfoFromApi(data)),
    resourceInfo: ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo),
    authorsDisplay: isRecord(data.authorsDisplay)
      ? Object.fromEntries(
          Object.entries(data.authorsDisplay).flatMap(([userId, userInfo]) => {
            const normalized = normalizeUserDisplayBaseFromApi(userInfo);
            return normalized ? [[userId, normalized] as const] : [];
          })
        )
      : undefined,
  };
};

const mapDocPermissionOverviewFromApi = (
  data: GetDocInfoApiResponse,
  resourceId: string
): ResourcePermissionOverview =>
  ResourceServicesMap.mapResourcePermissionOverviewFromApi(data.resourceInfo, resourceId);

const mapUploadDocFromApi = (data: UploadDocApiResponse | undefined): UploadDocApiResponse => {
  if (
    !isRecord(data) ||
    typeof data.documentId !== 'string' ||
    !data.documentId ||
    typeof data.objectKey !== 'string' ||
    typeof data.flashUploaded !== 'boolean'
  )
    invalidApiResponse('文档上传回执契约无效');
  if (
    !data ||
    (!data.flashUploaded &&
      (typeof data.putUrl !== 'string' ||
        !data.putUrl ||
        typeof data.callbackHeader !== 'string' ||
        !data.callbackHeader))
  )
    return invalidApiResponse('文档上传凭据契约无效');
  return {
    documentId: data.documentId,
    objectKey: data.objectKey,
    flashUploaded: data.flashUploaded,
    putUrl: optionalApiString(data.putUrl) ?? null,
    callbackHeader: optionalApiString(data.callbackHeader) ?? null,
  };
};

const mapOnlyOfficeConfigFromApi = (
  data: OnlyOfficeEditorConfigApiResponse
): OnlyOfficeEditorConfigApiResponse => {
  assertApiRecord(data, 'OnlyOffice 响应契约无效');
  return {
    sessionId: optionalApiString(data.sessionId),
    config: isRecord(data.config) ? data.config : undefined,
  };
};

export const DocumentServicesMap = {
  mapUploadDocToApi,
  mapUploadDocFromApi,
  mapOnlyOfficeConfigFromApi,
  mapDocumentProcessStatusFromApi,
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
  mapDocPermissionOverviewFromApi,
};
