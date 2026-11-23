import type { IChatTurnService } from '@/domains/ChatTurn';

import { getContextValue } from './registry';
import type { ServicesContextValue } from './registry.types';

export function getServices(): ServicesContextValue {
  return getContextValue();
}

export function getChatTurnService(): IChatTurnService {
  return getServices().chatTurnService;
}
