import { parseTimestamp } from "./kana";
import { hasVisibleSpeech, isKaraoke, stripAssText } from "./subtitle-text";
import type { Cue } from "./types";

const DEFAULT_FORMAT = [
  "Layer",
  "Start",
  "End",
  "Style",
  "Name",
  "MarginL",
  "MarginR",
  "MarginV",
  "Effect",
  "Text",
];

function splitFields(body: string, format: string[]): Record<string, string> {
  const values: string[] = [];
  let rest = body;
  for (let index = 0; index < format.length - 1; index += 1) {
    const comma = rest.indexOf(",");
    if (comma === -1) {
      values.push(rest.trim());
      rest = "";
      break;
    }
    values.push(rest.slice(0, comma).trim());
    rest = rest.slice(comma + 1);
  }
  values.push(rest);
  const record: Record<string, string> = {};
  format.forEach((name, index) => {
    record[name.toLowerCase()] = values[index] ?? "";
  });
  return record;
}

/**
 * Parse ASS/SSA dialogue. Karaoke, empty cues, and comment lines are dropped.
 * Style filtering happens later so one parser serves every episode.
 */
export function parseAss(input: string): Cue[] {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const cues: Cue[] = [];
  let format = DEFAULT_FORMAT;
  let inEvents = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("[")) {
      inEvents = trimmed.toLowerCase() === "[events]";
      continue;
    }
    if (!inEvents) continue;
    if (trimmed.toLowerCase().startsWith("format:")) {
      format = trimmed
        .slice(trimmed.indexOf(":") + 1)
        .split(",")
        .map((part) => part.trim());
      continue;
    }
    if (!trimmed.toLowerCase().startsWith("dialogue:")) continue;

    const body = trimmed.slice(trimmed.indexOf(":") + 1).trim();
    const fields = splitFields(body, format);
    const rawText = fields.text ?? "";
    if (isKaraoke(rawText)) continue;
    const spoken = stripAssText(rawText);
    if (!hasVisibleSpeech(spoken)) continue;

    cues.push({
      startMs: parseTimestamp(fields.start ?? "0:00:00.00"),
      endMs: parseTimestamp(fields.end ?? "0:00:00.00"),
      style: fields.style || "Default",
      text: spoken,
    });
  }

  return cues;
}
