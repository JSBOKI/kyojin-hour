"use client";

import { useMemo, useState } from "react";
import type { GlossaryEntry } from "@/lib/types";

const labels: Record<GlossaryEntry["kind"], string> = {
  character: "People",
  place: "Places",
  term: "Terms",
};

export function GlossaryList({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");
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
