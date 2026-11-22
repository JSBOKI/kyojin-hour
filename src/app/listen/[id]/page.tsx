import Link from "next/link";
import { notFound } from "next/navigation";
import { Player } from "@/components/player";
import { episodeStaticParams, findEpisode, loadEpisode, loadSeries } from "@/lib/library";

export const dynamicParams = false;

export function generateStaticParams() {
  return episodeStaticParams();
}

export default async function ListenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await loadSeries();
  const meta = findEpisode(series, id);
  if (!meta) notFound();
  const episode = await loadEpisode(id);
  if (!episode) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg text-muted-foreground">
          Season {meta.season} · Episode {meta.episode}
        </p>
        <h1 className="text-4xl font-semibold">{meta.titleEn}</h1>
        <p className="text-2xl">{meta.titleJa}</p>
        <p className="text-xl leading-relaxed">
          This episode does not have a recording yet. Write an original retelling, then build it.
        </p>
        <p className="rounded-2xl bg-card p-4 text-xl leading-relaxed">
          npm run episode -- {meta.id}
        </p>
        <Link href="/" className="text-xl font-semibold underline">
          Back to episodes
        </Link>
      </div>
    );
  }
  return <Player episode={episode} />;
}
