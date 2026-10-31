import type { ResourceItem } from '@/domains/Resource';
import type { ResourceItemApi } from '@/domains/Resource/apis/ResourceCoreApi.schema';

import type { SingleHtmlPageStatusApiValue } from '../apis/HtmlPageApi.schema';

export interface HtmlPageVersionInfo {
  version: number;
  status: SingleHtmlPageStatusApiValue;
  size?: number;
  updateTime?: number;
  lastEditedAtText: string;
}

export interface HtmlPageDisplayInfo {
  resourceInfo: ResourceItem;
  currentVersion: number;
  versionInfo?: HtmlPageVersionInfo;
}

export interface IHtmlPageService {
  getHtmlPageInfo(resourceId: string, targetVersion?: number): Promise<HtmlPageDisplayInfo>;
  getHtmlPageContent(resourceId: string, targetVersion?: number): Promise<string>;
  getResourceAccessInfo(resourceId: string): Promise<ResourceItemApi>;
}

/** 只有存在当前版本且该版本已完成资源注册时才允许读取正文。 */
export const isHtmlPageReady = (info?: HtmlPageDisplayInfo | null): boolean =>
  Boolean(
    info &&
    info.currentVersion > 0 &&
    info.versionInfo?.status === 'READY' &&
    info.versionInfo.version === info.currentVersion
  );
