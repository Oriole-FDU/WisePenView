/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type { BlockConfig } from '@blocknote/core';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import { useRequest } from 'ahooks';
import { Check, Copy } from 'lucide-react';
import { useId, useState } from 'react';

import AppIconButton from '@/components/Button/AppIconButton';
import SegmentedTabs from '@/components/SegmentedTabs';
import { copyText } from '@/utils/browser/copyText';
import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import { renderNoteMermaidDiagram } from '../mermaidRuntime';
import { readMermaidSource } from '../source';
import styles from './style.module.less';

const mermaidBlockConfig = {
  type: 'mermaid',
  propSchema: {},
  content: 'inline',
} as const satisfies BlockConfig<'mermaid', Record<never, never>, 'inline'>;

type MermaidBlockRenderProps = ReactCustomBlockRenderProps<typeof mermaidBlockConfig>;
type MermaidView = 'code' | 'graph';

function readRenderError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '图表渲染失败，请检查 Mermaid 语法。';
}

function MermaidBlockView({ block, contentRef }: MermaidBlockRenderProps) {
  const readOnly = useNoteEditorReadOnlyContext();
  const [view, setView] = useState<MermaidView>('graph');
  const [copied, setCopied] = useState(false);
  const diagramId = `note-mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const source = readMermaidSource(block.content);
  const shouldRender = source.trim().length > 0;
  const { data: rendered, loading } = useRequest(
    async () => {
      try {
        return { source, svg: await renderNoteMermaidDiagram(diagramId, source) };
      } catch (error) {
        return { source, error: readRenderError(error) };
      }
    },
    { ready: shouldRender, refreshDeps: [diagramId, source, shouldRender] }
  );
  const result = rendered?.source === source ? rendered : undefined;

  const handleCopy = async () => {
    if (!(await copyText(source))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header} contentEditable={false}>
        <span className={styles.title}>mermaid</span>
        <div className={styles.toolbarActions} data-mermaid-toolbar-actions="">
          <SegmentedTabs
            ariaLabel="Mermaid 展示模式"
            items={[
              { key: 'code', label: '源码' },
              { key: 'graph', label: '图形' },
            ]}
            selectedKey={view}
            onSelectionChange={(key) => setView(key as MermaidView)}
            size="sm"
            className={styles.tabs}
          />
          <AppIconButton
            icon={
              copied ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )
            }
            label={copied ? '已复制 Mermaid 源码' : '复制 Mermaid 源码'}
            size="sm"
            isActive={copied}
            className={styles.copyButton}
            data-copied={copied}
            tooltip={{ content: copied ? '已复制' : '复制源码' }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={handleCopy}
          />
        </div>
      </div>
      <div className={styles.content}>
        <div
          className={view === 'graph' ? styles.preview : `${styles.preview} ${styles.panelHidden}`}
          contentEditable={false}
        >
          {!shouldRender ? <div className={styles.status}>请输入 Mermaid 图表源码。</div> : null}
          {shouldRender && loading ? <div className={styles.status}>正在渲染图表...</div> : null}
          {shouldRender && result?.error ? (
            <div className={styles.error}>{result.error}</div>
          ) : null}
          {shouldRender && result?.svg ? (
            <div className={styles.diagram} dangerouslySetInnerHTML={{ __html: result.svg }} />
          ) : null}
        </div>
        <pre
          className={view === 'code' ? styles.source : `${styles.source} ${styles.panelHidden}`}
          data-readonly={readOnly || undefined}
        >
          <code ref={contentRef} data-language="mermaid" />
        </pre>
      </div>
    </div>
  );
}

function MermaidBlockToExternalHTML({ contentRef }: MermaidBlockRenderProps) {
  return (
    <pre className={styles.externalSource}>
      <code ref={contentRef} data-language="mermaid" />
    </pre>
  );
}

/** Mermaid 独立块：源码由 BlockNote inline content 托管，保证协同与撤销栈一致。 */
export const createMermaidBlockSpec = createReactBlockSpec(mermaidBlockConfig, {
  render: MermaidBlockView,
  toExternalHTML: MermaidBlockToExternalHTML,
});
