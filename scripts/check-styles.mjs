import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileString } from 'sass-embedded';
import { preprocessCSS, resolveConfig } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const sharedModules = ['breakpoints', 'desktopTitleBar', 'focusRing', 'scrollbar'];

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

test('共用 mixin 保留焦点、拖拽、滚动条与断点契约', () => {
  const css = compileScss(`
    @use '@/styles/mixins/breakpoints' as breakpoints;
    @use '@/styles/mixins/desktopTitleBar' as titleBar;
    @use '@/styles/mixins/focusRing' as focusRing;
    @use '@/styles/mixins/scrollbar' as scrollbar;

    .focus { @include focusRing.appFocusRing(); }
    .titleBar { @include titleBar.desktopTitleBarChrome(); }
    .scroll { @include scrollbar.appSubtleScrollbar(); }
    @media (max-width: breakpoints.$breakpoint-md) { .compact { display: block; } }
  `);

  assert.match(css, /\.focus\s*\{[^}]*outline: var\(--focus-ring-width\) solid var\(--focus\);/);
  assert.match(css, /\.titleBar\s*\{[^}]*-webkit-app-region: drag;/);
  assert.match(css, /\[data-no-drag\]\)\s*\{\s*-webkit-app-region: no-drag;/);
  assert.match(css, /\.scroll\s*\{[^}]*scrollbar-color: transparent transparent;/);
  assert.match(
    css,
    /\.scroll:is\(:hover, :focus-visible\)::-webkit-scrollbar-thumb\s*\{[^}]*background-color: var\(--scrollbar-thumb\);/
  );
  assert.match(css, /@media \(max-width: 768px\)/);
});

test('Input field partial 不输出 CSS，保留共用表面与状态', () => {
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

test('Table partial 不输出 CSS，固定栏宽与直接 CSS token 可展开', () => {
  const module = '@/components/base/Table/shared/styles/table';
  assert.equal(compileScss(`@use '${module}' as table;`), '');

  const css = compileScss(`
    @use '${module}' as table;
    .fixed { @include table.tableColFixedWidth(--table-col-sm); }
    .shell { @include table.tableShellRadius(); }
    .footer { min-height: var(--table-footer-row-height); }
    .tableRoot {
      @include table.tableFocusReset();
      @include table.tableInheritedTypography();
    }
  `);
  assert.match(
    css,
    /\.fixed\s*\{\s*width: var\(--table-col-sm\);\s*min-width: var\(--table-col-sm\);\s*max-width: var\(--table-col-sm\);\s*\}/
  );
  assert.match(css, /\.shell\s*\{\s*border-radius: var\(--table-shell-radius\);/);
  assert.match(css, /\.footer\s*\{\s*min-height: var\(--table-footer-row-height\);/);
  assert.match(css, /\.tableRoot :global\(\.table__column:focus-visible\)/);
  assert.match(css, /\.tableRoot :global\(\.table__cell\),/);
  assert.match(css, /font: inherit;/);
});

test('Table 尺寸与颜色 token 仍由各自归属层定义', async () => {
  const tableTokens = await readFile(
    join(root, 'src/components/base/Table/shared/styles/tokens.css'),
    'utf8'
  );
  for (const token of [
    '--table-row-height',
    '--table-footer-row-height',
    '--table-gap',
    '--table-shell-padding-inline',
    '--table-shell-radius',
    '--table-inner-radius',
  ]) {
    assert.match(tableTokens, new RegExp(`${token}\\s*:`), token);
  }

  const palette = await readFile(join(root, 'src/styles/theme/palette.css'), 'utf8');
  for (const token of [
    '--table-chrome-bg',
    '--table-inner-border',
    '--table-row-hover-bg',
    '--table-row-selected-bg',
    '--table-row-selected-hover-bg',
  ]) {
    assert.match(palette, new RegExp(`${token}\\s*:`), token);
    assert.doesNotMatch(tableTokens, new RegExp(`${token}\\s*:`), token);
  }
});

test('AppButton 可声明式关闭按压缩放，TraceRow 不覆盖 HeroUI 私有状态', async () => {
  const { code } = await compileCssModule('src/components/base/Button/shared/styles.module.scss');
  const traceRowDirectory =
    'src/components/business/Chat/ChatConversation/ChatMessageList/Message/Assistant/ProcessTrace/TraceRow';
  const [appButton, appButtonTypes, traceRowSource, traceRowComponent, traceRowCssModule] =
    await Promise.all([
      readFile(join(root, 'src/components/base/Button/AppButton/index.tsx'), 'utf8'),
      readFile(join(root, 'src/components/base/Button/AppButton/index.type.ts'), 'utf8'),
      readFile(join(root, traceRowDirectory, 'style.module.scss'), 'utf8'),
      readFile(join(root, traceRowDirectory, 'index.tsx'), 'utf8'),
      compileCssModule(join(traceRowDirectory, 'style.module.scss')),
    ]);

  assert.match(
    code,
    /\.root\.disablePressScale:active,\s*\.root\.disablePressScale\[data-pressed=['"]?true['"]?\]\s*\{\s*transform: none;/
  );
  assert.match(appButton, /disablePressScale = false/);
  assert.match(appButton, /disablePressScale && buttonStyles\.disablePressScale/);
  assert.match(appButtonTypes, /disablePressScale\?: boolean;/);

  assert.doesNotMatch(traceRowSource, /&#\{&\}/);
  assert.doesNotMatch(traceRowSource, /:active|\[data-pressed/);
  assert.doesNotMatch(traceRowSource, /:global\(\.button|button--/);
  assert.match(traceRowComponent, /disablePressScale/);
  assert.match(traceRowComponent, /aria-expanded=\{expanded\}/);
  assert.match(
    traceRowCssModule.code,
    /\.trigger:hover:not\(:disabled\)\s*\{[^}]*background: transparent;/
  );
  assert.match(
    traceRowCssModule.code,
    /\.trigger:focus-visible,\s*\.trigger\[data-focus-visible\]\s*\{[^}]*outline: var\(--focus-ring-width\) solid var\(--focus\);/
  );
  assert.match(
    traceRowCssModule.code,
    /\.indicator\[data-expanded=['"]?true['"]?\]\s*\{\s*transform: rotate\(180deg\);/
  );
});

test('自有样式和入口不残留 Less，所有 CSS Module 可编译', async () => {
  for (const directory of ['src', '.storybook', 'electron']) {
    const files = await readdir(join(root, directory), { recursive: true });
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      directory
    );
    for (const file of files.filter((file) => /\.(?:[cm]?[jt]sx?|s?css|html)$/.test(file))) {
      assert.doesNotMatch(
        await readFile(join(root, directory, file), 'utf8'),
        /['"][^'"\n]+\.less['"]|@(?:import|use)[^;\n]+\.less\b/,
        file
      );
    }
  }

  const modules = (await readdir(join(root, 'src'), { recursive: true })).filter((file) =>
    file.endsWith('.module.scss')
  );
  assert.ok(modules.length > 0);
  for (const file of modules) {
    assert.ok((await compileCssModule(join('src', file))).modules, file);
  }

  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  for (const name of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    assert.equal(pkg[name]?.less, undefined, name);
  }
  assert.ok(pkg.devDependencies['sass-embedded']);
});

test('全局滚动条保留页面与显式滚动条语义', async () => {
  const file = 'src/styles/global/scrollbar.scss';
  const css = compileScss(await readFile(join(root, file), 'utf8'), file);

  assert.match(
    css,
    /html:is\(:hover, :focus-visible\)\s*\{[^}]*scrollbar-color: var\(--scrollbar-color\);/
  );
  assert.match(
    css,
    /\.scrollbar-thin:is\(:hover, :focus-visible\)::-webkit-scrollbar-thumb\s*\{[^}]*background-color: var\(--scrollbar-thumb\);/
  );
  assert.match(
    css,
    /\[data-slot=['"]?message-scroller-viewport['"]?\]\[data-autoscrolling\]\s*\{\s*scrollbar-width: none;/
  );
});
