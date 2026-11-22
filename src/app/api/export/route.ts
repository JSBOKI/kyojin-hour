import AnkiExport from "anki-apkg-export";

export const runtime = "nodejs";

type Card = { id?: string; front?: string; back?: string; tags?: string[] };

export async function POST(request: Request) {
  let cards: Card[] = [];
  let filename = "kyojin-hour.apkg";
  try {
    const body = (await request.json()) as { cards?: Card[]; filename?: string };
    cards = Array.isArray(body.cards) ? body.cards : [];
    if (body.filename && /^[\w.-]+$/.test(body.filename)) filename = body.filename;
  } catch {
    return Response.json({ error: "Send a list of cards." }, { status: 400 });
  }
  if (!cards.length || cards.length > 400) {
    return Response.json({ error: "Choose between 1 and 400 cards." }, { status: 400 });
  }
  const usable = cards.filter((card) => card.front && card.back);
  if (!usable.length) {
    return Response.json({ error: "Each card needs a front and a back." }, { status: 400 });
  }

  const apkg = await AnkiExport.create("Kyojin Hour");
  try {
    for (const card of usable) {
      apkg.addCard(card.front ?? "", card.back ?? "", {
        noteId: card.id,
        tags: card.tags ?? ["aot"],
      });
    }
    const data = await apkg.save({ type: "uint8array" });
    return new Response(Buffer.from(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    apkg.close();
  }
}
