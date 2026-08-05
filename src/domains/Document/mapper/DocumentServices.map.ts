import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeUserDisplayBaseFromApi } from '@/domains/User/mapper/userEnum.mapper';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';
import type {
  DocMetaInfoApiResponse,
  GetDocInfoApiResponse,
  ListPendingDocsApiResponse,
  PendingDocItemApiResponse,
  PendingDocumentStatusApiResponse,
  UploadDocApiRequest,
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
): DocumentProcessStatus => ({
  status: data.status,
  errorMessage: data.errorMessage,
});

const mapDocMetaInfoFromApi = (
  data: DocMetaInfoApiResponse & { version?: number }
): DocMetaInfo => ({
  ...data,
  uploadMeta: {
    ...data.uploadMeta,
    uploaderId: normalizeOptionalId(data.uploadMeta.uploaderId),
    size: normalizeNonNegativeNumber(data.uploadMeta.size) ?? 0,
  },
  documentStatus: mapDocumentProcessStatusFromApi(data.documentStatus),
});

const mapPendingDocItemFromApi = (item: PendingDocItemApiResponse): PendingDocItem => ({
  ...item,
  ...mapDocMetaInfoFromApi(item),
});

const mapListPendingDocsFromApi = (data: ListPendingDocsApiResponse): PendingDocItem[] =>
  data.map(mapPendingDocItemFromApi);

const readDocumentVersionInfoFromApi = (
  data: GetDocInfoApiResponse
): DocMetaInfoApiResponse & { version?: number } => {
  if (data.documentVersionInfo == null) {
    throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_VERSION_INFO_MISSING);
  }
  return data.documentVersionInfo;
};

const mapGetDocInfoFromApi = (data: GetDocInfoApiResponse): DocDisplayInfoResponse => ({
  docMetaInfo: mapDocMetaInfoFromApi(readDocumentVersionInfoFromApi(data)),
  resourceInfo: ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo),
  authorsDisplay: data.authorsDisplay
    ? Object.fromEntries(
        Object.entries(data.authorsDisplay).flatMap(([userId, userInfo]) => {
          const normalized = normalizeUserDisplayBaseFromApi(userInfo);
          return normalized ? [[userId, normalized] as const] : [];
        })
      )
    : undefined,
});

export const DocumentServicesMap = {
  mapUploadDocToApi,
  mapDocumentProcessStatusFromApi,
  mapListPendingDocsFromApi,
  mapGetDocInfoFromApi,
};
