import { ResourceInteractionApi } from '@domain-apis';

import { ResourceInteractionServicesMap } from '../mapper/ResourceInteractionServices.map';
import type { IResourceInteractionService } from './index.type';

async function getResourceInteraction(resourceId: string) {
  const data = await ResourceInteractionApi.getUserInteractionRecord({ resourceId });
  return ResourceInteractionServicesMap.mapResourceInteractionRecordFromApi(data);
}

async function toggleResourceLike(resourceId: string): Promise<void> {
  await ResourceInteractionApi.setLike({ resourceId });
}

async function rateResource(params: { resourceId: string; score: number }): Promise<void> {
  await ResourceInteractionApi.rate(params);
}

async function recordResourceRead(resourceId: string): Promise<void> {
  await ResourceInteractionApi.read({ resourceId });
}

export const createResourceInteractionServices = (): IResourceInteractionService => ({
  getResourceInteraction,
  toggleResourceLike,
  rateResource,
  recordResourceRead,
});
