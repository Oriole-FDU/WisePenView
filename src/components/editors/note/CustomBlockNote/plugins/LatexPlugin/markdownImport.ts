import type {
  NoteMarkdownBlockImport,
  NoteMarkdownImportContext,
  NoteMarkdownInlineImport,
} from '../../registry/types';

interface MarkdownFence {
  marker: '`' | '~';
  length: number;
}

function parseFenceOpening(line: string): MarkdownFence | null {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
  if (!match) return null;
  return {
    marker: match[1][0] as MarkdownFence['marker'],
    length: match[1].length,
  };
}

function isFenceClosing(line: string, fence: MarkdownFence): boolean {
  const match = /^ {0,3}(`+|~+)\s*$/.exec(line);
  return Boolean(match && match[1][0] === fence.marker && match[1].length >= fence.length);
}

function isMathFence(line: string): boolean {
  return /^ {0,3}\$\$[ \t\r]*$/.test(line);
}

function parseSingleLineMathBlock(line: string): string | undefined {
  const match = /^ {0,3}\$\$[ \t]+(.+?)[ \t]+\$\$[ \t\r]*$/.exec(line);
  return match?.[1].trim();
}

function prepareMathBlocks(markdown: string, context: NoteMarkdownImportContext): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let codeFence: MarkdownFence | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (codeFence) {
      output.push(line);
      if (isFenceClosing(line, codeFence)) codeFence = null;
      continue;
    }

    const opening = parseFenceOpening(line);
    if (opening) {
      codeFence = opening;
      output.push(line);
      continue;
    }

    const singleLineExpression = parseSingleLineMathBlock(line);
    if (singleLineExpression !== undefined) {
      if (output.length > 0 && output[output.length - 1].trim() !== '') {
        output.push('');
      }
      output.push(context.createToken(singleLineExpression));
      if (index < lines.length - 1 && lines[index + 1].trim() !== '') {
        output.push('');
      }
      continue;
    }

    if (!isMathFence(line)) {
      output.push(line);
      continue;
    }

    let closingIndex = index + 1;
    while (closingIndex < lines.length && !isMathFence(lines[closingIndex])) {
      closingIndex += 1;
    }
    if (closingIndex >= lines.length) {
      output.push(line);
      continue;
    }

    const expression = lines
      .slice(index + 1, closingIndex)
      .join('\n')
      .trim();
    if (output.length > 0 && output[output.length - 1].trim() !== '') {
      output.push('');
    }
    output.push(context.createToken(expression));
    if (closingIndex < lines.length - 1 && lines[closingIndex + 1].trim() !== '') {
      output.push('');
    }
    index = closingIndex;
  }

  return output.join('\n');
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findClosingBackticks(text: string, start: number, length: number): number {
  const delimiter = '`'.repeat(length);
  return text.indexOf(delimiter, start + length);
}

function findLinkEnd(text: string, start: number): number | null {
  let bracketDepth = 0;
  let labelEnd = -1;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (isEscaped(text, cursor)) continue;
    if (text[cursor] === '[') bracketDepth += 1;
    if (text[cursor] === ']') {
      bracketDepth -= 1;
      if (bracketDepth === 0) {
        labelEnd = cursor;
        break;
      }
    }
  }
  if (labelEnd < 0) return null;

  const targetOpening = text[labelEnd + 1];
  if (targetOpening !== '(' && targetOpening !== '[') return null;
  const targetClosing = targetOpening === '(' ? ')' : ']';
  let targetDepth = 0;
  for (let cursor = labelEnd + 1; cursor < text.length; cursor += 1) {
    if (isEscaped(text, cursor)) continue;
    if (text[cursor] === targetOpening) targetDepth += 1;
    if (text[cursor] === targetClosing) {
      targetDepth -= 1;
      if (targetDepth === 0) return cursor + 1;
    }
  }
  return null;
}

function findInlineMathClosing(text: string, start: number): number {
  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] !== '$' || isEscaped(text, cursor)) continue;
    if (text[cursor - 1] === '$' || text[cursor + 1] === '$') continue;
    return cursor;
  }
  return -1;
}

function prepareInlineMathLine(line: string, context: NoteMarkdownImportContext): string {
  let output = '';

  for (let index = 0; index < line.length;) {
    const char = line[index];
    if (char === '\\' && index + 1 < line.length) {
      output += line.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (char === '`') {
      let delimiterLength = 1;
      while (line[index + delimiterLength] === '`') delimiterLength += 1;
      const closing = findClosingBackticks(line, index, delimiterLength);
      if (closing >= 0) {
        const end = closing + delimiterLength;
        output += line.slice(index, end);
        index = end;
        continue;
      }
    }

    if (char === '[') {
      const linkEnd = findLinkEnd(line, index);
      if (linkEnd !== null) {
        output += line.slice(index, linkEnd);
        index = linkEnd;
        continue;
      }
    }

    if (char === '<') {
      const closing = line.indexOf('>', index + 1);
      const value = closing >= 0 ? line.slice(index + 1, closing) : '';
      if (closing >= 0 && (value.includes('://') || value.includes('@'))) {
        output += line.slice(index, closing + 1);
        index = closing + 1;
        continue;
      }
    }

    if (
      char === '$' &&
      line[index - 1] !== '$' &&
      line[index + 1] !== '$' &&
      !isEscaped(line, index)
    ) {
      const closing = findInlineMathClosing(line, index);
      if (closing >= 0) {
        const expression = line.slice(index + 1, closing);
        if (expression.length > 0 && expression.trim() === expression) {
          output += context.createToken(expression);
          index = closing + 1;
          continue;
        }
      }
    }

    output += char;
    index += 1;
  }

  return output;
}

function prepareInlineMath(markdown: string, context: NoteMarkdownImportContext): string {
  const lines = markdown.split('\n');
  let codeFence: MarkdownFence | null = null;

  return lines
    .map((line) => {
      if (codeFence) {
        if (isFenceClosing(line, codeFence)) codeFence = null;
        return line;
      }

      const opening = parseFenceOpening(line);
      if (opening) {
        codeFence = opening;
        return line;
      }
      if (/^(?: {4}|\t)/.test(line)) return line;
      return prepareInlineMathLine(line, context);
    })
    .join('\n');
}

export const mathBlockMarkdownImport: NoteMarkdownBlockImport = {
  prepare: prepareMathBlocks,
  restore(block, context) {
    if (block.type !== 'paragraph' || !Array.isArray(block.content) || block.content.length !== 1) {
      return undefined;
    }
    const inline = block.content[0];
    if (typeof inline !== 'object' || inline === null || inline.type !== 'text') {
      return undefined;
    }
    const expression = context.readExactToken(typeof inline.text === 'string' ? inline.text : '');
    if (expression === undefined) return undefined;

    const { content: _content, props: _props, ...base } = block;
    return {
      ...base,
      type: 'math',
      props: {
        expression,
        autoEdit: false,
      },
    };
  },
};

export const inlineMathMarkdownImport: NoteMarkdownInlineImport = {
  prepare: prepareInlineMath,
  restore(inline, context) {
    if (inline.type !== 'text' || typeof inline.text !== 'string') return undefined;
    const styles = typeof inline.styles === 'object' && inline.styles !== null ? inline.styles : {};
    if ((styles as Record<string, unknown>).code === true) return undefined;

    const segments = context.splitTokens(inline.text);
    if (!segments.some((segment) => segment.type === 'token')) return undefined;

    const restored: Record<string, unknown>[] = [];
    for (const segment of segments) {
      if (segment.type === 'text') {
        if (segment.text) {
          restored.push({ type: 'text', text: segment.text, styles });
        }
        continue;
      }
      restored.push({
        type: 'inlineMath',
        props: {
          expression: segment.value,
          autoOpenEdit: false,
        },
      });
    }
    return restored;
  },
};
