# AyayaPrompt

一个完全运行在浏览器里的本地 Prompt 仓库，支持版本历史、模板变量、JSON 备份和 multi-provider Playground。

在线版本：<https://ayaya114514.github.io/AyayaPrompt/>

## 特性

- Prompt CRUD、folder、tags、favorite，以及覆盖标题、正文、标签和文件夹的全文筛选
- `{{variable}}` 模板变量、实时填参和复制
- 每次内容编辑自动创建版本快照，可查看 line diff 和恢复
- Anthropic 与 OpenAI-compatible browser Playground
- 运行历史、token 与耗时记录
- JSON import/export，兼容旧版 Electron/Prisma 导出格式
- 中英文、dark mode、键盘快捷键和 responsive mobile navigation
- 无 backend、无账号、无遥测

## 数据与隐私

Prompt、版本历史、运行记录和非敏感设置保存在当前网站 origin 的 `IndexedDB` 中。数据不会因为部署到 GitHub Pages 而上传到 GitHub，也不会在设备间自动同步。

API key 只保存在当前 tab 的 `sessionStorage`，不会写入 `IndexedDB` 或 JSON backup；关闭 tab 后浏览器会清除它。切换到不同 Provider 或 endpoint 时，应用也会清空当前 key，避免把 credential 发往错误服务。模型请求由浏览器直接发送给所选 Provider，因此：

- 仅应在自己的可信设备上使用 API key。
- `sessionStorage` 不是加密保险箱：当前 tab 中运行的同源 JavaScript 在 session 存续期间仍可读取它。
- Provider 必须允许 browser CORS。
- Ollama 等 HTTP localhost endpoint 可能受到 HTTPS mixed-content、Private Network Access 或 CORS 设置限制。
- GitHub Pages bundle 中没有、也不应该放置任何共享 API secret。

浏览器 storage 按 **origin**（scheme + host + port）隔离，而不是按 URL path 隔离。`https://ayaya114514.github.io/AyayaPrompt/` 与同一 `github.io` host 下的其他 project Pages 共享 origin；其他同源页面理论上可以读取这些 Prompt 数据，也能在 API session 尚未结束时读取 key。需要更强隔离时，请把 AyayaPrompt 部署到独立 custom domain/origin，并避免在共享 Pages origin 中保存高度敏感的内容。

换浏览器或清除站点数据前，请先在设置页导出 JSON backup。

## 本地开发

需要 Node.js `^20.19.0` 或 `>=22.12.0`。仓库的 `.nvmrc` 使用 Node 22：

```bash
nvm use
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck     # TypeScript
npm run test:unit     # IndexedDB 与 utility tests
npm run test:coverage # core lib tests + coverage thresholds
npm run lint          # ESLint（TypeScript、React hooks、a11y）
npm run test:browser  # build dist，并在 /AyayaPrompt/ 下运行 Playwright
npm run build         # production bundle -> dist/
npm test              # 完整验证
```

## GitHub Pages 部署

项目使用 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 自动部署：

1. 在 GitHub repository 打开 **Settings → Pages**。
2. 将 **Source** 设为 **GitHub Actions**。
3. Push 到 `main`，或在 Actions 页面手动运行 **Deploy GitHub Pages**。
4. Workflow 会执行 lint、typecheck、unit tests、production build，以及 Chromium、Firefox、WebKit browser tests，通过后发布 `dist/`。

Browser tests 不使用 Vite dev server：它们先创建真实 production `dist/`，再从 Pages-like `/AyayaPrompt/` 子路径提供静态文件，并验证 relative assets、React hash routing、mobile focus behavior 和 axe accessibility smoke。Unit suite 会对核心 provider、storage、variable libraries 执行 coverage thresholds。应用因此可以直接运行在 project Pages 子路径，不依赖 server rewrite。

## 从旧 Electron 版迁移

旧版 SQLite database 不能由网页直接读取。请先用旧版 PromptVault（AyayaPrompt 的前身）导出 JSON，然后在网页版设置页导入。旧版导出的 stringified tags 和 nested version records 会自动转换到新的 IndexedDB schema。

## Architecture

```text
GitHub Pages (static HTML/CSS/JS)
  └── Vite + React SPA
       ├── HashRouter
       ├── IndexedDB: prompts / versions / runs / settings
       ├── sessionStorage: tab-only API key session
       └── direct fetch: user-selected model provider
```

## License

[MIT](LICENSE) © ayaya114514
