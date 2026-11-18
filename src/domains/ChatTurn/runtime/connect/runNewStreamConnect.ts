import type { UseConnectFsmResult } from './useConnectFsm';

export interface RunNewStreamConnectParams {
  connect: UseConnectFsmResult;
  /** 失败标 closed 后的清理（通常 clearResumedTurn）。 */
  onClosed: () => void;
  run: () => Promise<void>;
}

/**
 * 开新 SSE 的连接事务：connecting → run → idle；失败则 closed + onClosed。
 * send / recover 共用；不发 HTTP、不碰 message 泵。
 */
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
