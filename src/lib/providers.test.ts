import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callModel,
  DEFAULT_ANTHROPIC_MAX_TOKENS,
  endpoint,
  isLocalProviderURL,
  ProviderError,
  providerNeedsApiKey,
  REQUEST_TIMEOUT_MS,
} from "@/lib/providers";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("browser provider requests", () => {
  it("allows an unauthenticated loopback endpoint and omits Authorization", async () => {
    let requestInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        requestInit = init;
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "local answer" } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    await expect(
      callModel({
        provider: "openai-compatible",
        baseURL: "http://127.0.0.1:11434/v1",
        apiKey: "",
        model: "local-model",
        prompt: "hello",
      }),
    ).resolves.toMatchObject({ text: "local answer" });

    expect(requestInit?.headers).toEqual({ "Content-Type": "application/json" });
    expect(
      providerNeedsApiKey({
        provider: "openai-compatible",
        baseURL: "http://localhost:11434/v1",
      }),
    ).toBe(false);
  });

  it("still requires credentials for a remote endpoint", async () => {
    await expect(
      callModel({
        provider: "openai-compatible",
        baseURL: "https://example.com/v1",
        apiKey: "",
        model: "remote-model",
        prompt: "hello",
      }),
    ).rejects.toMatchObject({ code: "apiKeyMissing" } satisfies Partial<ProviderError>);
  });

  it("refuses to send a credential over remote HTTP", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callModel({
        provider: "openai-compatible",
        baseURL: "http://example.com/v1",
        apiKey: "must-not-leak",
        model: "remote-model",
        prompt: "hello",
      }),
    ).rejects.toMatchObject({
      code: "insecureTransport",
    } satisfies Partial<ProviderError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed success payload as an invalid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      })),
    );

    await expect(
      callModel({
        provider: "openai-compatible",
        baseURL: "https://example.com/v1",
        apiKey: "secret",
        model: "remote-model",
        prompt: "hello",
      }),
    ).rejects.toMatchObject({
      code: "invalidResponse",
    } satisfies Partial<ProviderError>);
  });

  it("keeps the timeout active while the response body is streaming", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const signal = init?.signal;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            signal?.addEventListener(
              "abort",
              () => controller.error(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
            controller.enqueue(
              new TextEncoder().encode(
                '{"choices":[{"message":{"content":"never finishes"}}]}',
              ),
            );
          },
        });
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const request = callModel({
      provider: "openai-compatible",
      baseURL: "https://example.com/v1",
      apiKey: "secret",
      model: "remote-model",
      prompt: "hello",
    });
    const assertion = expect(request).rejects.toMatchObject({
      code: "timeout",
    } satisfies Partial<ProviderError>);

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it("joins endpoint paths before any Base URL query string", () => {
    expect(endpoint("https://example.com/v1/?api-version=1#frag", "/chat/completions"))
      .toBe("https://example.com/v1/chat/completions?api-version=1");
    expect(endpoint(" https://api.anthropic.com ", "/v1/messages"))
      .toBe("https://api.anthropic.com/v1/messages");
    expect(() => endpoint("not a url", "/x")).toThrow(ProviderError);
    expect(() => endpoint("ftp://example.com", "/x")).toThrowError(
      expect.objectContaining({ code: "invalidProtocol" }),
    );
  });

  it("only treats CSP-reachable hosts as loopback", () => {
    expect(isLocalProviderURL("http://localhost:11434/v1")).toBe(true);
    expect(isLocalProviderURL("http://ollama.localhost:11434/v1")).toBe(true);
    expect(isLocalProviderURL("http://127.0.0.1:8080")).toBe(true);
    expect(isLocalProviderURL("http://[::1]:11434/v1")).toBe(false);
    expect(isLocalProviderURL("file:///tmp")).toBe(false);
    expect(isLocalProviderURL("::")).toBe(false);
  });

  it("sends the Anthropic default max_tokens and parses text plus usage", async () => {
    let body: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));
        headers = init?.headers as Record<string, string>;
        return jsonResponse({
          content: [
            { type: "thinking", thinking: "" },
            { type: "text", text: "Hello" },
            { type: "text", text: " world" },
          ],
          usage: { input_tokens: 3, output_tokens: 2 },
        });
      }),
    );

    await expect(callModel({
      provider: "anthropic",
      baseURL: "https://api.anthropic.com",
      apiKey: "sk-ant",
      model: "claude-sonnet-5",
      prompt: "hi",
    })).resolves.toEqual({ text: "Hello world", inputTokens: 3, outputTokens: 2 });
    expect(body.max_tokens).toBe(DEFAULT_ANTHROPIC_MAX_TOKENS);
    expect(headers["x-api-key"]).toBe("sk-ant");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("omits max_tokens for OpenAI-compatible providers unless configured", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({
          choices: [{ message: { content: "ok" } }],
          usage: { prompt_tokens: 5, completion_tokens: 1 },
        });
      }),
    );
    const base = {
      provider: "openai-compatible" as const,
      baseURL: "https://example.com/v1",
      apiKey: "secret",
      model: "m",
      prompt: "hi",
    };

    await expect(callModel(base)).resolves.toEqual({ text: "ok", inputTokens: 5, outputTokens: 1 });
    await callModel({ ...base, maxTokens: 2048 });
    expect(bodies[0]).not.toHaveProperty("max_tokens");
    expect(bodies[1].max_tokens).toBe(2048);
  });

  it("reports HTTP errors with a truncated provider detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(900), { status: 429 })));

    const failure = await callModel({
      provider: "openai-compatible",
      baseURL: "https://example.com/v1",
      apiKey: "secret",
      model: "m",
      prompt: "hi",
    }).catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(ProviderError);
    expect(failure).toMatchObject({ code: "httpError", status: 429 });
    expect((failure as ProviderError).detail).toHaveLength(500);
  });

  it("maps fetch TypeErrors and caller aborts to provider error codes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const options = {
      provider: "openai-compatible" as const,
      baseURL: "https://example.com/v1",
      apiKey: "secret",
      model: "m",
      prompt: "hi",
    };
    await expect(callModel(options)).rejects.toMatchObject({ code: "network" });

    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return jsonResponse({});
    }));
    await expect(callModel({ ...options, signal: controller.signal }))
      .rejects.toMatchObject({ code: "aborted" });
  });

  it("requires a model and a Base URL", async () => {
    await expect(callModel({
      provider: "openai-compatible",
      baseURL: "https://example.com/v1",
      apiKey: "secret",
      model: "",
      prompt: "hi",
    })).rejects.toMatchObject({ code: "modelMissing" });
    await expect(callModel({
      provider: "openai-compatible",
      baseURL: "  ",
      apiKey: "secret",
      model: "m",
      prompt: "hi",
    })).rejects.toMatchObject({ code: "baseUrlMissing" });
  });
});
