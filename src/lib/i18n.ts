export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];
export const DEFAULT_LOCALE: Locale = "zh";

type Entry = { zh: string; en: string };

export const dict = {
  // Sidebar
  "sidebar.new": { zh: "新建 Prompt", en: "New prompt" },
  "sidebar.empty": {
    zh: "还没有 Prompt，先创建一条吧。",
    en: "No prompts yet. Create your first one.",
  },
  "sidebar.toggleLang": { zh: "English", en: "中文" },

  // Home
  "home.title": { zh: "欢迎使用 PromptVault", en: "Welcome to PromptVault" },
  "home.empty": {
    zh: "仓库为空，创建第一条 Prompt 开始吧。",
    en: "Your vault is empty. Create your first prompt to get started.",
  },
  "home.hasPrompts": {
    zh: "你已保存 {count} 条 Prompt。从左侧选一条，或创建新的。",
    en: "You have {count} prompt{s} saved. Pick one from the sidebar, or create a new one.",
  },

  // New page
  "new.title": { zh: "新建 Prompt", en: "New prompt" },
  "new.subtitle": {
    zh: "写一条可复用的 Prompt 存入仓库。",
    en: "Craft a reusable prompt and save it to your vault.",
  },

  // Form
  "form.titlePlaceholder": { zh: "Prompt 标题", en: "Prompt title" },
  "form.favorite": { zh: "收藏", en: "Favorite" },
  "form.tags": { zh: "标签", en: "Tags" },
  "form.tagsHint": {
    zh: "用英文逗号分隔。",
    en: "Comma-separated.",
  },
  "form.tagsPlaceholder": {
    zh: "写作, 翻译, 代码审查",
    en: "writing, translation, code-review",
  },
  "form.content": { zh: "内容", en: "Content" },
  "form.contentPlaceholder": {
    zh: "在这里写你的 Prompt。使用 {{变量名}} 语法插入可填参数。",
    en: "Write your prompt here. Use {{variable}} syntax for fillable parameters.",
  },
  "form.delete": { zh: "删除", en: "Delete" },
  "form.cancel": { zh: "取消", en: "Cancel" },
  "form.save": { zh: "保存", en: "Save" },
  "form.saving": { zh: "保存中…", en: "Saving…" },
  "form.confirmDelete": {
    zh: "确定删除这条 Prompt？此操作不可撤销。",
    en: "Delete this prompt? This cannot be undone.",
  },

  // Detail
  "detail.editPrompt": { zh: "编辑 Prompt", en: "Edit prompt" },
  "detail.lastUpdated": {
    zh: "最后更新：{date}",
    en: "Last updated {date}",
  },
  "detail.variables": { zh: "变量：", en: "Variables:" },
  "detail.history": { zh: "历史版本", en: "History" },
  "detail.versionCount": {
    zh: "{n} 个版本",
    en: "{n} version{s}",
  },

  // Variable runner
  "runner.fill": { zh: "填参", en: "Fill" },
  "runner.fillN": { zh: "填参 ({n})", en: "Fill ({n})" },
  "runner.dialogTitle": {
    zh: "填入变量 · {title}",
    en: "Fill variables · {title}",
  },
  "runner.dialogDesc": {
    zh: "在左侧填入变量值，右侧实时预览。",
    en: "Enter values below. The prompt preview on the right updates live.",
  },
  "runner.noVars": {
    zh: "这条 Prompt 没有检测到变量占位符。",
    en: "No variables detected in this prompt.",
  },
  "runner.enterValue": {
    zh: "输入 {name}…",
    en: "Enter {name}…",
  },
  "runner.preview": { zh: "预览", en: "Preview" },
  "runner.empty": { zh: "（空）", en: "(empty)" },
  "runner.copy": { zh: "复制结果", en: "Copy rendered" },
  "runner.copied": { zh: "已复制", en: "Copied" },

  // Versions panel
  "versions.empty": {
    zh: "还没有历史版本。编辑 Prompt 时会自动保存快照。",
    en: "No previous versions. Versions are created automatically when you edit a prompt.",
  },
  "versions.restore": { zh: "恢复此版本", en: "Restore this version" },
  "versions.oldTitle": {
    zh: "旧标题：{title}",
    en: "Title was: {title}",
  },
  "versions.confirmRestore": {
    zh: "恢复 v{n}？当前版本会先存入历史。",
    en: "Restore v{n}? Current version will be saved to history.",
  },
  "versions.versionContent": {
    zh: "v{n} 内容",
    en: "v{n} content",
  },
  "versions.currentContent": {
    zh: "当前内容",
    en: "Current content",
  },

  // Sidebar nav
  "nav.playground": { zh: "Playground", en: "Playground" },
  "nav.settings": { zh: "设置", en: "Settings" },

  // Settings
  "settings.title": { zh: "API 设置", en: "API settings" },
  "settings.subtitle": {
    zh: "配置浏览器直连模型所需的 API 凭证。数据不会经过 PromptVault 服务器。",
    en: "Configure credentials for direct browser-to-provider requests. PromptVault has no server in the middle.",
  },
  "settings.provider": { zh: "Provider", en: "Provider" },
  "settings.providerAnthropic": { zh: "Anthropic 原生", en: "Anthropic native" },
  "settings.providerOpenAI": {
    zh: "OpenAI 兼容（OpenRouter / Groq / DeepSeek / Ollama...）",
    en: "OpenAI-compatible (OpenRouter / Groq / DeepSeek / Ollama...)",
  },
  "settings.baseURL": { zh: "Base URL", en: "Base URL" },
  "settings.baseURLHint": {
    zh: "Anthropic 留空即可使用官方地址。",
    en: "Leave blank for Anthropic to use the official endpoint.",
  },
  "settings.apiKey": { zh: "API Key", en: "API Key" },
  "settings.apiKeyHint": {
    zh: "默认仅在当前 tab session 保存，只会发送给所选 Provider。",
    en: "Kept for this tab session by default and sent only to the selected provider.",
  },
  "settings.model": { zh: "模型", en: "Model" },
  "settings.save": { zh: "保存设置", en: "Save settings" },
  "settings.saved": { zh: "已保存", en: "Saved" },
  "settings.presets": { zh: "预设", en: "Presets" },
  "settings.presetApply": { zh: "使用", en: "Apply" },

  // Playground
  "playground.title": { zh: "Playground", en: "Playground" },
  "playground.subtitle": {
    zh: "选一条 Prompt，填入变量，调用模型。",
    en: "Pick a prompt, fill variables, call the model.",
  },
  "playground.selectPrompt": { zh: "选择 Prompt", en: "Select a prompt" },
  "playground.noPrompts": {
    zh: "还没有 Prompt，先去侧边栏创建一条。",
    en: "No prompts yet. Create one in the sidebar first.",
  },
  "playground.pickPrompt": { zh: "— 请选择 —", en: "— pick one —" },
  "playground.variables": { zh: "变量", en: "Variables" },
  "playground.noVariables": {
    zh: "此 Prompt 无变量。",
    en: "This prompt has no variables.",
  },
  "playground.rendered": { zh: "实际发送内容", en: "Rendered prompt" },
  "playground.run": { zh: "运行", en: "Run" },
  "playground.running": { zh: "运行中…", en: "Running…" },
  "playground.output": { zh: "输出", en: "Output" },
  "playground.noRunYet": {
    zh: "还没有运行。点击上方「运行」按钮调用模型。",
    en: 'No runs yet. Click "Run" above to call the model.',
  },
  "playground.stats": {
    zh: "{model} · 输入 {input} tok · 输出 {output} tok · 耗时 {ms}ms",
    en: "{model} · in {input} tok · out {output} tok · {ms}ms",
  },
  "playground.statsNoTokens": {
    zh: "{model} · 耗时 {ms}ms",
    en: "{model} · {ms}ms",
  },
  "playground.error": { zh: "运行失败", en: "Run failed" },
  "playground.settingsMissing": {
    zh: "尚未配置 API。前往设置 →",
    en: "API is not configured. Go to settings →",
  },
  "playground.history": { zh: "运行历史", en: "Run history" },
  "playground.historyEmpty": {
    zh: "还没有运行记录。",
    en: "No runs yet.",
  },
  "playground.deleteRun": { zh: "删除", en: "Delete" },
  "playground.confirmDeleteRun": {
    zh: "删除这次运行记录？",
    en: "Delete this run?",
  },
  "playground.loadInto": { zh: "回填到 Playground", en: "Load into playground" },

  // Theme
  "theme.dark": { zh: "深色模式", en: "Dark mode" },
  "theme.light": { zh: "浅色模式", en: "Light mode" },

  // Folder
  "form.folder": { zh: "文件夹", en: "Folder" },
  "form.folderPlaceholder": {
    zh: "如：工作 / 写作 / 实验",
    en: "e.g. work / writing / experiments",
  },
  "form.folderHint": {
    zh: "可留空。同名文件夹会自动分组。",
    en: "Optional. Same-name folders are grouped automatically.",
  },
  "sidebar.uncategorized": { zh: "未分类", en: "Uncategorized" },
  "sidebar.search": { zh: "搜索标题或标签", en: "Search title or tags" },
  "sidebar.noResults": { zh: "没有匹配的 Prompt。", en: "No matching prompts." },

  // Import/Export
  "settings.dataTitle": { zh: "数据管理", en: "Data management" },
  "settings.export": { zh: "导出为 JSON", en: "Export JSON" },
  "settings.exportDesc": {
    zh: "下载包含所有 Prompt 的 JSON 文件（含版本历史）。",
    en: "Download a JSON file containing all prompts (with version history).",
  },
  "settings.import": { zh: "导入 JSON", en: "Import JSON" },
  "settings.importDesc": {
    zh: "上传 JSON 文件。重复 id 会被跳过。",
    en: "Upload a JSON file. Duplicate ids are skipped.",
  },
  "settings.importResult": {
    zh: "导入完成：新增 {added}，跳过 {skipped}。",
    en: "Imported: {added} added, {skipped} skipped.",
  },
  "settings.importError": {
    zh: "导入失败：{msg}",
    en: "Import failed: {msg}",
  },

  // Shortcuts
  "shortcuts.title": { zh: "键盘快捷键", en: "Keyboard shortcuts" },
  "shortcuts.newPrompt": { zh: "新建 Prompt", en: "New prompt" },
  "shortcuts.playground": { zh: "打开 Playground", en: "Open playground" },
  "shortcuts.settings": { zh: "打开设置", en: "Open settings" },
  "shortcuts.search": { zh: "聚焦搜索框", en: "Focus search" },
  "shortcuts.help": { zh: "显示此帮助", en: "Show this help" },
  "shortcuts.close": { zh: "关闭弹框", en: "Close dialog" },

  // Browser-native shell
  "app.loading": { zh: "正在打开本地仓库…", en: "Opening your local vault…" },
  "app.storageError": { zh: "无法打开浏览器存储", en: "Browser storage is unavailable" },
  "app.retry": { zh: "重试", en: "Retry" },
  "app.menu": { zh: "打开导航", en: "Open navigation" },
  "app.closeMenu": { zh: "关闭导航", en: "Close navigation" },
  "app.localOnly": { zh: "数据仅保存在此浏览器", en: "Data stays in this browser" },
  "form.error": { zh: "操作失败：{msg}", en: "Operation failed: {msg}" },
  "settings.rememberApiKey": { zh: "在此浏览器中记住 API Key", en: "Remember API key in this browser" },
  "settings.rememberApiKeyHint": {
    zh: "启用后会写入 IndexedDB，可被此页面运行的 JavaScript 读取。仅建议在自己的设备上使用。",
    en: "When enabled, the key is stored in IndexedDB and can be read by JavaScript running on this origin. Use only on your own device.",
  },
  "settings.browserWarning": {
    zh: "这是纯静态 BYOK app。Provider 必须允许 browser CORS；请勿在公共设备保存 API Key。",
    en: "This is a static BYOK app. The provider must allow browser CORS, and API keys should never be saved on shared devices.",
  },
  "settings.storageTitle": { zh: "本地存储", en: "Local storage" },
  "settings.storageDesc": {
    zh: "Prompt、版本和运行记录保存在此网站 origin 的 IndexedDB 中。换浏览器或清除站点数据前请先导出备份。",
    en: "Prompts, versions, and runs live in IndexedDB for this site origin. Export a backup before switching browsers or clearing site data.",
  },
  "notFound.title": { zh: "没有找到这个页面", en: "Page not found" },
  "notFound.home": { zh: "返回首页", en: "Back home" },
} as const satisfies Record<string, Entry>;

export type Key = keyof typeof dict;

export function translate(
  locale: Locale,
  key: Key,
  params?: Record<string, string | number>,
): string {
  let s: string = dict[key][locale] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}
