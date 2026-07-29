import type { IResourceService } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import type { IUserService } from '@/domains/User';
import type { AssetUploadTicketApiResponse } from '@/domains/_shared/apis/versionAssetApi.type';
import { createOssStsClientManager } from '@/domains/_shared/ossStsClient';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { SkillApi } from '../apis/SkillApi';
import { SkillServicesMap } from '../mapper/SkillServices.map';
import type {
  ISkillService,
  MoveSkillAssetResult,
  UploadSkillAssetRequest,
  UploadSkillAssetResult,
  UploadSkillAssetsOptions,
} from './index.type';

interface SkillServicesDeps {
  resourceService: IResourceService;
  userService: IUserService;
}

const DEFAULT_UPLOAD_CONCURRENCY = 4;
const DEFAULT_UPLOAD_INIT_BATCH_SIZE = 12;

interface SkillAssetClientKey {
  resourceId: string;
  targetVersion?: number;
}

function buildUploadBody(params: UploadSkillAssetRequest): Blob {
  if (params.content instanceof Blob) return params.content;
  return new Blob([params.content ?? ''], { type: 'text/plain;charset=utf-8' });
}

function resolveUploadClientId(params: UploadSkillAssetRequest, index: number): string {
  return params.clientId ?? `${params.path}:${params.name}:${String(index)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTextReadable(value: unknown): value is { text: () => Promise<string> } {
  return isRecord(value) && typeof value.text === 'function';
}

async function stringifyOssContent(content: unknown): Promise<string> {
  if (typeof content === 'string') return content;
  if (content instanceof ArrayBuffer) return new TextDecoder().decode(content);
  if (ArrayBuffer.isView(content)) return new TextDecoder().decode(content);
  if (content instanceof Blob) return content.text();
  if (isTextReadable(content)) return content.text();
  return content == null ? '' : String(content);
}

async function toOssBlob(content: unknown): Promise<Blob> {
  if (content instanceof Blob) return content;
  if (content instanceof ArrayBuffer) return new Blob([content]);
  if (ArrayBuffer.isView(content)) {
    const copy = new Uint8Array(content.byteLength);
    copy.set(new Uint8Array(content.buffer, content.byteOffset, content.byteLength));
    return new Blob([copy]);
  }
  if (isTextReadable(content)) return new Blob([await content.text()]);
  return new Blob([content == null ? '' : String(content)]);
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  return results;
}

export const createSkillServices = (deps: SkillServicesDeps): ISkillService => {
  const { resourceService, userService } = deps;
  const assetClientManager = createOssStsClientManager<SkillAssetClientKey>({
    loadToken: ({ resourceId, targetVersion }) =>
      SkillApi.getSkillAssetStsToken({ resourceId, targetVersion }),
    resolveCacheKey: ({ resourceId, targetVersion }) =>
      `${resourceId}:${targetVersion ?? 'published'}`,
  });

  const readAssetContent = async (
    resourceId: string,
    objectKey: string,
    targetVersion?: number
  ) => {
    return assetClientManager.runWithClient({ resourceId, targetVersion }, async (client) => {
      const result = await client.get(objectKey);
      return stringifyOssContent(result.content);
    });
  };

  const readAssetBlob = async (resourceId: string, objectKey: string, targetVersion?: number) => {
    return assetClientManager.runWithClient({ resourceId, targetVersion }, async (client) => {
      const result = await client.get(objectKey);
      return toOssBlob(result.content);
    });
  };

  const getSkillSummaries = async (groupId?: string) => {
    const base = {
      page: 1,
      size: 100,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      resourceType: 'SKILL',
    };
    const page = groupId
      ? await resourceService.getGroupResources({ ...base, groupId })
      : await resourceService.getUserResources(base);
    return page.list.map(SkillServicesMap.mapSkillSummary).filter((item) => item.resourceId);
  };

  const createSkill = async (
    title: string,
    name?: string,
    description?: string,
    pathTagId?: string
  ) => {
    const resourceId = await SkillApi.createSkill({ title, name, description, pathTagId });
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_CREATE_RESOURCE_ID_MISSING);
    }
    return resourceId;
  };

  const forkSkill: ISkillService['forkSkill'] = async (params) => {
    const resourceId = await SkillApi.forkSkill(params);
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_COPY_RESOURCE_ID_MISSING);
    }
    return resourceId;
  };

  const getSkillDetail = async (resourceId: string) => {
    const [currentUser, info] = await Promise.all([
      userService.getUserInfo(),
      SkillApi.getSkillInfo({ resourceId }),
    ]);
    const publishedVersion = info?.skillInfo?.version ?? 0;
    const isOwner = info?.resourceInfo?.ownerId === currentUser.id;
    const targetVersion = isOwner ? publishedVersion + 1 : publishedVersion;
    const bundle =
      targetVersion > 0
        ? await SkillApi.getSkillVersionBundleInfo({
            resourceId,
            version: targetVersion,
          })
        : undefined;

    return SkillServicesMap.mapSkillDetail({
      resourceId,
      info,
      bundle,
      currentUserId: currentUser.id,
    });
  };

  const getSkillVersionFiles = async (resourceId: string, version: number) => {
    const [currentUser, info, bundle] = await Promise.all([
      userService.getUserInfo(),
      SkillApi.getSkillInfo({ resourceId }),
      SkillApi.getSkillVersionBundleInfo({ resourceId, version }),
    ]);

    return SkillServicesMap.mapSkillDetail({
      resourceId,
      info,
      bundle,
      currentUserId: currentUser.id,
    });
  };

  const updateSkillInfo = async (resourceId: string, name?: string, description?: string) => {
    await SkillApi.changeSkillInfo({ resourceId, name, description });
  };

  const publishVersion = async (resourceId: string) => {
    await SkillApi.publishSkillVersion({ resourceId });
  };

  const loadAssetContent = async (
    resourceId: string,
    objectKey: string,
    targetVersion?: number
  ) => {
    if (!objectKey) {
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_FILE_OBJECT_KEY_MISSING);
    }
    return readAssetContent(resourceId, objectKey, targetVersion);
  };

  const loadAssetBlob = async (resourceId: string, objectKey: string, targetVersion?: number) => {
    if (!objectKey) {
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_FILE_OBJECT_KEY_MISSING);
    }
    return readAssetBlob(resourceId, objectKey, targetVersion);
  };

  const deleteAssets = async (resourceId: string, draftVersion: number, assetIds: string[]) => {
    if (assetIds.length === 0) return;
    await SkillApi.deleteSkillAssets({ resourceId, draftVersion, assetIds });
  };

  const uploadAssets = async (
    resourceId: string,
    draftVersion: number,
    assets: UploadSkillAssetRequest[],
    options?: UploadSkillAssetsOptions
  ): Promise<UploadSkillAssetResult[]> => {
    if (assets.length === 0) return [];

    const entries = assets.map((asset, index) => ({
      request: asset,
      body: buildUploadBody(asset),
      clientId: resolveUploadClientId(asset, index),
    }));
    const results = new Array<UploadSkillAssetResult>(entries.length);

    for (let start = 0; start < entries.length; start += DEFAULT_UPLOAD_INIT_BATCH_SIZE) {
      const batchEntries = entries.slice(start, start + DEFAULT_UPLOAD_INIT_BATCH_SIZE);
      let tickets: AssetUploadTicketApiResponse[] = [];

      try {
        const res = await SkillApi.initUploadSkillAssets({
          resourceId,
          draftVersion,
          assets: batchEntries.map(({ request, body }) => ({
            name: request.name,
            path: request.path,
            assetResourceType: SkillServicesMap.resolveAssetResourceType(request.name),
            md5: request.md5,
            expectedSize: request.size ?? body.size,
          })),
        });
        tickets = res?.assetUploadTickets ?? [];
      } catch (error) {
        batchEntries.forEach(({ request, clientId }, batchIndex) => {
          results[start + batchIndex] = {
            clientId,
            name: request.name,
            path: request.path,
            error,
          };
        });
        continue;
      }

      const batchResults = await runWithConcurrency(
        batchEntries,
        options?.concurrency ?? DEFAULT_UPLOAD_CONCURRENCY,
        async ({ request, body, clientId }, index) => {
          const ticket = tickets[index];
          try {
            if (!ticket?.assetId) {
              throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_UPLOAD_ASSET_ID_MISSING, {
                fileName: request.name,
              });
            }

            options?.onProgress?.({ clientId, progress: 0 });
            if (ticket.putUrl && ticket.callbackHeader) {
              await putOssPresignedUrl({
                putUrl: ticket.putUrl,
                callbackHeader: ticket.callbackHeader,
                body,
                onProgress: (progress) => options?.onProgress?.({ clientId, progress }),
              });
            }
            options?.onProgress?.({ clientId, progress: 100 });

            return {
              clientId,
              name: request.name,
              path: request.path,
              assetId: ticket.assetId,
              objectKey: ticket.objectKey,
            };
          } catch (error) {
            if (ticket?.assetId) {
              await SkillApi.deleteSkillAssets({
                resourceId,
                draftVersion,
                assetIds: [ticket.assetId],
              }).catch(() => undefined);
            }
            return {
              clientId,
              name: request.name,
              path: request.path,
              assetId: ticket?.assetId,
              error,
            };
          }
        }
      );

      batchResults.forEach((result, batchIndex) => {
        results[start + batchIndex] = result;
      });
    }

    return results;
  };

  const moveAssets: ISkillService['moveAssets'] = async (
    resourceId: string,
    draftVersion: number,
    assets
  ) => {
    if (assets.length === 0) return [];

    const uploadRequests = await Promise.all(
      assets.map(async ({ assetId, objectKey, name, path, content }) => {
        let nextContent = content;
        if (nextContent === undefined) {
          if (!objectKey) {
            throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_FILE_OBJECT_KEY_MISSING);
          }
          nextContent = await readAssetBlob(resourceId, objectKey, draftVersion);
        }
        return {
          clientId: assetId,
          name,
          path,
          content: nextContent,
        };
      })
    );
    const results = await uploadAssets(resourceId, draftVersion, uploadRequests);
    const createdAssetIds = results.flatMap((result) =>
      result.assetId && !result.error ? [result.assetId] : []
    );
    const failedResult = results.find((result) => result.error);
    if (failedResult?.error) {
      await deleteAssets(resourceId, draftVersion, createdAssetIds).catch(() => undefined);
      throw failedResult.error;
    }

    const missingAssetIdResult = results.find((result) => !result.assetId);
    if (missingAssetIdResult || results.length !== assets.length) {
      await deleteAssets(resourceId, draftVersion, createdAssetIds).catch(() => undefined);
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_UPLOAD_ASSET_ID_MISSING, {
        fileName: missingAssetIdResult?.name,
      });
    }
    const missingObjectKeyResult = results.find((result) => !result.objectKey);
    if (missingObjectKeyResult) {
      await deleteAssets(resourceId, draftVersion, createdAssetIds).catch(() => undefined);
      throw createClientError(FRONTEND_CLIENT_ERROR.SKILL_FILE_OBJECT_KEY_MISSING, {
        fileName: missingObjectKeyResult.name,
      });
    }
    const movedAssets: MoveSkillAssetResult[] = results.flatMap((result) =>
      result.assetId && result.objectKey
        ? [
            {
              previousAssetId: result.clientId,
              assetId: result.assetId,
              objectKey: result.objectKey,
            },
          ]
        : []
    );

    await deleteAssets(
      resourceId,
      draftVersion,
      assets.map((asset) => asset.assetId)
    );
    return movedAssets;
  };

  return {
    getSkillSummaries,
    createSkill,
    forkSkill,
    getSkillDetail,
    getSkillVersionFiles,
    updateSkillInfo,
    publishVersion,
    loadAssetContent,
    loadAssetBlob,
    deleteAssets,
    uploadAssets,
    moveAssets,
  };
};
