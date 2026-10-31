import type { ResourceInteractionRecord } from '../entity/interaction';

export interface IResourceInteractionService {
  getResourceInteraction(resourceId: string): Promise<ResourceInteractionRecord>;
  toggleResourceLike(resourceId: string): Promise<void>;
  rateResource(params: RateResourceRequest): Promise<void>;
  recordResourceRead(resourceId: string): Promise<void>;
}

export interface RateResourceRequest {
  resourceId: string;
  score: number;
}
