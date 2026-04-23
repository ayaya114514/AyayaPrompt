export type Provider = "anthropic" | "openai-compatible";

export type CallResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type CallOptions = {
  provider: Provider;
  baseURL: string;
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens?: number;
};

export async function callModel(opts: CallOptions): Promise<CallResult> {
  if (!opts.apiKey) throw new Error("API key is not set. Configure it in Settings.");
  if (!opts.model) throw new Error("Model is not set.");

  return opts.provider === "anthropic"
    ? callAnthropic(opts)
    : callOpenAICompatible(opts);
}

async function callAnthropic(opts: CallOptions): Promise<CallResult> {
  const base =
    (opts.baseURL && opts.baseURL.trim()) || "https://api.anthropic.com";
  const url = `${base.replace(/\/$/, "")}/v1/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 500)}`);
  }

  const data: {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  } = await res.json();

  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("") ?? "";

  return {
    text,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

async function callOpenAICompatible(opts: CallOptions): Promise<CallResult> {
  if (!opts.baseURL) {
    throw new Error("Base URL is required for OpenAI-compatible providers.");
  }
  const url = `${opts.baseURL.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: opts.prompt }],
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Provider ${res.status}: ${body.slice(0, 500)}`);
  }

  const data: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } = await res.json();

  const text = data.choices?.[0]?.message?.content ?? "";

  return {
    text,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

export const PROVIDER_PRESETS: Array<{
  label: string;
  provider: Provider;
  baseURL: string;
  modelHint: string;
  note: string;
}> = [
  {
    label: "Anthropic",
    provider: "anthropic",
    baseURL: "https://api.anthropic.com",
    modelHint: "claude-sonnet-4-5",
    note: "Official Anthropic API (paid, new accounts get $5 credit).",
  },
  {
    label: "OpenRouter",
    provider: "openai-compatible",
    baseURL: "https://openrouter.ai/api/v1",
    modelHint: "anthropic/claude-sonnet-4.5",
    note: "Aggregator: one key for many models. Some models marked :free.",
  },
  {
    label: "Groq",
    provider: "openai-compatible",
    baseURL: "https://api.groq.com/openai/v1",
    modelHint: "llama-3.3-70b-versatile",
    note: "Free tier, very fast. No Claude models.",
  },
  {
    label: "DeepSeek",
    provider: "openai-compatible",
    baseURL: "https://api.deepseek.com/v1",
    modelHint: "deepseek-chat",
    note: "Very cheap, accessible in mainland China.",
  },
  {
    label: "Ollama (local)",
    provider: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    modelHint: "llama3.1",
    note: "Run models locally. Leave apiKey as any non-empty string (e.g. 'ollama').",
  },
  {
    label: "Google Gemini",
    provider: "openai-compatible",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelHint: "gemini-2.0-flash",
    note: "Generous free tier. May need a proxy in mainland China.",
  },
];
