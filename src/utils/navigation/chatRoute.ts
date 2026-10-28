import { matchPath, matchRoutes, type Path } from 'react-router-dom';

import { APP_ROUTE_PATH, buildChatPath } from './appRoute';

type ChatLocation = Pick<Path, 'pathname'> & Partial<Path>;

/** 内嵌聊天会话的查询参数名；切换会话只改变该参数，不代表离开当前资源。 */
export const CHAT_SESSION_QUERY_KEY = 'chat';

export const getChatSessionId = (location: ChatLocation): string | undefined => {
  const chatRoute = matchRoutes([{ path: `${APP_ROUTE_PATH.CHAT}/:sessionId?` }], location)?.[0];
  if (!chatRoute) {
    return new URLSearchParams(location.search).get(CHAT_SESSION_QUERY_KEY) || undefined;
  }
  return chatRoute.params.sessionId;
};

/** 内嵌聊天只更新 chat query，保留资源／课程位置、查看参数和锚点。 */
export const buildChatSessionLocation = (location: ChatLocation, sessionId?: string): Path => {
  const isChatPage = matchPath(`${APP_ROUTE_PATH.CHAT}/:sessionId?`, location.pathname) != null;
  const search = new URLSearchParams(location.search);
  if (isChatPage || !sessionId) search.delete(CHAT_SESSION_QUERY_KEY);
  else search.set(CHAT_SESSION_QUERY_KEY, sessionId);
  const query = search.toString();
  return {
    pathname: isChatPage ? buildChatPath(sessionId) : location.pathname,
    search: query ? `?${query}` : '',
    hash: location.hash ?? '',
  };
};
