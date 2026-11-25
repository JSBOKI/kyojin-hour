import Link from "next/link";
import { loadCatalog, loadSeries } from "@/lib/library";
import { formatClock } from "@/lib/player-time";

export default async function HomePage() {
  const [series, catalog] = await Promise.all([loadSeries(), loadCatalog()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-lg text-muted-foreground">For {series.learner}</p>
        <h1 className="mt-1 text-4xl font-semibold leading-tight">Listen through the walls</h1>
        <p className="mt-3 text-xl leading-relaxed">
          Scene-by-scene Japanese, with an English version of the same scene. The story is retold in new words, using the vocabulary of each episode. Play the show itself on whatever you already use.
        </p>
      </div>

      {series.seasons.map((season) => {
        const blocks =
          season.season === 3
            ? [
                { label: "Part 1", episodes: season.episodes.filter((episode) => episode.episode <= 12) },
                { label: "Part 2", episodes: season.episodes.filter((episode) => episode.episode >= 13) },
              ]
            : [{ label: null as string | null, episodes: season.episodes }];
        return (
          <section key={season.season} className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold">{season.label}</h2>
            {blocks.map((block) => {
              const waiting = block.episodes.filter((episode) => !catalog.episodes[episode.id]);
              return (
                <div key={block.label ?? "all"} className="flex flex-col gap-4">
                  {block.label ? <h3 className="text-2xl font-semibold">{block.label}</h3> : null}
                  {block.episodes.map((episode) => {
                    const info = catalog.episodes[episode.id];
                    if (info) {
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
                            {`${formatClock(info.jaSeconds)} of Japanese · ${info.segments} scenes`}
                          </p>
                        </Link>
                      );
                    }
                    return (
                      <div key={episode.id} className="rounded-2xl border bg-card px-4 py-4">
                        <p className="text-2xl font-medium">
                          {episode.episode}. {episode.titleEn}
                        </p>
                        <p className="text-xl">{episode.titleJa}</p>
                        <p className="mt-1 text-lg text-muted-foreground">Not recorded</p>
                      </div>
                    );
                  })}
                  {waiting.length > 0 ? (
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      A missing episode is a catalog line, an original script, and one command.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
