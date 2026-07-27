import CopyButton from '@/components/Button/CopyButton';
import {
  normalizeCodeLanguage,
  tokenizeCodeLines,
  type CodeHighlightToken,
} from '@/utils/codeHighlight';
import { useRequest } from 'ahooks';
import { type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeBlockFrameProps, CodeBlockProps, HighlightedCodeProps } from './index.type';
import styles from './style.module.less';

function getTokenStyle(token: CodeHighlightToken): CSSProperties {
  const fontStyle = token.fontStyle ?? 0;
  return {
    color: token.color,
    fontStyle: fontStyle & 1 ? 'italic' : undefined,
    fontWeight: fontStyle & 2 ? 700 : undefined,
    textDecoration: fontStyle & 4 ? 'underline' : undefined,
  };
}

function renderHighlightedCode(code: string, tokens: readonly CodeHighlightToken[][]): ReactNode {
  return code.split('\n').map((line, lineIndex) => {
    const lineTokens = tokens[lineIndex];
    return (
      <span key={`${lineIndex}-${line}`} className={styles.codeLine}>
        {lineTokens?.length
          ? lineTokens.map((token, tokenIndex) => (
              <span key={`${tokenIndex}-${token.content}`} style={getTokenStyle(token)}>
                {token.content}
              </span>
            ))
          : line || '\u200B'}
      </span>
    );
  });
}

export function CodeBlockFrame({ code, language, actions, children }: CodeBlockFrameProps) {
  const { t } = useTranslation('common');
  const codeLanguage = normalizeCodeLanguage(language);

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <span className={styles.language}>{codeLanguage}</span>
        <div className={styles.actions}>
          {actions}
          <CopyButton text={code} label={t('copy.codeBlock')} className={styles.copyButton} />
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

export function HighlightedCode({ code, language }: HighlightedCodeProps) {
  const codeLanguage = normalizeCodeLanguage(language);
  const { data: highlighted } = useRequest(
    async () => ({
      code,
      language: codeLanguage,
      tokens: await tokenizeCodeLines(code, codeLanguage),
    }),
    { refreshDeps: [code, codeLanguage] }
  );
  const tokens =
    highlighted?.code === code && highlighted.language === codeLanguage
      ? highlighted.tokens
      : undefined;

  return (
    <pre className={styles.pre}>
      <code className={`language-${codeLanguage}`}>
        {tokens?.length ? renderHighlightedCode(code, tokens) : code}
      </code>
    </pre>
  );
}

function CodeBlock({ code, language, actions }: CodeBlockProps) {
  return (
    <CodeBlockFrame code={code} language={language} actions={actions}>
      <HighlightedCode code={code} language={language} />
    </CodeBlockFrame>
  );
}

export default CodeBlock;
