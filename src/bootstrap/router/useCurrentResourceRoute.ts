import { useMatches } from 'react-router-dom';

import { normalizeResourceKind, type ResourceKind } from '@/domains/Resource/model/resourceTarget';

export interface CurrentResourceRoute {
  resourceType: ResourceKind;
  resourceId: string;
}

/** 从当前路由匹配参数读取资源身份，避免业务侧自行解析 pathname。 */
export function useCurrentResourceRoute(): CurrentResourceRoute | undefined {
  const matches = useMatches();
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const params = matches[index]?.params;
    const resourceType = normalizeResourceKind(params?.resourceType);
    const resourceId = params?.resourceId?.trim();
    if (resourceType && resourceId) {
      return { resourceType, resourceId };
    }
  }
  return undefined;
}
