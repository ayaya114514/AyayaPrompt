import type { Provider } from "@/lib/types";

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

function endpoint(baseURL: string, path: string): string {
  let url: URL;
  try {
    url = new URL(baseURL.replace(/\/$/, "") + path);
  } catch {
    throw new Error("The provider Base URL is invalid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("The provider Base URL must use HTTP or HTTPS");
  }
  return url.toString();
}

async function providerFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("The provider request timed out after 120 seconds");
    }
    if (cause instanceof TypeError) {
      throw new Error("The browser could not reach this provider. Check the Base URL, network, and provider CORS policy.");
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function callModel(options: CallOptions): Promise<CallResult> {
  if (!options.apiKey) throw new Error("API key is not set. Configure it in Settings.");
  if (!options.model) throw new Error("Model is not set.");

  return options.provider === "anthropic"
    ? callAnthropic(options)
    : callOpenAICompatible(options);
}

async function callAnthropic(options: CallOptions): Promise<CallResult> {
  const baseURL = options.baseURL.trim() || "https://api.anthropic.com";
  const response = await providerFetch(endpoint(baseURL, "/v1/messages"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      messages: [{ role: "user", content: options.prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error("Anthropic " + response.status + ": " + body.slice(0, 500));
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    text: data.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("") ?? "",
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

async function callOpenAICompatible(options: CallOptions): Promise<CallResult> {
  if (!options.baseURL.trim()) throw new Error("Base URL is required for OpenAI-compatible providers.");
  const response = await providerFetch(endpoint(options.baseURL, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + options.apiKey,
    },
    body: JSON.stringify({
      model: options.model,
      messages: [{ role: "user", content: options.prompt }],
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error("Provider " + response.status + ": " + body.slice(0, 500));
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
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
    note: "Direct browser access is enabled explicitly. Use a personal key only on a trusted device.",
  },
  {
    label: "OpenRouter",
    provider: "openai-compatible",
    baseURL: "https://openrouter.ai/api/v1",
    modelHint: "anthropic/claude-sonnet-4.5",
    note: "Browser support is provider-controlled; a CORS error will be shown if access is blocked.",
  },
  {
    label: "Groq",
    provider: "openai-compatible",
    baseURL: "https://api.groq.com/openai/v1",
    modelHint: "llama-3.3-70b-versatile",
    note: "Fast OpenAI-compatible endpoint with a free tier.",
  },
  {
    label: "DeepSeek",
    provider: "openai-compatible",
    baseURL: "https://api.deepseek.com/v1",
    modelHint: "deepseek-chat",
    note: "Direct browser access depends on the current provider CORS policy.",
  },
  {
    label: "Google Gemini",
    provider: "openai-compatible",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelHint: "gemini-2.5-flash",
    note: "Uses the Google OpenAI-compatible endpoint.",
  },
  {
    label: "Ollama (local)",
    provider: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    modelHint: "llama3.1",
    note: "The browser may block HTTPS-to-localhost or CORS requests unless Ollama is configured to allow this site.",
  },
];

export type { Provider } from "@/lib/types";
