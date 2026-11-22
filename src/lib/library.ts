import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { PublishedEpisode, PublicCatalog } from "./published";
import type { SeriesCatalog } from "./source";
import type { GlossaryEntry } from "./types";

const root = process.cwd();

export async function loadSeries(): Promise<SeriesCatalog> {
  const text = await readFile(path.join(root, "data/series.json"), "utf8");
  return JSON.parse(text) as SeriesCatalog;
}

export async function loadGlossary(): Promise<GlossaryEntry[]> {
  const text = await readFile(path.join(root, "data/glossary.json"), "utf8");
  const parsed = JSON.parse(text) as { entries: GlossaryEntry[] };
  return parsed.entries;
}

export async function loadCatalog(): Promise<PublicCatalog> {
  const file = path.join(root, "public/catalog.json");
  try {
    await access(file);
  } catch {
    return { generatedAt: "", episodes: {} };
  }
  return JSON.parse(await readFile(file, "utf8")) as PublicCatalog;
}

export async function loadEpisode(id: string): Promise<PublishedEpisode | null> {
  if (!/^s\d{2}e\d{2}$/.test(id)) return null;
  const file = path.join(root, "public/episodes", `${id}.json`);
  try {
    await access(file);
  } catch {
    return null;
  }
  return JSON.parse(await readFile(file, "utf8")) as PublishedEpisode;
}

export async function episodeStaticParams() {
  const series = await loadSeries();
  return series.seasons.flatMap((season) => season.episodes.map((episode) => ({ id: episode.id })));
}

export function findEpisode(series: SeriesCatalog, id: string) {
  for (const season of series.seasons) {
    const episode = season.episodes.find((item) => item.id === id);
    if (episode) return episode;
  }
  return null;
}
