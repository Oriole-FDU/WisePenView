import { authSessionCoordinator } from '@/utils/auth/authSessionCoordinator';

import { getObservabilityContext } from './_internal/runtime';

/** 复用守卫已有的用户查询，只把结果写入发起请求时的认证版本。 */
export async function observeUserLoad<T extends { id: string }>(
  load: () => Promise<T>
): Promise<T> {
  const authVersion = authSessionCoordinator.getSessionVersion();
  const user = await load();
  getObservabilityContext()?.identify(user.id, authVersion);
  return user;
}
