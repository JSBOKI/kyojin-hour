import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { annotateParagraph, collectVocab } from "../src/lib/annotate";
import { classifyCues } from "../src/lib/filter-cues";
import { parseAss } from "../src/lib/parse-ass";
import { parseSrt } from "../src/lib/parse-srt";
import type { EpisodeSource, SeriesCatalog } from "../src/lib/source";
import type { GlossaryEntry, RawToken } from "../src/lib/types";
import { findVerbatimOverlap } from "../src/lib/verbatim";
import { loadDictionary } from "./dictionary";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const JA_VOICE = "ja-JP-NanamiNeural";
const EN_VOICE = "en-US-GuyNeural";

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
  const id = args[0] ?? "s01e11";
  if (!/^s\d{2}e\d{2}$/.test(id)) {
    throw new Error(`Episode id must look like s01e11. Received ${id}`);
  }

  const catalog = JSON.parse(readFileSync(path.join(root, "data/series.json"), "utf8")) as SeriesCatalog;
  const meta = catalog.seasons.flatMap((season) => season.episodes).find((episode) => episode.id === id);
  if (!meta) throw new Error(`No ${id} entry in data/series.json. Add the episode there first.`);

  const sourcePath = path.join(root, "content/episodes", `${id}.ts`);
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Missing original script at content/episodes/${id}.ts. Write the retelling, then run this command again.`,
    );
  }
  const loaded = (await import(pathToFileURL(sourcePath).href)) as { episode: EpisodeSource };
  const source = loaded.episode;
  if (source.id !== id) throw new Error(`Script id is ${source.id}, expected ${id}.`);

  const glossaryFile = JSON.parse(readFileSync(path.join(root, "data/glossary.json"), "utf8")) as {
    entries: GlossaryEntry[];
  };
  const scriptText = source.segments.map((segment) => `${segment.ja}\n${segment.en}`).join("\n");
  const privateCues = await loadPrivateCues(id, meta.privateSubs);
  if (privateCues) {
    const hits = findVerbatimOverlap(scriptText, privateCues.cues, 16);
    if (hits.length) {
      const preview = hits.slice(0, 5).map((hit) => hit.slice(0, 40)).join(" | ");
      throw new Error(
        `The original script repeats ${hits.length} private subtitle line(s). Rewrite those sentences. First hits: ${preview}`,
      );
    }
    reportMissingVocabulary(privateCues.lemmas, scriptText);
    console.log(`Private subtitle check passed (${privateCues.cues.length} cues kept in memory only).`);
  } else {
    console.log("No private subtitles on disk. Skipping the verbatim check.");
  }

  console.log("Loading tokenizer and dictionary…");
  const tokenize = await loadTokenizer();
  const define = await loadDictionary(root);
  const notes = source.notes ?? {};
  const segments = source.segments.map((segment) => {
    const tokens = annotateParagraph(tokenize(segment.ja), glossaryFile.entries, define, notes);
    return { ...segment, tokens };
  });
  const vocab = collectVocab(segments).filter(
    (item) => item.source === "glossary" || item.count >= 2 || Boolean(item.note),
  );

  const audioDir = path.join(root, "public/audio", id);
  mkdirSync(audioDir, { recursive: true });
  const jaVoice = source.jaVoice || JA_VOICE;
  const enVoice = source.enVoice || EN_VOICE;
  const withAudio = [];
  for (const segment of segments) {
    const jaFile = path.join(audioDir, `ja-${segment.id}.mp3`);
    const enFile = path.join(audioDir, `en-${segment.id}.mp3`);
    if (!flags.has("--no-audio") && (flags.has("--audio") || !existsSync(jaFile))) {
      await speak(segment.ja, jaVoice, jaFile);
    }
    if (!flags.has("--no-audio") && (flags.has("--audio") || !existsSync(enFile))) {
      await speak(segment.en, enVoice, enFile);
    }
    const jaDuration = existsSync(jaFile) ? await durationOf(jaFile) : 0;
    const enDuration = existsSync(enFile) ? await durationOf(enFile) : 0;
    console.log(
      `  ${segment.id}  JA ${jaDuration.toFixed(1)}s  EN ${enDuration.toFixed(1)}s  ${segment.titleEn}`,
    );
    withAudio.push({
      ...segment,
      jaAudio: `/audio/${id}/ja-${segment.id}.mp3`,
      enAudio: `/audio/${id}/en-${segment.id}.mp3`,
      jaDuration,
      enDuration,
    });
  }

  const jaSeconds = Math.round(withAudio.reduce((sum, segment) => sum + segment.jaDuration, 0));
  const enSeconds = Math.round(withAudio.reduce((sum, segment) => sum + segment.enDuration, 0));
  const published = {
    id: source.id,
    season: source.season,
    episode: source.episode,
    titleJa: source.titleJa,
    titleEn: source.titleEn,
    summary: source.summary,
    voices: { ja: jaVoice, en: enVoice },
    stats: {
      segments: withAudio.length,
      jaSeconds,
      enSeconds,
      vocab: vocab.length,
    },
    segments: withAudio,
    vocab,
    personalUse:
      "Original study narration for Jeremy. Vocabulary and plot beats were taken from a private reading of the episode. The anime's dialogue is not included.",
  };

  const outDir = path.join(root, "public/episodes");
  mkdirSync(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${id}.json`), JSON.stringify(published));
  await writeCatalog();
  console.log(
    `Wrote public/episodes/${id}.json — Japanese ${Math.floor(jaSeconds / 60)} min ${jaSeconds % 60} sec, English ${Math.floor(enSeconds / 60)} min ${enSeconds % 60} sec, ${vocab.length} study words.`,
  );
}

async function loadPrivateCues(
  id: string,
  sources: SeriesCatalog["seasons"][number]["episodes"][number]["privateSubs"],
) {
  if (!sources) return null;
  const jaPath = await ensureRaw(id, "ja", sources.ja);
  const enPath = await ensureRaw(id, "en", sources.en);
  if (!jaPath && !enPath) return null;
  const cues: string[] = [];
  const lemmas = new Map<string, number>();
  const tokenize = jaPath ? await loadTokenizer() : null;
  if (jaPath) {
    const text = readFileSync(jaPath, "utf8");
    const parsed = parseAss(text);
    const dialogueStyles = [...new Set(parsed.map((cue) => cue.style))].filter((style) => {
      if (/^(op|ed)([-_]|$)/i.test(style)) return false;
      return /jp/i.test(style);
    });
    const kept = classifyCues(parsed, {
      role: "ja",
      keepStyles: dialogueStyles.length ? dialogueStyles : ["JP"],
      songStyles: ["OP-JP", "ED-JP", "ED-JP-2"],
    }).filter((cue) => cue.kind === "dialogue");
    for (const cue of kept) {
      cues.push(cue.text);
      if (!tokenize) continue;
      for (const token of tokenize(cue.text)) {
        if (token.pos === "記号" || token.pos === "助詞" || token.pos === "助動詞") continue;
        lemmas.set(token.lemma, (lemmas.get(token.lemma) ?? 0) + 1);
      }
    }
  }
  if (enPath) {
    const text = readFileSync(enPath, "utf8");
    const parsed = enPath.endsWith(".ass") ? parseAss(text) : parseSrt(text);
    for (const cue of parsed) cues.push(cue.text);
  }
  return { cues, lemmas };
}

function reportMissingVocabulary(lemmas: Map<string, number>, script: string) {
  const missing = [...lemmas.entries()]
    .filter(([lemma, count]) => count >= 4 && lemma.length > 1 && !script.includes(lemma))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  if (!missing.length) return;
  console.log("Frequent private-sub lemmas not used in the retelling (words only):");
  for (const [lemma, count] of missing) console.log(`  ${count}  ${lemma}`);
}

async function ensureRaw(
  id: string,
  side: "ja" | "en",
  source: { filename: string; url: string } | undefined,
) {
  if (!source?.url) return null;
  const ext = source.filename.toLowerCase().endsWith(".srt") ? "srt" : "ass";
  const dest = path.join(root, "data/raw", `${id}.${side}.${ext}`);
  mkdirSync(path.dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).size > 400) return dest;
  console.log(`Fetching private ${side} subtitles for ${id} into data/raw (not published).`);
  const response = await fetch(source.url, { headers: { "User-Agent": "kyojin-hour-personal-study" } });
  if (!response.ok) throw new Error(`Subtitle download failed (${response.status}) for ${side}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const head = bytes.subarray(0, 80).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) {
    throw new Error(`Subtitle download for ${side} returned a web page, not a subtitle file.`);
  }
  await writeFile(dest, bytes);
  return dest;
}

async function loadTokenizer(): Promise<(text: string) => RawToken[]> {
  const kuromoji = require("kuromoji") as typeof import("kuromoji");
  const staticDict = path.join(root, "public/kuromoji");
  const packagedDict = path.join(path.dirname(require.resolve("kuromoji/package.json")), "dict");
  const dicPath = existsSync(path.join(staticDict, "base.dat.gz")) ? staticDict : packagedDict;
  const tokenizer = await new Promise<import("kuromoji").Tokenizer<import("kuromoji").IpadicFeatures>>(
    (resolve, reject) => {
      kuromoji.builder({ dicPath }).build((error, built) => (error ? reject(error) : resolve(built)));
    },
  );
  return (text) =>
    tokenizer.tokenize(text).map((token) => ({
      surface: token.surface_form,
      pos: token.pos,
      posDetail: token.pos_detail_1,
      conjugation: token.conjugated_form,
      lemma: token.basic_form && token.basic_form !== "*" ? token.basic_form : token.surface_form,
      reading: token.reading ?? null,
    }));
}

async function speak(text: string, voice: string, dest: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kyojin-"));
  const scriptFile = path.join(dir, "line.txt");
  const rawFile = path.join(dir, "raw.mp3");
  await writeFile(scriptFile, text);
  const rate = process.env.AOT_TTS_RATE || "-8%";
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await execFileAsync(
        "python3",
        ["-m", "edge_tts", "--voice", voice, `--rate=${rate}`, "--file", scriptFile, "--write-media", rawFile],
        { timeout: 120_000, maxBuffer: 8_000_000 },
      );
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", rawFile, "-ac", "1", "-ar", "24000", "-b:a", "48k", dest],
        { maxBuffer: 8_000_000 },
      );
      await rm(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function durationOf(file: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    file,
  ]);
  return Number(stdout.trim());
}

async function writeCatalog() {
  const episodes: Record<string, { id: string; titleEn: string; jaSeconds: number; segments: number }> = {};
  const dir = path.join(root, "public/episodes");
  if (existsSync(dir)) {
    const { readdir } = await import("node:fs/promises");
    for (const name of await readdir(dir)) {
      if (!name.endsWith(".json")) continue;
      const data = JSON.parse(await readFile(path.join(dir, name), "utf8")) as {
        id: string;
        titleEn: string;
        stats: { jaSeconds: number; segments: number };
      };
      episodes[data.id] = {
        id: data.id,
        titleEn: data.titleEn,
        jaSeconds: data.stats.jaSeconds,
        segments: data.stats.segments,
      };
    }
  }
  await writeFile(
    path.join(root, "public/catalog.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), episodes }, null, 2),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
