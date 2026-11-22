/** Katakana (aside from the long-vowel mark) to hiragana. */
export function kataToHira(input: string): string {
  return input.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

export function hiraToKata(input: string): string {
  return input.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

/** Key used to match glossary forms across middle dots, width, and kana type. */
export function normKey(input: string): string {
  return kataToHira(input.normalize("NFKC"))
    .replace(/[・･·.\s　]/g, "")
    .toLowerCase();
}

export function isKanji(ch: string): boolean {
  return /[\u3400-\u9fff]/.test(ch);
}

export function isKana(ch: string): boolean {
  return /[\u3040-\u30ff]/.test(ch);
}

export function parseTimestamp(raw: string): number {
  const match = raw.trim().match(/^(\d+):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!match) {
    throw new Error(`Bad timestamp: ${raw}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = match[4] ?? "0";
  const millis =
    fraction.length >= 3
      ? Number(fraction.slice(0, 3))
      : Number(fraction.padEnd(2, "0")) * 10;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
