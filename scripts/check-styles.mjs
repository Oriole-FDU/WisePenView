import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileString } from 'sass-embedded';
import { preprocessCSS, resolveConfig } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const sharedModules = ['breakpoints', 'desktopTitleBar', 'focusRing', 'layoutMixins', 'scrollbar'];

function compileScss(source, file = 'scripts/style-contract.scss') {
  return compileString(source, {
    url: pathToFileURL(join(root, file)),
    importers: [
      {
        findFileUrl(url) {
          return url.startsWith('@/') ? pathToFileURL(join(root, 'src', url.slice(2))) : null;
        },
      },
    ],
  }).css;
}

test('共用 SCSS partial 只提供定义，不输出 CSS', () => {
  for (const name of sharedModules) {
    assert.equal(compileScss(`@use '@/styles/mixins/${name}';`), '', name);
  }
});

test('共用 mixin 保留焦点、间距、拖拽、滚动条与断点', () => {
  const css = compileScss(`
    @use '@/styles/mixins/breakpoints' as breakpoints;
    @use '@/styles/mixins/desktopTitleBar' as titleBar;
    @use '@/styles/mixins/focusRing' as focusRing;
    @use '@/styles/mixins/layoutMixins' as layout;
    @use '@/styles/mixins/scrollbar' as scrollbar;

    .focus { @include focusRing.appFocusRing(); }
    .layout { @include layout.flexBetween(); }
    .customLayout { @include layout.inlineFlexBetween(24px); }
    .titleBar { @include titleBar.desktopTitleBarChrome(); }
    .scroll { @include scrollbar.appSubtleScrollbarStable(); }
    @media (max-width: breakpoints.$breakpoint-md) { .compact { display: block; } }
  `);

  assert.match(css, /\.focus\s*\{[^}]*outline: 2px solid var\(--focus, var\(--accent\)\);/);
  assert.match(css, /\.layout\s*\{[^}]*gap: var\(--space-sm\);/);
  assert.match(css, /\.customLayout\s*\{[^}]*gap: 24px;/);
  assert.match(css, /\.titleBar\s*\{[^}]*-webkit-app-region: drag;/);
  assert.match(css, /\[data-no-drag\]\)\s*\{\s*-webkit-app-region: no-drag;/);
  assert.match(css, /\.scroll\s*\{[^}]*scrollbar-gutter: stable;/);
  assert.match(
    css,
    /\.scroll:hover::-webkit-scrollbar-thumb\s*\{[^}]*background-clip: content-box;/
  );
  assert.match(css, /@media \(max-width: 768px\)/);
});

test('AppIconButton SCSS 保留 CSS Module 类名与交互状态样式', async () => {
  const file = 'src/components/base/Button/AppIconButton/style.module.scss';
  const css = compileScss(await readFile(join(root, file), 'utf8'), file);
  const config = await resolveConfig(
    {
      configFile: false,
      envFile: false,
      root,
      css: { modules: { generateScopedName: (name) => name } },
    },
    'build'
  );
  const result = await preprocessCSS(css, join(root, file.replace(/\.scss$/, '.css')), config);

  assert.deepEqual(Object.keys(result.modules).sort(), [
    'active',
    'danger',
    'md',
    'primary',
    'root',
    'sm',
    'tooltipTrigger',
    'xs',
  ]);
  assert.match(
    result.code,
    /\.root:hover:not\(:disabled\)[^{]*\{[^}]*background: var\(--surface-tertiary\);/
  );
  assert.match(
    result.code,
    /\.root:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--focus, var\(--accent\)\);/
  );
  assert.match(result.code, /\.root:is\([^{}]+\)\s*\{[^}]*cursor: not-allowed;/);
  assert.match(
    result.code,
    /\.root\.primary:is\([^{}]+\)\s*\{[^}]*background: var\(--control-disabled-filled-bg\);/
  );
});

test('全局 scrollbar SCSS 保留页面与显式滚动条规则', async () => {
  const file = 'src/styles/global/scrollbar.scss';
  const css = compileScss(await readFile(join(root, file), 'utf8'), file);

  assert.equal(css.match(/scrollbar-width: var\(--scrollbar-width, thin\);/g)?.length, 2);
  assert.match(
    css,
    /html:hover\s*\{[^}]*scrollbar-color: var\(--scrollbar-thumb\) var\(--scrollbar-track\);/
  );
  assert.match(
    css,
    /\.scrollbar-thin:hover::-webkit-scrollbar-thumb\s*\{[^}]*background-clip: content-box;/
  );
  assert.match(
    css,
    /\[data-slot=['"]?message-scroller-viewport['"]?\]\[data-autoscrolling\]\s*\{\s*scrollbar-width: none;/
  );
});

for (const [script, valid, invalid] of [
  ['check-radius-tokens.mjs', 'border-radius: var(--app-radius-button);', 'border-radius: 8px;'],
  ['check-z-index-tokens.mjs', 'z-index: var(--app-z-index-popover);', 'z-index: 400;'],
]) {
  test(`${script} 接受合法 SCSS，并拒绝违规 SCSS`, async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wisepen-style-guard-'));

    try {
      const scriptPath = join(workspace, 'scripts', script);
      const stylePath = join(workspace, 'src/components/Fixture/style.module.scss');
      await mkdir(dirname(scriptPath), { recursive: true });
      await mkdir(dirname(stylePath), { recursive: true });
      await writeFile(scriptPath, await readFile(join(root, 'scripts', script)));

      for (const [declaration, status] of [
        [valid, 0],
        [invalid, 1],
      ]) {
        await writeFile(stylePath, `.control { ${declaration} }`);
        const result = spawnSync(process.execPath, [scriptPath], {
          cwd: workspace,
          encoding: 'utf8',
        });

        assert.equal(result.status, status, result.stdout + result.stderr);
        if (status === 1) assert.match(result.stderr, /Fixture\/style\.module\.scss:1/);
      }
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
}
