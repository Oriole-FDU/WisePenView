import type { EditorProps } from '@tiptap/pm/view';
import { createContext, useContext } from 'react';

const NoteEditorReadOnlyContext = createContext(false);

export const NoteEditorReadOnlyProvider = NoteEditorReadOnlyContext.Provider;

export function useNoteEditorReadOnlyContext(): boolean {
  return useContext(NoteEditorReadOnlyContext);
}

const AI_DIFF_PLACEHOLDER_SELECTOR = '[data-ai-diff-toggle-add-placeholder="true"]';

type DOMEventHandlers = NonNullable<EditorProps['handleDOMEvents']>;
type DOMEventHandler = NonNullable<DOMEventHandlers[keyof DOMEventHandlers]>;

/** 合并插件 editorProps，并在无协同编辑权时拦截 AIDiff 占位块的 click */
export function mergeReadOnlyEditorProps(
  base: Partial<EditorProps>,
  blockLocalDocWrites: boolean
): Partial<EditorProps> {
  const placeholderClickGuard: DOMEventHandler = (view, event) => {
    if (!blockLocalDocWrites) {
      return false;
    }
    if (!(event instanceof MouseEvent) || event.button !== 0) {
      return false;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (!target.closest(AI_DIFF_PLACEHOLDER_SELECTOR)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const pluginClick = base.handleDOMEvents?.click;
  const click: DOMEventHandler | undefined = pluginClick
    ? (view, event) => placeholderClickGuard(view, event) || pluginClick(view, event)
    : placeholderClickGuard;

  return {
    ...base,
    handleDOMEvents: {
      ...base.handleDOMEvents,
      click,
    },
  };
}
