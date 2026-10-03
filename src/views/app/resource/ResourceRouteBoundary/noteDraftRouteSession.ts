interface NoteDraftRouteSession {
  pathname: string;
  key: string;
  resourceId: string | undefined;
}

/** 仅空白页升级为自己的资源 URL 时保留编辑器；切换其它资源或重新新建时结束旧会话。 */
export function updateNoteDraftRouteSession(
  session: NoteDraftRouteSession,
  route: {
    pathname: string;
    key: string;
    newNote: boolean;
    resourceId?: string;
    noteEditor: boolean;
  }
): NoteDraftRouteSession {
  if (session.pathname === route.pathname && (!session.resourceId || route.noteEditor))
    return session;
  if (!route.newNote && route.noteEditor && session.resourceId === route.resourceId) {
    return { ...session, pathname: route.pathname };
  }
  return { pathname: route.pathname, key: route.key, resourceId: undefined };
}
