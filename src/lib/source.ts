export type EpisodeSource = {
  id: string;
  season: number;
  episode: number;
  titleJa: string;
  titleEn: string;
  summary: string;
  jaVoice?: string;
  enVoice?: string;
  notes?: Record<string, string>;
  segments: {
    id: string;
    titleJa: string;
    titleEn: string;
    ja: string;
    en: string;
  }[];
};

export type PrivateSubSource = {
  group: string;
  filename: string;
  url: string;
};

export type CatalogEpisode = {
  id: string;
  season: number;
  episode: number;
  titleJa: string;
  titleEn: string;
  /** Pointers for a private vocab pass. The files are downloaded into data/raw and never published. */
  privateSubs?: {
    ja?: PrivateSubSource;
    en?: PrivateSubSource;
  };
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
    episodes: CatalogEpisode[];
  }[];
};
