import { App } from 'antd';

export function useAppMessage() {
  const { message } = App.useApp();
  return message;
}

export type { MessageInstance } from 'antd/es/message/interface';
