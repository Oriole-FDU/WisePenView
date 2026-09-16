/* eslint-disable react-refresh/only-export-components -- AI Diff DOM 渲染器需要暴露 React 挂载函数 */
import { Tabs } from '@heroui/react';
import { useId, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useApi } from '@/hooks/useApi';
import i18n from '@/i18n';
import { sanitizeHtml, SVG_HTML_SANITIZE_CONFIG } from '@/utils/sanitizeHtml';

import styles from './MermaidBlock/style.module.less';
import { renderNoteMermaidDiagram } from './mermaidRuntime';

type MermaidDiffView = 'source' | 'graph';

interface MermaidAiDiffPanelProps {
  source: string;
}

interface MermaidAiDiffPanelHostElement extends HTMLElement {
  reactRoot?: Root;
}

const MERMAID_AI_DIFF_PANEL_ELEMENT = 'wisepen-mermaid-ai-diff-panel';

function readRenderError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return i18n.t('mermaid.renderFailed', { ns: 'note' });
}

function ensureMermaidAiDiffPanelElement() {
  if (customElements.get(MERMAID_AI_DIFF_PANEL_ELEMENT)) return;
  customElements.define(
    MERMAID_AI_DIFF_PANEL_ELEMENT,
    class extends HTMLElement {
      disconnectedCallback() {
        const host = this as MermaidAiDiffPanelHostElement;
        const root = host.reactRoot;
        if (!root) return;
        host.reactRoot = undefined;
        queueMicrotask(() => root.unmount());
      }
    }
  );
}

function MermaidAiDiffPanel({ source }: MermaidAiDiffPanelProps) {
  const [view, setView] = useState<MermaidDiffView>('graph');
  const diagramId = `ai-diff-mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shouldRender = source.trim().length > 0;
  const { data: rendered, loading } = useApi(
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

  return (
    <>
      <div className={styles.aiDiffHeader}>
        <Tabs
          selectedKey={view}
          onSelectionChange={(key) => setView(key as MermaidDiffView)}
          className={styles.aiDiffTabs}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List
              className={styles.aiDiffTabsList}
              aria-label={i18n.t('mermaid.displayMode', { ns: 'note' })}
            >
              <Tabs.Tab id="source" className={styles.aiDiffTab}>
                {i18n.t('mermaid.source', { ns: 'note' })}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="graph" className={styles.aiDiffTab}>
                {i18n.t('mermaid.graph', { ns: 'note' })}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
      <div className={styles.aiDiffPanelContent}>
        <div
          className={
            view === 'graph'
              ? styles.aiDiffPreview
              : `${styles.aiDiffPreview} ${styles.aiDiffPanelHidden}`
          }
        >
          {!shouldRender ? i18n.t('mermaid.empty', { ns: 'note' }) : null}
          {shouldRender && loading ? i18n.t('mermaid.rendering', { ns: 'note' }) : null}
          {shouldRender && result?.error ? (
            <div className={styles.aiDiffRenderError}>{result.error}</div>
          ) : null}
          {shouldRender && result?.svg ? (
            <div
              className={styles.aiDiffDiagram}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(result.svg, SVG_HTML_SANITIZE_CONFIG),
              }}
            />
          ) : null}
        </div>
        <pre
          className={
            view === 'source'
              ? styles.aiDiffSource
              : `${styles.aiDiffSource} ${styles.aiDiffPanelHidden}`
          }
        >
          <code>{source}</code>
        </pre>
      </div>
    </>
  );
}

export function createMermaidAiDiffPanel(params: {
  source: string;
  toneClassName: string;
  diffKind?: 'delete' | 'insert';
}): HTMLElement {
  ensureMermaidAiDiffPanelElement();
  const host = document.createElement(
    MERMAID_AI_DIFF_PANEL_ELEMENT
  ) as MermaidAiDiffPanelHostElement;
  host.className = `${styles.aiDiffPanel} ${params.toneClassName}`;
  host.contentEditable = 'false';
  host.dataset.readOnly = 'true';
  if (params.diffKind) host.dataset.diffKind = params.diffKind;

  const reactRoot = createRoot(host);
  host.reactRoot = reactRoot;
  queueMicrotask(() => {
    if (!host.reactRoot) return;
    reactRoot.render(<MermaidAiDiffPanel source={params.source} />);
  });
  return host;
}
