import { GlossaryList } from "@/components/glossary-list";
import { loadGlossary } from "@/lib/library";

export default async function GlossaryPage() {
  const entries = await loadGlossary();
  return <GlossaryList entries={entries} />;
}
