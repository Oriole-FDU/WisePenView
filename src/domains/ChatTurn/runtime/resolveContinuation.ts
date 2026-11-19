export type LocalStream = 'idle' | 'connecting' | 'open' | 'closed';
export type ContinuationAction = 'respond' | 'respond_and_resume' | 'recover';

/** 本地订阅优先；断流后仅以本次 active 查询决定补订或挂起恢复。 */
export function resolveContinuation({
  localStream,
  activeTurnId,
}: {
  localStream: LocalStream;
  activeTurnId: string | null;
}): ContinuationAction {
  if (localStream === 'open' || localStream === 'connecting') return 'respond';
  return activeTurnId ? 'respond_and_resume' : 'recover';
}
