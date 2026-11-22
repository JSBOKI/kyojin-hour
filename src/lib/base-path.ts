/** GitHub Pages project site prefix. Empty only when NEXT_PUBLIC_BASE_PATH is set to "". */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/kyojin-hour";

/** Prefix a root-relative public asset so it loads under the Pages base path. */
export function withBase(assetPath: string): string {
  if (!assetPath.startsWith("/") || assetPath.startsWith("//")) return assetPath;
  if (!basePath) return assetPath;
  if (assetPath === basePath || assetPath.startsWith(`${basePath}/`)) return assetPath;
  return `${basePath}${assetPath}`;
}
