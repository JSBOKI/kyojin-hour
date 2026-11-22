"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildApkg, downloadBlob } from "@/lib/anki-client";
import { vocabToCards, vocabToCsv, type VocabItem } from "@/lib/annotate";

export function VocabList({ episodeId, title, items }: { episodeId: string; title: string; items: VocabItem[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function downloadCsv() {
    const csv = `\uFEFF${vocabToCsv(items, episodeId)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${episodeId}-vocab.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Spreadsheet downloaded.");
  }

  async function downloadApkg() {
    setBusy(true);
    setMessage("");
    try {
      const blob = await buildApkg(vocabToCards(items, episodeId));
      downloadBlob(blob, `${episodeId}-vocab.apkg`);
      setMessage("Anki deck downloaded. Import the .apkg file in Anki.");
    } catch {
      setMessage("Anki export did not finish. The spreadsheet is still available.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg text-muted-foreground">{title}</p>
        <h1 className="text-4xl font-semibold">Words to keep</h1>
        <p className="mt-2 text-xl leading-relaxed">
          {items.length} words from this retelling. Series names and terms are listed first.
        </p>
      </div>
      <Button type="button" size="touch" onClick={downloadApkg} disabled={busy || items.length === 0}>
        {busy ? "Preparing Anki deck…" : "Download Anki deck"}
      </Button>
      <Button type="button" size="touch" variant="outline" onClick={downloadCsv} disabled={items.length === 0}>
        Download spreadsheet
      </Button>
      {message ? <p className="text-lg">{message}</p> : null}
      <ol className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border bg-card p-4">
            <p className="text-3xl font-semibold">{item.lemma}</p>
            <p className="mt-1 text-xl">{item.reading}</p>
            <p className="mt-2 text-2xl leading-snug">{item.meaning}</p>
            <p className="mt-1 text-lg capitalize text-muted-foreground">
              {item.posLabel}
              {item.count > 1 ? ` · heard ${item.count} times` : ""}
            </p>
            {item.note ? <p className="mt-2 text-lg leading-relaxed">{item.note}</p> : null}
            <p className="mt-3 text-xl leading-relaxed">{item.exampleJa}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
