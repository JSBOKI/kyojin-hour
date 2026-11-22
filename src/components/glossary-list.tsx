"use client";

import { useEffect, useMemo, useState } from "react";
import { loadKuromoji } from "@/lib/kuromoji-client";
import type { GlossaryEntry } from "@/lib/types";

const labels: Record<GlossaryEntry["kind"], string> = {
  character: "People",
  place: "Places",
  term: "Terms",
};

export function GlossaryList({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");
  const [analyzer, setAnalyzer] = useState("Word analyzer is loading from the site dictionary.");
  const [reading, setReading] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadKuromoji()
      .then((tokenizer) => {
        if (cancelled) return;
        const tokens = tokenizer.tokenize("巨人");
        const heard = tokens.map((token) => token.reading || token.surface_form).join("");
        setAnalyzer(heard ? `Word analyzer ready. 巨人 reads ${heard}.` : "Word analyzer ready.");
      })
      .catch(() => {
        if (!cancelled) setAnalyzer("Word analyzer could not load. Glossary entries still work.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setReading("");
      return;
    }
    let cancelled = false;
    loadKuromoji()
      .then((tokenizer) => {
        if (cancelled) return;
        const tokens = tokenizer.tokenize(query.trim());
        setReading(tokens.map((token) => token.reading || token.surface_form).filter(Boolean).join(" "));
      })
      .catch(() => {
        if (!cancelled) setReading("");
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.english, entry.reading, entry.note ?? "", ...entry.forms]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  const groups = (["term", "place", "character"] as const).map((kind) => ({
    kind,
    items: filtered.filter((entry) => entry.kind === kind),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-4xl font-semibold">Glossary</h1>
        <p className="mt-2 text-xl leading-relaxed">
          The same readings and English names are used in every episode, so 巨人 stays Titan and 調査兵団 stays Survey Corps.
        </p>
      </div>
      <label className="text-lg" htmlFor="glossary-search">
        Search
      </label>
      <input
        id="glossary-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Titan, Eren, 壁"
        className="h-14 rounded-2xl border bg-card px-4 text-xl"
      />
      <p className="text-lg leading-relaxed">{analyzer}</p>
      {reading ? <p className="text-2xl">Reading: {reading}</p> : null}
      {filtered.length === 0 ? (
        <p className="text-xl">Nothing matches that search.</p>
      ) : null}
      {groups.map((group) =>
        group.items.length ? (
          <section key={group.kind}>
            <h2 className="mb-3 text-2xl font-semibold">{labels[group.kind]}</h2>
            <ul className="flex flex-col gap-3">
              {group.items.map((entry) => (
                <li key={entry.id} className="rounded-2xl border bg-card p-4">
                  <p className="text-3xl font-semibold">{entry.forms[0]}</p>
                  <p className="mt-1 text-xl">{entry.reading}</p>
                  <p className="mt-2 text-2xl">{entry.english}</p>
                  {entry.note ? <p className="mt-2 text-lg leading-relaxed">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
