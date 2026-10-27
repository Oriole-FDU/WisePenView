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

test('Table partial 不輸出 CSS，固定欄寬與直接 CSS token 可展開', () => {
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

test('Table token 集中于 shared，主题文件只保留颜色与通用 token', async () => {
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

  const globalIndex = await readFile(join(root, 'src/styles/global/index.css'), 'utf8');
  assert.match(
    globalIndex,
    /@import '\.\.\/\.\.\/components\/base\/Table\/shared\/styles\/tokens\.css' layer\(base\);/
  );

  for (const file of ['layout.css', 'controls.css', 'effects.css', 'spacing.css', 'radius.css']) {
    const source = await readFile(join(root, 'src/styles/theme', file), 'utf8');
    assert.doesNotMatch(source, /--table-[\w-]+\s*:/, file);
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

test('主题 token 按职责拆分，不再维护通用 tokens 文件', async () => {
  const themeFiles = await readdir(join(root, 'src/styles/theme'));
  assert.equal(themeFiles.includes('tokens.css'), false);

  const globalIndex = await readFile(join(root, 'src/styles/global/index.css'), 'utf8');
  assert.doesNotMatch(globalIndex, /theme\/tokens\.css/);
  for (const file of ['layout.css', 'controls.css', 'effects.css']) {
    assert.match(globalIndex, new RegExp(`@import '\\.\\./theme/${file}' layer\\(base\\);`));
  }

  const [layout, controls, effects] = await Promise.all(
    ['layout.css', 'controls.css', 'effects.css'].map((file) =>
      readFile(join(root, 'src/styles/theme', file), 'utf8')
    )
  );
  assert.match(layout, /--layout-workspace-split-header-height\s*:/);
  assert.match(layout, /--chat-input-textarea-max-height\s*:/);
  assert.match(controls, /--control-height\s*:/);
  assert.match(controls, /--border-width\s*:/);
  assert.match(effects, /--shadow-none\s*:/);
  assert.match(effects, /--scrollbar-size\s*:/);
});

test('字体 token 只保留应用来源与 Tailwind 桥接', async () => {
  const fonts = await readFile(join(root, 'src/styles/theme/fonts.css'), 'utf8');
  assert.doesNotMatch(fonts, /--font-(?:sans|mono)\s*:/);

  const globalIndex = await readFile(join(root, 'src/styles/global/index.css'), 'utf8');
  assert.match(globalIndex, /--font-sans:\s*var\(--app-font-family\);/);
  assert.match(globalIndex, /--font-mono:\s*var\(--app-font-mono\);/);

  for (const file of await readdir(join(root, 'src'), { recursive: true })) {
    if (!/\.(css|scss)$/.test(file)) continue;
    const source = await readFile(join(root, 'src', file), 'utf8');
    assert.doesNotMatch(source, /var\(--font-(?:sans|mono)\b/, file);
  }
});

test('HeroUI 跨组件覆盖集中在 heroui-overrides', async () => {
  const globalIndex = await readFile(join(root, 'src/styles/global/index.css'), 'utf8');
  const heroOverrides = await readFile(
    join(root, 'src/styles/global/heroui-overrides.css'),
    'utf8'
  );

  assert.match(globalIndex, /@import '\.\/heroui-overrides\.css' layer\(components\);/);
  assert.doesNotMatch(globalIndex, /@layer components\s*\{/);
  assert.doesNotMatch(globalIndex, /\.button:is\(:disabled/);
  assert.doesNotMatch(globalIndex, /\.tabs:not\(\.tabs--secondary\)/);
  assert.doesNotMatch(globalIndex, /\.modal__backdrop/);
  assert.doesNotMatch(heroOverrides, /--app-radius-popover-(?:item|control)\s*:/);
  assert.doesNotMatch(heroOverrides, /--app-popover-item-inset\s*:/);
  assert.doesNotMatch(heroOverrides, /\.modal__backdrop/);
  assert.doesNotMatch(heroOverrides, /\.tooltip\s*\{/);
  assert.doesNotMatch(heroOverrides, /\.table-root/);

  for (const selector of [
    /\.button:is\(:disabled/,
    /\.tabs:not\(\.tabs--secondary\)/,
    /\.popover__dialog/,
  ]) {
    assert.match(heroOverrides, selector);
  }

  const buttonBase = heroOverrides.indexOf(':is(.button, .toggle-button)');
  const buttonDisabled = heroOverrides.indexOf('.button:is(:disabled, [aria-disabled=');
  const buttonGroup = heroOverrides.indexOf(':is(.button-group, .toggle-button-group)');
  assert.ok(buttonBase >= 0 && buttonBase < buttonDisabled && buttonDisabled < buttonGroup);
});

test('Modal 基础封装持有弹窗与遮罩覆盖', async () => {
  const { code } = await compileCssModule('src/components/base/Modal/style.module.scss');
  const modalSource = await readFile(join(root, 'src/components/base/Modal/index.tsx'), 'utf8');

  assert.match(code, /\.backdrop\s*\{\s*z-index: var\(--app-z-index-modal\);/);
  assert.match(
    code,
    /\.dialog:not\(\.modal__dialog--full\):not\(\.alert-dialog__dialog--full\)\s*\{\s*border-radius: var\(--app-radius-modal\) !important;\s*overflow: clip;/
  );
  assert.match(modalSource, /className=\{clsx\(styles\.backdrop, props\.className\)\}/);
  assert.match(modalSource, /className=\{clsx\(styles\.dialog, className\)\}/);
});

test('Tooltip 基础封装持有气泡圆角与层级', async () => {
  const { code } = await compileCssModule('src/components/base/Tooltip/style.module.scss');
  const tooltipSource = await readFile(join(root, 'src/components/base/Tooltip/index.tsx'), 'utf8');

  assert.match(code, /\.content\s*\{\s*border-radius: var\(--app-radius-tooltip\);/);
  assert.match(code, /\.content\s*\{[^}]*z-index: var\(--app-z-index-tooltip\);/);
  assert.match(tooltipSource, /className=\{clsx\(styles\.content, className\)\}/);
});

test('DataTable 工具栏保留主按钮标准配色与禁用态覆盖', async () => {
  const { code, modules } = await compileCssModule(
    'src/components/base/Table/DataTable/style.module.scss'
  );
  const buttons = code.match(/\.toolbar button\s*\{([^}]+)\}/);
  assert.ok(buttons);
  assert.doesNotMatch(buttons[1], /(?:^|;)\s*color\s*:/);
  assert.match(code, /\.toolbar button:not\(\.button\)\s*\{\s*color: var\(--muted\);\s*\}/);
  assert.match(code, /\.toolbarDisabled button\s*\{\s*color: var\(--text-disabled\);\s*\}/);
  assert.equal(Object.hasOwn(modules, 'button'), false);
});

test('FolderTable 直接消费全局排版与 Table CSS token', async () => {
  const { code, modules } = await compileCssModule(
    'src/components/base/Table/FolderTable/style.module.scss'
  );

  assert.deepEqual(Object.keys(modules).sort(), [
    'actionCell',
    'actionColumnHeader',
    'bodyCell',
    'bodyOverlay',
    'bodyRow',
    'breadcrumb',
    'cellSurface',
    'checkboxCell',
    'checkboxCellInner',
    'checkboxColumn',
    'checkboxColumnInner',
    'emptyStateOverlay',
    'headerBar',
    'headerBarSpacer',
    'inlineLoadMoreButton',
    'inlineLoadMoreRow',
    'loadMoreCell',
    'loadMoreTableRow',
    'mutedCell',
    'nameCell',
    'nameColumnHeader',
    'scrollContainer',
    'selectedRow',
    'shell',
    'tableContent',
    'tableRoot',
    'toolbar',
    'virtualSpacerCell',
    'virtualSpacerRow',
  ]);
  assert.equal(code.match(/font-family: var\(--app-font-family\);/g)?.length, 5);
  assert.equal(code.match(/font-size: var\(--font-size-base\);/g)?.length, 5);
  assert.doesNotMatch(code, /var\(--table-[\w-]+,\s*/);
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
  assert.match(table.code, /\.colEq\s*\{\s*width: calc\(100% \/ var\(--table-eq-column-count\)\);/);

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
  for (const file of tableFiles.filter((file) => file.endsWith('.scss'))) {
    const source = await readFile(join(tableRoot, file), 'utf8');
    assert.doesNotMatch(source, /\$table-/, file);
    assert.doesNotMatch(source, /var\(--table-[\w-]+,\s*/, file);
  }
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

test('Drive、Group、Resource 業務樣式不殘留 Less，所有 Module 可編譯', async () => {
  for (const domain of ['Drive', 'Group', 'Resource']) {
    const directory = join('src/components/business', domain);
    const files = await readdir(join(root, directory), { recursive: true });
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      domain
    );
    const modules = files.filter((file) => file.endsWith('.module.scss'));
    assert.ok(modules.length > 0, domain);
    for (const file of modules)
      assert.ok((await compileCssModule(join(directory, file))).modules, file);
  }
});

test('Drive scrollbar 與後續宣告保留於同一父規則', async () => {
  for (const [component, selector, declarations] of [
    [
      'Modals/DriveFolderPickerModal',
      'treeWrap',
      [
        'padding: var(--space-2xs);',
        'border: 1px solid var(--border);',
        'border-radius: var(--app-radius-modal);',
      ],
    ],
    [
      'Modals/UploadFileToGroupModal',
      'navTree',
      ['border: 1px solid var(--border);', 'border-radius: var(--app-radius-modal);'],
    ],
    [
      'PermissionActionEditor',
      'permissionTableShell',
      [
        'border: 1px solid var(--border-light);',
        'border-radius: var(--app-radius-content);',
        'background: var(--surface);',
      ],
    ],
    ['Modals/TagPermissionModal', 'selectedMemberList', ['padding-right: var(--space-3xs);']],
    ['Modals/TagPermissionModal', 'memberList', ['padding: var(--space-2xs-plus);']],
  ]) {
    const file = `src/components/business/Drive/${component}/style.module.scss`;
    assert.ok((await readdir(dirname(join(root, file)))).includes('style.module.scss'), file);
    const { code } = await compileCssModule(file);
    const rules = [...code.matchAll(new RegExp(`^\\.${selector}\\s*\\{([^}]+)\\}`, 'gm'))];
    assert.equal(rules.length, 1, `${component}.${selector}: 不拆分父規則`);
    for (const declaration of [
      'scrollbar-width: var(--scrollbar-width, thin);',
      'scrollbar-color: transparent transparent;',
      ...declarations,
    ])
      assert.ok(rules[0][1].includes(declaration), `${component}.${selector}: ${declaration}`);
  }
});

test('Drive、Group、Resource 保留各斷點的窄版佈局', async () => {
  for (const [component, expected] of [
    [
      'Drive/PermissionActionEditor',
      [[640, /\.presetBar\s*\{\s*align-items: flex-start;\s*flex-direction: column;/]],
    ],
    [
      'Drive/Modals/TagPermissionModal',
      [
        [960, /\.advancedAccessGrid\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/],
        [640, /\.scopeTabsList\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/],
      ],
    ],
    [
      'Group/DefaultAccessPermissionModal',
      [
        [960, /\.advancedAccessGrid\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/],
        [640, /\.scopeTabsList\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/],
      ],
    ],
    ['Group/JoinByInviteCodeModal', [[640, /\.codeSlot\s*\{\s*width: auto;\s*flex: 1 1 0;/]]],
    [
      'Resource/ResourcePermissionPanel',
      [[768, /\.skeletonAddRow\s*\{\s*grid-template-columns: 1fr;/]],
    ],
  ]) {
    const file = `src/components/business/${component}/style.module.scss`;
    assert.ok((await readdir(dirname(join(root, file)))).includes('style.module.scss'), file);
    const { code } = await compileCssModule(file);
    const media = [...code.matchAll(/^@media \(max-width: (\d+)px\) \{([\s\S]*?)^\}/gm)];
    assert.deepEqual(
      media.map(([, width]) => Number(width)),
      expected.map(([width]) => width),
      component
    );
    for (const [index, [, pattern]] of expected.entries())
      assert.match(media[index][2], pattern, component);
  }
});

test('TableDrive 在业务组件内生成专属布局 token', async () => {
  const source = await readFile(
    join(root, 'src/components/business/Drive/TableDrive/index.tsx'),
    'utf8'
  );
  assert.match(source, /useViewportLayoutScale\(\)/);
  assert.match(source, /'--table-drive-layout-max-height'\s*:/);
  assert.match(source, /'--table-drive-detail-panel-width'\s*:/);
  assert.match(source, /className=\{styles\.driveFrame\}\s+style=\{driveFrameCssVars\}/);

  const layoutScale = await readFile(join(root, 'src/constants/layoutScale.ts'), 'utf8');
  assert.doesNotMatch(layoutScale, /--table-drive-/);
});

test('Chat、Sidebar 業務樣式不殘留 Less，所有 Module 可編譯', async () => {
  for (const domain of ['Chat', 'Sidebar']) {
    const directory = join('src/components/business', domain);
    const files = await readdir(join(root, directory), { recursive: true });
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      domain
    );
    const modules = files.filter((file) => file.endsWith('.module.scss'));
    assert.ok(modules.length > 0, domain);
    for (const file of modules)
      assert.ok((await compileCssModule(join(directory, file))).modules, file);
  }
});

test('Chat 歷史導覽精確產生 48→1 的延遲規則，reduced-motion 在其後覆寫', async () => {
  const { code } = await compileCssModule(
    'src/components/business/Chat/ChatConversation/ChatMessageList/MessageHistoryNavigator/style.module.scss'
  );
  const delays = [
    ...code.matchAll(
      /\.historyNavigatorRailPanel\[data-open=['"]?true['"]?\] \.historyNavigatorRailItem:nth-child\((\d+)\)\s*\{\s*transition-delay: calc\(\((\d+) - 1\) \* var\(--history-nav-item-stagger\)\);\s*\}/g
    ),
  ];
  assert.equal(code.match(/:nth-child\(/g)?.length, 48);
  assert.deepEqual(
    delays.map(([, child, delay]) => [Number(child), Number(delay)]),
    Array.from({ length: 48 }, (_, index) => [48 - index, 48 - index])
  );
  const reduced =
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.historyNavigatorRailItem\s*\{\s*opacity: 1;\s*transform: none;\s*transition-duration: var\(--motion-duration-reduced\);\s*transition-delay: 0s !important;/;
  assert.match(code, reduced);
  assert.ok(code.search(reduced) > delays.at(-1).index);
});

test('Chat 重複類別與 hover pseudo-class 保留原本優先級', async () => {
  for (const [component, patterns] of [
    ['Message/User', [/\.attachment\.attachment\s*\{[^}]*width: 160px;/]],
    [
      '',
      [
        /\.scrollToBottomButton\.scrollToBottomButton\s*\{[^}]*width: 32px;/,
        /\.scrollToBottomButton:hover:not\(:disabled\)\.scrollToBottomButton:hover:not\(:disabled\)\s*\{[^}]*background: var\(--surface-tertiary\);/,
      ],
    ],
    [
      'Message/Assistant/ProcessTrace/TraceRow',
      [
        /\.trigger\.trigger\s*\{[^}]*transform: none;/,
        /\.trigger\.trigger:hover:not\(:disabled\)\s*\{[^}]*background: transparent;/,
        /\.trigger\.trigger:active,\s*\.trigger\.trigger\[data-pressed=['"]?true['"]?\]\s*\{\s*transform: none;/,
      ],
    ],
  ]) {
    const { code } = await compileCssModule(
      join(
        'src/components/business/Chat/ChatConversation/ChatMessageList',
        component,
        'style.module.scss'
      )
    );
    for (const pattern of patterns) assert.match(code, pattern, component);
  }
});

test('Chat 與 Sidebar 的 reduced-motion 規則保留動畫與過渡降級', async () => {
  for (const [component, count, patterns] of [
    ['Chat', 1, [/\.composerBottomSpacer\s*\{\s*transition: none;/]],
    ['Chat/WelcomeConfigurable/Starter', 1, [/\.promptCard\s*\{\s*transition: none;/]],
    [
      'Chat/ChatConversation/ChatInput',
      1,
      [
        /\.dropOverlay\s*\{\s*transition-duration: var\(--motion-duration-reduced\);\s*transform: none;/,
        /\.dropOverlay\[data-visible=['"]?true['"]?\]\s*\{\s*transform: none;/,
      ],
    ],
    [
      'Chat/ChatConversation/ChatMessageList/MessageHistoryNavigator',
      5,
      [
        /\.historyNavigatorRailPanel\s*\{\s*transition-duration: var\(--motion-duration-reduced\);\s*transform: translateY\(-50%\);/,
        /\.historyNavigatorRailItem\s*\{[^}]*transition-delay: 0s !important;/,
      ],
    ],
    [
      'Chat/ChatConversation/ChatMessageList/Message/Assistant/LoadingText',
      1,
      [/\.root\[data-animated=['"]?true['"]?\]\s*\{\s*animation: none;/],
    ],
    [
      'Chat/ChatConversation/ChatMessageList/Message/Assistant/ProcessTrace/TraceRow',
      2,
      [
        /\.triggerMain\s*\{\s*animation: none;/,
        /\.indicator\s*\{\s*transition-duration: var\(--motion-duration-reduced\);/,
      ],
    ],
    [
      'Sidebar/_common/tab',
      1,
      [
        /\.tab \.tabLabelInner\s*\{\s*transition-duration: var\(--motion-duration-reduced\);\s*transition-delay: 0s;/,
      ],
    ],
    [
      'Sidebar/_common/footer/UserCheckIn',
      1,
      [/\.rewardConfetti span\s*\{\s*animation: none;/, /\.rewardConfetti\s*\{\s*display: none;/],
    ],
  ]) {
    const { code } = await compileCssModule(
      `src/components/business/${component}/style.module.scss`
    );
    const reduced = [
      ...code.matchAll(/^@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)^\}/gm),
    ];
    assert.equal(reduced.length, count, component);
    for (const pattern of patterns)
      assert.match(reduced.map(([, body]) => body).join('\n'), pattern, component);
  }
});

test('Chat 父宣告維持在 page-layout 巢狀覆寫之前', async () => {
  for (const [component, selector, declarations] of [
    ['ChatMessageList', 'container', ['flex: 1;', 'min-height: 0;', 'position: relative;']],
    [
      'ChatMessageList/MessageHistoryNavigator',
      'historyNavigator',
      [
        '--history-nav-item-stagger: 0.016s;',
        'position: absolute;',
        'z-index: var(--app-z-index-elevated);',
      ],
    ],
  ]) {
    const { code } = await compileCssModule(
      `src/components/business/Chat/ChatConversation/${component}/style.module.scss`
    );
    const rules = [...code.matchAll(new RegExp(`^\\.${selector}\\s*\\{([^}]+)\\}`, 'gm'))];
    assert.equal(rules.length, 1, component);
    for (const declaration of declarations)
      assert.ok(rules[0][1].includes(declaration), `${component}: ${declaration}`);
    assert.ok(
      code.search(new RegExp(`\\[data-chat-layout=['"]?page['"]?\\] \\.${selector}`)) >
        rules[0].index,
      component
    );
  }
});

test('Chat scrollbar 與後續宣告保留於同一父規則', async () => {
  for (const [component, selector, declaration] of [
    ['', '\\.sessionList', 'padding: var(--space-xs);'],
    ['ToolApprovalDialog', '\\.payload', 'white-space: pre-wrap;'],
    [
      'ChatConversation/ChatInput',
      '\\.attachmentStripShell \\.attachmentArea',
      'padding-block: var(--space-2xs) var(--space-xs);',
    ],
    ['ChatConversation/ChatInput', '\\.textarea', 'field-sizing: content;'],
    ['ChatConversation/ChatInput', '\\.agentGroupModalTree', 'background: var(--background);'],
    [
      'ChatConversation/ChatInput/DocumentPickerModal',
      '\\.navTree',
      'border: 1px solid var(--border);',
    ],
    ['ChatConversation/ChatInput/OtherSkillModal', '\\.treeNav', 'padding: var(--space-sm);'],
    [
      'ChatConversation/ChatMessageList/MessageHistoryNavigator',
      '\\.historyNavigatorRailTrigger',
      'overscroll-behavior: contain;',
    ],
    [
      'ChatConversation/ChatMessageList/MessageHistoryNavigator',
      '\\.historyNavigatorRailPanel',
      'overscroll-behavior: contain;',
    ],
  ]) {
    const { code } = await compileCssModule(
      join('src/components/business/Chat', component, 'style.module.scss')
    );
    const rules = [...code.matchAll(new RegExp(`^${selector}\\s*\\{([^}]+)\\}`, 'gm'))];
    assert.equal(rules.length, 1, `${component}: ${selector}`);
    assert.ok(rules[0][1].includes(declaration), component);
    assert.ok(rules[0][1].includes('scrollbar-width: var(--scrollbar-width, thin);'), component);
  }
});

test('Chat、Sidebar 保留桌面拖拽區、窗口按鈕留白與鍵盤焦點', async () => {
  const chat = await compileCssModule('src/components/business/Chat/style.module.scss');
  assert.match(chat.code, /\.titleBarInsetEnd\s*\{[^}]*-webkit-app-region: drag;/);
  assert.match(
    chat.code,
    /\.titleBarInsetEnd\s*\{[^}]*padding-right: var\(--desktop-window-controls-width, 116px\);[^}]*padding-left: var\(--space-sm\);[^}]*position: relative;/
  );
  assert.match(
    chat.code,
    /\.titleBarInsetEnd :where\([^{}]+\)\s*\{\s*-webkit-app-region: no-drag;/
  );
  assert.match(
    chat.code,
    /\.titleBarInsetEnd::after\s*\{[^}]*width: var\(--resource-header-end-reserve, var\(--desktop-window-controls-width, 116px\)\);[^}]*-webkit-app-region: no-drag;[^}]*pointer-events: none;/
  );
  const header = await compileCssModule(
    'src/components/business/Sidebar/_common/header/SidebarHeader/style.module.scss'
  );
  assert.match(header.code, /\.desktopHeader \.headerTop\s*\{[^}]*-webkit-app-region: drag;/);
  assert.match(header.code, /\.desktopHeader \.headerTop > \*\s*\{\s*-webkit-app-region: no-drag;/);
  const profile = await compileCssModule(
    'src/components/business/Sidebar/_common/footer/UserProfile/style.module.scss'
  );
  assert.match(
    profile.code,
    /\.menuTrigger\[data-focus-visible\]\s*\{[^}]*outline: 2px solid var\(--focus, var\(--accent\)\);/
  );
  const tab = await compileCssModule(
    'src/components/business/Sidebar/_common/tab/style.module.scss'
  );
  assert.match(
    tab.code,
    /\.tab\[data-focus-visible\]\s*\{[^}]*box-shadow: inset 0 0 0 2px var\(--focus, var\(--accent\)\);/
  );
});

test('Chat 輸入區與歡迎頁斷點、Sidebar 選取與收合狀態不變', async () => {
  const input = await compileCssModule(
    'src/components/business/Chat/ChatConversation/ChatInput/style.module.scss'
  );
  assert.match(
    input.code,
    /@container chat-input \(max-width: 420px\) \{\s*\.actionToolbar\s*\{\s*column-gap: var\(--space-2xs\);/
  );
  assert.match(
    input.code,
    /@media \(max-width: 640px\) \{\s*\.container\s*\{\s*padding-inline: var\(--space-sm\);/
  );

  const welcomeStarter = await readFile(
    join(root, 'src/components/business/Chat/WelcomeConfigurable/Starter/style.module.scss'),
    'utf8'
  );
  assert.doesNotMatch(welcomeStarter, /--table-control-min-height/);
  assert.match(welcomeStarter, /min-height:\s*var\(--control-height\);/);
  const welcome = await compileCssModule(
    'src/components/business/Chat/WelcomeConfigurable/Starter/style.module.scss'
  );
  assert.match(
    welcome.code,
    /@media \(max-width: 640px\) \{\s*\.cardGrid\[data-columns=['"]2['"]\],[^{}]*\.featureGrid\[data-columns=['"]3['"]\]\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/
  );
  const session = await compileCssModule(
    'src/components/business/Sidebar/_common/tab/SessionTab/style.module.scss'
  );
  assert.match(
    session.code,
    /\.sessionItem\[data-selected\]\s*\{\s*color: var\(--accent-text-strong\);\s*background: var\(--item-selected\);/
  );
  assert.match(
    session.code,
    /\.sessionItem\[data-disabled\]\s*\{\s*color: var\(--text-disabled\);\s*cursor: not-allowed;\s*background: transparent;/
  );
  const shell = await compileCssModule(
    'src/components/business/Sidebar/_common/sidebarShell.module.scss'
  );
  assert.match(
    shell.code,
    /\.sider\[data-sidebar-phase=['"]?collapsed['"]?\] \.expandedBody\s*\{\s*opacity: 0;\s*visibility: hidden;\s*pointer-events: none;/
  );
});

test('所有 business 樣式不殘留 Less，其餘業務 Module 可編譯', async () => {
  const directory = 'src/components/business';
  const files = await readdir(join(root, directory), { recursive: true });
  assert.deepEqual(
    files.filter((file) => file.endsWith('.less')),
    []
  );
  const modules = files.filter(
    (file) =>
      file.endsWith('.module.scss') && !/^(Chat|Sidebar|Drive|Group|Resource)[/\\]/.test(file)
  );
  assert.ok(modules.length > 0);
  for (const file of modules)
    assert.ok((await compileCssModule(join(directory, file))).modules, file);
});

test('SelectedMemberList scrollbar 與後續宣告保留於同一父規則', async () => {
  const { code } = await compileCssModule(
    'src/components/business/SelectedMemberList/style.module.scss'
  );
  const rules = [...code.matchAll(/^\.list\s*\{([^}]+)\}/gm)];
  assert.equal(rules.length, 1);
  for (const declaration of [
    'overflow-y: auto;',
    'margin-bottom: var(--space-md);',
    'max-height: 300px;',
    'scrollbar-width: var(--scrollbar-width, thin);',
    'scrollbar-color: transparent transparent;',
  ])
    assert.ok(rules[0][1].includes(declaration), declaration);
});

test('DesktopWindowControls 保留固定禁拖拽、焦點與關閉按鈕狀態', async () => {
  const { code } = await compileCssModule(
    'src/components/business/DesktopWindowControls/style.module.scss'
  );
  assert.match(
    code,
    /\.root\s*\{[^}]*position: fixed;[^}]*pointer-events: auto;[^}]*-webkit-app-region: no-drag;/
  );
  assert.match(code, /\.button\s*\{[^}]*-webkit-app-region: no-drag;/);
  assert.equal(code.match(/-webkit-app-region: no-drag;/g)?.length, 2);
  assert.doesNotMatch(code, /-webkit-app-region: drag;/);
  assert.match(
    code,
    /\.button:focus-visible,\s*\.button:focus-visible:not\(:focus\),\s*\.button\[data-focus-visible\]\s*\{[^}]*--tw-ring-offset-shadow: 0 0 #0000;[^}]*outline: 2px solid var\(--focus, var\(--accent\)\);[^}]*outline-offset: 2px;/
  );
  assert.match(
    code,
    /\.close:hover\s*\{\s*color: var\(--danger-text\);\s*background: var\(--danger-soft\);/
  );
});

test('UserSearchCombobox 與 RechargeModal 保留 768 與 640px 窄版規則', async () => {
  for (const [component, width, pattern] of [
    ['UserSearchCombobox', 768, /\.controlRow\s*\{\s*grid-template-columns: 1fr;/],
    [
      'Wallet/RechargeModal',
      640,
      /\.codeSlot\s*\{\s*width: 30px;\s*min-width: 30px;\s*flex-basis: 30px;\s*height: 40px;/,
    ],
  ]) {
    const { code } = await compileCssModule(
      `src/components/business/${component}/style.module.scss`
    );
    const media = [...code.matchAll(/^@media \(max-width: (\d+)px\) \{([\s\S]*?)^\}/gm)];
    assert.deepEqual(
      media.map(([, value]) => Number(value)),
      [width],
      component
    );
    assert.match(media[0][2], pattern, component);
  }
});

test('其餘業務樣式保留禁用、唯讀、表單與錯誤頁間距', async () => {
  const model = await compileCssModule('src/components/business/ModelSelector/style.module.scss');
  assert.match(
    model.code,
    /\.trigger:disabled\s*\{\s*color: var\(--text-disabled\);\s*cursor: not-allowed;\s*opacity: 1;/
  );
  const members = await compileCssModule(
    'src/components/business/SelectedMemberList/style.module.scss'
  );
  assert.match(
    members.code,
    /\.memberItemReadOnly\[data-disabled=['"]?true['"]?\]\s*\{\s*opacity: 1;/
  );
  assert.match(
    members.code,
    /\.memberItemReadOnly\[data-focus-visible=['"]?true['"]?\]\s*\{\s*background: transparent;\s*background-color: transparent;\s*outline: none;/
  );
  const form = await compileCssModule('src/components/business/AppFormDialog/style.module.scss');
  assert.match(form.code, /\.form\s*\{\s*display: contents;/);
  assert.match(form.code, /\.formCapture\s*\{\s*display: contents;/);
  const shell = await compileCssModule(
    'src/components/business/ErrorPage/ErrorPageShell.module.scss'
  );
  assert.match(
    shell.code,
    /\.main\s*\{[^}]*padding: clamp\(var\(--space-xl\), 6vh, 64px\) clamp\(16px, 4vw, 40px\);/
  );
  assert.match(
    shell.code,
    /\.footerMini\s*\{[^}]*padding: var\(--space-md\) clamp\(16px, 4vw, 40px\) var\(--space-lg\);/
  );
  for (const [key, width] of [
    ['sizeSm', 560],
    ['sizeMd', 620],
    ['sizeLg', 680],
  ]) {
    assert.equal(shell.modules[key], key);
    assert.match(shell.code, new RegExp(`\\.${key}\\s*\\{\\s*max-width: ${width}px;`));
  }
});

test('CommandPalette 全域覆寫、Wallet 動畫與 InlineComment 重複規則保留', async () => {
  const palette = await compileCssModule(
    'src/components/business/CommandPalette/style.module.scss'
  );
  assert.match(palette.code, /\.wp-highlight\s*\{\s*color: var\(--accent-text\);/);
  assert.match(
    palette.code,
    /\.resultFooter\.list-box-item\[data-disabled=['"]?true['"]?\]\s*\{\s*opacity: 1;/
  );
  assert.match(
    palette.code,
    /\.virtualSpacer\.list-box-item\[data-disabled=['"]?true['"]?\]\s*\{[^}]*pointer-events: none;\s*visibility: hidden;/
  );
  const wallet = await compileCssModule(
    'src/components/business/Wallet/ComputeWallet/style.module.scss'
  );
  assert.match(
    wallet.code,
    /\.rowFlash \.table__cell\s*\{\s*animation: walletRowFlash 1\.2s ease-out 2;/
  );
  assert.equal(wallet.code.match(/@keyframes walletRowFlash\s*\{/g)?.length, 1);
  assert.match(
    wallet.code,
    /0%,\s*100%\s*\{\s*background-color: transparent;\s*\}\s*25%\s*\{\s*background-color: var\(--success-soft\);/
  );
  const comments = await compileCssModule(
    'src/components/business/InlineComment/style.module.scss'
  );
  const imageRules = [...comments.code.matchAll(/^\.commentImageButton\s*\{([^}]+)\}/gm)];
  assert.equal(imageRules.length, 2);
  assert.match(imageRules[0][1], /position: relative;/);
  assert.match(imageRules[1][1], /^\s*padding: 0;\s*cursor: zoom-in;\s*$/);
});

test('agent、skill 編輯器不殘留 Less，所有 Module 可編譯', async () => {
  for (const editor of ['agent', 'skill']) {
    const directory = join('src/components/editors', editor);
    const files = await readdir(join(root, directory), { recursive: true });
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      editor
    );
    const modules = files.filter((file) => file.endsWith('.module.scss'));
    assert.ok(modules.length > 0, editor);
    for (const file of modules)
      assert.ok((await compileCssModule(join(directory, file))).modules, file);
  }
});

test('agent、skill 七處 scrollbar 保留單一父規則與後續宣告', async () => {
  for (const [component, selectors] of [
    ['agent', [['content', ['background: var(--surface);', 'scroll-behavior: smooth;']]]],
    [
      'agent/components/AgentEditor/sections/CapabilitiesSection/CapabilityPolicyPanel',
      [['options', ['padding: var(--space-2xs-plus);']]],
    ],
    [
      'skill',
      [
        ['treeWrap', ['padding: var(--space-sm);']],
        ['markdownPreview', ['background: var(--surface);']],
        ['configForm', ['overflow: auto;']],
        ['configDescriptionInput', ['field-sizing: content;', 'resize: vertical;']],
      ],
    ],
    ['skill/components/SkillSaveQueueDock', [['queueBody', ['overflow: auto;']]]],
  ]) {
    const { code } = await compileCssModule(
      `src/components/editors/${component}/style.module.scss`
    );
    for (const [selector, declarations] of selectors) {
      const rules = [...code.matchAll(new RegExp(`^\\.${selector}\\s*\\{([^}]+)\\}`, 'gm'))];
      assert.equal(rules.length, 1, `${component}.${selector}: 不拆分父規則`);
      for (const declaration of [
        'scrollbar-width: var(--scrollbar-width, thin);',
        'scrollbar-color: transparent transparent;',
        ...declarations,
      ])
        assert.ok(rules[0][1].includes(declaration), `${component}.${selector}: ${declaration}`);
    }
  }
});

test('agent 編輯器保留三組 768px 窄版規則', async () => {
  for (const [component, patterns] of [
    ['agent', [/\.page\s*\{\s*grid-template-columns: 1fr;/]],
    [
      'agent/components/AgentEditor/sections/MemorySection',
      [
        /\.advancedHeader\s*\{\s*align-items: flex-start;/,
        /\.settingGrid\s*\{\s*grid-template-columns: 1fr;\s*gap: 22px;/,
      ],
    ],
    [
      'agent/components/AgentEditor/sections/CapabilitiesSection/CapabilityPolicyPanel',
      [
        /\.header\s*\{\s*align-items: stretch;\s*flex-direction: column;/,
        /\.heading\s*\{\s*align-items: flex-start;\s*flex-direction: column;\s*gap: 3px;/,
      ],
    ],
  ]) {
    const { code } = await compileCssModule(
      `src/components/editors/${component}/style.module.scss`
    );
    const media = [...code.matchAll(/^@media \(max-width: (\d+)px\) \{([\s\S]*?)^\}/gm)];
    assert.deepEqual(
      media.map(([, width]) => Number(width)),
      [768],
      component
    );
    for (const pattern of patterns) assert.match(media[0][2], pattern, component);
  }
});

test('skill 保留編輯區尺寸、預覽全域規則與兩段 footer 宣告', async () => {
  const { code } = await compileCssModule('src/components/editors/skill/style.module.scss');
  for (const pattern of [
    /\.middlePanelSlot\s*\{\s*flex: 0 0 280px;\s*width: 280px;\s*height: 100%;\s*min-width: 0;\s*min-height: 0;/,
    /\.rightPanelSlot\s*\{\s*flex: 1 1 auto;\s*height: 100%;\s*min-width: 0;\s*min-height: 0;/,
    /\.contentRow\s*\{\s*flex: 1;\s*min-height: 0;\s*display: flex;\s*overflow: hidden;/,
    /\.editorBody\s*\{\s*flex: 1;\s*min-height: 0;/,
    /\.markdownPreview\s*\{[^}]*height: 100%;[^}]*min-height: 0;[^}]*overflow: auto;/,
    /\.markdownPreviewContent table\s*\{\s*table-layout: fixed;/,
    /\.markdownPreviewContent th,\s*\.markdownPreviewContent td\s*\{\s*padding: var\(--space-sm\) var\(--space-md\);\s*vertical-align: top;\s*line-height: 1\.6;\s*overflow-wrap: anywhere;/,
    /\.markdownPreviewContent table:has\(img\)\s*\{\s*table-layout: auto;/,
    /\.markdownPreviewContent table:has\(img\) img\s*\{\s*max-width: min\(100%, 600px\);\s*margin: 0 auto;/,
    /\.configDescriptionInput\s*\{\s*min-height: 160px;\s*max-height: max\(160px, min\(560px, 100dvh - var\(--layout-drive-chrome-height, 240px\) - 200px\)\);/,
    /\.editorTab\[data-selected=['"]?true['"]?\]\s*\{\s*color: var\(--foreground\);/,
  ])
    assert.match(code, pattern);
  const footer = [...code.matchAll(/^\.configFooterText\s*\{([^}]+)\}/gm)];
  assert.equal(footer.length, 2);
  assert.match(footer[0][1], /^\s*color: var\(--muted\);\s*font-size: var\(--font-size-xs\);\s*$/);
  assert.match(
    footer[1][1],
    /^\s*min-width: 0;\s*overflow: hidden;\s*text-overflow: ellipsis;\s*white-space: nowrap;\s*$/
  );
});

test('agent 保留資產拖入遮罩與 prompt 選取、相容狀態', async () => {
  const assets = await compileCssModule(
    'src/components/editors/agent/components/AgentEditor/sections/AssetsSection/style.module.scss'
  );
  assert.match(assets.code, /\.dropZone\s*\{\s*position: relative;/);
  assert.match(
    assets.code,
    /\.dropHint\s*\{\s*position: absolute;\s*inset: 0;\s*z-index: var\(--app-z-index-elevated\);[^}]*pointer-events: none;/
  );
  const prompt = await compileCssModule(
    'src/components/editors/agent/components/AgentEditor/sections/SystemPromptSection/style.module.scss'
  );
  assert.match(
    prompt.code,
    /\.tab\[data-selected=['"]?true['"]?\]\s*\{\s*color: var\(--accent-soft-foreground\);/
  );
  assert.match(
    prompt.code,
    /\.editorHead span\[data-compatible=['"]?false['"]?\]\s*\{\s*color: var\(--warning-text\);/
  );
  assert.match(prompt.code, /\.markdown\s*\{\s*min-height: 560px;/);
});

test('skill 保留檔案樹焦點、待儲存佇列 resize 與失敗進度狀態', async () => {
  const tree = await compileCssModule(
    'src/components/editors/skill/components/SkillFileTree/style.module.scss'
  );
  assert.match(tree.code, /\.nodeLabelDirty\s*\{\s*color: var\(--accent-text\);/);
  assert.match(tree.code, /\.deleteBtn\s*\{[^}]*opacity: 0;/);
  assert.match(tree.code, /\.nodeRow:hover \.deleteBtn\s*\{\s*opacity: 1;/);
  assert.match(tree.code, /\.inlineInputField:focus\s*\{\s*border-color: var\(--accent\);/);
  const queue = await compileCssModule(
    'src/components/editors/skill/components/SkillSaveQueueDock/style.module.scss'
  );
  for (const pattern of [
    /\.resizeHandle\s*\{[^}]*z-index: var\(--app-z-index-raised\);\s*height: 6px;\s*cursor: ns-resize;\s*touch-action: none;/,
    /\.resizeHandle::after\s*\{\s*content: ['"]{2};\s*position: absolute;\s*top: 2px;\s*left: 0;\s*right: 0;\s*height: 1px;\s*background: transparent;/,
    /\.resizeHandle:hover::after\s*\{\s*background: var\(--border-tertiary, var\(--border-light\)\);/,
    /\.queueDockExpanded \.queueHeader\s*\{\s*border-bottom-color: var\(--border-light\);/,
    /\.retryButton:hover\s*\{\s*background: var\(--surface-tertiary\);/,
    /\.progressFill\s*\{[^}]*transition: width var\(--motion-duration-fast\) var\(--motion-ease-standard\);/,
    /\.itemIconFailed\s*\{\s*color: var\(--danger-text\);/,
    /\.itemPhaseFailed\s*\{\s*color: var\(--danger-text\);/,
    /\.spinningIcon\s*\{\s*animation: var\(--animate-spin-fast\);/,
  ])
    assert.match(queue.code, pattern);
});

test('編輯器、版型、頁面與樣式入口不殘留 Less，所有 Module 可編譯', async () => {
  for (const directory of [
    'src/components/editors',
    'src/layouts',
    'src/views',
    'src/bootstrap',
    'src/styles/_stories',
  ]) {
    const files = await readdir(join(root, directory), { recursive: true });
    assert.deepEqual(
      files.filter((file) => file.endsWith('.less')),
      [],
      directory
    );
    const modules = files.filter((file) => file.endsWith('.module.scss'));
    assert.ok(modules.length > 0, directory);
    for (const file of modules)
      assert.ok((await compileCssModule(join(directory, file))).modules, file);
  }
});

test('Note 五個本地 checklist mixin 保留正文與全域拖拽預覽的輸出', async () => {
  const { code } = await compileCssModule(
    'src/components/editors/note/CustomBlockNote/style.module.scss'
  );
  for (const prefix of ['.editorShell .bn-editor', '.bn-drag-preview']) {
    const checklist = `${prefix} .bn-block-content[data-content-type="checkListItem"]`;
    const normalized = code.replaceAll("'", '"').replace(/\s+/g, ' ');
    for (const [suffix, declaration] of [
      ['', '--app-checkbox-control-size: 18px;'],
      [' > div:has(> input)', 'height: calc(var(--app-checkbox-control-size) + 6px);'],
      [' > div > input', 'border-radius: var(--app-radius-checkbox);'],
      [' > div > input:checked', 'background-color: var(--accent);'],
      [' > div > input:checked::after', 'transform: rotate(45deg);'],
    ]) {
      const start = normalized.indexOf(`${checklist}${suffix} {`);
      assert.notEqual(start, -1, `${checklist}${suffix}`);
      assert.ok(normalized.slice(start, normalized.indexOf('}', start)).includes(declaration));
    }
  }
  assert.match(code, /input:focus-visible\s*\{[^}]*box-shadow: var\(--app-checkbox-focus-ring\);/);
  assert.match(code, /input:disabled\s*\{[^}]*cursor: default;/);
});

test('剩餘 scrollbar mixin 與晚宣告維持單一父規則', async () => {
  for (const [file, selectors] of [
    ['components/editors/note/components/NoteOutline/style', ['.scrollArea']],
    ['components/editors/note/CustomBlockNote/ui/slashMenu/style', ['.menuViewport']],
    [
      'components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidBlock/style',
      ['.source, .externalSource', '.aiDiffSource, .aiDiffPreview'],
    ],
    ['layouts/Course/CourseLayout/style', ['.content']],
    [
      'layouts/Course/CourseLearningLayout/style',
      ['.outlineTree', '.outlineMoveTree', '.resourceViewer, .emptyMain'],
    ],
    [
      'layouts/Course/CourseLearningLayout/_components/CourseOutlineSidebar/CourseResourcePickerModal/style',
      ['.resourcePickerBody'],
    ],
    ['components/business/Resource/ResourceInteractionPanel/style', ['.content']],
    ['layouts/Resource/ResourceLayout/ResourceToolbar/ResourceTargetModal', ['.treeWrap']],
    ['views/app/course/CourseContextPage/_components/CourseHomeTab/style', ['.leftScroll']],
    ['views/app/course/CourseEditorPage/style', ['.editorScroll', '.courseTextArea']],
  ]) {
    const { code } = await compileCssModule(`src/${file}.module.scss`);
    for (const selector of selectors) {
      const rules = [...code.matchAll(/^(\.[^{}]+)\{([^{}]*)\}/gm)].filter(
        ([, name]) => name.replace(/\s+/g, ' ').trim() === selector
      );
      assert.equal(rules.length, 1, `${file}: ${selector} 不拆分父規則`);
      assert.ok(rules[0][2].includes('scrollbar-width: var(--scrollbar-width, thin);'));
      assert.ok(rules[0][2].includes('scrollbar-color: transparent transparent;'));
    }
  }
});

test('Auth 本地文字連結 mixin 保留三個 caller 的 hover 與鍵盤焦點', async () => {
  const { code } = await compileCssModule('src/views/app/auth/_common/style.module.scss');
  for (const name of ['centerLinks', 'rightLinks', 'leftBottomLinks']) {
    const body = code.match(new RegExp(`\\.${name} a \\{([^}]+)\\}`))?.[1];
    assert.ok(body?.includes('color: var(--link);\n  text-decoration: none;'));
    assert.ok(
      code.includes(
        `.${name} a:hover, .${name} a:focus-visible {\n  color: var(--accent-text-strong);\n  text-decoration: underline;`
      )
    );
  }
});

test('layout mixin 保留參數與單次 min-size 宣告', async () => {
  for (const [file, selectors] of [
    ['App/AppPageLayout', ['root']],
    ['Course/CourseLayout/style', ['sidebar', 'main']],
    ['Course/CourseLearningLayout/style', ['outlineSidebar']],
  ]) {
    const { code } = await compileCssModule(`src/layouts/${file}.module.scss`);
    for (const selector of selectors) {
      const body = code.match(new RegExp(`^\\.${selector} \\{([^}]+)\\}`, 'm'))?.[1];
      assert.ok(body, `${file}.${selector}`);
      assert.equal(body.match(/min-height: 0;/g)?.length, 1, `${file}.${selector}`);
      if (selector !== 'root') assert.equal(body.match(/min-width: 0;/g)?.length, 1);
    }
  }
  const { code } = await compileCssModule(
    'src/layouts/Course/CourseLearningLayout/style.module.scss'
  );
  assert.match(
    code,
    /\.outlineNodeTitle\s*\{\s*display: inline-flex;\s*align-items: center;\s*justify-content: space-between;\s*gap: var\(--space-xs\);/
  );
  assert.match(code, /@media \(max-width: 768px\)/);
});

test('桌面頂欄與共用軟焦點 mixin 保留拖拽邊界及鍵盤樣式', async () => {
  const { code } = await compileCssModule(
    'src/layouts/Resource/ResourceLayout/ResourceLayoutHeader/style.module.scss'
  );
  assert.match(code, /\.desktopRoot \.bar\s*\{[^}]*-webkit-app-region: drag;/);
  assert.match(code, /\.desktopRoot \.bar :where\([^{}]+\)\s*\{\s*-webkit-app-region: no-drag;/);
  assert.match(
    code,
    /-webkit-app-region: no-drag;\s*\}\s*\.desktopRoot \.bar\s*\{\s*padding-right: var\(--space-sm\);\s*padding-left: var\(--space-lg\);\s*\}\s*\.desktopRoot \.bar \.toolbar/
  );
  assert.match(
    code,
    /\.titleBarInsetEnd \.bar::after\s*\{[^}]*-webkit-app-region: no-drag;\s*pointer-events: none;/
  );
  const tabs = await compileCssModule('src/views/app/_common/underlineTabs.module.scss');
  assert.match(
    tabs.code,
    /:focus-visible,[^{]*:focus-visible:not\(:focus\),[^{]*\[data-focus-visible\]\s*\{[^}]*--tw-ring-offset-shadow: 0 0 #0000;[^}]*background: var\(--accent-soft\);/
  );
});

test('自有樣式及入口不得殘留 Less 檔案、引用或直接相依', async () => {
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
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  for (const name of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ])
    assert.equal(pkg[name]?.less, undefined, name);
  assert.ok(pkg.devDependencies['sass-embedded']);
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
      if (script === 'check-radius-tokens.mjs') {
        const radiusTokenPath = join(workspace, 'src/styles/theme/radius.css');
        await mkdir(dirname(radiusTokenPath), { recursive: true });
        await writeFile(
          radiusTokenPath,
          ':root { --app-radius-field: 8px; --field-radius: var(--app-radius-field); }'
        );
      }

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
