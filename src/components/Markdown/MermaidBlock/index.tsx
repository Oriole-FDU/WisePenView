import SegmentedTabs from '@/components/SegmentedTabs';
import { useRequest } from 'ahooks';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
        <SegmentedTabs
          ariaLabel={t('markdown.mermaidMode')}
          items={[
            { key: 'code', label: t('markdown.code') },
            { key: 'graph', label: t('markdown.graph') },
          ]}
          selectedKey={view}
          onSelectionChange={(key) => setView(key as MermaidView)}
          size="sm"
          className={styles.tabs}
        />
      }
    >
      {view === 'code' || streaming ? <HighlightedCode code={code} language={language} /> : null}
      {shouldRender && loading ? (
        <div className={styles.status}>{t('markdown.mermaidRendering')}</div>
      ) : null}
      {shouldRender && result?.error ? <div className={styles.error}>{result.error}</div> : null}
      {shouldRender && result?.svg ? (
        <div className={styles.graph}>
          <div className={styles.svg} dangerouslySetInnerHTML={{ __html: result.svg }} />
        </div>
      ) : null}
    </CodeBlockFrame>
  );
}

export default MermaidBlock;
