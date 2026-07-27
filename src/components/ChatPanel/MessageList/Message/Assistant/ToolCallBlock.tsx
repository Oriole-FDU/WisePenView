import { useMessageScroller } from '@/components/_shadcn';
import { Button, Chip } from '@heroui/react';
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleX,
  Clock,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ToolCallBlock.module.less';

type RenderableToolPart = ToolUIPart | DynamicToolUIPart;
type ToolPartState = RenderableToolPart['state'];

type ToolDetailKind = 'input' | 'output' | 'error';

type ToolStatusTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

interface ToolStatusBadge {
  labelKey: string;
  tone: ToolStatusTone;
  Icon: LucideIcon;
}

interface ToolDetailSection {
  kind: ToolDetailKind;
  labelKey: string;
  text: string;
}

interface ToolCallBlockProps {
  part: RenderableToolPart;
  /** 结束后是否自动收起，默认 true；运行中始终自动展开 */
  autoCollapseOnFinish?: boolean;
}

const STATUS_ICON_SIZE = 12;

const RUNNING_STATES: ReadonlySet<ToolPartState> = new Set([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
]);

const FINISHED_STATES: ReadonlySet<ToolPartState> = new Set([
  'output-available',
  'output-error',
  'output-denied',
]);

/** 对齐 AI Elements Tool getStatusBadge 的状态文案与色调 */
function getToolStatusBadge(part: RenderableToolPart): ToolStatusBadge {
  switch (part.state) {
    case 'input-streaming':
      return { labelKey: 'message.tool.status.pending', tone: 'default', Icon: Circle };
    case 'input-available':
      return { labelKey: 'message.tool.status.running', tone: 'default', Icon: Clock };
    case 'approval-requested':
      return {
        labelKey: 'message.tool.status.awaitingApproval',
        tone: 'warning',
        Icon: Clock,
      };
    case 'approval-responded':
      return { labelKey: 'message.tool.status.responded', tone: 'accent', Icon: CheckCircle2 };
    case 'output-available':
      return { labelKey: 'message.tool.status.completed', tone: 'success', Icon: CheckCircle2 };
    case 'output-error':
      return { labelKey: 'message.tool.status.error', tone: 'danger', Icon: CircleX };
    case 'output-denied':
      return { labelKey: 'message.tool.status.denied', tone: 'danger', Icon: CircleX };
  }
}

function formatToolPayload(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getToolDetailSections(part: RenderableToolPart): ToolDetailSection[] {
  const sections: ToolDetailSection[] = [];

  if (part.input !== undefined) {
    sections.push({
      kind: 'input',
      labelKey: 'message.tool.detail.input',
      text: formatToolPayload(part.input),
    });
  }

  if (part.state === 'output-available') {
    sections.push({
      kind: 'output',
      labelKey: 'message.tool.detail.output',
      text: formatToolPayload(part.output),
    });
  }

  if (part.state === 'output-error') {
    sections.push({
      kind: 'error',
      labelKey: 'message.tool.detail.error',
      text: part.errorText || '',
    });
  }

  return sections;
}

function ToolStatusChip({ badge }: { badge: ToolStatusBadge }) {
  const { t } = useTranslation('chat');
  const { Icon, labelKey, tone } = badge;
  return (
    <Chip size="sm" variant="soft" color={tone} className={styles.statusChip}>
      <Icon size={STATUS_ICON_SIZE} aria-hidden="true" className={styles.statusChipIcon} />
      <Chip.Label>{t(labelKey)}</Chip.Label>
    </Chip>
  );
}

function ToolCallBlock({ part, autoCollapseOnFinish = true }: ToolCallBlockProps) {
  const { t } = useTranslation('chat');
  const badge = getToolStatusBadge(part);
  const isRunning = RUNNING_STATES.has(part.state);
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const previousStateRef = useRef<ToolPartState | null>(null);
  const { scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const detailSections = getToolDetailSections(part);
  const toolName = getToolName(part);
  const isExpanded = isRunning || (userExpanded ?? !autoCollapseOnFinish);
  const panelId = useId();

  /**
   * @wisepen-manual-effect
   * 执行时机：工具调用运行状态变化时校正消息滚动位置。
   * 不可替代原因：工具状态来自外部消息运行时，消息滚动器只提供命令式控制。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const prev = previousStateRef.current;
    const stateChanged = prev !== part.state;
    previousStateRef.current = part.state;

    if (!stateChanged) return;

    if (RUNNING_STATES.has(part.state)) {
      const wasRunning = prev != null && RUNNING_STATES.has(prev);
      if (!wasRunning) scrollToEndUnlessUserInterrupted();
      return;
    }

    if (prev != null && FINISHED_STATES.has(part.state) && autoCollapseOnFinish) {
      scrollToEndUnlessUserInterrupted();
    }
  }, [part.state, autoCollapseOnFinish, scrollToEndUnlessUserInterrupted]);

  return (
    <div className={styles.wrapper}>
      <Button
        variant="ghost"
        className={styles.trigger}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onPress={() => {
          if (!isRunning) {
            setUserExpanded((current) => !(current ?? !autoCollapseOnFinish));
          }
        }}
      >
        <span className={styles.headerMain}>
          <Wrench size={14} aria-hidden="true" className={styles.toolIcon} />
          <span className={styles.toolName}>{toolName}</span>
        </span>
        <span className={styles.headerEnd}>
          <ToolStatusChip badge={badge} />
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={styles.indicator}
            data-expanded={isExpanded ? 'true' : 'false'}
          />
        </span>
      </Button>

      {isExpanded ? (
        <div id={panelId} className={styles.panel}>
          {detailSections.length === 0 ? (
            <p className={styles.empty}>{t('message.tool.detail.empty')}</p>
          ) : (
            detailSections.map((section) => (
              <section key={section.kind} className={styles.section}>
                <h4 className={styles.sectionLabel}>{t(section.labelKey)}</h4>
                <pre className={section.kind === 'error' ? styles.errorText : styles.payload}>
                  {section.text || t('message.tool.detail.failed')}
                </pre>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ToolCallBlock;
