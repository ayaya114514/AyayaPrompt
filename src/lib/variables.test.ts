import { describe, expect, it } from "vitest";
import { extractVariables, fillVariables } from "@/lib/variables";

describe("prompt variables", () => {
  it("extracts unique valid variables in source order", () => {
    expect(extractVariables("Hi {{ name }}, {{topic}} and {{name}}"))
      .toEqual(["name", "topic"]);
  });

  it("fills known variables and preserves missing placeholders", () => {
    expect(fillVariables("{{greeting}}, {{name}}!", { greeting: "Hello" }))
      .toBe("Hello, {{name}}!");
  });
});
