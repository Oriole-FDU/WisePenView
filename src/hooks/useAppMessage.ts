import { App } from 'antd';

/** 使用由根节点 <App> 注入的 message，避免静态 API 无法消费主题等上下文 */
export function useAppMessage() {
  const { message } = App.useApp();
  return message;
}
