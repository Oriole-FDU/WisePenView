import type { NoteRichTextAiDiffConfig } from '../plugins/DefaultContentPlugin/aiDiff';

interface NoteConfig {
  aiDiff: {
    richText: NoteRichTextAiDiffConfig;
  };
}

/** Note 的静态行为配置；回归调参统一从组合根注入。 */
export const noteConfig = {
  aiDiff: {
    richText: {
      hunk: {
        highChangeRatio: 0.55,
        maxGapCharacters: 2,
        maxGapTokens: 1,
        maxMergedCharacters: 48,
        maxHunksPerBlock: 12,
      },
      limits: {
        maxMatrixCells: 250_000,
      },
    },
  },
} as const satisfies NoteConfig;
