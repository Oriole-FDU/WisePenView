import { ChatRouter } from './ChatRouter/index.impl';
import type { ChatRouter as ChatRouterContract } from './ChatRouter/index.type';
import { SessionCoordinator } from './SessionCoordinator/index.impl';

let chatRouter: ChatRouterContract | null = null;

/** 命令式取得对话窄门（单例）；Context 选型本轮不做。 */
export function getChatRouter(): ChatRouterContract {
  if (!chatRouter) {
    chatRouter = new ChatRouter(new SessionCoordinator());
  }
  return chatRouter;
}
