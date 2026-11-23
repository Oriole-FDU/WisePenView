import type { WelcomeLayoutMode } from './Starter/index.type';

/** 按 starter blocks 数量推导布局模式，与 `data-welcome-mode` / `data-welcome-starters` 对齐。 */
export function welcomeModeFromBlockCount(blockCount: number): WelcomeLayoutMode {
  if (blockCount === 0) return 'compact';
  if (blockCount === 1) return 'focused';
  return 'rich';
}
