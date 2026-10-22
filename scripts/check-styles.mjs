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
