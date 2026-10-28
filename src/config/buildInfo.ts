/**
 * 前端构建身份的唯一读取入口。
 *
 * build ID 用于区分同一 commit 的重复构建，release 由版本、commit 和 build ID 组成。
 */
export interface BuildInfo {
  version: string;
  commit: string;
  buildId: string;
  mode: string;
  release: string;
  dirty: boolean;
}

declare const __APP_BUILD_INFO__: Readonly<BuildInfo>;

export const buildInfo = __APP_BUILD_INFO__;

export const buildTelemetryAttributes = {
  'service.version': buildInfo.version,
  'service.commit': buildInfo.commit,
  'service.release': buildInfo.release,
  'service.build_id': buildInfo.buildId,
  'service.build_mode': buildInfo.mode,
  'service.dirty': buildInfo.dirty,
} as const;
