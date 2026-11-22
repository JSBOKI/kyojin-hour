import { execFile } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { kataToHira } from "../src/lib/kana";
import type { DictSense, RawToken } from "../src/lib/types";

const execFileAsync = promisify(execFile);

const COMMON_URL =
  "https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20261116213322/jmdict-eng-common-3.6.2%2B20261116213322.json.tgz";

type Compact = {
  id: string;
  kanji: string[];
  kana: { text: string; applies: string[] }[];
  glosses: string[];
  pos: string[];
  common: boolean;
};

export async function loadDictionary(root: string): Promise<(token: RawToken) => DictSense | null> {
  const cacheDir = path.join(root, "data/cache");
  mkdirSync(cacheDir, { recursive: true });
  const jsonPath = path.join(cacheDir, "jmdict-eng-common.json");
  if (!existsSync(jsonPath) || readFileSync(jsonPath).length < 1000) {
    await downloadDictionary(cacheDir, jsonPath);
  }
  const parsed = JSON.parse(await readFile(jsonPath, "utf8")) as {
    words: {
      id: string;
      kanji?: { text: string; common?: boolean }[];
      kana?: { text: string; common?: boolean; appliesToKanji?: string[] }[];
      sense?: { partOfSpeech?: string[]; gloss?: { lang?: string; text?: string }[] }[];
    }[];
  };
  const index = new Map<string, Compact[]>();
  for (const word of parsed.words) {
    const glosses = (word.sense ?? [])
      .flatMap((sense) => sense.gloss ?? [])
      .filter((gloss) => gloss.lang === "eng" && gloss.text)
      .map((gloss) => gloss.text as string)
      .slice(0, 3);
    if (!glosses.length) continue;
    const entry: Compact = {
      id: word.id,
      kanji: (word.kanji ?? []).map((item) => item.text),
      kana: (word.kana ?? []).map((item) => ({
        text: kataToHira(item.text),
        applies: item.appliesToKanji ?? ["*"],
      })),
      glosses,
      pos: [...new Set((word.sense ?? []).flatMap((sense) => sense.partOfSpeech ?? []))].slice(0, 4),
      common: (word.kanji ?? []).some((item) => item.common) || (word.kana ?? []).some((item) => item.common),
    };
    for (const key of [...entry.kanji, ...entry.kana.map((item) => item.text)]) {
      const bucket = index.get(key) ?? [];
      if (!bucket.some((item) => item.id === entry.id)) bucket.push(entry);
      index.set(key, bucket);
    }
  }

  return (token) => lookup(index, token);
}

function lookup(index: Map<string, Compact[]>, token: RawToken): DictSense | null {
  const lemma = token.lemma && token.lemma !== "*" ? token.lemma : token.surface;
  const reading = kataToHira(token.reading || "");
  const hits = index.get(lemma) ?? index.get(token.surface) ?? (reading ? index.get(reading) : undefined) ?? [];
  if (!hits.length) return null;
  const ranked = [...hits].sort((a, b) => score(b, token, lemma, reading) - score(a, token, lemma, reading));
  const best = ranked[0];
  const matched = best.kanji.find((text) => text === lemma || text === token.surface) ?? best.kanji[0] ?? best.kana[0]?.text ?? lemma;
  const readingHit =
    best.kana.find((item) => item.applies.includes("*") || item.applies.includes(matched))?.text ??
    best.kana[0]?.text ??
    reading;
  return {
    lemma: matched,
    reading: readingHit,
    glosses: best.glosses,
    pos: best.pos,
  };
}

function score(entry: Compact, token: RawToken, lemma: string, reading: string): number {
  let value = entry.common ? 10 : 0;
  if (entry.kanji.includes(lemma) || entry.kanji.includes(token.surface)) value += 6;
  if (entry.kana.some((item) => item.text === reading)) value += 4;
  if (token.pos === "動詞" && entry.pos.some((pos) => pos.startsWith("v"))) value += 3;
  if (token.pos === "名詞" && entry.pos.some((pos) => pos === "n" || pos.startsWith("n-"))) value += 2;
  if (token.pos === "助詞" && entry.pos.includes("prt")) value += 5;
  if (token.pos === "形容詞" && entry.pos.some((pos) => pos.startsWith("adj-i"))) value += 3;
  return value;
}

async function downloadDictionary(cacheDir: string, jsonPath: string) {
  const archive = path.join(cacheDir, "jmdict-eng-common.json.tgz");
  console.log("Downloading the common JMdict slice (about 1.4 MB)…");
  const response = await fetch(COMMON_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download JMdict: ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body as import("stream/web").ReadableStream), createWriteStream(archive));
  await execFileAsync("tar", ["-xzf", archive, "-C", cacheDir]);
  const extracted = readdirSync(cacheDir).find((name) => name.startsWith("jmdict-eng-common") && name.endsWith(".json"));
  if (!extracted) throw new Error("JMdict archive did not contain a JSON file.");
  if (path.join(cacheDir, extracted) !== jsonPath) {
    const { renameSync } = await import("node:fs");
    renameSync(path.join(cacheDir, extracted), jsonPath);
  }
}
