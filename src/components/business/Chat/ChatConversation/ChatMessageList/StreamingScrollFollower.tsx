import { useEffect, useRef } from 'react';

import { useMessageScroller } from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';

interface StreamingScrollFollowerProps {
  active: boolean;
  messages: readonly WisePenUIMessage[];
}

/** 生成开始时定位到底部，后续内容更新尊重用户主动滚动中断。 */
function StreamingScrollFollower({ active, messages }: StreamingScrollFollowerProps) {
  const { scrollToEnd, scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const wasActiveRef = useRef(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：流式消息开始或内容更新后校正消息滚动锚点。
   * 不可替代原因：消息高度和用户滚动中断状态由外部 MessageScroller 的 DOM 运行时维护。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const started = active && !wasActiveRef.current;
    wasActiveRef.current = active;

    if (!active) return;

    if (started) {
      scrollToEnd({ behavior: 'auto' });
      return;
    }

    scrollToEndUnlessUserInterrupted();
  }, [active, messages, scrollToEnd, scrollToEndUnlessUserInterrupted]);

  return null;
}

export default StreamingScrollFollower;
