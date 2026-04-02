/**
 * 为什么项目中不直接使用 useEffect
 * -----------------------------------------------------------------------------
 * 我们在业务代码里禁用原生 useEffect，核心原因不是“它不能用”，而是它在大型前端工程中
 * 很容易被滥用为“万能同步器”，特别是AI生成代码，会导致数据流变得隐式、分散且难以维护。常见问题包括：
 *
 * 1) 隐式副作用触发：
 *    代码行为依赖依赖数组与渲染时机，调用路径不直观，阅读成本高。
 *
 * 2) 依赖管理脆弱：
 *    依赖遗漏会造成陈旧闭包，依赖过多又会引发重复执行，长期演进后易出现偶发 bug。
 *    配置了lint规则后，可以避免依赖遗漏，但是稳定的依赖如service就会极大破坏可读性。
 *
 * 3) 职责混杂：
 *    把事件响应、状态同步、请求触发等不同职责都塞进 effect，组件边界会被破坏。
 *
 * 4) 可测试性下降：
 *    effect 往往与渲染节奏耦合，单测需要额外处理异步与时序，测试稳定性更差。
 *
 * 因此我们优先采用“显式数据流”：
 * - 用户交互驱动：在事件回调中直接处理状态与副作用；
 * - 明确入口触发：在打开弹窗、提交表单、切页等语义明确的时机执行逻辑；
 * - 能同步就同步：避免把纯计算或派生值放进 effect。
 *
 * 该文件是项目内使用 useEffect 的唯一合法入口。任何确有必要的 effect 场景，都应先与团队成员讨论，再通过
 * useEffectForce 统一接入，以便进行集中约束、审查与后续治理。
 *
 * 2026-03-31 zhao-jingyan
 */
import { useEffect } from 'react';
import type { DependencyList, EffectCallback } from 'react';

/**
 * 项目约定中 useEffect 的唯一合法入口。若非万不得已，请不要使用。
 */
export const useEffectForce = (effect: EffectCallback, deps?: DependencyList): void => {
  // 这里是项目内 useEffect 的统一封装出口：
  // 依赖数组由调用方显式传入，react-hooks 无法对“非字面量依赖”做静态分析，故在此处集中豁免。
  // 必须把 effect 的返回值交给 React，否则 cleanup（如 connection 池 release）永远不会执行。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, deps);
};
