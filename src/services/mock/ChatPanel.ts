import type { Model } from '@/components/ChatPanel/index.type';

export const MOCK_MODELS: Model[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 3.5',
    provider: 'anthropic',
    tags: [{ text: 'New', type: 'purple' }],
    multiplier: '25x',
    vision: true,
    usageRank: 1,
    category: 'reasoning',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tags: [],
    multiplier: '17x',
    vision: true,
    usageRank: 2,
    category: 'all-round',
  },
  {
    id: 'grok-4-fast',
    name: 'Grok 4.1 Fast',
    provider: 'grok',
    tags: [{ text: 'Free', type: 'success' }],
    multiplier: '1x',
    vision: true,
    usageRank: 5,
    category: 'chat',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    tags: [{ text: 'Reasoning', type: 'blue' }],
    multiplier: '7x',
    vision: false,
    usageRank: 4,
    category: 'reasoning',
  },
  {
    id: 'doubao-pro',
    name: '豆包 Seed 1.6',
    provider: 'doubao',
    tags: [{ text: 'Free', type: 'success' }],
    multiplier: null,
    vision: false,
    usageRank: 6,
    category: 'chat',
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'meta',
    tags: [],
    multiplier: '1x',
    vision: false,
    usageRank: 7,
    category: 'chat',
  },
];

const MOCK_REASONING = `首先，我需要分析用户的意图。用户发送了消息，看来需要我的帮助。
接着，我应该确认当前的上下文环境。这是一个 AI 助手 Demo 环境，不仅需要返回正文，还需要展示我的思考过程。
最后，我决定用礼貌且热情的方式回应用户，并询问可以提供什么帮助。`;

const MOCK_ANSWER = `您好！我是 AI 助理小 W。很高兴为您服务。

这是一个基于 Ant Design 和 React 构建的高性能聊天界面。
无论是代码编写、文案创作，还是逻辑推理，我都能帮到您。请问今天想做点什么？`;

/**
 * 流式回调接口定义
 */
export interface StreamCallbacks {
  /** 思考过程回调 (增量) */
  onReasoning?: (delta: string) => void;
  /** 正文内容回调 (增量) */
  onContent?: (delta: string) => void;
  /** 结束回调 (返回总耗时) */
  onComplete?: (totalTime: number) => void;
}

/**
 * 模拟流式发送消息
 * @param text 用户输入的内容 (Mock模式下暂时不用，但为了接口统一保留)
 * @param callbacks 回调函数集合
 * @param signal AbortSignal 用于中断请求
 */
export const sendMessageStream = async (
  text: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
) => {
  const startTime = Date.now();

  // 辅助函数：模拟打字机效果
  const streamText = async (
    content: string,
    callback?: (delta: string) => void,
    delay: number = 30
  ) => {
    if (!callback) return;
    const chars = content.split('');
    for (const char of chars) {
      // 检查中断信号
      if (signal?.aborted) throw new Error('Aborted');
      
      callback(char);
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  try {
    // 1. 阶段一：输出思考过程 (Reasoning)
    await streamText(MOCK_REASONING, callbacks.onReasoning, 20);

    // 模拟思考结束后的停顿
    if (!signal?.aborted) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // 2. 阶段二：输出正文 (Content)
    await streamText(MOCK_ANSWER, callbacks.onContent, 15);

    // 3. 结束：计算耗时并回调
    const endTime = Date.now();
    const duration = parseFloat(((endTime - startTime) / 1000).toFixed(2));
    
    if (callbacks.onComplete) {
      callbacks.onComplete(duration);
    }

  } catch (error) {
    // 如果是中断错误，可以忽略或做特定处理
    if (signal?.aborted) {
      console.log('Stream aborted by user');
    } else {
      console.error('Stream error:', error);
    }
  }
};