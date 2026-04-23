const VAR_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractVariables(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = Array.from(content.matchAll(VAR_RE));
  for (const m of matches) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function fillVariables(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(VAR_RE, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? values[name]
      : `{{${name}}}`,
  );
}
