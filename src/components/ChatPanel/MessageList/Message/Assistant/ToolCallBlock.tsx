import { useMessageScroller } from '@/components/_shadcn';
import { useEffectForce } from '@/hooks/useEffectForce';
import { Button, Chip, Disclosure } from '@heroui/react';
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { CheckCircle2, Circle, CircleX, Clock, Wrench, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import styles from './ToolCallBlock.module.less';

type RenderableToolPart = ToolUIPart | DynamicToolUIPart;
type ToolPartState = RenderableToolPart['state'];

type ToolDetailKind = 'input' | 'output' | 'error';

type ToolStatusTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

interface ToolStatusBadge {
  label: string;
  tone: ToolStatusTone;
  Icon: LucideIcon;
}

interface ToolDetailSection {
  kind: ToolDetailKind;
  label: string;
  text: string;
}

const STATUS_ICON_SIZE = 12;

/** 对齐 AI Elements Tool getStatusBadge 的状态文案与色调 */
function getToolStatusBadge(part: RenderableToolPart): ToolStatusBadge {
  switch (part.state) {
    case 'input-streaming':
      return { label: '待处理', tone: 'default', Icon: Circle };
    case 'input-available':
      return { label: '运行中', tone: 'default', Icon: Clock };
    case 'approval-requested':
      return { label: '等待批准', tone: 'warning', Icon: Clock };
    case 'approval-responded':
      return { label: '已回复', tone: 'accent', Icon: CheckCircle2 };
    case 'output-available':
      return { label: '已完成', tone: 'success', Icon: CheckCircle2 };
    case 'output-error':
      return { label: '错误', tone: 'danger', Icon: CircleX };
    case 'output-denied':
      return { label: '已拒绝', tone: 'danger', Icon: CircleX };
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
    sections.push({ kind: 'input', label: '输入', text: formatToolPayload(part.input) });
  }

  if (part.state === 'output-available') {
    sections.push({ kind: 'output', label: '输出', text: formatToolPayload(part.output) });
  }

  if (part.state === 'output-error') {
    sections.push({ kind: 'error', label: '错误', text: part.errorText || '调用失败' });
  }

  return sections;
}

function ToolStatusChip({ badge }: { badge: ToolStatusBadge }) {
  const { Icon, label, tone } = badge;
  return (
    <Chip size="sm" variant="soft" color={tone} className={styles.statusChip}>
      <Icon size={STATUS_ICON_SIZE} aria-hidden="true" className={styles.statusChipIcon} />
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}

function ToolCallBlock({ part }: { part: RenderableToolPart }) {
  const badge = getToolStatusBadge(part);
  const [userExpanded, setUserExpanded] = useState(false);
  const previousStateRef = useRef<ToolPartState | null>(null);
  const { scrollToEndUnlessUserInterrupted } = useMessageScroller();
  const detailSections = getToolDetailSections(part);
  const toolName = getToolName(part);

  /**
   * 工具块首次出现或状态切换时，后续结果与正文可能在同一批次渲染。
   * 任意状态都保持收起，需用户手动展开查看详情。
   */
  useEffectForce(() => {
    const stateChanged = previousStateRef.current !== part.state;
    previousStateRef.current = part.state;

    if (!stateChanged) return;

    setUserExpanded(false);
    scrollToEndUnlessUserInterrupted();
  }, [part.state, scrollToEndUnlessUserInterrupted]);

  return (
    <div className={styles.wrapper}>
      <Disclosure isExpanded={userExpanded} onExpandedChange={setUserExpanded}>
        <Disclosure.Heading>
          <Button slot="trigger" variant="ghost" className={styles.trigger}>
            <span className={styles.headerMain}>
              <Wrench size={14} aria-hidden="true" className={styles.toolIcon} />
              <span className={styles.toolName}>{toolName}</span>
            </span>
            <span className={styles.headerEnd}>
              <ToolStatusChip badge={badge} />
              <Disclosure.Indicator />
            </span>
          </Button>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className={styles.panel}>
            {detailSections.length === 0 ? (
              <p className={styles.empty}>暂无详情</p>
            ) : (
              detailSections.map((section) => (
                <section key={section.kind} className={styles.section}>
                  <h4 className={styles.sectionLabel}>{section.label}</h4>
                  <pre className={section.kind === 'error' ? styles.errorText : styles.payload}>
                    {section.text}
                  </pre>
                </section>
              ))
            )}
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
}

export default ToolCallBlock;
