import { grammarNote, posLabel } from "./grammar";
import { applyGlossary } from "./glossary";
import { furigana } from "./furigana";
import { kataToHira } from "./kana";
import type { DictSense, GlossaryEntry, RawToken, RubySegment } from "./types";

export type AnnotatedToken = {
  surface: string;
  reading: string;
  lemma: string;
  pos: string;
  posLabel: string;
  grammar: string | null;
  meaning: string | null;
  senses: string[];
  source: "glossary" | "dictionary" | "none";
  note: string | null;
  rubies: RubySegment[];
  key: boolean;
};

export type VocabItem = {
  id: string;
  lemma: string;
  reading: string;
  meaning: string;
  posLabel: string;
  note: string | null;
  count: number;
  exampleJa: string;
  exampleEn: string;
  source: "glossary" | "dictionary";
};

const STOP = new Set([
  "する",
  "いる",
  "ある",
  "なる",
  "こと",
  "もの",
  "ため",
  "よう",
  "ところ",
  "さん",
  "これ",
  "それ",
  "あれ",
  "ここ",
  "そこ",
  "私",
  "僕",
  "俺",
  "の",
  "ん",
]);

const KEY_POS = new Set(["名詞", "動詞", "形容詞", "形容動詞", "副詞"]);

export function annotateParagraph(
  rawTokens: RawToken[],
  glossary: GlossaryEntry[],
  define: (token: RawToken) => DictSense | null,
  extraNotes: Record<string, string> = {},
): AnnotatedToken[] {
  return applyGlossary(rawTokens, glossary).map((merged) => {
    if (merged.kind === "glossary") {
      const reading = kataToHira(merged.entry.reading);
      const note = [merged.entry.note, extraNotes[merged.entry.forms[0]]].filter(Boolean).join(" ");
      return {
        surface: merged.surface,
        reading,
        lemma: merged.entry.forms[0],
        pos: "名詞",
        posLabel: merged.entry.kind === "character" ? "name" : merged.entry.kind === "place" ? "place" : "series term",
        grammar: null,
        meaning: merged.entry.english,
        senses: [],
        source: "glossary" as const,
        note: note || null,
        rubies: furigana(merged.surface, reading),
        key: true,
      };
    }
    const token = merged.raw;
    const sense = define(token);
    const reading = kataToHira(token.reading || sense?.reading || "");
    const lemma = sense?.lemma || token.lemma || token.surface;
    const meaning = sense?.glosses[0] ?? null;
    const note = extraNotes[lemma] ?? extraNotes[token.surface] ?? null;
    const key =
      !STOP.has(lemma) &&
      !STOP.has(token.surface) &&
      token.pos !== "記号" &&
      token.pos !== "助詞" &&
      token.pos !== "助動詞" &&
      (KEY_POS.has(token.pos) || Boolean(note));
    return {
      surface: token.surface,
      reading,
      lemma,
      pos: token.pos,
      posLabel: posLabel(token.pos),
      grammar: grammarNote({
        surface: token.surface,
        lemma: token.lemma,
        pos: token.pos,
        conjugation: token.conjugation,
      }),
      meaning,
      senses: sense?.glosses.slice(1, 3) ?? [],
      source: meaning ? ("dictionary" as const) : ("none" as const),
      note,
      rubies: furigana(token.surface, reading),
      key: Boolean(key && (meaning || note)),
    };
  });
}

export function collectVocab(
  segments: { ja: string; en: string; tokens: AnnotatedToken[] }[],
): VocabItem[] {
  const map = new Map<string, VocabItem>();
  for (const segment of segments) {
    for (const token of segment.tokens) {
      if (!token.key || !token.meaning) continue;
      const id = `${token.source}:${token.lemma}`;
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
        continue;
      }
      map.set(id, {
        id,
        lemma: token.lemma,
        reading: token.reading,
        meaning: token.meaning,
        posLabel: token.posLabel,
        note: token.note,
        count: 1,
        exampleJa: sentenceWith(segment.ja, token.surface),
        exampleEn: segment.en,
        source: token.source === "glossary" ? "glossary" : "dictionary",
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === "glossary" ? -1 : 1;
    return b.count - a.count || a.lemma.localeCompare(b.lemma, "ja");
  });
}

function sentenceWith(paragraph: string, surface: string): string {
  const parts = paragraph.split(/(?<=。)/);
  const found = parts.find((part) => part.includes(surface));
  return (found ?? paragraph).trim();
}

export function vocabToCsv(items: VocabItem[], episodeId: string): string {
  const header = ["Japanese", "Reading", "English", "Notes", "Example", "Episode", "Tags"];
  const rows = items.map((item) => [
    item.lemma,
    item.reading,
    item.meaning,
    item.note ?? "",
    item.exampleJa,
    episodeId,
    `aot ${episodeId}`,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function vocabToCards(items: VocabItem[], episodeId: string) {
  return items.map((item) => ({
    id: `${episodeId}:${item.id}`,
    front: `${escapeHtml(item.lemma)}<br><span style="font-size:20px">${escapeHtml(item.reading)}</span>`,
    back: [
      escapeHtml(item.meaning),
      item.note ? `<br><br>${escapeHtml(item.note)}` : "",
      `<br><br>${escapeHtml(item.exampleJa)}`,
    ].join(""),
    tags: ["aot", episodeId],
  }));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
