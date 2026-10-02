const AI_DIFF_DOM_CLEANUPS = Symbol('aiDiffDomCleanups');

interface AiDiffDisposableElement extends Element {
  [AI_DIFF_DOM_CLEANUPS]?: Array<() => void>;
}

function registerAiDiffDomCleanup(element: Element, cleanup: () => void): void {
  const disposable = element as AiDiffDisposableElement;
  disposable[AI_DIFF_DOM_CLEANUPS] ??= [];
  disposable[AI_DIFF_DOM_CLEANUPS].push(cleanup);
}

export function addAiDiffDomCleanup(element: HTMLElement, cleanup: () => void): void {
  registerAiDiffDomCleanup(element, cleanup);
}

export function addAiDiffDomListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void {
  const eventListener = listener as EventListener;
  element.addEventListener(type, eventListener, options);
  registerAiDiffDomCleanup(element, () => {
    element.removeEventListener(type, eventListener, options);
  });
}

export function cleanupAiDiffDomTree(root: Node): void {
  if (!(root instanceof Element)) return;

  const cleanupElement = (element: Element) => {
    const disposable = element as AiDiffDisposableElement;
    const cleanups = disposable[AI_DIFF_DOM_CLEANUPS];
    if (!cleanups) return;
    delete disposable[AI_DIFF_DOM_CLEANUPS];
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  };

  cleanupElement(root);
  root.querySelectorAll('*').forEach(cleanupElement);
}
