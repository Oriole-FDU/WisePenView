import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd });
const filePaths = [
  'src/components/editors/skill/__file_length_check.ts',
  ...['Resource', 'Tag', 'Image', 'Document'].map(
    (domain) => `src/domains/${domain}/__file_length_check.ts`
  ),
];

for (const filePath of filePaths) {
  for (const lineCount of [400, 401, 600, 601]) {
    for (const newline of ['\n', '\r\n']) {
      for (const trailingNewline of [false, true]) {
        const lines = Array.from({ length: lineCount }, (_, index) =>
          index % 3 === 0 ? '// 注释也计入文件长度。' : index % 3 === 1 ? '' : 'void 0;'
        );
        lines[lineCount - 1] = 'void 0;';
        const source = lines.join(newline) + (trailingNewline ? newline : '');
        const [result] = await eslint.lintText(source, { filePath });
        assert(!result.messages.some((message) => message.fatal));
        const lengthMessages = result.messages
          .filter((message) => ['max-lines', 'wisepen/max-lines-error'].includes(message.ruleId))
          .map(({ ruleId, severity }) => [ruleId, severity])
          .sort();
        const expected = [];
        if (lineCount > 400) expected.push(['max-lines', 1]);
        if (lineCount > 600) expected.push(['wisepen/max-lines-error', 2]);
        assert.deepEqual(
          lengthMessages,
          expected,
          JSON.stringify({ filePath, lineCount, newline, trailingNewline })
        );
      }
    }
  }
}

console.log('文件长度规则在 5 个目录的 80 个边界场景检查通过');
