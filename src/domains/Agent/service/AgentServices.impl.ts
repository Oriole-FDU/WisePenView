import type { IUserService } from '@/domains/User';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { AgentApi } from '../apis/AgentApi';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService } from './index.type';

interface AgentServicesDeps {
  userService: IUserService;
}

export const createAgentServices = ({ userService }: AgentServicesDeps): IAgentService => ({
  async createAgent(title, name, description, pathTagId) {
    const resourceId = await AgentApi.createAgent({ title, name, description, pathTagId });
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.AGENT_CREATE_RESOURCE_ID_MISSING);
    }
    return resourceId;
  },
  async getAgentDetail(resourceId, version) {
    const [user, info] = await Promise.all([
      userService.getUserInfo(),
      AgentApi.getAgentInfo(resourceId),
    ]);
    const publishedVersion = info?.agentInfo?.version ?? 0;
    const targetVersion =
      version ??
      (info?.resourceInfo?.ownerId === user.id ? publishedVersion + 1 : publishedVersion);
    const bundle =
      targetVersion > 0
        ? await AgentApi.getAgentVersionBundleInfo(resourceId, targetVersion)
        : undefined;
    return AgentServicesMap.mapAgentDetail({ resourceId, info, bundle, currentUserId: user.id });
  },
  async saveAgentDraft(request) {
    const requests = AgentServicesMap.mapSaveAgentDraftRequests(request);
    await Promise.all([
      AgentApi.changeAgentInfo(requests.info),
      AgentApi.updateAgentSpec(requests.spec),
    ]);
  },
  async publishVersion(resourceId) {
    await AgentApi.publishAgentVersion(resourceId);
  },
  async uploadAsset(resourceId, draftVersion, { file, path = '/' }) {
    const response = await AgentApi.initUploadAgentAssets({
      resourceId,
      draftVersion,
      assets: [
        {
          name: file.name,
          path,
          assetResourceType: AgentServicesMap.resolveAssetResourceType(file.name),
          md5: await computeFileMd5(file),
          expectedSize: file.size,
        },
      ],
    });
    const ticket = response?.assetUploadTickets?.[0];
    if (!ticket?.assetId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.AGENT_UPLOAD_ASSET_ID_MISSING);
    }
    if (ticket.putUrl && ticket.callbackHeader) {
      await putOssPresignedUrl({
        putUrl: ticket.putUrl,
        callbackHeader: ticket.callbackHeader,
        body: file,
      });
    }
  },
  async deleteAssets(resourceId, draftVersion, assetIds) {
    if (assetIds.length === 0) return;
    await AgentApi.deleteAgentAssets({ resourceId, draftVersion, assetIds });
  },
});
