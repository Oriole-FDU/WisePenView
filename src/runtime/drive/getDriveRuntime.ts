import { registerStore } from '@/store/lifecycle';

import { DriveRuntime } from './DriveRuntime/index.impl';
import type { DriveRuntime as DriveRuntimeContract } from './DriveRuntime/index.type';

let driveRuntime: DriveRuntimeContract | null = null;

export function getDriveRuntime(): DriveRuntimeContract {
  if (!driveRuntime) {
    driveRuntime = new DriveRuntime();
  }
  return driveRuntime;
}

registerStore({
  id: 'drive.runtime',
  scope: 'session',
  reset: () => {
    driveRuntime?.reset();
  },
});
