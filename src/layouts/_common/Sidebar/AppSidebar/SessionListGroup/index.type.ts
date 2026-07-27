export interface SessionListGroupProps {
  selectedKeys: string[];
  /** 外部数据变更时递增，触发会话列表重新加载。 */
  refreshVersion?: number;
}
