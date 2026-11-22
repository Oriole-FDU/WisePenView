/**
 * 单 Session Runtime 的生命周期相位（与 connect phase 分离）。
 */
export const LIFECYCLE_PHASE = {
  created: 'created',
  bootstrapping: 'bootstrapping',
  ready: 'ready',
  disposing: 'disposing',
  disposed: 'disposed',
} as const;

export type LifecyclePhase = (typeof LIFECYCLE_PHASE)[keyof typeof LIFECYCLE_PHASE];

export function isLifecycleAllowed(
  phase: LifecyclePhase,
  allowed: readonly LifecyclePhase[]
): boolean {
  return allowed.includes(phase);
}
