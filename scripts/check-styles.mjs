import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
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

const cssModuleConfig = await resolveConfig(
  {
    configFile: false,
    envFile: false,
    root,
    css: { modules: { generateScopedName: (name) => name } },
  },
  'build'
);

async function compileCssModule(file) {
  const css = compileScss(await readFile(join(root, file), 'utf8'), file);
  return preprocessCSS(css, join(root, file.replace(/\.scss$/, '.css')), cssModuleConfig);
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
  const result = await compileCssModule(
    'src/components/base/Button/AppIconButton/style.module.scss'
  );

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

test('Input field partial 不輸出 CSS，保留共用表面與狀態', () => {
  const fieldModule = '@/components/base/Input/_common/field';
  assert.equal(compileScss(`@use '${fieldModule}' as field;`), '');

  const css = compileScss(`
    @use '${fieldModule}' as field;
    .tokens { @include field.fieldTokens(); }
    .normal { @include field.fieldSurface(); }
    .placeholder { @include field.fieldPlaceholder(); }
    .hover { @include field.fieldSurfaceHover(); }
    .focus { @include field.fieldSurfaceFocus(); }
    .focusVisible { @include field.fieldSurfaceFocusVisible(); }
    .invalid { @include field.fieldSurfaceInvalid(); }
    .invalidFocus { @include field.fieldSurfaceInvalidFocus(); }
    .disabled { @include field.fieldSurfaceDisabled(); }
  `);

  assert.match(
    css,
    /\.tokens\s*\{[^}]*--app-field-ring: 0 0 0 var\(--app-field-ring-width\) var\(--app-field-ring-color\);/
  );
  assert.match(css, /\.normal\s*\{[^}]*border-radius: var\(--app-radius-field\);/);
  assert.match(css, /\.normal\s*\{[^}]*background-color: var\(--app-field-bg\);/);
  assert.match(css, /\.placeholder\s*\{[^}]*color: var\(--field-placeholder, var\(--muted\)\);/);
  assert.match(css, /\.hover\s*\{[^}]*background-color: var\(--app-field-bg-hover\);/);
  assert.match(css, /\.focus\s*\{[^}]*box-shadow: var\(--app-field-ring\);/);
  assert.match(css, /\.focusVisible\s*\{[^}]*outline: none;/);
  assert.match(css, /\.invalid\s*\{[^}]*background-color: var\(--app-field-danger-bg\);/);
  assert.match(css, /\.invalidFocus\s*\{[^}]*box-shadow: var\(--app-field-danger-ring\);/);
  assert.match(css, /\.disabled\s*\{[^}]*background-color: var\(--app-field-disabled-bg\);/);
  assert.match(css, /\.disabled\s*\{[^}]*box-shadow: var\(--shadow-none\);/);
});

test('AppBreadcrumb 只匯出自有類別，使用等值通用字體 token', async () => {
  const result = await compileCssModule('src/components/base/AppBreadcrumb/style.module.scss');

  assert.deepEqual(Object.keys(result.modules).sort(), [
    'breadcrumb',
    'current',
    'label',
    'link',
    'segment',
    'separator',
  ]);
  assert.equal(result.code.match(/font-family: var\(--app-font-family\);/g)?.length, 2);
  assert.equal(result.code.match(/font-size: var\(--font-size-sm\);/g)?.length, 2);
  assert.equal(result.code.match(/line-height: var\(--line-height-md\);/g)?.length, 2);
  assert.match(result.code, /\.current\s*\{[^}]*font-weight: var\(--font-weight-medium\);/);
});

test('非 Table 基礎元件與 _shadcn 不殘留 Less，所有 Module 可編譯', async () => {
  for (const directory of ['src/components/base', 'src/components/_shadcn']) {
    const files = (await readdir(join(root, directory), { recursive: true })).filter(
      (file) => file.split(sep)[0] !== 'Table'
    );
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      directory
    );

    const modules = files.filter((file) => file.endsWith('.module.scss'));
    assert.ok(modules.length > 0, directory);
    for (const file of modules) {
      const result = await compileCssModule(join(directory, file));
      assert.ok(result.modules, file);
    }
  }
});

test('scrollbar mixin 後的宣告不拆成重複父規則', async () => {
  for (const [file, selector, declaration] of [
    ['AppForm', '\\.anchorNav', 'padding: var(--space-md-plus) var(--space-sm);'],
    ['Input/CommentInput', '\\.textarea\\.textarea', 'field-sizing: content;'],
    ['Markdown', '\\.mathBlock', 'text-align: center;'],
  ]) {
    const { code } = await compileCssModule(`src/components/base/${file}/style.module.scss`);
    const rules = code.match(new RegExp(`^${selector}\\s*\\{[^}]*\\}`, 'gm')) ?? [];
    assert.equal(rules.length, 1, file);
    assert.ok(rules[0].includes(declaration), file);
    assert.ok(rules[0].includes('scrollbar-width: var(--scrollbar-width, thin);'), file);
  }
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
