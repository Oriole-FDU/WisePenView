# 契约 Lint 基础设施

跨模块契约复用同一个 ESLint 插件、配置与检查入口。专题文档说明原则和范例，专题规则只检查能够静态判定的边界。

## 职责与入口

- `lint/<topic>.js`：专题规则及其 `no-restricted-syntax` 片段。
- `lint/contracts.js`：登记专题规则、默认级别和属于该专题的语法限制。
- `eslint-rules/project-rules.js`：通过 `contractRules` 注册到现有 `wisepen` 插件。
- `eslint.config.js`：通过 `contractRuleSettings` 启用规则；适用文件范围与目录例外仍由配置或专题规则负责。
- `scripts/check-contract-lint.mjs`：运行项目 ESLint 配置，统一筛选、格式化诊断并设置退出码。

当前 `error` 专题承接主干已有的错误规则与原生错误语法限制；`component` 专题已接入组件目录、类型和私有边界契约，默认级别为 error。后续专题扩展自己的规则，公共注册和专项检查会直接读取新的规则对象，不复制检查脚本。

```bash
pnpm lint                    # 全项目检查，遵守配置中的 error / warn 级别
pnpm lint:contracts          # 一次扫描，检查所有已登记契约
pnpm lint:error              # 等价于 node scripts/check-contract-lint.mjs error
pnpm lint:component          # 等价于 node scripts/check-contract-lint.mjs component
```

专项检查可以同时接受多个专题名；未知专题直接失败。只有已经登记的专题才可以被检查，尚未接入的查询规则不能被报告为检查通过。

## 诊断与失败契约

专项检查从仓库根目录加载与 `pnpm lint` 相同的 `eslint.config.js`，扫描整个 `src` 下的 TypeScript、TSX 与 JavaScript，不创建第二份 ESLint 配置。

- 专题规则名称从导出的规则对象生成，不在脚本内手抄规则清单。
- `no-restricted-syntax` 的专题归属通过同一语法片段的完整提示匹配，不另写提示关键字。
- 解析失败、没有 ruleId 的 error，以及配置或执行异常始终导致失败，不能因为筛选专题而漏报。
- 专项检查命中 warning 或 error 均返回 1；没有命中返回 0。全项目检查仍按 ESLint 原有严重级别判定。
- 不使用 warning 总数作为存量豁免。记录基线时写明提交、命令和实际诊断，不能把改后总数当作改前基线。

## 新专题接入范例

查询分支新增 `lint/query.js` 后，在 `lint/contracts.js` 导入 `queryRules` 并添加：

```js
query: {
  rules: queryRules,
  severity: 'error',
},
```

注册和默认级别会自动进入现有插件与配置。按需要增加命令别名：

```json
"lint:query": "node scripts/check-contract-lint.mjs query"
```

如果专题包含内置语法限制，同时登记 `restrictedSyntax`，并在原有配置组合处引用同一批片段。登记仅声明诊断归属，不会自动扩大语法限制的适用目录。

目录豁免、业务允许的错误类型或本地异步任务等仍归各专题规则；公共入口不推断业务空值、不分析接口语义，也不要求不同专题使用相同的规则严重级别。

## 分支顺序

基础设施先合入 `main`，error 与 query 分支随后各自基于更新后的 `main` 处理。错误分支保留本专题的行为变更，查询分支使用同一套基础设施接入查询规则。两个分支均删除自有的专项扫描脚本，避免再次分叉。
