/** 公式批注内部 Yjs 写入 origin，afterTransaction 监听器应忽略此类事务 */
export const WISEPEN_FORMULA_YJS_ORIGIN = 'wisePenFormulaCommentSync';

/** 公式批注 sync 进行中时跳过 Yjs afterTransaction 触发的 bump，避免事务嵌套栈溢出 */
export let isFormulaCommentSyncing = false;

export function isWisePenFormulaYjsTransaction(origin: unknown): boolean {
  return origin === WISEPEN_FORMULA_YJS_ORIGIN;
}

export function runWithFormulaCommentSync<T>(fn: () => T): T {
  isFormulaCommentSyncing = true;
  try {
    return fn();
  } finally {
    isFormulaCommentSyncing = false;
  }
}
