export type Provider = "anthropic" | "openai-compatible";

export type PromptRecord = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  favorite: boolean;
  folder: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromptVersionRecord = {
  id: string;
  promptId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
};

export type PlaygroundRunRecord = {
  id: string;
  promptId: string | null;
  promptTitle: string;
  renderedPrompt: string;
  variables: Record<string, string>;
  provider: Provider;
  model: string;
  output: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
};

export type AppSettings = {
  id: "singleton";
  provider: Provider;
  baseURL: string;
  apiKey: string;
  model: string;
  rememberApiKey: boolean;
};

export type PromptInput = Pick<
  PromptRecord,
  "title" | "content" | "tags" | "favorite" | "folder"
>;

export type VaultSnapshot = {
  prompts: PromptRecord[];
  versions: PromptVersionRecord[];
  runs: PlaygroundRunRecord[];
  settings: AppSettings;
};
