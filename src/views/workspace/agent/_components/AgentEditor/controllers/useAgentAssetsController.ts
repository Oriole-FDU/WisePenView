import { useAgentService } from '@/domains';
import type { AgentAsset } from '@/domains/Agent';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useState } from 'react';

interface UseAgentAssetsControllerOptions {
  assets: AgentAsset[];
  draftVersion: number;
  resourceId: string;
  t: TFunction<'agent' | 'common'>;
}

export function useAgentAssetsController({
  assets: sourceAssets,
  draftVersion,
  resourceId,
  t,
}: UseAgentAssetsControllerOptions) {
  const agentService = useAgentService();
  const [assetOverride, setAssetOverride] = useState<AgentAsset[] | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);

  const refreshAssets = async () => {
    try {
      const latest = await agentService.getAgentDetail(resourceId);
      setAssetOverride(latest.assets);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const uploadRequest = useRequest(
    async (files: File[]) => {
      for (const file of files) {
        await agentService.uploadAsset(resourceId, draftVersion, { file });
      }
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('agent:page.assetUploaded'));
        void refreshAssets();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const deleteRequest = useRequest(
    (assetId: string) => agentService.deleteAssets(resourceId, draftVersion, [assetId]),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('agent:page.assetDeleted'));
        void refreshAssets();
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const confirmDeleteAsset = async () => {
    if (!deleteAssetId) return;
    try {
      await deleteRequest.runAsync(deleteAssetId);
      setDeleteAssetId(null);
    } catch {
      // 请求错误已由当前控制器提示，保留弹窗供用户重试。
    }
  };

  return {
    assets: assetOverride ?? sourceAssets,
    closeDeleteAsset: () => setDeleteAssetId(null),
    confirmDeleteAsset,
    deleteAssetId,
    deleteLoading: deleteRequest.loading,
    requestDeleteAsset: setDeleteAssetId,
    uploadAssets: (files: File[]) => uploadRequest.run(files),
    uploadLoading: uploadRequest.loading,
  };
}
