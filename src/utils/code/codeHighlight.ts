import type { createHighlighter } from 'shiki';

const DEFAULT_CODE_HIGHLIGHT_THEME = 'github-light';
const FALLBACK_CODE_LANGUAGE = 'text';

type CodeHighlighter = Awaited<ReturnType<typeof createHighlighter>>;

/** Shiki token 最小形状，避免业务代码依赖 Shiki 的内部类型路径。 */
export type CodeHighlightToken = {
  content: string;
  color?: string;
  fontStyle?: number;
};

let highlighterPromise: Promise<CodeHighlighter> | null = null;

/** 代码围栏只使用首个语言标记，并与 Shiki 的小写语言 ID 对齐。 */
export function normalizeCodeLanguage(language: string | undefined): string {
  return language?.trim().split(/\s+/, 1)[0]?.toLowerCase() || FALLBACK_CODE_LANGUAGE;
}

/** 编辑器与聊天共用同一套浅色 Shiki Highlighter 单例。 */
export async function getCodeBlockHighlighter(): Promise<CodeHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki');
      const highlighter = await createHighlighter({
        themes: [DEFAULT_CODE_HIGHLIGHT_THEME],
        langs: [],
      });
      const getLoadedThemes = highlighter.getLoadedThemes.bind(highlighter);
      highlighter.getLoadedThemes = () => {
        const themes = getLoadedThemes();
        if (!themes.includes(DEFAULT_CODE_HIGHLIGHT_THEME)) return themes;
        return [
          DEFAULT_CODE_HIGHLIGHT_THEME,
          ...themes.filter((theme) => theme !== DEFAULT_CODE_HIGHLIGHT_THEME),
        ];
      };
      return highlighter;
    })();
  }
  return highlighterPromise;
}

async function resolveLanguage(highlighter: CodeHighlighter, language: string): Promise<string> {
  if (highlighter.getLoadedLanguages().includes(language)) return language;

  try {
    await highlighter.loadLanguage(language as never);
    return language;
  } catch {
    if (!highlighter.getLoadedLanguages().includes(FALLBACK_CODE_LANGUAGE)) {
      try {
        await highlighter.loadLanguage(FALLBACK_CODE_LANGUAGE as never);
      } catch {
        /* 忽略纯文本语言加载失败，调用方会回退源码。 */
      }
    }
    return highlighter.getLoadedLanguages().includes(FALLBACK_CODE_LANGUAGE)
      ? FALLBACK_CODE_LANGUAGE
      : language;
  }
}

/** 按行返回 Shiki tokens；未知语言或高亮失败时返回空数组，调用方回退纯文本。 */
export async function tokenizeCodeLines(
  code: string,
  language: string
): Promise<CodeHighlightToken[][]> {
  try {
    const highlighter = await getCodeBlockHighlighter();
    const lang = await resolveLanguage(highlighter, normalizeCodeLanguage(language));
    const result = highlighter.codeToTokens(code, {
      lang: lang as never,
      theme: DEFAULT_CODE_HIGHLIGHT_THEME,
    });
    return result.tokens as CodeHighlightToken[][];
  } catch {
    return [];
  }
}
