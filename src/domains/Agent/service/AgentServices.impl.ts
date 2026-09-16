import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { AgentApi, putOssPresignedUrl } from '@domain-apis';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService } from './index.type';

export const createAgentServices = (): IAgentService => ({
  async createAgent(title, name, description, pathTagId) {
    const resourceId = await AgentApi.createAgent({
      title,
      name,
      description,
      mountTargetTagId: pathTagId,
    });
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.AGENT_CREATE_RESOURCE_ID_MISSING);
    }
    return resourceId;
  },
  async getAgentDetail(resourceId, version) {
    const info = await AgentApi.getAgentInfo(resourceId);
    const bundle =
      version !== undefined && version > 0
        ? await AgentApi.getAgentVersionBundleInfo(resourceId, version)
        : undefined;
    return AgentServicesMap.mapAgentDetail({ resourceId, info, bundle });
  },
  async getAgentPermissionOverview(resourceId) {
    const data = await AgentApi.getAgentInfo(resourceId);
    return AgentServicesMap.mapAgentPermissionOverviewFromApi(data, resourceId);
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
