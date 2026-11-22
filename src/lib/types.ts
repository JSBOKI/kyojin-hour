export type RubySegment = {
  text: string;
  reading?: string;
};

export type RawToken = {
  surface: string;
  pos: string;
  posDetail: string;
  conjugation: string;
  lemma: string;
  reading: string | null;
};

export type DictSense = {
  lemma: string;
  reading: string;
  glosses: string[];
  pos: string[];
};

export type StudyToken = {
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
};

export type LineKind = "dialogue" | "song";
export type EnglishSource = "aligned" | "fallback" | "missing";

export type StudyLine = {
  id: string;
  startMs: number;
  endMs: number;
  ja: string;
  en: string | null;
  enSource: EnglishSource;
  kind: LineKind;
  tokens: StudyToken[];
};

export type SubtitleSource = {
  group: string;
  filename: string;
  url?: string;
  /** Path relative to the repo, usually under data/raw, which is gitignored. */
  local?: string;
};

export type EpisodeConfig = {
  id: string;
  season: number;
  episode: number;
  titleJa: string;
  titleEn: string;
  ja?: SubtitleSource;
  en?: SubtitleSource;
  jaKeepStyles?: string[];
  jaSongStyles?: string[];
};

export type SeriesCatalog = {
  seriesId: string;
  title: string;
  englishTitle: string;
  learner: string;
  addEpisode: string;
  seasons: {
    season: number;
    label: string;
    episodes: EpisodeConfig[];
  }[];
};

export type GlossaryEntry = {
  id: string;
  kind: "character" | "place" | "term";
  forms: string[];
  reading: string;
  english: string;
  note?: string;
};

export type GlossaryFile = {
  version: number;
  notes: string;
  entries: GlossaryEntry[];
};

export type Cue = {
  startMs: number;
  endMs: number;
  style: string;
  text: string;
};

export type KeptCue = Cue & { kind: LineKind };

export type EpisodeStats = {
  jaCues: number;
  enCues: number;
  lines: number;
  dialogue: number;
  songs: number;
  aligned: number;
  fallback: number;
  missing: number;
  unmatchedEn: number;
  offsetMs: number;
};

export type EpisodeModule = {
  id: string;
  season: number;
  episode: number;
  titleJa: string;
  titleEn: string;
  sources: {
    ja: { group: string; filename: string };
    en: { group: string; filename: string } | null;
  };
  stats: EpisodeStats;
  lines: StudyLine[];
  personalUse: string;
};

export type Manifest = {
  generatedAt: string;
  episodes: Record<
    string,
    {
      id: string;
      titleJa: string;
      titleEn: string;
      season: number;
      episode: number;
      lineCount: number;
      dialogueCount: number;
      aligned: number;
      fallback: number;
    }
  >;
};
