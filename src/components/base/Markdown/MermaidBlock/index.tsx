import { Tabs } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sanitizeHtml, SVG_HTML_SANITIZE_CONFIG } from '@/utils/sanitizeHtml';

import { CodeBlockFrame, HighlightedCode } from '../CodeBlock';
import { renderMermaidDiagram } from './mermaidRuntime';
import styles from './style.module.less';

type MermaidView = 'code' | 'graph';

interface MermaidBlockProps {
  code: string;
  language?: string;
  streaming: boolean;
}

function readRenderError(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

function MermaidBlock({ code, language, streaming }: MermaidBlockProps) {
  const { t, i18n } = useTranslation('common');
  const [view, setView] = useState<MermaidView>('graph');
  const diagramId = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const shouldRender = view === 'graph' && !streaming;
  const { data: rendered, loading } = useRequest(
    async () => {
      try {
        return { source: code, svg: await renderMermaidDiagram(diagramId, code) };
      } catch (error) {
        return { source: code, error: readRenderError(error, t('markdown.mermaidFailed')) };
      }
    },
    {
      ready: shouldRender,
      refreshDeps: [code, diagramId, shouldRender, i18n.resolvedLanguage],
    }
  );
  const result = rendered?.source === code ? rendered : undefined;

  return (
    <CodeBlockFrame
      code={code}
      language={language}
      actions={
        <Tabs
          selectedKey={view}
          onSelectionChange={(key) => setView(key as MermaidView)}
          className={styles.tabs}
        >
          <Tabs.ListContainer>
            <Tabs.List className={styles.tabsList} aria-label={t('markdown.mermaidMode')}>
              <Tabs.Tab id="code" className={styles.tab}>
                {t('markdown.code')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="graph" className={styles.tab}>
                {t('markdown.graph')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      }
    >
      {view === 'code' || streaming ? <HighlightedCode code={code} language={language} /> : null}
      {shouldRender && loading ? (
        <div className={styles.status}>{t('markdown.mermaidRendering')}</div>
      ) : null}
      {shouldRender && result?.error ? <div className={styles.error}>{result.error}</div> : null}
      {shouldRender && result?.svg ? (
        <div className={styles.graph}>
          <div
            className={styles.svg}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(result.svg, SVG_HTML_SANITIZE_CONFIG),
            }}
          />
        </div>
      ) : null}
    </CodeBlockFrame>
  );
}

export default MermaidBlock;
