import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

async function bundleModule(contents) {
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents,
      resolveDir: root,
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': join(root, 'src') },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
}

const resourceModule = await bundleModule(`
  export {
    isResourceViewerCompatible,
    normalizeResourceKind,
    normalizeResourceViewer,
    resolveResourceViewer,
  } from '@/domains/Resource/model/resourceTarget';
  export {
    getSupportedResourcePermissionActions,
    RESOURCE_ACTION,
  } from '@/domains/Resource/enum';
  export { resolveEditorKind } from '@/components/editors/editorKind';
  export { buildHtmlDocument, buildHtmlPageCsp } from '@/components/editors/html/htmlDocument';
  export { isHtmlPageReady } from '@/domains/HtmlPage/service/index.type';
`);

test('SINGLE_HTML_PAGE 与 html 扩展名统一归一化到 HTML 资源、查看器和编辑器', () => {
  for (const token of ['SINGLE_HTML_PAGE', 'single_html_page', 'html', ' Html ']) {
    assert.equal(resourceModule.normalizeResourceKind(token), 'html');
    assert.equal(resourceModule.normalizeResourceViewer(token), 'html');
    assert.equal(
      resourceModule.resolveResourceViewer({ resourceType: token }),
      'html',
      `${token} 应推导出 HTML 查看器`
    );
    assert.equal(resourceModule.isResourceViewerCompatible('html', 'html'), true);
    assert.equal(
      resourceModule.resolveEditorKind({
        resourceId: 'html-1',
        resourceType: 'html',
        viewer: 'html',
      }),
      'html'
    );
  }

  assert.equal(resourceModule.resolveResourceViewer({ viewer: 'SINGLE_HTML_PAGE' }), 'html');
  assert.equal(resourceModule.isResourceViewerCompatible('html', 'pdfPreview'), false);
});

test('HTML 权限只暴露 DISCOVER、VIEW、EDIT', () => {
  for (const token of ['SINGLE_HTML_PAGE', 'single_html_page', 'html']) {
    assert.deepEqual(
      resourceModule
        .getSupportedResourcePermissionActions(token)
        .map((action) => resourceModule.RESOURCE_ACTION.getKey(action)),
      ['DISCOVER', 'VIEW', 'EDIT']
    );
  }
});

test('仅当前版本大于 0 且对应版本 READY 时请求正文', () => {
  const info = (currentVersion, status, version = currentVersion) => ({
    resourceInfo: {},
    currentVersion,
    versionInfo: status == null ? undefined : { version, status, lastEditedAtText: '' },
  });

  assert.equal(resourceModule.isHtmlPageReady(undefined), false);
  assert.equal(resourceModule.isHtmlPageReady(info(0, null)), false);
  assert.equal(resourceModule.isHtmlPageReady(info(1, 'FAILED')), false);
  assert.equal(resourceModule.isHtmlPageReady(info(1, 'READY', 2)), false);
  assert.equal(resourceModule.isHtmlPageReady(info(1, 'READY')), true);
});

test('CSP 文档包装保留原内容，并覆盖 head、html 和 fragment 三种输入', () => {
  const assetOrigin = 'https://api.example.com';
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${resourceModule.buildHtmlPageCsp(assetOrigin)}">`;
  const withHead = resourceModule.buildHtmlDocument(
    '<!doctype html><html><head><title>已有页面</title></head><body><h1>正文</h1></body></html>',
    assetOrigin
  );
  const withHtml = resourceModule.buildHtmlDocument(
    '<html><body><p>无 head</p></body></html>',
    assetOrigin
  );
  const fragment = resourceModule.buildHtmlDocument('<section>片段内容</section>', assetOrigin);

  for (const document of [withHead, withHtml, fragment]) {
    assert.equal(document.match(/http-equiv="Content-Security-Policy"/g)?.length, 1);
    assert(document.includes(cspMeta));
    assert(document.includes('<meta charset="utf-8">'));
    assert(document.includes('<base href="https://api.example.com/">'));
    assert(document.includes(`style-src 'unsafe-inline' ${assetOrigin}`));
    assert(document.includes(`base-uri ${assetOrigin}`));
  }
  assert(withHead.includes('<title>已有页面</title>'));
  assert(withHead.includes('<h1>正文</h1>'));
  assert(withHtml.includes('<head>'));
  assert(withHtml.includes('<p>无 head</p>'));
  assert(fragment.startsWith('<!doctype html><html><head>'));
  assert(fragment.includes('<body><section>片段内容</section></body>'));
});

test('HTML iframe 只授予脚本权限，不使用 allow-same-origin', async () => {
  const source = await readFile(join(root, 'src/components/editors/html/index.tsx'), 'utf8');
  assert.match(source, /sandbox="allow-scripts"/);
  assert.doesNotMatch(source, /allow-same-origin/);
});
