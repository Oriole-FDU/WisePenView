import type { TraceItem } from '../traceModel';

export interface ProcessTraceProps {
  /** 连续的思考与工具调用节点，按发生顺序排列 */
  items: readonly TraceItem[];
  /** 消息是否仍在流式输出；非流式时不再轮换“当前节点”，只展示收敛后的结果 */
  streaming: boolean;
}
