import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { annotateParagraph, vocabToCsv } from "../src/lib/annotate";
import { applyGlossary } from "../src/lib/glossary";
import { episodePosition, positionAfterLanguageSwitch } from "../src/lib/player-time";
import { findVerbatimOverlap } from "../src/lib/verbatim";
import type { GlossaryEntry, RawToken } from "../src/lib/types";
import { episode } from "../content/episodes/s01e11";

const glossary: GlossaryEntry[] = [
  {
    id: "eren-full",
    kind: "character",
    forms: ["エレン・イェーガー"],
    reading: "エレン・イェーガー",
    english: "Eren Jaeger",
  },
  { id: "eren", kind: "character", forms: ["エレン"], reading: "エレン", english: "Eren" },
  { id: "titan", kind: "term", forms: ["巨人"], reading: "きょじん", english: "Titan" },
];

describe("language switch keeps the scene fraction", () => {
  it("maps the middle of a Japanese scene onto the English scene", () => {
    expect(positionAfterLanguageSwitch(30, 60, 90)).toBe(45);
  });

  it("adds up episode time across scenes", () => {
    expect(episodePosition([60, 40], 1, 10)).toEqual({ current: 70, total: 100 });
  });
});

describe("glossary", () => {
  it("keeps a full name together and ahead of the short name", () => {
    const tokens: RawToken[] = [
      { surface: "エレン", pos: "名詞", posDetail: "固有名詞", conjugation: "*", lemma: "エレン", reading: null },
      { surface: "・", pos: "記号", posDetail: "一般", conjugation: "*", lemma: "・", reading: null },
      { surface: "イェーガー", pos: "名詞", posDetail: "固有名詞", conjugation: "*", lemma: "イェーガー", reading: null },
      { surface: "は", pos: "助詞", posDetail: "係助詞", conjugation: "*", lemma: "は", reading: "ハ" },
    ];
    const merged = applyGlossary(tokens, glossary);
    expect(merged[0]).toMatchObject({ kind: "glossary", surface: "エレン・イェーガー" });
    expect(merged).toHaveLength(2);
  });

  it("uses the series rendering for 巨人", () => {
    const tokens = annotateParagraph(
      [{ surface: "巨人", pos: "名詞", posDetail: "一般", conjugation: "*", lemma: "巨人", reading: "キョジン" }],
      glossary,
      () => ({ lemma: "巨人", reading: "きょじん", glosses: ["giant"], pos: ["n"] }),
    );
    expect(tokens[0].meaning).toBe("Titan");
    expect(tokens[0].source).toBe("glossary");
    expect(tokens[0].rubies[0]?.reading).toBe("きょじん");
  });
});

describe("copyright guard", () => {
  it("flags a copied subtitle line and ignores a short shared word", () => {
    const script = "エレンは岩を運ぶと決めました。";
    expect(findVerbatimOverlap(script, ["エレンは岩を運ぶと決めました。"], 10)).toHaveLength(1);
    expect(findVerbatimOverlap(script, ["エレン"], 16)).toHaveLength(0);
  });

  it("does not reuse known episode 11 subtitle lines", () => {
    const script = episode.segments.map((segment) => `${segment.ja}\n${segment.en}`).join("\n");
    const banned = [
      "彼は人類の敵ではありません",
      "850年",
      "同士である兵士",
      "Eren is not a foe of humanity",
      "I've always been one of you",
      "heart of a lion",
    ];
    for (const line of banned) expect(script.includes(line)).toBe(false);
  });
});

describe("vocab export", () => {
  it("quotes commas in csv cells", () => {
    const csv = vocabToCsv(
      [
        {
          id: "glossary:巨人",
          lemma: "巨人",
          reading: "きょじん",
          meaning: "Titan, the giant",
          posLabel: "series term",
          note: null,
          count: 2,
          exampleJa: "巨人は壁の外にいます。",
          exampleEn: "Titans are outside.",
          source: "glossary",
        },
      ],
      "s01e11",
    );
    expect(csv).toContain('"Titan, the giant"');
    expect(csv.startsWith("Japanese,Reading,English")).toBe(true);
  });
});

describe("published episode", () => {
  it("has scene audio and stays clear of raw subtitle files", () => {
    const file = path.join(process.cwd(), "public/episodes/s01e11.json");
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      return;
    }
    const episodeJson = JSON.parse(text) as {
      segments: { jaAudio: string; enAudio: string; jaDuration: number }[];
      personalUse: string;
    };
    expect(episodeJson.segments.length).toBeGreaterThanOrEqual(8);
    expect(episodeJson.segments[0].jaAudio).toMatch(/\.mp3$/);
    expect(episodeJson.segments[0].enAudio).toMatch(/\.mp3$/);
    expect(text.includes("[Script Info]")).toBe(false);
    expect(text.includes("-->")).toBe(false);
    const jaSeconds = episodeJson.segments.reduce((sum, segment) => sum + segment.jaDuration, 0);
    expect(jaSeconds).toBeGreaterThan(7 * 60);
    expect(jaSeconds).toBeLessThan(14 * 60);
  });
});
