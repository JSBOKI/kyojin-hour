import { withBase } from "./base-path";

export type AnkiCard = {
  id?: string;
  front: string;
  back: string;
  tags?: string[];
};

/** Build an .apkg in the browser. sql.js loads its wasm from the static site. */
export async function buildApkg(cards: AnkiCard[]): Promise<Blob> {
  const { default: AnkiExport } = await import("anki-apkg-export");
  const apkg = await AnkiExport.create("Kyojin Hour", {
    locateFile: () => withBase("/sql-wasm.wasm"),
  });
  try {
    for (const card of cards) {
      apkg.addCard(card.front, card.back, { noteId: card.id, tags: card.tags ?? ["aot"] });
    }
    return await apkg.save({ type: "blob" });
  } finally {
    apkg.close();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
