import type { IChatSessionService } from '@/domains/ChatSession';
import type { IChatTurnService } from '@/domains/ChatTurn';

import { getContextValue } from './registry';
import type { ServicesContextValue } from './registry.types';

export function getServices(): ServicesContextValue {
  return getContextValue();
}

export function getChatSessionService(): IChatSessionService {
  return getServices().chatSessionService;
}

export function getChatTurnService(): IChatTurnService {
  return getServices().chatTurnService;
}
