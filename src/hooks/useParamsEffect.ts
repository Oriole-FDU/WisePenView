import { useRef } from 'react';
import { useEffectForce } from './useEffectForce';

type Cleanup = void | (() => void);

/**
 * 为什么这里必须通过 effect 同步 params（常见于 URL 查询参数 / 路由参数）
 * -----------------------------------------------------------------------------
 * URL 变化本质是“外部状态变化”：
 * - 变化来源可能是浏览器前进后退、地址栏输入、路由跳转、其他组件导航行为；
 * - 当前组件通常拿不到一个稳定、统一、可注入的“显式回调入口”。
 *
 * 换句话说，组件无法像处理按钮点击那样，在某个事件回调里直接收到“URL 已变化”的通知。
 * 在这种场景下，必须依赖 React 的渲染与依赖比对机制：当 params 改变后，通过 effect 做同步。
 *
 * 本 hook 的职责是把这种“外部变化监听”集中封装：
 * - 仅在 params 变化时执行最新 effect；
 * - effect 回调引用更新本身不会触发额外执行；
 * - 统一走 useEffectForce，避免业务层直接散落 useEffect。
 */

export const useParamsEffect = <T extends readonly unknown[]>(
  params: T,
  effect: (...nextParams: T) => Cleanup
) => {
  const effectRef = useRef(effect);

  // effect变化时，更新effectRef
  useEffectForce(() => {
    effectRef.current = effect;
  }, [effect]);

  // params变化时，执行effect
  useEffectForce(() => effectRef.current(...params), params);
};
