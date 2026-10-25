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
