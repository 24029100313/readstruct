# readstruct

[![CI](https://github.com/24029100313/readstruct/actions/workflows/ci.yml/badge.svg)](https://github.com/24029100313/readstruct/actions/workflows/ci.yml)

一个用来生成 README 文件结构区块的命令行工具。

适合想把项目目录结构稳定写进文档、又不想手工维护树形列表的场景。

## 安装

全局安装：

```bash
npm install -g readstruct
```

直接使用 `npx`：

```bash
npx readstruct generate
```

## 快速开始

1. 在项目根目录安装 `readstruct`，或者直接使用 `npx readstruct`。
2. 运行 `readstruct gen --dir . --output ./README.md` 生成结构区块。
3. 如果需要忽略更多目录或换模板，添加 `.readstructrc` 或传入 `--template`，然后再次执行命令。

## CLI 参数

命令：`readstruct generate`，可简写为 `readstruct gen`

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `-d, --dir <path>` | 要扫描的目录 | `"."` |
| `-o, --output <path>` | 要写入的 README 文件路径 | `"./README.md"` |
| `-t, --template <path>` | 自定义 Handlebars 模板路径 | 使用内置模板 |
| `--depth <number>` | 最大扫描深度 | `3` |
| `--dry-run` | 只打印结果，不写入文件 | `false` |
| `--no-emoji` | 关闭文件和文件夹 emoji | `false` |

## `.readstructrc` 配置

`readstruct` 会从当前工作目录读取 `.readstructrc`，格式为标准 JSON。CLI 参数优先级高于配置文件。

支持字段：

- `ignore`：额外忽略规则数组，遵循 `.gitignore` 语法
- `depth`：最大扫描深度
- `emoji`：是否启用 emoji
- `template`：自定义模板路径，传 `null` 表示使用默认模板

完整示例：

```json
{
  "ignore": ["node_modules", ".git", "dist", "*.log", ".env*"],
  "depth": 3,
  "emoji": true,
  "template": null
}
```

默认还会忽略这些路径：

```text
node_modules
.git
dist
build
.next
.cache
coverage
*.log
.DS_Store
Thumbs.db
.env
.env.*
```

此外，扫描时也会叠加读取被扫描目录根下的 `.gitignore` 规则。

## 自定义模板

模板使用 Handlebars，默认模板位于 `templates/default.hbs`。可用变量如下：

| 变量 | 含义 |
| --- | --- |
| `{{title}}` | 项目名，优先读取扫描目录下 `package.json.name` |
| `{{tree}}` | 已渲染好的树形结构字符串 |
| `{{date}}` | 生成日期，格式为 `YYYY-MM-DD` |
| `{{totalFiles}}` | 文件总数 |
| `{{totalDirs}}` | 文件夹总数 |

自定义模板时，建议保留 `&lt;!-- READSTRUCT:START --&gt;` 和 `&lt;!-- READSTRUCT:END --&gt;` 标记。目标 README 里最好只保留一组标记，这样后续更新会更稳定。

示例：

~~~~hbs
&lt;!-- READSTRUCT:START --&gt;
## {{title}} Structure

```text
{{tree}}
```
&lt;!-- READSTRUCT:END --&gt;
~~~~

## 开发与测试

常用命令：

```bash
npm run build
npm test
npm run check
```

- `npm run build`：构建 CLI 到 `dist/`
- `npm test`：运行 `node:test` 测试集
- `npm run check`：串联构建、测试和 `npm pack --dry-run`

## 发布前检查

发布前建议至少确认这几项：

1. `npm run check` 通过。
2. README 中的仓库链接、示例和版本信息已经更新。
3. 已完成 `npm login`，并确认 npm 包名可用。

发布命令：

```bash
npm publish --access public
```

## 在当前仓库中的生成效果

下面这段内容就是 `readstruct` 在当前仓库里实际运行后的结果：

<!-- READSTRUCT:START -->
## 📁 Project Structure

> 由 [readstruct](https://github.com/24029100313/readstruct) 自动生成于 2026-04-14
> 共 6 个文件夹，21 个文件

```text
📁 readstruct/
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 ci.yml
├── 📁 src/
│   ├── 📄 config.ts
│   ├── 📄 index.ts
│   ├── 📄 injector.ts
│   ├── 📄 renderer.ts
│   └── 📄 scanner.ts
├── 📁 templates/
│   └── 📄 default.hbs
├── 📁 test/
│   ├── 📄 cli.test.ts
│   ├── 📄 config.test.ts
│   ├── 📄 helpers.ts
│   ├── 📄 injector.test.ts
│   ├── 📄 renderer.test.ts
│   └── 📄 scanner.test.ts
├── 📄 .gitattributes
├── 📄 .gitignore
├── 📄 .npmignore
├── 📄 LICENSE
├── ⚙️ package-lock.json
├── ⚙️ package.json
├── 📝 README.md
└── ⚙️ tsconfig.json
```
<!-- READSTRUCT:END -->

