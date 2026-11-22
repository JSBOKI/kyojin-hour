import Link from "next/link";
import { notFound } from "next/navigation";
import { VocabList } from "@/components/vocab-list";
import { findEpisode, loadEpisode, loadSeries } from "@/lib/library";

export default async function WordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await loadSeries();
  const meta = findEpisode(series, id);
  if (!meta) notFound();
  const episode = await loadEpisode(id);
  if (!episode) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold">No word list yet</h1>
        <p className="text-xl">Record the episode first.</p>
        <Link href={`/listen/${id}`} className="text-xl font-semibold underline">
          Episode page
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Link href={`/listen/${episode.id}`} className="text-xl font-semibold underline">
        Back to the episode
      </Link>
      <VocabList episodeId={episode.id} title={episode.titleEn} items={episode.vocab} />
    </div>
  );
}
