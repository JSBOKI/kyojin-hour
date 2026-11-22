import { normKey } from "./kana";
import type { GlossaryEntry, RawToken } from "./types";

export type MergedToken =
  | { kind: "raw"; raw: RawToken }
  | { kind: "glossary"; surface: string; entry: GlossaryEntry };

type FormRef = { entry: GlossaryEntry; norm: string };

/**
 * Longest glossary form wins, so エレン・イェーガー stays one name
 * and 巨人 inside 超大型巨人 does not take the shorter gloss.
 */
export function applyGlossary(tokens: RawToken[], glossary: GlossaryEntry[]): MergedToken[] {
  const forms: FormRef[] = [];
  for (const entry of glossary) {
    for (const form of entry.forms) {
      const norm = normKey(form);
      if (norm) forms.push({ entry, norm });
    }
  }
  forms.sort((a, b) => b.norm.length - a.norm.length);

  const merged: MergedToken[] = [];
  let index = 0;
  while (index < tokens.length) {
    const hit = matchAt(tokens, index, forms);
    if (hit) {
      merged.push({
        kind: "glossary",
        surface: tokens
          .slice(index, hit.end)
          .map((token) => token.surface)
          .join(""),
        entry: hit.entry,
      });
      index = hit.end;
      continue;
    }
    merged.push({ kind: "raw", raw: tokens[index] });
    index += 1;
  }
  return merged;
}

function matchAt(
  tokens: RawToken[],
  start: number,
  forms: FormRef[],
): { end: number; entry: GlossaryEntry } | null {
  for (const form of forms) {
    const end = consume(tokens, start, form.norm);
    if (end != null) return { end, entry: form.entry };
  }
  return null;
}

function consume(tokens: RawToken[], start: number, target: string): number | null {
  let acc = "";
  for (let index = start; index < tokens.length; index += 1) {
    const piece = normKey(tokens[index].surface);
    if (!piece) {
      if (acc && target.startsWith(acc) && acc.length < target.length) continue;
      return null;
    }
    acc += piece;
    if (acc === target) return index + 1;
    if (!target.startsWith(acc)) return null;
  }
  return null;
}

export function glossaryPrompt(entries: GlossaryEntry[], texts: string[]): string {
  const blob = texts.join("\n");
  const used = entries.filter((entry) => entry.forms.some((form) => form && blob.includes(form)));
  return used.map((entry) => `${entry.forms[0]} = ${entry.english}`).join("\n");
}
