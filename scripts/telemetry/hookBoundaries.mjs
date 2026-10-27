import { installBrowser, loadTelemetry } from './harness.mjs';

/** 仅替代 React/外部 SDK 的运行环境；业务回调、reporter 与 OTel SDK 均使用真实实现。 */
export const reactStub = `
const slots = [];
let cursor = 0;
export const hooks = {
  render(fn) {
    cursor = 0;
    const value = fn();
    return value;
  },
};
export function useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; }
export function useState(initial) {
  const index = cursor++;
  if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
  return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
}
`;

export const ahooksStub = `
import { useRef } from 'react';
export function useLatest(value) { const ref = useRef(value); ref.current = value; return ref; }
export const useUnmountedRef = () => useRef(false);
`;

export const uiStub = `
export const notices = [];
export const toast = Object.fromEntries(['danger', 'warning', 'success'].map(type => [type, value => notices.push({type, value})]));
`;

export const translationStub = `
export const useTranslation = () => ({ t: key => key });
export const initReactI18next = { type: '3rdParty', init() {} };
`;

export async function loadBusinessTelemetry(context, options) {
  const telemetry = await loadTelemetry('development', '/otel', {
    ...options,
    stubs: {
      react: reactStub,
      ahooks: ahooksStub,
      '@heroui/react': uiStub,
      'react-i18next': translationStub,
      ...options.stubs,
    },
  });
  const browser = installBrowser(context);
  browser.cleanup(telemetry.installOtelErrorReporter());
  return { ...telemetry, browser };
}
