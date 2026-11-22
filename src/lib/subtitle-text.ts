/** Remove ASS override tags and turn hard breaks into newlines. */
export function stripAssText(input: string): string {
  let text = input.replace(/\\N/g, "\n").replace(/\\n/g, "\n").replace(/\\h/g, " ");
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(/\{[^}]*\}/g, "");
  }
  text = text.replace(/\\[a-zA-Z]+\d*/g, "");
  return text.replace(/\r/g, "").trim();
}

export function isKaraoke(input: string): boolean {
  return /\\[kK][fFoO]?\d|\\kt\d/.test(input);
}

export function stripSrtText(input: string): string {
  return stripAssText(input)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function hasVisibleSpeech(input: string): boolean {
  return /[\p{L}\p{N}]/u.test(input);
}
