import type { Ref, RefCallback } from 'react';

// 多个交互上下文共用 DOM 节点时，保留各自的挂载通知与 React 19 ref cleanup。
export function mergeRefs<T extends HTMLElement>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
    });
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') cleanup();
        else if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
      });
    };
  };
}
