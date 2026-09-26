/** 调用点：Modal 和 Popover 装配，DeferredContent 及浮层子组件消费；控制打开后延迟挂载内容的时机。 */
export type {
  DeferredContentProps,
  DeferredOverlayProviderProps,
  DeferredOverlayState,
  DeferredRenderable,
} from './DeferredOverlayContext';
export { DeferredOverlayProvider } from './DeferredOverlayProvider';
export { useDeferredOverlayContext, useDeferredOverlayState } from './useDeferredOverlayState';
