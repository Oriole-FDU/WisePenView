import type { IDriveService } from '@/domains/Drive';
import type { IGroupService } from '@/domains/Group';

import { getContextValue } from './registry';
import type { ServicesContextValue } from './registry.types';

/** Runtime 等命令式代码通过统一装配入口取得 service，不接触实现文件。 */
export function getServices(): ServicesContextValue {
  return getContextValue();
}

export function getDriveService(): IDriveService {
  return getServices().driveService;
}

export function getGroupService(): IGroupService {
  return getServices().groupService;
}
