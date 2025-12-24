import { useState, useCallback } from 'react';
import { message } from 'antd';

interface UseLoadingOptions {
  /**
   * 是否显示全局loading消息
   * @default false
   */
  showMessage?: boolean;
  /**
   * loading消息的文本
   * @default '处理中...'
   */
  messageText?: string;
  /**
   * loading消息的key，用于销毁特定消息
   */
  messageKey?: string;
}

interface UseLoadingReturn {
  /**
   * 当前loading状态
   */
  loading: boolean;
  /**
   * 执行异步操作，自动管理loading状态
   * @param asyncFn 异步函数
   * @param options 可选配置
   */
  run: <T>(
    asyncFn: () => Promise<T>,
    options?: UseLoadingOptions
  ) => Promise<T | undefined>;
  /**
   * 手动设置loading状态
   */
  setLoading: (loading: boolean) => void;
}

/**
 * 统一的loading状态管理hook
 * 
 * @example
 * ```tsx
 * const { loading, run } = useLoading();
 * 
 * const handleSubmit = async () => {
 *   await run(
 *     () => request.post('/api/login', values),
 *     { showMessage: true, messageText: '正在登录...' }
 *   );
 * };
 * 
 * <Button loading={loading} onClick={handleSubmit}>提交</Button>
 * ```
 */
export const useLoading = (): UseLoadingReturn => {
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: UseLoadingOptions = {}
    ): Promise<T | undefined> => {
      const {
        showMessage = false,
        messageText = '处理中...',
        messageKey = 'loading',
      } = options;

      // 如果已经在loading，直接返回
      if (loading) {
        return;
      }

      setLoading(true);

      // 显示全局loading消息
      if (showMessage) {
        message.open({
          type: 'loading',
          content: messageText,
          key: messageKey,
          duration: 0,
        });
      }

      try {
        const result = await asyncFn();
        return result;
      } catch (error) {
        // 错误处理由调用方负责
        throw error;
      } finally {
        setLoading(false);
        // 销毁全局loading消息
        if (showMessage) {
          message.destroy(messageKey);
        }
      }
    },
    [loading]
  );

  return {
    loading,
    run,
    setLoading,
  };
};
