/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import type { BlockConfig } from '@blocknote/core';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import { Dropdown, Label } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, Copy, Eye, LayoutTemplate } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import i18n from '@/i18n';
import { copyText } from '@/utils/browser/copyText';
import { sanitizeHtml, SVG_HTML_SANITIZE_CONFIG } from '@/utils/sanitizeHtml';

import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import { renderNoteMermaidDiagram } from '../mermaidRuntime';
import {
  DEFAULT_MERMAID_SOURCE,
  MERMAID_TEMPLATE_SOURCES,
  type MermaidTemplateKey,
  readMermaidSource,
} from '../source';
import styles from './style.module.less';

const mermaidBlockConfig = {
  type: 'mermaid',
  propSchema: {},
  content: 'inline',
} as const satisfies BlockConfig<'mermaid', Record<never, never>, 'inline'>;

type MermaidBlockRenderProps = ReactCustomBlockRenderProps<typeof mermaidBlockConfig>;
type MermaidView = 'code' | 'graph' | 'split';

const MERMAID_VIEW_OPTIONS = [
  { key: 'split', labelKey: 'mermaid.allViews' },
  { key: 'code', labelKey: 'mermaid.source' },
  { key: 'graph', labelKey: 'mermaid.graph' },
] as const satisfies Array<{ key: MermaidView; labelKey: string }>;

const MERMAID_TEMPLATE_OPTIONS = [
  { key: 'flowchart', labelKey: 'mermaid.templateFlowchart' },
  { key: 'sequence', labelKey: 'mermaid.templateSequence' },
  { key: 'gantt', labelKey: 'mermaid.templateGantt' },
  { key: 'state', labelKey: 'mermaid.templateState' },
  { key: 'class', labelKey: 'mermaid.templateClass' },
  { key: 'er', labelKey: 'mermaid.templateEr' },
  { key: 'pie', labelKey: 'mermaid.templatePie' },
  { key: 'timeline', labelKey: 'mermaid.templateTimeline' },
  { key: 'journey', labelKey: 'mermaid.templateJourney' },
] as const satisfies Array<{ key: MermaidTemplateKey; labelKey: string }>;

function readRenderError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return i18n.t('mermaid.renderFailed', { ns: 'note' });
}

function MermaidBlockView({ block, contentRef, editor }: MermaidBlockRenderProps) {
  const { t } = useTranslation('note');
  const readOnly = useNoteEditorReadOnlyContext();
  const [view, setView] = useState<MermaidView>('split');
  const [copied, setCopied] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const diagramId = `note-mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const source = readMermaidSource(block.content);
  const shouldRender = source.trim().length > 0;
  const currentViewOption = MERMAID_VIEW_OPTIONS.find((option) => option.key === view);
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
   * 执行时机：编辑器选区进入当前 Mermaid 块且当前处于图形视图时。
   * 不可替代原因：图形视图无法直接输入，需要切换到可承载原生光标的源码视图后才能继续编辑。
   * cleanup：卸载时自动取消选区订阅。
   */
  useEffect(() => {
    if (readOnly || view !== 'graph') return;
    return editor.onSelectionChange((currentEditor) => {
      if (currentEditor.getTextCursorPosition().block.id === block.id) {
        setView('code');
      }
    });
  }, [block.id, editor, readOnly, view]);

  /**
   * @wisepen-manual-effect
   * 执行时机：切换到源码视图后。
   * 不可替代原因：源码区域是 BlockNote inline content，必须在可见状态下重新聚焦才能继续输入。
   * cleanup：取消尚未执行的 animation frame。
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

  const handleViewChange = (viewKey: MermaidView) => {
    setView(viewKey);
    setViewOpen(false);
  };

  const applyTemplate = (templateKey: MermaidTemplateKey) => {
    if (readOnly) return;
    editor.updateBlock(block, {
      content: [
        {
          type: 'text',
          text: MERMAID_TEMPLATE_SOURCES[templateKey] || DEFAULT_MERMAID_SOURCE,
          styles: {},
        },
      ],
    });
    setView('split');
    setTemplateOpen(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <div className={styles.header} contentEditable={false}>
          <span className={styles.title}>mermaid</span>
          <div className={styles.toolbarActions} data-mermaid-toolbar-actions="">
            <Dropdown isOpen={viewOpen} onOpenChange={setViewOpen}>
              <AppIconButton
                icon={<Eye size={14} aria-hidden="true" />}
                label={t('mermaid.displayMode')}
                size="sm"
                className={styles.viewButton}
                overlayTrigger={<Dropdown.Trigger />}
                tooltip={{ content: currentViewOption ? t(currentViewOption.labelKey) : undefined }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  aria-label={t('mermaid.displayMode')}
                  selectedKeys={[view]}
                  selectionMode="single"
                  onAction={(key) => handleViewChange(String(key) as MermaidView)}
                >
                  {MERMAID_VIEW_OPTIONS.map((option) => (
                    <Dropdown.Item key={option.key} id={option.key} textValue={t(option.labelKey)}>
                      <Label>{t(option.labelKey)}</Label>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
            <Dropdown isOpen={templateOpen} onOpenChange={setTemplateOpen}>
              <AppIconButton
                icon={<LayoutTemplate size={14} aria-hidden="true" />}
                label={t('mermaid.template')}
                size="sm"
                isDisabled={readOnly}
                className={styles.templateButton}
                overlayTrigger={<Dropdown.Trigger />}
                tooltip={{ content: t('mermaid.template') }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  aria-label={t('mermaid.template')}
                  onAction={(key) => applyTemplate(String(key) as MermaidTemplateKey)}
                >
                  {MERMAID_TEMPLATE_OPTIONS.map((option) => (
                    <Dropdown.Item key={option.key} id={option.key} textValue={t(option.labelKey)}>
                      <Label>{t(option.labelKey)}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
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
        <div className={styles.body} data-view={view} data-mermaid-block-body="">
          <section
            className={view === 'graph' ? `${styles.pane} ${styles.paneHidden}` : styles.pane}
            data-view={view}
            data-mermaid-pane="source"
          >
            <div className={styles.paneHeader} contentEditable={false} data-mermaid-pane-header="">
              <span className={styles.paneTitle}>{t('mermaid.source')}</span>
            </div>
            <pre className={styles.source} data-readonly={readOnly || undefined}>
              <code ref={contentRef} data-language="mermaid" />
            </pre>
          </section>
          <section
            className={view === 'code' ? `${styles.pane} ${styles.paneHidden}` : styles.pane}
            data-view={view}
            data-mermaid-pane="graph"
          >
            <div className={styles.paneHeader} contentEditable={false} data-mermaid-pane-header="">
              <span className={styles.paneTitle}>{t('mermaid.graph')}</span>
            </div>
            <div className={styles.preview} contentEditable={false}>
              {!shouldRender ? <div className={styles.status}>{t('mermaid.empty')}</div> : null}
              {shouldRender && loading ? (
                <div className={styles.status}>{t('mermaid.rendering')}</div>
              ) : null}
              {shouldRender && result?.error ? (
                <div className={styles.error}>{result.error}</div>
              ) : null}
              {shouldRender && result?.svg ? (
                <div
                  className={styles.diagram}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(result.svg, SVG_HTML_SANITIZE_CONFIG),
                  }}
                />
              ) : null}
            </div>
          </section>
        </div>
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
