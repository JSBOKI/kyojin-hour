import { isKanji, kataToHira } from "./kana";
import type { RubySegment } from "./types";

/**
 * Align a dictionary reading under the kanji in a surface form.
 * Okurigana is matched from both ends, then each kanji run is labeled.
 */
export function furigana(surface: string, readingRaw: string | null): RubySegment[] {
  const reading = kataToHira(readingRaw ?? "");
  if (!surface) return [];
  if (!reading || ![...surface].some(isKanji) || kataToHira(surface) === reading) {
    return [{ text: surface }];
  }
  return align(surface, reading);
}

function align(surface: string, reading: string): RubySegment[] {
  if (!surface) return [];
  if (![...surface].some(isKanji)) return [{ text: surface }];
  if (!reading) return [{ text: surface }];

  const surfaceChars = [...surface];
  const readingChars = [...reading];
  let start = 0;
  while (
    start < surfaceChars.length &&
    start < readingChars.length &&
    !isKanji(surfaceChars[start]) &&
    kataToHira(surfaceChars[start]) === readingChars[start]
  ) {
    start += 1;
  }

  let surfaceEnd = surfaceChars.length;
  let readingEnd = readingChars.length;
  while (
    surfaceEnd > start &&
    readingEnd > start &&
    !isKanji(surfaceChars[surfaceEnd - 1]) &&
    kataToHira(surfaceChars[surfaceEnd - 1]) === readingChars[readingEnd - 1]
  ) {
    surfaceEnd -= 1;
    readingEnd -= 1;
  }

  const prefix = start > 0 ? [{ text: surfaceChars.slice(0, start).join("") }] : [];
  const suffix =
    surfaceEnd < surfaceChars.length
      ? [{ text: surfaceChars.slice(surfaceEnd).join("") }]
      : [];
  const middleSurface = surfaceChars.slice(start, surfaceEnd).join("");
  const middleReading = readingChars.slice(start, readingEnd).join("");
  if (!middleSurface) return [...prefix, ...suffix];

  const middleChars = [...middleSurface];
  if (middleChars.every(isKanji)) {
    return [...prefix, { text: middleSurface, reading: middleReading }, ...suffix];
  }

  let kanjiEnd = 0;
  while (kanjiEnd < middleChars.length && isKanji(middleChars[kanjiEnd])) kanjiEnd += 1;
  if (kanjiEnd === 0) {
    return [...prefix, { text: middleSurface, reading: middleReading }, ...suffix];
  }

  const kanjiPart = middleChars.slice(0, kanjiEnd).join("");
  const after = middleChars.slice(kanjiEnd).join("");
  const anchor = kataToHira([...after][0] ?? "");
  const anchorAt = [...middleReading].findIndex((ch) => ch === anchor);
  if (!anchor || anchorAt <= 0) {
    return [...prefix, { text: middleSurface, reading: middleReading }, ...suffix];
  }

  const kanjiReading = [...middleReading].slice(0, anchorAt).join("");
  const restReading = [...middleReading].slice(anchorAt).join("");
  return [
    ...prefix,
    { text: kanjiPart, reading: kanjiReading },
    ...align(after, restReading),
    ...suffix,
  ];
}
