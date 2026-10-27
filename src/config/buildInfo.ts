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
