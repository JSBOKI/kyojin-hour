/** Keep the same fraction of the current scene when the language changes. */
export function positionAfterLanguageSwitch(
  currentTime: number,
  currentDuration: number,
  nextDuration: number,
): number {
  if (!Number.isFinite(currentDuration) || currentDuration <= 0) return 0;
  if (!Number.isFinite(nextDuration) || nextDuration <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, currentTime / currentDuration));
  return ratio * nextDuration;
}

export function episodePosition(
  durations: number[],
  segmentIndex: number,
  currentTime: number,
): { current: number; total: number } {
  const safe = durations.map((value) => (Number.isFinite(value) ? value : 0));
  const total = safe.reduce((sum, value) => sum + value, 0);
  const before = safe.slice(0, segmentIndex).reduce((sum, value) => sum + value, 0);
  const here = Math.min(safe[segmentIndex] ?? 0, Math.max(0, currentTime));
  return { current: before + here, total };
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}
