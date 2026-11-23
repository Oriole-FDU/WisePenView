import { useMemoizedFn } from 'ahooks';
import { matchPath, useLocation } from 'react-router-dom';

import type { MarkdownResourceResolver } from '@/components/base/Markdown';
import { useNoteExternalNavigationStore } from '@/components/editors/note/_store/useNoteExternalNavigationStore';
import {
  parseNoteLinkUrl,
  resolveNoteLinkAction,
} from '@/components/editors/note/noteLinkProtocol';
import { normalizeResourceKind, RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useOpenResource } from '@/hooks/useOpenResource';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

/** 读取当前路由上已打开的笔记 ID；其它资源或非资源页返回 null。 */
function readOpenNoteId(pathname: string): string | null {
  const match = matchPath(`${APP_ROUTE_PATH.RESOURCES}/:resourceType/:resourceId`, pathname);
  if (!match) return null;
  if (normalizeResourceKind(match.params.resourceType) !== RESOURCE_KIND.NOTE) return null;
  return match.params.resourceId?.trim() || null;
}

/**
 * 助手消息中的原文链接解析器。
 *
 * 只放行能严格解析的 note 协议地址，点击时按当前路由决定是「只滚动」还是「打开并滚动」；
 * 其余地址返回 undefined 交给 Markdown 默认处理（在 chat 里即渲染为纯文本）。
 */
export function useNoteLinkResolver(): MarkdownResourceResolver {
  const location = useLocation();
  const openResource = useOpenResource();
  const requestExternalNavigation = useNoteExternalNavigationStore(
    (state) => state.requestExternalNavigation
  );

  const resolveUrl = useMemoizedFn((url: string, kind: 'link' | 'image') =>
    kind === 'link' && parseNoteLinkUrl(url) ? url : undefined
  );

  const onLinkClick = useMemoizedFn((url: string) => {
    const target = parseNoteLinkUrl(url);
    if (!target) return false;

    const action = resolveNoteLinkAction({
      currentNoteId: readOpenNoteId(location.pathname),
      targetNoteId: target.resourceId,
    });
    // 先派发定位请求再打开笔记，保证新挂载的笔记能立刻消费到这次定位
    requestExternalNavigation(target);
    if (action === 'open') {
      openResource({ resourceId: target.resourceId, resourceType: RESOURCE_KIND.NOTE });
    }
    return true;
  });

  return { onLinkClick, resolveUrl };
}
