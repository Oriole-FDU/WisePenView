/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type { BlockConfig } from '@blocknote/core';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import { useRequest } from 'ahooks';
import { Check, Copy } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/Button/AppIconButton';
import SegmentedTabs from '@/components/SegmentedTabs';
import i18n from '@/i18n';
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
  return i18n.t('mermaid.renderFailed', { ns: 'note' });
}

function MermaidBlockView({ block, contentRef, editor }: MermaidBlockRenderProps) {
  const { t } = useTranslation('note');
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

  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器选区进入当前 Mermaid 块时。
   * 不可替代原因：源码编辑区在图形态被隐藏，必须订阅编辑器选区变化后切换到可承载原生光标的面板。
   * cleanup：卸载时取消 BlockNote 选区订阅，避免已销毁的块视图继续更新状态。
   */
  useEffect(() => {
    if (readOnly) return;
    return editor.onSelectionChange((currentEditor) => {
      if (currentEditor.getTextCursorPosition().block.id === block.id) {
        setView('code');
      }
    });
  }, [block.id, editor, readOnly]);

  /**
   * @wisepen-manual-effect
   * 执行时机：源码面板由图形态切换为可见后。
   * 不可替代原因：ProseMirror 在源码 DOM 被隐藏时已完成选区同步，需等待 React 提交可见布局后重新聚焦，才能重新绘制原生光标。
   * cleanup：卸载或再次切换视图时取消尚未执行的 animation frame。
   */
  useEffect(() => {
    if (readOnly || view !== 'code') return;
    const frame = window.requestAnimationFrame(() => {
      if (editor.getTextCursorPosition().block.id === block.id) {
        editor.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [block.id, editor, readOnly, view]);

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
            ariaLabel={t('mermaid.displayMode')}
            items={[
              { key: 'code', label: t('mermaid.source') },
              { key: 'graph', label: t('mermaid.graph') },
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
            label={t(copied ? 'mermaid.copiedSource' : 'mermaid.copySource')}
            size="sm"
            isActive={copied}
            className={styles.copyButton}
            data-copied={copied}
            tooltip={{ content: t(copied ? 'mermaid.copied' : 'mermaid.copy') }}
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
          {!shouldRender ? <div className={styles.status}>{t('mermaid.empty')}</div> : null}
          {shouldRender && loading ? (
            <div className={styles.status}>{t('mermaid.rendering')}</div>
          ) : null}
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
