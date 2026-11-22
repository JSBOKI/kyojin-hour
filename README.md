# Kyojin Hour

A personal Japanese listening podcast for Jeremy. Each episode of *Shingeki no Kyojin* (Attack on Titan) becomes an original scene-by-scene retelling, told twice: once in intermediate Japanese, once in English. A large Japanese / English control switches the voice and keeps the same scene.

Season 1 Episodes 11 through 20 are recorded. Each one runs about eight to twelve minutes in Japanese and in English.

This is study material, not a substitute for the show. Watch the episode on a legal copy you already have. The podcast does not host video, and it does not use the anime’s dialogue.

Kyojin Hour is an unofficial, non-commercial fan learning project. The scripts and the spoken narration are original retellings. They are not the anime’s dialogue, subtitles, or soundtrack. *Attack on Titan* / *Shingeki no Kyojin* belongs to its rightsholders.

## Listen

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123), then Episode 11. Japanese is the voice Nanami. English is the voice Guy. Play, then tap **English** or **Japanese**. The scene position stays put.

Tap any Japanese word in the transcript for the reading and a short English gloss. **Words in this episode** exports a spreadsheet (CSV) or an Anki deck (`.apkg`). **Glossary** is the shared name and term list for the whole series.

## What you will hear

The narration follows the episode’s beats in new sentences: the open gate at Trost, the fear around Eren, Armin’s plea, Commander Pyxis, the boulder operation, the talk about food and population, who stays on the wall, and the moment Eren’s Titan stops obeying him. A last scene repeats the words worth keeping.

Sample, from the opening scene:

> トロスト区の街は、昼なのに静かでした。外門の扉は折れ、壁には大きな穴が開いたままです。

> Trost District was quiet, even though it was still day. The outer gate was broken, and a huge hole stood open in the wall.

## Add an episode

Adding episodes 1–25, or a later season, is a catalog line, an original script, and one command. No player code changes.

1. Add the episode to `data/series.json` (id like `s01e12`, titles, and optional `privateSubs` URLs).
2. Write an original bilingual retelling at `content/episodes/s01e12.ts`. Export `episode` using the `EpisodeSource` shape. One object per scene, with `ja` and `en` saying the same thing. Reuse the glossary forms (`巨人`, `駐屯兵団`, `エレン・イェーガー`, and the rest) so names stay stable.
3. Run:

```bash
npm run episode -- s01e12
```

That command:

- Downloads private subtitles into `data/raw/` when `privateSubs` URLs are set, and only if the file is not already there.
- Refuses to continue if the new script copies a subtitle line (16 characters or longer after punctuation is removed).
- Prints frequent subtitle lemmas that the retelling never used, as words only, so the next draft can pick them up.
- Tokenizes the Japanese with kuromoji, applies `data/glossary.json`, and looks up other words in the common JMdict slice.
- Speaks each scene with [edge-tts](https://github.com/rany2/edge-tts) and writes 48 kbps mono mp3 files.
- Publishes `public/episodes/s01e12.json`, `public/audio/s01e12/`, and `public/catalog.json`.

Rebuild audio from scratch with `npm run episode -- s01e12 --audio`. Skip speech with `--no-audio`.

Install the speech tools once:

```bash
pip install edge-tts
```

`ffmpeg` and `ffprobe` are used to compress the audio and read its length. Voices and pace live on the episode (`jaVoice`, `enVoice`) and in `AOT_TTS_RATE` (default `-8%`).

To extend the glossary, add an entry to `data/glossary.json`. Longer forms win, so `エレン・イェーガー` is not split into `エレン`.

## File structure

```
content/episodes/     original scripts, one file per episode (safe to commit)
data/series.json      season and episode catalog, including future episodes
data/glossary.json    shared readings and English renderings
data/raw/             private subtitle downloads (gitignored, never shipped)
data/cache/           JMdict cache for the build (gitignored)
public/episodes/      published episode: scenes, tokens, vocab, durations
public/audio/<id>/    ja-01.mp3 and en-01.mp3, aligned by scene id
public/catalog.json   which episodes are ready, and how long they are
scripts/build-episode.ts
src/app/              the player, the word list, the glossary
```

Raw `.ass` and `.srt` files are gitignored everywhere, not only under `data/raw/`.

## Private subtitles

Episode 11’s vocabulary pass used:

- Japanese: kitsunekko, group **Kamigami**, `[Kamigami] Shingeki no Kyojin - 11 … Sub(GB,Big5,Jap).ass`. The loose Season 1 file for this episode is Kamigami’s. Coalgirls is a `.7z` of the season, HorribleSubs Season 1 is a `.rar`, and Judas is a zip, so they are not what the build fetched.
- English: the subtitle archival repo, group **Funimation [CC]**, `Attack On Titan - 11.srt`.

The build keeps the Japanese style named `JP` and drops signs, credits, Chinese styles, and karaoke. Those cues are held in memory for the overlap check and then discarded.

## Deploy

GitHub Pages serves the static export at [https://jsboki.github.io/kyojin-hour/](https://jsboki.github.io/kyojin-hour/). `.github/workflows/pages.yml` builds `out/` and deploys it on every push to `main`. In the repository settings, set Pages to deploy from GitHub Actions.

The site uses base path `/kyojin-hour`. Anki decks are built in the browser. The kuromoji dictionary is copied into `public/kuromoji` at build time and loaded from `/kyojin-hour/kuromoji/`.

`render.yaml` is still there if a free web-service slot opens later. Its build command is `npm install && npm run build`, its start command is `npm start` (`next start --hostname 0.0.0.0 --port ${PORT:-43123}`), and its health check path is `/`. The Pages site does not use that process.

Do not commit raw `.ass` or `.srt` files. The public tree should keep only the original scripts, the generated narration, and the app.

## Tests

```bash
npm test
```

The tests cover scene-position math, glossary matching, the subtitle-overlap guard, and the CSV export. When `public/episodes/s01e11.json` exists, they also check that the Japanese audio lands between 7 and 14 minutes and that no raw subtitle timing is in the published file.
