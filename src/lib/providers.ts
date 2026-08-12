import type { Key } from "@/lib/i18n";
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
  signal?: AbortSignal;
};

export type ProviderErrorCode =
  | "aborted"
  | "apiKeyMissing"
  | "baseUrlMissing"
  | "httpError"
  | "invalidBaseUrl"
  | "invalidProtocol"
  | "insecureTransport"
  | "invalidResponse"
  | "modelMissing"
  | "network"
  | "responseTooLarge"
  | "timeout";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly detail?: string;
  readonly provider?: string;
  readonly status?: number;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { detail?: string; provider?: string; status?: number } = {},
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.detail = options.detail;
    this.provider = options.provider;
    this.status = options.status;
  }
}

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_SUCCESS_BYTES = 2 * 1024 * 1024;
const MAX_ERROR_BYTES = 64 * 1024;

function endpoint(baseURL: string, path: string): string {
  let url: URL;
  try {
    url = new URL(baseURL.replace(/\/$/, "") + path);
  } catch {
    throw new ProviderError("invalidBaseUrl", "The provider Base URL is invalid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProviderError(
      "invalidProtocol",
      "The provider Base URL must use HTTP or HTTPS",
    );
  }
  if (url.protocol === "http:" && !isLocalProviderURL(url.toString())) {
    throw new ProviderError(
      "insecureTransport",
      "Remote provider endpoints must use HTTPS; HTTP is allowed only for loopback hosts",
    );
  }
  return url.toString();
}

export function isLocalProviderURL(baseURL: string): boolean {
  try {
    const { hostname, protocol } = new URL(baseURL);
    if (protocol !== "http:" && protocol !== "https:") return false;
    const host = hostname.toLowerCase();
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

export function providerNeedsApiKey(
  options: Pick<CallOptions, "provider" | "baseURL">,
): boolean {
  return options.provider === "anthropic" || !isLocalProviderURL(options.baseURL);
}

async function readTextLimited(response: Response, limit: number): Promise<string> {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) {
      throw new ProviderError(
        "responseTooLarge",
        `The provider response exceeded ${limit} bytes`,
      );
    }
    return new TextDecoder().decode(bytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      throw new ProviderError(
        "responseTooLarge",
        `The provider response exceeded ${limit} bytes`,
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await readTextLimited(response, MAX_SUCCESS_BYTES);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError(
      "invalidResponse",
      "The provider returned an invalid JSON response",
    );
  }
}

function invalidResponse(): never {
  throw new ProviderError(
    "invalidResponse",
    "The provider returned an invalid response schema",
  );
}

function optionalFiniteNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) invalidResponse();
  return value;
}

async function providerFetch<T>(
  url: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
  handle: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await handle(response);
  } catch (cause) {
    if (cause instanceof ProviderError) throw cause;
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new ProviderError(
          "timeout",
          "The provider request timed out after 120 seconds",
        );
      }
      throw new ProviderError("aborted", "The provider request was cancelled");
    }
    if (cause instanceof TypeError) {
      throw new ProviderError(
        "network",
        "The browser could not reach this provider. Check the Base URL, network, and provider CORS policy.",
      );
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function callModel(options: CallOptions): Promise<CallResult> {
  if (providerNeedsApiKey(options) && !options.apiKey) {
    throw new ProviderError(
      "apiKeyMissing",
      "API key is not set. Configure it in Settings.",
    );
  }
  if (!options.model) {
    throw new ProviderError("modelMissing", "Model is not set.");
  }

  return options.provider === "anthropic"
    ? callAnthropic(options)
    : callOpenAICompatible(options);
}

async function callAnthropic(options: CallOptions): Promise<CallResult> {
  const baseURL = options.baseURL.trim() || "https://api.anthropic.com";
  return providerFetch(
    endpoint(baseURL, "/v1/messages"),
    {
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
    },
    options.signal,
    async (response) => {
      if (!response.ok) {
        const detail = (await readTextLimited(response, MAX_ERROR_BYTES)).slice(0, 500);
        throw new ProviderError(
          "httpError",
          `Anthropic ${response.status}: ${detail}`,
          { detail, provider: "Anthropic", status: response.status },
        );
      }

      const data = await readJson<unknown>(response);
      if (!data || typeof data !== "object") invalidResponse();
      const payload = data as Record<string, unknown>;
      if (!Array.isArray(payload.content)) invalidResponse();
      const textBlocks = payload.content.filter((block): block is Record<string, unknown> =>
        Boolean(block) && typeof block === "object" && (block as Record<string, unknown>).type === "text",
      );
      if (
        textBlocks.length === 0 ||
        textBlocks.some((block) => typeof block.text !== "string")
      ) invalidResponse();
      const usage = payload.usage;
      if (usage !== undefined && (!usage || typeof usage !== "object")) {
        invalidResponse();
      }
      const usageRecord = usage as Record<string, unknown> | undefined;
      return {
        text: textBlocks.map((block) => block.text as string).join(""),
        inputTokens: optionalFiniteNumber(usageRecord?.input_tokens),
        outputTokens: optionalFiniteNumber(usageRecord?.output_tokens),
      };
    },
  );
}

async function callOpenAICompatible(options: CallOptions): Promise<CallResult> {
  if (!options.baseURL.trim()) {
    throw new ProviderError(
      "baseUrlMissing",
      "Base URL is required for OpenAI-compatible providers.",
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.apiKey) headers.Authorization = "Bearer " + options.apiKey;

  return providerFetch(
    endpoint(options.baseURL, "/chat/completions"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: options.prompt }],
        max_tokens: options.maxTokens ?? 4096,
      }),
    },
    options.signal,
    async (response) => {
      if (!response.ok) {
        const detail = (await readTextLimited(response, MAX_ERROR_BYTES)).slice(0, 500);
        throw new ProviderError(
          "httpError",
          `Provider ${response.status}: ${detail}`,
          { detail, provider: "Provider", status: response.status },
        );
      }

      const data = await readJson<unknown>(response);
      if (!data || typeof data !== "object") invalidResponse();
      const payload = data as Record<string, unknown>;
      if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
        invalidResponse();
      }
      const choice = payload.choices[0];
      if (!choice || typeof choice !== "object") invalidResponse();
      const message = (choice as Record<string, unknown>).message;
      if (!message || typeof message !== "object") invalidResponse();
      const content = (message as Record<string, unknown>).content;
      if (typeof content !== "string") invalidResponse();
      const usage = payload.usage;
      if (usage !== undefined && (!usage || typeof usage !== "object")) {
        invalidResponse();
      }
      const usageRecord = usage as Record<string, unknown> | undefined;
      return {
        text: content,
        inputTokens: optionalFiniteNumber(usageRecord?.prompt_tokens),
        outputTokens: optionalFiniteNumber(usageRecord?.completion_tokens),
      };
    },
  );
}

export const PROVIDER_PRESETS: Array<{
  label: string;
  provider: Provider;
  baseURL: string;
  modelHint: string;
  noteKey: Key;
}> = [
  {
    label: "Anthropic",
    provider: "anthropic",
    baseURL: "https://api.anthropic.com",
    modelHint: "claude-sonnet-4-5",
    noteKey: "provider.noteAnthropic",
  },
  {
    label: "OpenRouter",
    provider: "openai-compatible",
    baseURL: "https://openrouter.ai/api/v1",
    modelHint: "anthropic/claude-sonnet-4.5",
    noteKey: "provider.noteOpenRouter",
  },
  {
    label: "Groq",
    provider: "openai-compatible",
    baseURL: "https://api.groq.com/openai/v1",
    modelHint: "llama-3.3-70b-versatile",
    noteKey: "provider.noteGroq",
  },
  {
    label: "DeepSeek",
    provider: "openai-compatible",
    baseURL: "https://api.deepseek.com/v1",
    modelHint: "deepseek-chat",
    noteKey: "provider.noteDeepSeek",
  },
  {
    label: "Google Gemini",
    provider: "openai-compatible",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelHint: "gemini-2.5-flash",
    noteKey: "provider.noteGemini",
  },
  {
    label: "Ollama (local)",
    provider: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    modelHint: "llama3.1",
    noteKey: "provider.noteOllama",
  },
];

export type { Provider } from "@/lib/types";
