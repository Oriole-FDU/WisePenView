import type { Attributes } from '@opentelemetry/api';
import type { RouterState } from 'react-router-dom';

export interface ObservabilityRouter {
  state: RouterState;
  subscribe: (listener: (state: RouterState) => void) => () => void;
}

/** 仅输出路由模板和资源定位信息，动态邀请参数、query 与 hash 不进入遥测。 */
export const getRouteAttributes = (state: RouterState): Attributes => {
  let route = '';
  for (const match of state.matches) {
    const path = match.route.path;
    if (!path) continue;
    route = path.startsWith('/') ? path : `${route}/${path}`;
  }
  route = route.replace(/\/{2,}/g, '/') || '/';
  const params = state.matches.at(-1)?.params;
  return {
    'page.path': route,
    'page.route': route,
    'resource.id': params?.resourceId?.slice(0, 128),
    'editor.type': params?.resourceType?.slice(0, 32),
  };
};
