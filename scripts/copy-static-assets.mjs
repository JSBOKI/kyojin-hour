import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const kuromojiRoot = path.dirname(require.resolve("kuromoji/package.json"));
const dictDir = path.join(kuromojiRoot, "dict");
const publicDict = path.join(root, "public/kuromoji");

mkdirSync(publicDict, { recursive: true });
for (const name of readdirSync(dictDir)) {
  if (!name.endsWith(".gz")) continue;
  copyFileSync(path.join(dictDir, name), path.join(publicDict, name));
}
copyFileSync(path.join(kuromojiRoot, "build/kuromoji.js"), path.join(publicDict, "kuromoji.js"));

const wasm = require.resolve("anki-apkg-export/sql-wasm.wasm");
copyFileSync(wasm, path.join(root, "public/sql-wasm.wasm"));
console.log("Copied kuromoji dictionary and sql-wasm.wasm into public/.");
