import type { EditorExitChoice, EditorExitPrompt } from '../editor.type';

/** 提示按退出请求归属，旧请求结束不能关闭新请求的提示。 */
export function createEditorExitPrompt() {
  let prompt:
    { data: EditorExitPrompt; owner: object; resolve(choice: EditorExitChoice): void } | undefined;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  const choose = (choice: EditorExitChoice) => {
    const current = prompt;
    prompt = undefined;
    current?.resolve(choice);
    publish();
  };
  return {
    getSnapshot: () => prompt?.data,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    choose,
    createRequest() {
      const owner = {};
      let active = true;
      return {
        confirm(data: EditorExitPrompt) {
          if (!active) return Promise.resolve<EditorExitChoice>('cancel');
          choose('cancel');
          return new Promise<EditorExitChoice>((resolve) => {
            prompt = { data, owner, resolve };
            publish();
          });
        },
        dispose() {
          active = false;
          if (prompt?.owner === owner) choose('cancel');
        },
      };
    },
  };
}
