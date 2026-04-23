<div align="center">

# 🗝️ PromptVault

**你的本地 Prompt 仓库 · 版本管理 · 变量模板 · 多模型 Playground**

*A local-first prompt vault with versioning, template variables, and a multi-provider playground.*

<p>
  <a href="https://github.com/ayaya114514/promptvault/releases/latest">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/ayaya114514/promptvault?style=flat-square&color=8b5cf6">
  </a>
  <a href="https://github.com/ayaya114514/promptvault/releases">
    <img alt="Downloads" src="https://img.shields.io/github/downloads/ayaya114514/promptvault/total?style=flat-square&color=10b981">
  </a>
  <img alt="License" src="https://img.shields.io/github/license/ayaya114514/promptvault?style=flat-square">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-32-47848F?style=flat-square&logo=electron">
</p>

[中文](#-中文) · [English](#-english) · [下载 / Download](https://github.com/ayaya114514/promptvault/releases/latest)

</div>

---

## 📥 下载 / Download

| 平台 · Platform | 安装包 · Installer |
| --- | --- |
| 🍎 **macOS** (Apple Silicon / Intel) | [`PromptVault-x.y.z-arm64.dmg`](https://github.com/ayaya114514/promptvault/releases/latest) / `-x64.dmg` |
| 🪟 **Windows 10 / 11** (x64) | [`PromptVault-x.y.z-Setup.exe`](https://github.com/ayaya114514/promptvault/releases/latest) |
| 🐧 Linux / 其他 | 源码自行构建（见下） |

> 未签名提示 · The app is unsigned, so **macOS Gatekeeper** 会提示 "无法验证"：右键点击 → 打开 → 继续。**Windows SmartScreen**：点击「更多信息」→「仍要运行」。
>
> The binaries ship **unsigned** to keep the project free. Right-click → Open on macOS; "More info → Run anyway" on Windows SmartScreen.

---

<a name="-中文"></a>

## 🀄 中文

### ✨ 功能速览

- 📝 **Prompt CRUD** — 标题、正文、标签、收藏、文件夹分组
- 🔤 **模板变量** — `{{variable}}` 语法，运行时弹框填参，实时预览，一键复制
- 🕑 **版本控制** — 每次保存自动快照，历史列表 + 行级 diff 对比，可一键恢复
- 🎮 **Playground** — 选 Prompt → 填变量 → 调模型 → 看结果；记录输入 / 输出 / token / 耗时
- 🌐 **多 Provider** — Anthropic 原生 · OpenAI 兼容（OpenRouter · Groq · DeepSeek · Gemini · Ollama）
- 🔍 **搜索 + 文件夹** — 侧边栏搜标题 / 标签 / 文件夹，可折叠分组
- 💾 **JSON 导入导出** — 完整备份（含版本历史）
- 🌙 **深色模式** + 🌏 **中英切换**
- ⌨️ **快捷键** — `⌘N` 新建 · `⌘K` / `/` 搜索 · `?` 帮助
- 🔒 **100% 本地** — 所有数据都在本机的单个 SQLite 文件里，没有遥测

### 🎨 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | [Next.js 14](https://nextjs.org) (App Router) |
| 桌面壳 | [Electron 32](https://www.electronjs.org/) |
| 数据库 | [Prisma 6](https://www.prisma.io) + SQLite |
| UI | [Tailwind CSS](https://tailwindcss.com) · [Radix UI](https://www.radix-ui.com) · [lucide-react](https://lucide.dev) · shadcn 风格组件 |

### 🚀 快速开始（Web 版开发）

```bash
git clone https://github.com/ayaya114514/promptvault.git
cd promptvault

npm install
npx prisma migrate dev   # 创建本地 SQLite
npm run dev              # http://localhost:3000
```

### 🖥️ 本地打包桌面版

```bash
npm run dist:mac   # macOS .dmg (release/)
npm run dist:win   # Windows .exe  (需在 Windows 上运行)
```

### ⚙️ 配置 API

打开左下角 **设置**，选一个预设：

| Provider | 费用 | 备注 |
| --- | --- | --- |
| Anthropic | 付费（新号送 $5） | 官方 Claude API |
| Groq | 免费 | 飞快，Llama / Mixtral |
| Google Gemini | 有免费额度 | `gemini-2.0-flash` |
| OpenRouter | 聚合 | 一个 key 访问所有模型，部分 `:free` |
| DeepSeek | $0.14/M tok | 便宜，国内可直连 |
| Ollama | 免费 · 本地 | 需本地装 Ollama，apiKey 随便填 |

### 💾 数据存在哪

- **桌面版**：`~/Library/Application Support/PromptVault/promptvault.db` (macOS) 或 `%APPDATA%\PromptVault\promptvault.db` (Windows)
- **Web 版**：`prisma/dev.db`
- API Key 存在同一个 DB 里，**不会上传任何第三方**（除了你选的 Provider）

---

<a name="-english"></a>

## 🌏 English

### ✨ Features

- 📝 **Prompt CRUD** — title, content, tags, favorites, folders
- 🔤 **Template variables** — `{{variable}}` syntax; modal fills them with live preview + copy
- 🕑 **Version control** — auto-snapshot on save, history list with line-level diff, one-click restore
- 🎮 **Playground** — pick prompt → fill variables → run against a model; logs input / output / tokens / latency
- 🌐 **Multi-provider** — Anthropic native · OpenAI-compatible (OpenRouter · Groq · DeepSeek · Gemini · Ollama)
- 🔍 **Search + folders** — sidebar filter on title / tag / folder; collapsible groups
- 💾 **JSON import/export** — full backup including version history
- 🌙 **Dark mode** + 🌏 **CN/EN toggle**
- ⌨️ **Keyboard shortcuts** — `⌘N` new · `⌘K` / `/` search · `?` help
- 🔒 **100% local** — everything lives in a single local SQLite file; no telemetry

### 🎨 Stack

Next.js 14 · Electron 32 · Prisma 6 + SQLite · Tailwind + Radix UI · lucide-react.

### 🚀 Develop (web mode)

```bash
git clone https://github.com/ayaya114514/promptvault.git
cd promptvault

npm install
npx prisma migrate dev
npm run dev   # http://localhost:3000
```

### 🖥️ Build desktop locally

```bash
npm run dist:mac   # .dmg into release/
npm run dist:win   # .exe (run on Windows)
```

### ⚙️ Configure API

Open **Settings** in the sidebar, pick a preset, paste your key + model, save. Settings and keys stay in the local SQLite file.

### 💾 Where is my data?

- **Desktop**: `~/Library/Application Support/PromptVault/promptvault.db` (macOS) or `%APPDATA%\PromptVault\promptvault.db` (Windows)
- **Web dev**: `prisma/dev.db`

---

## 📸 Screenshots

> _Drop PNGs into `docs/screenshots/` and they'll show up here. Suggested pages: `/`, `/new`, `/p/[id]` with the versions panel, `/playground`, `/settings`._

| Vault | Playground | Versions |
| --- | --- | --- |
| _coming soon_ | _coming soon_ | _coming soon_ |

---

## 🤝 Contributing

PRs welcome — especially for new Provider presets, UI polish, and screenshots. Run `npm run lint` before submitting.

## 📄 License

[MIT](LICENSE) © ayaya114514
