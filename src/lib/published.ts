import type { AnnotatedToken, VocabItem } from "./annotate";

export type PublishedSegment = {
  id: string;
  titleJa: string;
  titleEn: string;
  ja: string;
  en: string;
  jaAudio: string;
  enAudio: string;
  jaDuration: number;
  enDuration: number;
  tokens: AnnotatedToken[];
};

export type PublishedEpisode = {
  id: string;
  season: number;
  episode: number;
  titleJa: string;
  titleEn: string;
  summary: string;
  voices: { ja: string; en: string };
  stats: {
    segments: number;
    jaSeconds: number;
    enSeconds: number;
    vocab: number;
  };
  segments: PublishedSegment[];
  vocab: VocabItem[];
  personalUse: string;
};

export type PublicCatalog = {
  generatedAt: string;
  episodes: Record<string, { id: string; titleEn: string; jaSeconds: number; segments: number }>;
};
