import type { DefaultStyleSchema } from '@blocknote/core';
import { DEFAULT_LINK_PROTOCOL, VALID_LINK_PROTOCOLS } from '@blocknote/core/extensions';
import {
  GenericPopover,
  OpenLinkButton,
  useComponentsContext,
  useDictionary,
  type GenericPopoverReference,
  type ReactCustomInlineContentRenderProps,
} from '@blocknote/react';
import type { Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Link, Type, Unlink } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent, ReactNode, Ref, RefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { useAiDiffDisplayModeContext } from './displayModeContext';
import {
  applyAiDiffActionForKey,
  clearAiLinkInlineContentForKey,
  editAiLinkInlineContentForKey,
  isInlineContentEffectivelyEmpty,
} from './patch';
import styles from './style.module.less';

type AiDiffActionMode = 'accept' | 'discard'; // 用户对某条 diff 的动作：accept/discard
type AiVisualMode = 'hidden' | 'plain' | 'compare'; // UI 呈现模式：隐藏占位/纯文本/对比

type AiDiffConfig = {
  readonly type: 'ai-diff';
  readonly propSchema: {
    readonly origin: { readonly default: '' };
    readonly replace: { readonly default: '' };
    readonly key: { readonly default: '' };
    readonly granularity: { readonly default: 'word' };
  };
  readonly content: 'none'; // 叶子 inline content：不允许嵌套子内容，渲染由 props 驱动
};

type AiAddConfig = {
  readonly type: 'ai-add';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

type AiDeleteConfig = {
  readonly type: 'ai-delete';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

type AiLinkAddConfig = {
  readonly type: 'ai-link-add';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly href: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

type AiLinkDeleteConfig = {
  readonly type: 'ai-link-delete';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly href: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

// 渲染层真正消费的状态结构
type AiDiffResolvedView = {
  mode: AiVisualMode; // 展示模式
  plainText: string; // plain 模式输出的文本
  origin: string; // 原文本
  replace: string; // 新文本
};

type AiDiffActionButtonsProps = {
  onApply: (mode: AiDiffActionMode) => void;
};

type EditorForActions = {
  prosemirrorView: EditorView;
  transact: (fn: (tr: Transaction) => void | Transaction) => void;
  focus: () => void;
  getTextCursorPosition: () => unknown;
  updateBlock: (block: unknown, update: unknown) => void;
  removeBlocks?: (blocks: readonly unknown[]) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// 获取当前光标所在 block，不存在则返回 null
function getCursorBlock(editor: EditorForActions): unknown | null {
  try {
    const cursor = editor.getTextCursorPosition();
    if (!isRecord(cursor)) return null;
    const block = cursor['block'];
    return block ?? null;
  } catch {
    return null; // 任意异常都降级为拿不到 block
  }
}

// 把编辑器的光标强行移动到“特定行内节点对应的 DOM 位置”附近，并让编辑器获得焦点。确保点击按钮时能找到对应的block
function focusCaretAtInlineNode(editor: EditorForActions, shell: HTMLElement | null): void {
  if (!shell) return; // 没有对应 DOM 容器就无法定位光标
  const view = editor.prosemirrorView;
  try {
    const pos = view.posAtDOM(shell, 0); // 从DOM节点反查其对应的文档位置（pos）
    // 将光标位置设为pos
    editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, Math.max(0, pos))));
  } catch {
    void 0; // 定位失败时静默处理
  }
  editor.focus();
}

// 检查一个 block 是否有嵌套子块
function blockHasNestedChildren(block: Record<string, unknown>): boolean {
  const ch = block['children'];
  return Array.isArray(ch) && ch.length > 0;
}

// 应用 AI diff 操作（accept/discard）到当前光标所在 block
function useApplyAiDiffAction(
  editor: unknown,
  changeKey: string,
  shellRef: RefObject<HTMLElement | null>
): (mode: AiDiffActionMode) => void {
  return useCallback(
    (mode: AiDiffActionMode) => {
      // 获取作用按钮指向的block
      const ed = editor as EditorForActions;
      focusCaretAtInlineNode(ed, shellRef.current);
      const block = getCursorBlock(ed);
      if (!block || !isRecord(block)) return;

      const content = block['content'];
      const next = applyAiDiffActionForKey(content, changeKey, mode); // 对 content 里匹配 changeKey 的片段应用 accept/discard，返回更新后的 content
      if (!next) return; // 返回空表示不需要更新
      // 如果更新后block内容清空，则直接删除此block
      if (isInlineContentEffectivelyEmpty(next) && !blockHasNestedChildren(block)) {
        try {
          ed.removeBlocks?.([block]);
        } catch {
          void 0; // 删除失败静默处理
        }
        ed.focus();
        return;
      }
      try {
        ed.updateBlock(block, { content: next }); // 否则更新 block 的 content 为 next
      } catch {
        void 0; // 更新失败静默处理
      }
      ed.focus();
    },
    [changeKey, editor, shellRef]
  );
}

function useUpdateAiInlineContent(
  editor: unknown,
  changeKey: string,
  shellRef: RefObject<HTMLElement | null>,
  updater: (content: unknown, key: string) => unknown[] | null
): () => void {
  return useCallback(() => {
    const ed = editor as EditorForActions;
    focusCaretAtInlineNode(ed, shellRef.current);
    const block = getCursorBlock(ed);
    if (!block || !isRecord(block)) return;

    const next = updater(block['content'], changeKey);
    if (!next) return;

    if (isInlineContentEffectivelyEmpty(next) && !blockHasNestedChildren(block)) {
      try {
        ed.removeBlocks?.([block]);
      } catch {
        void 0;
      }
      ed.focus();
      return;
    }

    try {
      ed.updateBlock(block, { content: next });
    } catch {
      void 0;
    }
    ed.focus();
  }, [changeKey, editor, shellRef, updater]);
}

function validateUrl(url: string): string {
  for (const protocol of VALID_LINK_PROTOCOLS) {
    if (url.startsWith(protocol)) {
      return url;
    }
  }

  return `${DEFAULT_LINK_PROTOCOL}://${url}`;
}

// 将ai-diff原始数据转化为渲染层可用的状态结构
function resolveDiffViewState(
  displayMode: AiDiffDisplayMode,
  payload: { origin: string; replace: string } // payload命名表示函数需要处理的数据
): AiDiffResolvedView {
  const origin = payload.origin; // 原文本
  const replace = payload.replace; // 新文本

  // 仅旧文本
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: origin ? 'plain' : 'hidden', plainText: origin, origin, replace }; // 有 origin 则直接输出 origin（plain），否则隐藏（hidden）
  }
  // 仅新文本
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: replace ? 'plain' : 'hidden', plainText: replace, origin, replace }; // 有 replace 则输出 replace（plain），否则隐藏
  }
  // 对比模式
  const hasCompareText = Boolean(origin || replace); // 对比模式下：只要任一文本存在就需要显示对比 UI
  return { mode: hasCompareText ? 'compare' : 'hidden', plainText: '', origin, replace }; // 对比时 plainText 为空，具体展示由 compare UI 决定
}

// 将ai-add原始数据转化为渲染层可用的状态结构
function resolveAddViewState(
  displayMode: AiDiffDisplayMode,
  text: string
): { mode: AiVisualMode; plainText: string } {
  if (!text) return { mode: 'hidden', plainText: '' }; // 没有文本就隐藏（不占可见空间）
  // 仅旧文本时add块不可见
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: 'hidden', plainText: '' };
  }
  // 仅新文本时显示为普通文本
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: 'plain', plainText: text };
  }
  return { mode: 'compare', plainText: '' }; // 对比模式下用 compare UI（带高亮/按钮）
}

// 将ai-delete原始数据转化为渲染层可用的状态结构
function resolveDeleteViewState(
  displayMode: AiDiffDisplayMode,
  text: string
): { mode: AiVisualMode; plainText: string } {
  if (!text) return { mode: 'hidden', plainText: '' };
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: 'hidden', plainText: '' };
  }
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: 'plain', plainText: text };
  }
  return { mode: 'compare', plainText: '' };
}

type AiLinkToolbarProps = {
  editor: unknown;
  changeKey: string;
  shellRef: RefObject<HTMLElement | null>;
  text: string;
  href: string;
};

type AiLinkHoverToolbarProps = AiLinkToolbarProps & {
  anchorElement: HTMLAnchorElement | null;
};

function AiLinkToolbarEditButton({
  editor,
  changeKey,
  shellRef,
  setToolbarOpen,
  setToolbarPositionFrozen,
  text,
  href,
}: AiLinkToolbarProps & {
  setToolbarOpen: (open: boolean) => void;
  setToolbarPositionFrozen: (frozen: boolean) => void;
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const [currentUrl, setCurrentUrl] = useState(href);
  const [currentText, setCurrentText] = useState(text);
  const updateLink = useUpdateAiInlineContent(
    editor,
    changeKey,
    shellRef,
    useCallback(
      (content, key) =>
        editAiLinkInlineContentForKey(content, key, {
          href: validateUrl(currentUrl),
          text: currentText,
        }),
      [currentText, currentUrl]
    )
  );

  const handleUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCurrentUrl(event.currentTarget.value),
    []
  );
  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCurrentText(event.currentTarget.value),
    []
  );
  const handleSubmit = useCallback(() => {
    updateLink();
    setToolbarOpen(false);
    setToolbarPositionFrozen(false);
  }, [setToolbarOpen, setToolbarPositionFrozen, updateLink]);
  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Components.Generic.Popover.Root onOpenChange={setToolbarPositionFrozen}>
      <Components.Generic.Popover.Trigger>
        <Components.LinkToolbar.Button
          className="bn-button"
          mainTooltip={dict.link_toolbar.edit.tooltip}
          isSelected={false}
        >
          {dict.link_toolbar.edit.text}
        </Components.LinkToolbar.Button>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className="bn-popover-content bn-form-popover"
        variant="form-popover"
      >
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            className="bn-text-input"
            name="url"
            icon={<Link />}
            autoFocus={true}
            placeholder={dict.link_toolbar.form.url_placeholder}
            value={currentUrl}
            onKeyDown={handleEnter}
            onChange={handleUrlChange}
            onSubmit={handleSubmit}
          />
          <Components.Generic.Form.TextInput
            className="bn-text-input"
            name="title"
            icon={<Type />}
            placeholder={dict.link_toolbar.form.title_placeholder}
            value={currentText}
            onKeyDown={handleEnter}
            onChange={handleTextChange}
            onSubmit={handleSubmit}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
}

function AiLinkToolbarDeleteButton({
  editor,
  changeKey,
  shellRef,
  setToolbarOpen,
}: AiLinkToolbarProps & { setToolbarOpen: (open: boolean) => void }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const clearLink = useUpdateAiInlineContent(
    editor,
    changeKey,
    shellRef,
    clearAiLinkInlineContentForKey
  );

  return (
    <Components.LinkToolbar.Button
      className="bn-button"
      label={dict.link_toolbar.delete.tooltip}
      mainTooltip={dict.link_toolbar.delete.tooltip}
      isSelected={false}
      onClick={(event) => {
        event.preventDefault();
        clearLink();
        setToolbarOpen(false);
      }}
      icon={<Unlink />}
    />
  );
}

function useAiLinkHoverToolbar({
  editor,
  changeKey,
  shellRef,
  anchorElement,
  text,
  href,
}: AiLinkHoverToolbarProps): {
  toolbar: ReactNode;
  linkAnchorHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
} {
  const Components = useComponentsContext()!;
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [toolbarPositionFrozen, setToolbarPositionFrozen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openToolbar = useCallback(() => {
    cancelScheduledClose();
    setToolbarOpen(true);
  }, [cancelScheduledClose]);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    if (toolbarPositionFrozen) return;
    closeTimerRef.current = window.setTimeout(() => {
      setToolbarOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }, [cancelScheduledClose, toolbarPositionFrozen]);

  const floatingUIOptions = useMemo(
    () => ({
      useFloatingOptions: {
        open: toolbarOpen,
        onOpenChange: (open: boolean, _event?: Event, reason?: string) => {
          if (reason === 'escape-key') {
            cancelScheduledClose();
            setToolbarOpen(false);
            (editor as EditorForActions).focus();
            return;
          }
          if (!toolbarPositionFrozen) {
            setToolbarOpen(open);
          }
        },
        placement: 'top-start' as const,
      },
      focusManagerProps: {
        disabled: true,
      },
      elementProps: {
        style: {
          zIndex: 50,
        },
        onMouseEnter: openToolbar,
        onMouseLeave: scheduleClose,
      },
    }),
    [cancelScheduledClose, editor, openToolbar, scheduleClose, toolbarOpen, toolbarPositionFrozen]
  );

  const reference = useMemo<GenericPopoverReference | undefined>(() => {
    if (!anchorElement) return undefined;
    return { element: anchorElement };
  }, [anchorElement]);

  const linkAnchorHandlers = useMemo(
    () => ({
      onMouseEnter: openToolbar,
      onMouseLeave: scheduleClose,
    }),
    [openToolbar, scheduleClose]
  );

  if (!anchorElement || !href) {
    return { toolbar: null, linkAnchorHandlers };
  }

  return {
    toolbar: (
      <GenericPopover reference={reference} {...floatingUIOptions}>
        <Components.LinkToolbar.Root
          className="bn-toolbar bn-link-toolbar"
          onMouseEnter={openToolbar}
          onMouseLeave={scheduleClose}
        >
          <AiLinkToolbarEditButton
            key={`${changeKey}:${href}:${text}`}
            editor={editor}
            changeKey={changeKey}
            shellRef={shellRef}
            text={text}
            href={href}
            setToolbarOpen={setToolbarOpen}
            setToolbarPositionFrozen={setToolbarPositionFrozen}
          />
          <OpenLinkButton url={href} />
          <AiLinkToolbarDeleteButton
            editor={editor}
            changeKey={changeKey}
            shellRef={shellRef}
            text={text}
            href={href}
            setToolbarOpen={setToolbarOpen}
          />
        </Components.LinkToolbar.Root>
      </GenericPopover>
    ),
    linkAnchorHandlers,
  };
}

function LinkStyledText({
  text,
  href,
  variant,
  anchorRef,
  onMouseEnter,
  onMouseLeave,
}: {
  text: string;
  href?: string;
  variant: 'add' | 'delete' | 'plain';
  anchorRef?: Ref<HTMLAnchorElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const className =
    variant === 'add'
      ? `${styles.aiAddRoot} ${styles.aiLinkText}`
      : variant === 'delete'
        ? `${styles.aiDeleteRoot} ${styles.aiLinkText}`
        : styles.aiLinkText;
  return (
    <a
      ref={anchorRef}
      href={href || undefined}
      className={className}
      target="_blank"
      rel="noreferrer noopener"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {text}
    </a>
  );
}

// 当某个diff块需要折叠时，返回一个不可见的占位span
function StrategyHiddenShell({ setRefs }: { setRefs: (node: HTMLSpanElement | null) => void }) {
  return (
    <span
      ref={setRefs} // 把该 span 的 DOM 引用回传给上层（用于 posAtDOM 定位光标）
      className={styles.aiDiffInlineStrategyHidden} // 样式
      contentEditable={false} // 声明不可编辑
      aria-hidden="true" // 对屏幕阅读器隐藏
    >
      {'\u200B'} {/* 零宽空格：保证该 inline atom 在 DOM/文档里有“可定位”的实体 */}
    </span>
  );
}

// 渲染操作按钮（Keep/Undo），并把用户点击映射成业务动作 accept/discard 回调给上层
function AiDiffActionButtons({ onApply }: AiDiffActionButtonsProps) {
  return (
    <span className={styles.aiActionsAnchor} contentEditable={false} aria-hidden="true">
      {' '}
      {/* 外层锚点：用于定位/布局按钮区域 */}
      <span className={styles.aiActionsRoot} contentEditable={false} aria-hidden="true">
        {' '}
        {/* 内层容器：放置实际按钮 */}
        <button
          type="button"
          aria-label="保留"
          className={`${styles.aiActionBtn} ${styles.aiActionAccept}`} // 按钮基础样式 + 接受态样式
          onMouseDown={(e) => {
            e.preventDefault(); // // 阻止默认点击行为，避免按钮按下导致编辑器丢焦/产生选择变化
            e.stopPropagation(); // 阻止事件冒泡到编辑器，避免触发编辑器的点击逻辑
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('accept'); // 应用“接受”
          }}
        >
          Keep
        </button>
        <button
          type="button"
          aria-label="撤销"
          className={`${styles.aiActionBtn} ${styles.aiActionDiscard}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('discard');
          }}
        >
          Undo
        </button>
      </span>
    </span>
  );
}

// 在 BlockNote 编辑器内部渲染 ai-diff，并在对比模式下提供 Keep/Undo 按钮
export function AiDiffView(
  props: ReactCustomInlineContentRenderProps<AiDiffConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props; // 解构BlockNote 传入的 editor 实例与当前 inlineContent 节点数据
  const displayMode = useAiDiffDisplayModeContext(); // 从 Context 获取当前 diff 展示模式
  const shellRef = useRef<HTMLSpanElement | null>(null); // 保存渲染出来的“壳”DOM 引用，用于定位光标
  const origin = String(inlineContent.props.origin ?? '');
  const replace = String(inlineContent.props.replace ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveDiffViewState(displayMode, { origin, replace }); // 根据展示模式与数据解析出应该如何显示

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node; // 把当前渲染的根 span 保存到 ref，供按钮点击时定位 caret
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>; // 纯文本模式：直接输出 plainText，不附带 diff UI
  }

  // 对比模式，输出 compare UI
  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      {' '}
      {/* 整体用不可编辑容器包住，作为一个原子 UI */}
      {viewState.origin ? (
        <span className={styles.aiDeleteRoot}>{viewState.origin}</span>
      ) : null}{' '}
      {/* 有 origin 则显示“删除样式”的旧文本 */}
      {viewState.replace ? (
        <span className={styles.aiAddRoot}>{viewState.replace}</span>
      ) : null}{' '}
      {/* 有 replace 则显示“新增样式”的新文本 */}
      <AiDiffActionButtons onApply={apply} /> {/* 操作按钮：接受/丢弃 */}
    </span>
  );
}

// 当编辑器内容被“导出成外部 HTML”时，把一条 ai-diff 行内节点序列化成对应的 HTML 结构（固定仅旧文本）
export function AiDiffExportHTML(
  props: ReactCustomInlineContentRenderProps<AiDiffConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const origin = String(inlineContent.props.origin ?? '');
  const replace = String(inlineContent.props.replace ?? '');
  const plain = resolveDiffViewState(AI_DIFF_DISPLAY_MODE.OLD_ONLY, { origin, replace }).plainText;
  return plain ? <span className={styles.aiDeleteRoot}>{plain}</span> : <span />;
}

// ai-add
export function AiAddView(
  props: ReactCustomInlineContentRenderProps<AiAddConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveAddViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      <span className={styles.aiAddRoot}>{text}</span>
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiAddExportHTML(
  props: ReactCustomInlineContentRenderProps<AiAddConfig, DefaultStyleSchema>
) {
  const text = String(props.inlineContent.props.text ?? '');
  const plain = resolveAddViewState(AI_DIFF_DISPLAY_MODE.OLD_ONLY, text).plainText;
  return plain ? <span>{plain}</span> : <span />;
}

export function AiDeleteView(
  props: ReactCustomInlineContentRenderProps<AiDeleteConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveDeleteViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      <span className={styles.aiDeleteRoot}>{text}</span>
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiDeleteExportHTML(
  props: ReactCustomInlineContentRenderProps<AiDeleteConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const text = String(inlineContent.props.text ?? '');
  const plain = resolveDeleteViewState(AI_DIFF_DISPLAY_MODE.OLD_ONLY, text).plainText;
  return plain ? <span>{plain}</span> : <span />;
}

export function AiLinkAddView(
  props: ReactCustomInlineContentRenderProps<AiLinkAddConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<HTMLAnchorElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const href = String(inlineContent.props.href ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveAddViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const setAnchorRef = useCallback((node: HTMLAnchorElement | null) => {
    setAnchorElement(node);
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);
  const { toolbar, linkAnchorHandlers } = useAiLinkHoverToolbar({
    editor,
    changeKey,
    shellRef,
    anchorElement,
    text,
    href,
  });

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return (
      <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
        <LinkStyledText
          text={viewState.plainText}
          href={href}
          variant="plain"
          anchorRef={setAnchorRef}
          onMouseEnter={linkAnchorHandlers.onMouseEnter}
          onMouseLeave={linkAnchorHandlers.onMouseLeave}
        />
        {toolbar}
      </span>
    );
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      {toolbar}
      <LinkStyledText
        text={text}
        href={href}
        variant="add"
        anchorRef={setAnchorRef}
        onMouseEnter={linkAnchorHandlers.onMouseEnter}
        onMouseLeave={linkAnchorHandlers.onMouseLeave}
      />
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiLinkAddExportHTML(
  props: ReactCustomInlineContentRenderProps<AiLinkAddConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const text = String(inlineContent.props.text ?? '');
  return <span className={styles.aiLinkText}>{text}</span>;
}

export function AiLinkDeleteView(
  props: ReactCustomInlineContentRenderProps<AiLinkDeleteConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<HTMLAnchorElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const href = String(inlineContent.props.href ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveDeleteViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const setAnchorRef = useCallback((node: HTMLAnchorElement | null) => {
    setAnchorElement(node);
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);
  const { toolbar, linkAnchorHandlers } = useAiLinkHoverToolbar({
    editor,
    changeKey,
    shellRef,
    anchorElement,
    text,
    href,
  });

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return (
      <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
        <LinkStyledText
          text={viewState.plainText}
          href={href}
          variant="plain"
          anchorRef={setAnchorRef}
          onMouseEnter={linkAnchorHandlers.onMouseEnter}
          onMouseLeave={linkAnchorHandlers.onMouseLeave}
        />
        {toolbar}
      </span>
    );
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      {toolbar}
      <LinkStyledText
        text={text}
        href={href}
        variant="delete"
        anchorRef={setAnchorRef}
        onMouseEnter={linkAnchorHandlers.onMouseEnter}
        onMouseLeave={linkAnchorHandlers.onMouseLeave}
      />
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiLinkDeleteExportHTML(
  props: ReactCustomInlineContentRenderProps<AiLinkDeleteConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const text = String(inlineContent.props.text ?? '');
  return <span className={styles.aiLinkText}>{text}</span>;
}
