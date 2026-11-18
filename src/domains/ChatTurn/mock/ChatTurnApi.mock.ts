import { mockResponse } from '@/domains/_shared/mock/response';

import type { ChatTurnApi as ChatTurnApiContract } from '../apis/ChatTurnApi';
import type { UIMessageApi } from '../apis/ChatTurnApi.schema';

const MOCK_HISTORY_SIZE = 260;
const MOCK_HISTORY_INTERVAL_MS = 45 * 1000;
const MOCK_HISTORY_BASE_TS = Date.parse('2026-03-01T08:00:00.000Z');
const MOCK_HISTORY_SESSION_IDS = ['mock-session-1', 'mock-session-2', 'mock-session-3'];

/**
 * 原文引用链接（`wisepen://note/<noteId>#p_<blockId>`）的 mock 覆盖。
 *
 * 四个链接分别对应：打开并定位、跨笔记定位、失效块（应提示失败）、非 note 协议（应回落纯文本）。
 * 可用的 blockId 来自 `src/components/editors/note/mock/notePreview.ts` 的 mock 笔记正文。
 */
const MOCK_NOTE_REFERENCE_LINES = [
  '- 参考原文：[顺序表实现](wisepen://note/mock-note-2#p_linear-list-array)',
  '- 参考原文：[课程导学正文](wisepen://note/mock-note-1#p_course-intro-body)',
  '- 已失效的引用：[旧段落](wisepen://note/mock-note-2#p_missing-block)',
  '- 暂不支持的协议：[技能链接](wisepen://skill/mock-skill-1)',
];

const buildMockHistoryMessages = (sessionId: string, total: number): UIMessageApi[] => {
  return Array.from({ length: total }, (_, index) => {
    const messageNo = index + 1;
    const messageSeq = String(messageNo).padStart(4, '0');
    const isUser = messageNo % 2 === 1;
    const round = Math.ceil(messageNo / 2);
    const createdAt = new Date(
      MOCK_HISTORY_BASE_TS + index * MOCK_HISTORY_INTERVAL_MS
    ).toISOString();

    const role: UIMessageApi['role'] = isUser ? 'user' : 'assistant';
    const baseText = isUser
      ? `【${sessionId}】第 ${round} 轮：请解释一下这个需求，并给出步骤。`
      : `【${sessionId}】第 ${round} 轮回复：已整理需求背景、约束条件与执行步骤。`;
    const text =
      !isUser && messageNo === total
        ? `${baseText}\n\n原文引用示例：\n${MOCK_NOTE_REFERENCE_LINES.join('\n')}`
        : baseText;

    const metadata: Record<string, unknown> = {
      createdAt,
      ...(isUser && messageNo === total - 1
        ? {
            selectedAttachments: [
              {
                attachmentId: `${sessionId}-resource-report`,
                filename: 'SlideWise_Report.pdf',
                kind: 'resource',
                available: true,
              },
            ],
          }
        : {}),
    };

    return {
      id: `${sessionId}-msg-${messageSeq}`,
      role,
      parts: [
        {
          type: 'text',
          text,
          state: 'done',
          toolCallId: null,
          input: null,
          output: null,
        },
      ],
      metadata,
      createdAt,
    };
  });
};

const mockHistoryMessagesBySessionId: Record<string, UIMessageApi[]> =
  MOCK_HISTORY_SESSION_IDS.reduce<Record<string, UIMessageApi[]>>((acc, sessionId) => {
    acc[sessionId] = buildMockHistoryMessages(sessionId, MOCK_HISTORY_SIZE);
    return acc;
  }, {});

const mockSseResponse = (): Promise<Response> =>
  Promise.resolve(
    new Response('data: {"type":"finish"}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  );

export const ChatTurnApi: typeof ChatTurnApiContract = {
  getActiveTurn: async () => ({ turn_id: null }),
  cancelTurn: async () => undefined,
  respondTurn: async () => undefined,
  listHistoryMessages: ({ session_id, page = 1, size = 20 }) => {
    const rows = mockHistoryMessagesBySessionId[session_id] ?? [];
    const end = Math.max(0, rows.length - (page - 1) * size);
    return mockResponse({
      list: rows.slice(Math.max(0, end - size), end),
      page,
      size,
      total: rows.length,
      total_page: Math.ceil(rows.length / size) || 1,
    });
  },
  streamChatCompletion: async () => mockSseResponse(),
  streamChatRecovery: async () => mockSseResponse(),
  reconnectChatStream: async () => mockSseResponse(),
};
