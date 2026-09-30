import {
  type DynamicToolUIPart,
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ToolUIPart,
} from 'ai';

import type { WisePenUIMessage } from '@/domains/Chat';

export type RenderableToolPart = ToolUIPart | DynamicToolUIPart;

export type TraceTone = 'muted' | 'accent' | 'danger';

/** 工具调用里仍在推进、需要继续轮换提示的状态 */
const RUNNING_TOOL_STATES: ReadonlySet<RenderableToolPart['state']> = new Set([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
]);

export interface TraceReasoningItem {
  kind: 'reasoning';
  key: string;
  content: string;
  streaming: boolean;
  /** 后端历史 metadata 透出的推理耗时（秒） */
  durationSeconds?: number;
}

export interface TraceToolItem {
  kind: 'tool';
  key: string;
  part: RenderableToolPart;
}

export type TraceItem = TraceReasoningItem | TraceToolItem;

/** 助手消息按顺序切分出的渲染片段：正文与过程（思考 / 工具调用）交替 */
export type AssistantSegment =
  | { kind: 'text'; key: string; text: string; streaming: boolean }
  | { kind: 'trace'; key: string; items: TraceItem[] };

/** 过程行的当前提示文案，key 为 chat 命名空间下的 i18n key */
export interface TraceHeadline {
  key: string;
  options?: Record<string, string | number>;
  tone: TraceTone;
}

const SKILL_NAME_INPUT_KEYS = ['skill_id', 'skillId', 'skill_ids', 'skillIds', 'name'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 是否 skill 类工具。
 * 后端在 tool part 上透出 `title` 后，这里可以直接删掉，改为按 title 判断。
 */
function isSkillToolPart(part: RenderableToolPart): boolean {
  return `${getToolName(part)} ${part.title ?? ''}`.toLowerCase().includes('skill');
}

/** 展示用名称：`builtin:skill-creator` 这类作用域前缀只保留后面的名称 */
function normalizeSkillName(value: string): string {
  const trimmed = value.trim();
  const scoped = /^[a-z0-9_-]+:(.+)$/i.exec(trimmed);
  return scoped?.[1]?.trim() || trimmed;
}

/**
 * 从 skill 类工具的入参里取要展示的 Skill 名称。
 * 依赖后端工具入参字段名，取不到时返回 undefined，由调用方退化到通用文案。
 */
export function getLoadedSkillName(part: RenderableToolPart): string | undefined {
  if (!isSkillToolPart(part) || !isRecord(part.input)) return undefined;

  for (const key of SKILL_NAME_INPUT_KEYS) {
    const value = part.input[key];
    if (typeof value === 'string' && value.trim()) return normalizeSkillName(value);
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string' && item.trim());
      if (typeof first === 'string') return normalizeSkillName(first);
    }
  }
  return undefined;
}

export function getToolDisplayName(part: RenderableToolPart): string {
  const title = part.title?.trim();
  return title || getToolName(part);
}

export function formatToolPayload(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isTraceItemActive(item: TraceItem): boolean {
  if (item.kind === 'reasoning') return item.streaming;
  return RUNNING_TOOL_STATES.has(item.part.state);
}

/** 过程组里当前仍在推进的节点，用于单行轮换提示 */
export function findActiveTraceIndex(items: readonly TraceItem[]): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (isTraceItemActive(items[index])) return index;
  }
  return -1;
}

/** skill 类工具的专用提示；拿不到 Skill 名称时返回 undefined */
function describeSkillToolPart(part: RenderableToolPart): TraceHeadline | undefined {
  const name = getLoadedSkillName(part);
  if (!name) return undefined;

  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return { key: 'message.tool.activity.skillLoading', options: { name }, tone: 'muted' };
    case 'approval-requested':
      return { key: 'message.tool.activity.awaitingApproval', options: { name }, tone: 'accent' };
    case 'approval-responded':
      return part.approval.approved
        ? { key: 'message.tool.activity.skillLoading', options: { name }, tone: 'muted' }
        : { key: 'message.tool.activity.skillDenied', options: { name }, tone: 'danger' };
    case 'output-available':
      return { key: 'message.tool.activity.skillLoaded', options: { name }, tone: 'muted' };
    case 'output-error':
      return { key: 'message.tool.activity.skillFailed', options: { name }, tone: 'danger' };
    case 'output-denied':
      return { key: 'message.tool.activity.skillDenied', options: { name }, tone: 'danger' };
  }
}

export function describeTraceItem(
  item: TraceItem,
  measuredDurations: Readonly<Record<string, number>>
): TraceHeadline {
  if (item.kind === 'reasoning') {
    if (item.streaming) return { key: 'message.reasoning.loading', tone: 'muted' };
    const seconds = item.durationSeconds ?? measuredDurations[item.key];
    if (seconds != null) {
      return { key: 'message.reasoning.duration', options: { count: seconds }, tone: 'muted' };
    }
    return { key: 'message.reasoning.title', tone: 'muted' };
  }

  const skillHeadline = describeSkillToolPart(item.part);
  if (skillHeadline) return skillHeadline;

  const name = getToolDisplayName(item.part);
  switch (item.part.state) {
    case 'input-streaming':
    case 'input-available':
      return { key: 'message.tool.activity.running', options: { name }, tone: 'muted' };
    case 'approval-requested':
      return { key: 'message.tool.activity.awaitingApproval', options: { name }, tone: 'accent' };
    case 'approval-responded':
      return item.part.approval.approved
        ? { key: 'message.tool.activity.running', options: { name }, tone: 'muted' }
        : { key: 'message.tool.activity.denied', options: { name }, tone: 'danger' };
    case 'output-available':
      return { key: 'message.tool.activity.completed', options: { name }, tone: 'muted' };
    case 'output-error':
      return { key: 'message.tool.activity.error', options: { name }, tone: 'danger' };
    case 'output-denied':
      return { key: 'message.tool.activity.denied', options: { name }, tone: 'danger' };
  }
}

interface BuildAssistantSegmentsOptions {
  /** 当前助手消息是否仍在流式输出 */
  streaming: boolean;
  reasoningDurationSeconds?: number;
}

/**
 * 把助手消息的 parts 收敛成“正文 + 过程组”两种片段。
 * 连续的思考与工具调用合并成同一个过程组，让 UI 只占一行并轮换展示当前节点。
 */
export function buildAssistantSegments(
  parts: WisePenUIMessage['parts'],
  { streaming, reasoningDurationSeconds }: BuildAssistantSegmentsOptions
): AssistantSegment[] {
  const lastReasoningIndex = parts.reduce(
    (lastIndex, part, index) => (isReasoningUIPart(part) ? index : lastIndex),
    -1
  );
  const segments: AssistantSegment[] = [];
  let pendingItems: TraceItem[] = [];

  const flushTrace = () => {
    if (pendingItems.length === 0) return;
    segments.push({ kind: 'trace', key: `trace-${pendingItems[0].key}`, items: pendingItems });
    pendingItems = [];
  };

  parts.forEach((part, index) => {
    if (isTextUIPart(part)) {
      flushTrace();
      if (!part.text) return;
      segments.push({
        kind: 'text',
        key: `text-${index}`,
        text: part.text,
        streaming: streaming && part.state !== 'done',
      });
      return;
    }

    if (isReasoningUIPart(part)) {
      // 即使正文为空也保留节点：展开后要能按顺序读出「思考 - 加载 Skill - 思考」
      pendingItems.push({
        kind: 'reasoning',
        key: `reasoning-${index}`,
        content: part.text,
        streaming: part.state === 'streaming',
        durationSeconds: index === lastReasoningIndex ? reasoningDurationSeconds : undefined,
      });
      return;
    }

    if (isToolUIPart(part)) {
      pendingItems.push({ kind: 'tool', key: part.toolCallId, part });
    }
  });

  flushTrace();
  return segments;
}

/** 尚未决策的高危工具审批，按时间顺序返回第一个 */
export function findPendingApprovalPart(
  parts: WisePenUIMessage['parts'],
  decisions: Readonly<Record<string, boolean>>
): RenderableToolPart | undefined {
  return parts.find(
    (part): part is RenderableToolPart =>
      isToolUIPart(part) &&
      part.state === 'approval-requested' &&
      decisions[part.toolCallId] === undefined
  );
}
