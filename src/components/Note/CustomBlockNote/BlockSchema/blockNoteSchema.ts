import { BlockNoteSchema } from '@blocknote/core';

import { createMathBlockSpec } from '../MathBlock';

/**
 * 笔记正文编辑器 schema：在 BlockNote 默认块集上扩展 KaTeX 公式块（type: math）。
 */
export const blockNoteSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    math: createMathBlockSpec(),
  },
});

export type CustomBlockNoteSchema = typeof blockNoteSchema;

/** 带 math 块的编辑器类型，供 slash 菜单与插入 API 使用 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export type CustomBlockNotePartialBlock = typeof blockNoteSchema.PartialBlock;
