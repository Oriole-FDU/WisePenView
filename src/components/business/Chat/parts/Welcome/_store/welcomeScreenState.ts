import { useLayoutEffect } from 'react';
import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

import type { WelcomeScreenConfig } from '../Starter/index.type';

/** Welcome 区布局模式，与 `data-welcome-starters` / `data-welcome-mode` 对齐。 */
export const WelcomeMode = {
  Compact: 'compact',
  Focused: 'focused',
  Rich: 'rich',
} as const;

export type WelcomeMode = (typeof WelcomeMode)[keyof typeof WelcomeMode];

const WELCOME_MODE_VALUES = new Set<string>(Object.values(WelcomeMode));

export function isWelcomeMode(value: string): value is WelcomeMode {
  return WELCOME_MODE_VALUES.has(value);
}

export function welcomeModeFromBlockCount(blockCount: number): WelcomeMode {
  if (blockCount === 0) return WelcomeMode.Compact;
  if (blockCount === 1) return WelcomeMode.Focused;
  return WelcomeMode.Rich;
}

interface WelcomeScreenState {
  welcomeConfig: WelcomeScreenConfig | null;
  welcomeMode: WelcomeMode;
  setWelcomeConfig: (config: WelcomeScreenConfig | null) => void;
  /** 任意流程可直接改布局模式（如切换 Agent）；会覆盖当前 mode，直至下次 setWelcomeConfig。 */
  setWelcomeMode: (mode: WelcomeMode) => void;
  resetWelcomeScreen: () => void;
}

const DEFAULT_STATE: Pick<WelcomeScreenState, 'welcomeConfig' | 'welcomeMode'> = {
  welcomeConfig: null,
  welcomeMode: WelcomeMode.Compact,
};

function resolveWelcomeMode(config: WelcomeScreenConfig | null): WelcomeMode {
  if (!config) return WelcomeMode.Compact;
  return welcomeModeFromBlockCount(config.blocks.length);
}

export const useWelcomeScreenStore = create<WelcomeScreenState>()((set) => ({
  ...DEFAULT_STATE,
  setWelcomeConfig: (config) =>
    set({
      welcomeConfig: config,
      welcomeMode: resolveWelcomeMode(config),
    }),
  setWelcomeMode: (mode) => set({ welcomeMode: mode }),
  resetWelcomeScreen: () => set(DEFAULT_STATE),
}));

registerStore({
  id: 'chat.welcome-screen',
  scope: 'tab',
  reset: () => useWelcomeScreenStore.setState(DEFAULT_STATE),
});

/**
 * 无 React 树写入入口：Service 回调、选 Agent、WebSocket 等任意过程均可 import 调用。
 * 订阅布局：useWelcomeScreenStore((s) => s.welcomeMode)
 */
export const welcomeScreenActions = {
  setWelcomeConfig: (config: WelcomeScreenConfig | null) =>
    useWelcomeScreenStore.getState().setWelcomeConfig(config),
  setWelcomeMode: (mode: WelcomeMode) => useWelcomeScreenStore.getState().setWelcomeMode(mode),
  resetWelcomeScreen: () => useWelcomeScreenStore.getState().resetWelcomeScreen(),
};

/** React 编排层：config 变化时同步 store；由 Chat 装配层调用，WelcomeStarter 不调用。 */
export function useWelcomeScreenOrchestration(config: WelcomeScreenConfig | null): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：编排层持有的 config 变化时同步 store。
   */
  useLayoutEffect(() => {
    welcomeScreenActions.setWelcomeConfig(config);
  }, [config]);
}
