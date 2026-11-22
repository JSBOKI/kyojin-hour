import Link from "next/link";
import { loadCatalog, loadSeries } from "@/lib/library";
import { formatClock } from "@/lib/player-time";

export default async function HomePage() {
  const [series, catalog] = await Promise.all([loadSeries(), loadCatalog()]);
  const season = series.seasons[0];
  const ready = season.episodes.filter((episode) => catalog.episodes[episode.id]);
  const waiting = season.episodes.filter((episode) => !catalog.episodes[episode.id]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-lg text-muted-foreground">For {series.learner}</p>
        <h1 className="mt-1 text-4xl font-semibold leading-tight">Listen through the walls</h1>
        <p className="mt-3 text-xl leading-relaxed">
          Scene-by-scene Japanese, with an English version of the same scene. The story is retold in new words, using the vocabulary of each episode. Play the show itself on whatever you already use.
        </p>
      </div>

      {ready.map((episode) => {
        const info = catalog.episodes[episode.id];
        return (
          <Link
            key={episode.id}
            href={`/listen/${episode.id}`}
            className="block rounded-3xl bg-primary px-5 py-6 text-primary-foreground"
          >
            <p className="text-lg">Ready to play</p>
            <p className="mt-1 text-4xl font-semibold leading-tight">
              {episode.episode}. {episode.titleEn}
            </p>
            <p className="mt-1 text-2xl">{episode.titleJa}</p>
            <p className="mt-3 text-xl">
              {info ? `${formatClock(info.jaSeconds)} of Japanese · ${info.segments} scenes` : "Open episode"}
            </p>
          </Link>
        );
      })}

      <section>
        <h2 className="text-2xl font-semibold">Rest of season 1</h2>
        <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
          These are not recorded yet. Adding one is a catalog line, an original script, and one command.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {waiting.map((episode) => (
            <li key={episode.id} className="rounded-2xl border bg-card px-4 py-4">
              <p className="text-2xl font-medium">
                {episode.episode}. {episode.titleEn}
              </p>
              <p className="text-xl">{episode.titleJa}</p>
              <p className="mt-1 text-lg text-muted-foreground">Not recorded</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
