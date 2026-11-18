import type { UseConnectFsmResult } from './useConnectFsm';

export interface RunNewStreamConnectParams {
  connect: UseConnectFsmResult;
  shouldApply: () => boolean;
  run: () => Promise<void>;
}

export async function runNewStreamConnect({
  connect,
  shouldApply,
  run,
}: RunNewStreamConnectParams): Promise<void> {
  connect.beginConnect();
  try {
    await run();
    if (shouldApply()) connect.markIdleIfOpen();
  } catch (error) {
    if (!shouldApply()) return;
    connect.markClosed();
    throw error;
  }
}
