/** Compare an original script with private subtitle cues without keeping the cues. */
export function normalizeForMatch(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　、。！？!?.,…・「」『』（）()[\]"'“”‘’\-—:：;；]/g, "");
}

export function findVerbatimOverlap(
  script: string,
  cues: string[],
  minLength = 16,
): string[] {
  const haystack = normalizeForMatch(script);
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const cue of cues) {
    const needle = normalizeForMatch(cue);
    if (needle.length < minLength) continue;
    if (!haystack.includes(needle)) continue;
    if (seen.has(needle)) continue;
    seen.add(needle);
    hits.push(cue.trim());
  }
  return hits;
}
