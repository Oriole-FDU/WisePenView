# 颜色系统

项目使用 Radix Colors 的色阶职责组织颜色，HeroUI 语义 token 作为业务唯一入口。业务样式不得直接引用
`--blue-9`、`--slate-11`、`--wisepen-default-9`、`--palette-accent-*` 等基础变量。

## 分层

1. `src/styles/theme/radix-colors.css` 导入 Radix 官方 neutral 与状态色 light/dark 色阶。
2. `src/styles/theme/custom-accents.css` 保存由 Radix 官方生成器生成的六套品牌色阶。
3. `src/styles/theme/palette.css` 选择每套配色的 accent 与 neutral，并映射为语义 token。
4. `src/styles/global/index.css` 将语义 token 暴露为 Tailwind 主题颜色。
5. 组件和页面只使用 `--accent`、`--surface`、`--foreground` 等语义 token。

## Radix 阶号职责

| 阶号 | 项目职责                         |
| ---- | -------------------------------- |
| 1    | 应用画布和基础表面               |
| 2    | 次级表面、极弱 accent 背景       |
| 3    | 控件默认背景、soft accent 背景   |
| 4    | hover 背景                       |
| 5    | active / selected 背景、极弱边框 |
| 6    | 普通边框                         |
| 7    | 强边框、hover、accent 边框       |
| 8    | 高强调边框与弱 accent 前景       |
| 9    | 实心 accent、状态色和 focus ring |
| 10   | 实心色 hover，不作常规文字       |
| 11   | 辅助文字、链接、soft foreground  |
| 12   | 正文和高对比文字                 |

不要把阶号理解为可随意替换的明暗值。每一级都对应 Radix 官方定义的界面职责。

## 配色

| 主题     | Neutral | 品牌色锚点 |
| -------- | ------- | ---------- |
| Default  | Slate   | `#127abb`  |
| Floral   | Mauve   | `#be435a`  |
| Aqua     | Slate   | `#248286`  |
| Sunset   | Sand    | `#b85d43`  |
| Emerald  | Sage    | `#2f8a64`  |
| Lavender | Mauve   | `#835ec7`  |

六个品牌色锚点在 light/dark 中都固定为第 9 阶，再由 Radix 官方自定义色板生成器按模式生成其余
11 阶及文本选区使用的 alpha 第 5 阶。旧深色模式中单独维护的浅品牌色不再作为锚点；深色模式的
链接和强调文字使用生成后的第 11 阶，避免把文字色误用为实心主色。

状态色固定使用 Blue、Green、Amber、Red，分别表达 info、success、warning、danger。错误语义统一使用
`danger`，不再维护重复的 `error` token；品牌与主操作统一使用 `accent`，不再维护 `primary` 颜色别名。

## 使用规则

- 应用画布、主内容底色和顶栏使用带主题色的 accent 第 1 阶，通过 `background`、`canvas`、
  `header-surface` 表达；卡片、浮层、输入框和其它内容载体使用 Neutral 第 1 阶，通过 `surface`、
  `card-surface`、`overlay`、`field-background` 表达。不要用 `surface` 覆盖顶层画布。
- 正文使用 `foreground`，辅助文字使用 `muted`；输入占位使用 `field-placeholder`。`text-tertiary`
  只用于不传递信息的装饰图标和列表符号，不用于可读文字或交互控件。
- 主操作和实心品牌背景使用 `accent`；品牌色文字与图标使用 `accent-text`，文字链接使用 `link`；
  第 5 阶选中背景上的小字号文字使用 `accent-text-strong`（第 12 阶）。
- 默认透明的控件可在 hover 使用第 3 阶；有默认底色的控件 hover 使用第 4 阶；active / selected
  状态统一使用 `accent-selected`（第 5 阶）。
- 一级侧栏使用独立的连续层级：底色第 2 阶、导航 hover 第 3 阶、selected 第 4 阶、selected
  hover 第 5 阶；不要将这组侧栏 token 用于普通菜单或其它业务控件。
- 表格 header/footer 使用 accent 第 2 阶。资源管理器式表格为降低大面积行状态的视觉干扰，
  可交互行 hover 使用第 2 阶、selected 使用第 3 阶、selected hover 使用第 4 阶。普通表体和
  只读表格行保持 neutral，不用主题色制造可点击暗示。表格外框使用 Neutral 第 5 阶，内部行分隔、
  header/footer 分隔和内部面板分栏使用更淡的 Neutral 第 4 阶，降低高密度列表的网格感。
- 键盘 focus ring 使用 `focus`（第 9 阶），原生文本选区使用 `selection`（alpha 第 5 阶）。
- 禁用控件不对整个控件叠加透明度，并按控件变体保留形状层级：filled 使用 Neutral 第 4 阶背景和
  Neutral 第 10 阶前景，soft 使用 Neutral 第 3 阶背景和 Neutral 第 10 阶前景；ghost 保持透明背景
  和 Neutral 第 10 阶前景，outline 使用 Neutral 第 6 阶边框。
- 状态实心背景使用 `info`、`success`、`warning`、`danger`；状态文字使用对应的 `*-text`。
- 状态背景优先使用 `*-soft`，其中文字使用 `*-soft-foreground`。
- 高密度应用界面的 Neutral 边框整体比 Radix 通用职责低一阶：`border-light` / `separator` 使用
  第 5 阶、`border` 使用第 6 阶、`border-tertiary` 使用第 7 阶；交互字段 hover 使用第 7 阶，
  focus 边框与外层 focus ring 都使用高饱和的 accent 第 9 阶，避免相邻两层存在细微色差。深色模式中
  模拟边框的卡片、浮层和字段外描边使用 Neutral 第 5 阶，避免阴影描边比实际分隔线更亮。
- 普通业务 UI 禁止硬编码十六进制、RGB 和 HSL 颜色。
- 编辑器用户内容色、图表数据色、协作用户色、打印和媒体遮罩应维护独立语义，不映射为应用主题色。
- 新增颜色前先确认现有语义是否可表达；确需新增时，在 palette 中同时定义 light/dark 行为并暴露 Tailwind 别名。

## 验证

颜色系统修改至少需要完成：

1. 全局搜索确认无旧 `primary` / `error` 颜色变量和未定义 token。
2. `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过。
3. 经用户允许后，对六套配色的 light/dark 页面、表单状态、浮层和实心按钮做浏览器视觉检查。

参考：

- [Radix Colors: Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Radix Colors: Composing a color palette](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)
- [Radix Colors: Custom palettes](https://www.radix-ui.com/colors/docs/overview/custom-palettes)
- [HeroUI: Colors](https://heroui.com/en/docs/react/getting-started/colors)
