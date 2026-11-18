import type { UseConnectFsmResult } from './useConnectFsm';

export interface RunNewStreamConnectParams {
  connect: UseConnectFsmResult;
  onClosed: () => void;
  run: () => Promise<void>;
}

export async function runNewStreamConnect({
  connect,
  onClosed,
  run,
}: RunNewStreamConnectParams): Promise<void> {
  connect.beginConnect();
  try {
    await run();
    connect.markIdleIfOpen();
  } catch (error) {
    connect.markClosed();
    onClosed();
    throw error;
  }
}
