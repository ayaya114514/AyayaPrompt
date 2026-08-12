import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callModel,
  ProviderError,
  providerNeedsApiKey,
} from "@/lib/providers";

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

    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
  });
});
