export const SOUL_FIELD_KEYS = [
  'soulStyle',
  'soulInitiative',
  'soulTaste',
  'soulTruth',
  'soulBoundaries',
] as const;

export type SoulFieldKey = (typeof SOUL_FIELD_KEYS)[number];

export interface GuidedPromptFields {
  overview: string;
  context: string;
  workflow: string;
  outputFormat: string;
  exampleOutput: string;
  qualityChecks: string;
  whenToAsk: string;
  soulRole: string;
  soulStyle: string;
  soulInitiative: string;
  soulTaste: string;
  soulTruth: string;
  soulBoundaries: string;
}

const AGENT_PROMPT_ROOT = 'Agent';
const SOUL_PROMPT_ROOT = 'SOUL（可选）';

const createEmptyGuidedPromptFields = (): GuidedPromptFields => ({
  overview: '',
  context: '',
  workflow: '',
  outputFormat: '',
  exampleOutput: '',
  qualityChecks: '',
  whenToAsk: '',
  soulRole: '',
  soulStyle: '',
  soulInitiative: '',
  soulTaste: '',
  soulTruth: '',
  soulBoundaries: '',
});

interface HeadingSection {
  title: string;
  level: number;
  path: string[];
  lineIndex: number;
  contentStart: number;
  contentEnd: number;
  content: string;
}

export interface GuidedPromptParseResult {
  compatible: boolean;
  soulEnabled: boolean;
  fields: GuidedPromptFields;
  markdown: string;
}

const normalizeMarkdown = (value: string) => value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const trimContent = (value: string) =>
  value.replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '');

function scanHeadings(markdown: string): HeadingSection[] {
  const lines = normalizeMarkdown(markdown).split('\n');
  const headings: Array<Omit<HeadingSection, 'contentStart' | 'contentEnd' | 'content'>> = [];
  const stack: Array<{ title: string; level: number }> = [];
  let fence: string | null = null;
  let fenceLength = 0;

  lines.forEach((line, lineIndex) => {
    if (fence) {
      const close = line.match(/^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence && close[1].length >= fenceLength) {
        fence = null;
        fenceLength = 0;
      }
      return;
    }

    const open = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
    if (open) {
      fence = open[1][0];
      fenceLength = open[1].length;
      return;
    }

    const match = line.match(/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
    if (!match) return;

    const level = match[1].length;
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

    const title = match[2].trim().replace(/[ \t]+/g, ' ');
    headings.push({ title, level, path: [...stack.map((x) => x.title), title], lineIndex });
    stack.push({ title, level });
  });

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const contentStart = heading.lineIndex + 1;
    const contentEnd = next?.lineIndex ?? lines.length;
    return {
      ...heading,
      contentStart,
      contentEnd,
      content: trimContent(lines.slice(contentStart, contentEnd).join('\n')),
    };
  });
}

const fieldSchemas = [
  ['overview', 2, [AGENT_PROMPT_ROOT, 'Overview']],
  ['context', 2, [AGENT_PROMPT_ROOT, 'Context']],
  ['workflow', 2, [AGENT_PROMPT_ROOT, 'Workflow']],
  ['outputFormat', 2, [AGENT_PROMPT_ROOT, 'Output Format']],
  ['exampleOutput', 3, [AGENT_PROMPT_ROOT, 'Output Format', 'Example Output 示例输出']],
  ['qualityChecks', 2, [AGENT_PROMPT_ROOT, 'Quality Checks']],
  ['whenToAsk', 2, [AGENT_PROMPT_ROOT, 'When To Ask First']],
  ['soulRole', 2, [SOUL_PROMPT_ROOT, '角色关系 Role & Relationship']],
  ['soulStyle', 2, [SOUL_PROMPT_ROOT, '说话方式 Communication Style']],
  ['soulInitiative', 2, [SOUL_PROMPT_ROOT, '主动程度 Initiative Level']],
  ['soulTaste', 2, [SOUL_PROMPT_ROOT, '结果偏好 Quality Taste']],
  ['soulTruth', 2, [SOUL_PROMPT_ROOT, '事实与不确定性 Truth & Uncertainty']],
  ['soulBoundaries', 2, [SOUL_PROMPT_ROOT, '底线 Boundaries']],
] as const satisfies ReadonlyArray<readonly [keyof GuidedPromptFields, number, readonly string[]]>;

const pathKey = (path: readonly string[]) => path.join('\u001f');

export function parseGuidedPrompt(
  markdown: string,
  fallbackFields: GuidedPromptFields = createEmptyGuidedPromptFields()
): GuidedPromptParseResult {
  const normalized = normalizeMarkdown(markdown);
  const sections = scanHeadings(normalized);
  const roots = (title: string) =>
    sections.filter((item) => item.level === 1 && item.path.length === 1 && item.title === title);
  const agentRoots = roots(AGENT_PROMPT_ROOT);
  const soulRoots = roots(SOUL_PROMPT_ROOT);
  const soulEnabled = soulRoots.length > 0;
  const fields = { ...fallbackFields };
  let compatible = agentRoots.length === 1 && (soulRoots.length === 0 || soulRoots.length === 1);

  fieldSchemas.forEach(([key, level, path]) => {
    if (!soulEnabled && path[0] === SOUL_PROMPT_ROOT) return;
    const matches = sections.filter(
      (item) => item.level === level && pathKey(item.path) === pathKey(path)
    );
    if (matches.length !== 1) {
      compatible = false;
      return;
    }
    fields[key] = matches[0].content;
  });

  return { compatible, soulEnabled, fields, markdown: normalized };
}

const headings: Record<keyof GuidedPromptFields, string> = {
  overview: '## Overview',
  context: '## Context',
  workflow: '## Workflow',
  outputFormat: '## Output Format',
  exampleOutput: '### Example Output 示例输出',
  qualityChecks: '## Quality Checks',
  whenToAsk: '## When To Ask First',
  soulRole: '## 角色关系 Role & Relationship',
  soulStyle: '## 说话方式 Communication Style',
  soulInitiative: '## 主动程度 Initiative Level',
  soulTaste: '## 结果偏好 Quality Taste',
  soulTruth: '## 事实与不确定性 Truth & Uncertainty',
  soulBoundaries: '## 底线 Boundaries',
};

function section(key: keyof GuidedPromptFields, value: string) {
  return value ? `${headings[key]}\n${value}` : headings[key];
}

export function buildGuidedPrompt(fields: GuidedPromptFields, soulEnabled = true) {
  const parts = [
    '# Agent',
    section('overview', fields.overview),
    section('context', fields.context),
    section('workflow', fields.workflow),
    section('outputFormat', fields.outputFormat),
    section('exampleOutput', fields.exampleOutput),
    section('qualityChecks', fields.qualityChecks),
    section('whenToAsk', fields.whenToAsk),
  ];

  if (soulEnabled) {
    parts.push('# SOUL（可选）', section('soulRole', fields.soulRole));
    SOUL_FIELD_KEYS.forEach((key) => parts.push(section(key, fields[key])));
  }

  return parts.join('\n\n');
}

const replaceSectionContent = (markdown: string, path: readonly string[], content: string) => {
  const normalized = normalizeMarkdown(markdown);
  const lines = normalized.split('\n');
  const matches = scanHeadings(normalized).filter((item) => pathKey(item.path) === pathKey(path));
  if (matches.length !== 1) return normalized;

  const match = matches[0];
  const currentLines = lines.slice(match.contentStart, match.contentEnd);
  const firstContentIndex = currentLines.findIndex((line) => line.trim().length > 0);
  let lastContentIndex = currentLines.length - 1;
  while (lastContentIndex >= 0 && currentLines[lastContentIndex].trim().length === 0) {
    lastContentIndex -= 1;
  }
  // 仅替换正文，保留原 section 的首尾空白行和整体 Markdown 格式。
  const leadingLines = firstContentIndex < 0 ? [] : currentLines.slice(0, firstContentIndex);
  const trailingLines =
    lastContentIndex < 0 ? currentLines : currentLines.slice(lastContentIndex + 1);
  const replacement = [...leadingLines, ...(content ? content.split('\n') : []), ...trailingLines];
  lines.splice(match.contentStart, match.contentEnd - match.contentStart, ...replacement);
  return lines.join('\n');
};

const fieldPaths = fieldSchemas.reduce<Record<keyof GuidedPromptFields, readonly string[]>>(
  (result, [key, , path]) => ({ ...result, [key]: path }),
  {} as Record<keyof GuidedPromptFields, readonly string[]>
);

export function syncGuidedPrompt(markdown: string, fields: GuidedPromptFields) {
  const parsed = parseGuidedPrompt(markdown);
  if (!parsed.compatible) return markdown;

  let next = parsed.markdown;
  fieldSchemas.forEach(([key, , path]) => {
    if (!parsed.soulEnabled && path[0] === SOUL_PROMPT_ROOT) return;
    next = replaceSectionContent(next, fieldPaths[key], fields[key]);
  });
  return next;
}

export function setSoulEnabled(markdown: string, fields: GuidedPromptFields, enabled: boolean) {
  const parsed = parseGuidedPrompt(markdown);
  if (!parsed.compatible || parsed.soulEnabled === enabled) return parsed.markdown;

  if (enabled) {
    const soulBlock = buildGuidedPrompt(fields, true).split(`\n\n# ${SOUL_PROMPT_ROOT}`)[1];
    return `${parsed.markdown.trimEnd()}\n\n# ${SOUL_PROMPT_ROOT}${soulBlock}`;
  }

  const lines = parsed.markdown.split('\n');
  const sections = scanHeadings(parsed.markdown);
  const root = sections.find(
    (item) => item.level === 1 && item.path.length === 1 && item.title === SOUL_PROMPT_ROOT
  );
  if (!root) return parsed.markdown;
  const nextRoot = sections.find((item) => item.level === 1 && item.lineIndex > root.lineIndex);
  lines.splice(root.lineIndex, (nextRoot?.lineIndex ?? lines.length) - root.lineIndex);
  return lines.join('\n').trimEnd();
}
