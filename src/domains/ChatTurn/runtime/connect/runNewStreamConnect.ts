import type { ConnectFsm } from './connectFsm';

export interface RunNewStreamConnectParams {
  connect: ConnectFsm;
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
