import type { Cue, KeptCue, LineKind } from "./types";

const DROP_STYLE =
  /(sign|title|staff|karaoke|credit|typeset|caption|comment|op-other|ed-other|\bfx\b|typesetting|^cn$|^chs$|^cht$|chinese|^english$|^eng$|^en$)/i;
const SONG_STYLE = /^(op|ed)([_-]|$)/i;
const JP_STYLE = /^(jp|jap|jpn|japanese|日本語)$/i;

export type FilterOptions = {
  role: "ja" | "en";
  keepStyles?: string[];
  songStyles?: string[];
};

function classify(
  style: string,
  options: FilterOptions,
  fileHasDedicatedJapanese: boolean,
): LineKind | "drop" {
  if (options.songStyles?.includes(style)) return "song";
  if (options.keepStyles?.length) {
    return options.keepStyles.includes(style) ? "dialogue" : "drop";
  }
  if (DROP_STYLE.test(style)) return "drop";
  if (SONG_STYLE.test(style)) return "song";
  if (options.role === "ja" && fileHasDedicatedJapanese && !JP_STYLE.test(style)) {
    return "drop";
  }
  return "dialogue";
}

export function classifyCues(cues: Cue[], options: FilterOptions): KeptCue[] {
  const styles = new Set(cues.map((cue) => cue.style));
  const fileHasDedicatedJapanese = [...styles].some((style) => JP_STYLE.test(style));
  const kept: KeptCue[] = [];
  for (const cue of cues) {
    const kind = classify(cue.style, options, fileHasDedicatedJapanese);
    if (kind === "drop") continue;
    kept.push({ ...cue, kind });
  }
  return kept;
}
