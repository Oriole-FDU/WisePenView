import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/components/editors/note/CustomBlockNote/plugins/TablePlugin/AiDiffView.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: 'tsconfig.app.json',
  write: false,
  plugins: [
    {
      name: 'ignore-styles',
      setup(builder) {
        builder.onLoad({ filter: /\.scss$/ }, () => ({
          contents: 'export default {}',
          loader: 'js',
        }));
      },
    },
  ],
});

const { readTableContent } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`
);

test('表格内容保留有效行、列宽和数字表头', () => {
  assert.deepEqual(
    readTableContent({
      content: {
        rows: [{ cells: [{ content: [] }] }],
        columnWidths: [120, undefined],
        headerRows: 1,
        headerCols: 0,
      },
    }),
    {
      rows: [{ cells: [{ content: [] }] }],
      columnWidths: [120, undefined],
      headerRows: 1,
      headerCols: 0,
    }
  );
});

test('畸形行、列宽或 block 不会冒充有效表格内容', () => {
  assert.equal(readTableContent(null), null);
  assert.equal(readTableContent({ content: { rows: [{ cells: null }], columnWidths: [] } }), null);
  assert.equal(readTableContent({ content: { rows: [], columnWidths: ['wide'] } }), null);
});
