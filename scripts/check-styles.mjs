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

test('Table partial 不輸出 CSS，固定欄寬與 token fallback 可展開', () => {
  const module = '@/components/base/Table/shared/styles/table';
  assert.equal(compileScss(`@use '${module}' as table;`), '');

  const css = compileScss(`
    @use '${module}' as table;
    .fixed { @include table.tableColFixedWidth(--table-col-sm); }
    .shell { @include table.tableShellRadius(); }
    .footer { min-height: table.$table-footer-row-height; }
  `);
  assert.match(
    css,
    /\.fixed\s*\{\s*width: var\(--table-col-sm\);\s*min-width: var\(--table-col-sm\);\s*max-width: var\(--table-col-sm\);\s*\}/
  );
  assert.match(
    css,
    /\.shell\s*\{\s*border-radius: var\(--table-shell-radius, var\(--app-radius-content\)\);/
  );
  assert.match(
    css,
    /\.footer\s*\{\s*min-height: var\(--table-footer-row-height, var\(--table-control-min-height, 32px\)\);/
  );
});

test('DataTable 與 FolderTable 各依序產生精確 16 組等寬欄規則', async () => {
  for (const variant of ['DataTable', 'FolderTable']) {
    const { code } = await compileCssModule(
      `src/components/base/Table/${variant}/style.module.scss`
    );
    assert.equal(code.match(/data-eq-count=/g)?.length, 16, variant);
    const counts = [
      ...code.matchAll(
        /\.tableContent\[data-eq-count=['"]?(\d+)['"]?\]\s*\{\s*--table-eq-column-count:\s*(\d+);\s*\}/g
      ),
    ].map(([, attribute, value]) => [Number(attribute), Number(value)]);
    assert.deepEqual(
      counts,
      Array.from({ length: 16 }, (_, index) => [index + 1, index + 1]),
      variant
    );
  }
});

test('MemberListTable 行高規則維持在行內控件規則之前', async () => {
  const { code } = await compileCssModule(
    'src/components/business/Group/MemberList/MemberListTable/style.module.scss'
  );
  const selector = '.managementTable .table-root--secondary .table__row .table__cell';
  const row = code.indexOf(`${selector} {`);
  const field = code.indexOf(`${selector} .select`);
  assert.ok(row >= 0 && field > row, 'Sass 不得把父行高移到巢狀控件規則之後');
  const block = code.slice(row, code.indexOf('}', row));
  for (const property of ['height', 'min-height', 'max-height']) {
    assert.ok(block.includes(`${property}: var(--table-row-height, 60px);`), property);
  }
});

test('Table 共用類別與 cellStyles 保留使用中的匯出和 composition', async () => {
  const table = await compileCssModule('src/components/base/Table/shared/styles/table.module.scss');
  assert.deepEqual(Object.keys(table.modules).sort(), [
    'colAction',
    'colCheckbox',
    'colEnum',
    'colEq',
    'colFill',
    'colFolderAction',
    'colFolderSize',
    'colFolderType',
    'colLg',
    'colMd',
    'colSm',
    'inlineEditSelect',
    'inlineEditSelectCompact',
    'pageSizeSelect',
    'toolbarSelect',
  ]);
  assert.equal(table.modules.pageSizeSelect, 'pageSizeSelect toolbarSelect');
  assert.match(table.code, /\.colCheckbox\s*\{\s*width: var\(--table-checkbox-column-width\);/);
  assert.match(
    table.code,
    /\.colEq\s*\{\s*width: calc\(100% \/ var\(--table-eq-column-count, 1\)\);/
  );

  const cells = await compileCssModule('src/components/base/Table/shared/styles/cells.module.scss');
  assert.deepEqual(Object.keys(cells.modules).sort(), [
    'amountHeader',
    'amountInflow',
    'amountOutflow',
    'cellChipHost',
    'cellChipHostCenter',
    'cellChipHostEnd',
    'cellChipHostStart',
    'cellContentHost',
    'cellContentHostCenter',
    'cellContentHostEnd',
    'cellContentHostStart',
    'cellContentHostStretch',
    'cellEllipsis',
    'cellEmphasis',
    'cellMuted',
    'cellTextAlignCenter',
    'cellTextAlignEnd',
    'statusChip',
    'tableCellChip',
  ]);
  for (const [key, value] of Object.entries({
    cellMuted: 'cellMuted cellEllipsis',
    cellEmphasis: 'cellEmphasis cellEllipsis',
    cellContentHostStart: 'cellContentHostStart cellContentHost',
    cellContentHostCenter: 'cellContentHostCenter cellContentHost',
    cellContentHostEnd: 'cellContentHostEnd cellContentHost',
    cellChipHost: 'cellChipHost cellContentHost',
    cellChipHostStart: 'cellChipHostStart cellContentHostStart cellContentHost',
    cellChipHostCenter: 'cellChipHostCenter cellContentHostCenter cellContentHost',
    cellChipHostEnd: 'cellChipHostEnd cellContentHostEnd cellContentHost',
    statusChip: 'statusChip tableCellChip',
  }))
    assert.equal(cells.modules[key], value, key);
});

test('Table 與 F33 樣式可編譯，不跨元件預處理器引用 Table 私有樣式', async () => {
  const tableRoot = join(root, 'src/components/base/Table');
  const tableFiles = await readdir(tableRoot, { recursive: true });
  assert.deepEqual(
    tableFiles.filter((file) => file.endsWith('.less')),
    []
  );
  const modules = tableFiles
    .filter((file) => file.endsWith('.module.scss'))
    .map((file) => join('src/components/base/Table', file));
  modules.push(
    'src/components/business/Group/MemberList/MemberListTable/style.module.scss',
    'src/components/business/Group/MemberList/MemberListTable/InlineEditError/style.module.scss',
    'src/views/app/drive/_components/FavoritesTab/style.module.scss'
  );
  for (const file of modules) assert.ok((await compileCssModule(file)).modules, file);

  for (const file of await readdir(join(root, 'src'), { recursive: true })) {
    if (!/\.(less|scss)$/.test(file)) continue;
    const absolute = join(root, 'src', file);
    const source = await readFile(absolute, 'utf8');
    for (const [, path] of source.matchAll(
      /@(?:import|use|forward)\s+(?:\([^)]*\)\s*)?['"]([^'"]+)['"]/g
    )) {
      const target = path.startsWith('@/')
        ? join(root, 'src', path.slice(2))
        : join(dirname(absolute), path);
      if (!target.startsWith(tableRoot + sep)) continue;
      assert.ok(absolute.startsWith(tableRoot + sep), `${file}: Table 私有樣式跨元件引用`);
      assert.doesNotMatch(target, /\.module(?:\.(?:less|scss|css))?$/, file);
    }
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
