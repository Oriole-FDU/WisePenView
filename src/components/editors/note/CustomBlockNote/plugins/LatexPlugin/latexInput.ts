const ESC = '\u001b';

export function sanitizeLatexInput(value: string): string {
  return value.replaceAll(ESC, '');
}
