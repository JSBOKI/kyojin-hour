import { parseTimestamp } from "./kana";
import { hasVisibleSpeech, stripSrtText } from "./subtitle-text";
import type { Cue } from "./types";

export function parseSrt(input: string): Cue[] {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const cues: Cue[] = [];

  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex === -1) continue;
    const match = lines[timingIndex].match(
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
    );
    if (!match) continue;
    const spoken = stripSrtText(lines.slice(timingIndex + 1).join("\n"));
    if (!hasVisibleSpeech(spoken)) continue;
    cues.push({
      startMs: parseTimestamp(match[1]),
      endMs: parseTimestamp(match[2]),
      style: "Default",
      text: spoken,
    });
  }

  return cues;
}
