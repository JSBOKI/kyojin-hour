"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AnnotatedToken } from "@/lib/annotate";
import { withBase } from "@/lib/base-path";
import { episodePosition, formatClock, positionAfterLanguageSwitch } from "@/lib/player-time";
import type { PublishedEpisode } from "@/lib/published";
import { cn } from "@/lib/utils";

type Lang = "ja" | "en";

export function Player({ episode }: { episode: PublishedEpisode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingRatio = useRef(0);
  const wantPlay = useRef(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [lang, setLang] = useState<Lang>("ja");
  const [furigana, setFurigana] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [active, setActive] = useState<AnnotatedToken | null>(null);
  const [audioError, setAudioError] = useState("");

  const segment = episode.segments[segmentIndex];
  const durations = episode.segments.map((item) => (lang === "ja" ? item.jaDuration : item.enDuration));
  const sceneDuration = durations[segmentIndex] ?? 0;
  const position = episodePosition(durations, segmentIndex, current);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("kyojin-lang");
      const savedRuby = localStorage.getItem("kyojin-furigana");
      if (savedLang === "en" || savedLang === "ja") setLang(savedLang);
      if (savedRuby === "off") setFurigana(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segment) return;
    const url = withBase(lang === "ja" ? segment.jaAudio : segment.enAudio);
    const ratio = pendingRatio.current;
    setAudioError("");
    audio.src = url;
    const onReady = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const nextTime = positionAfterLanguageSwitch(ratio * audio.duration, audio.duration, audio.duration);
        audio.currentTime = Math.min(Math.max(0, nextTime), Math.max(0, audio.duration - 0.05));
      }
      if (wantPlay.current) {
        void audio.play().catch(() => setPlaying(false));
      }
    };
    audio.addEventListener("loadedmetadata", onReady);
    return () => audio.removeEventListener("loadedmetadata", onReady);
  }, [segment, lang]);

  function switchLanguage(next: Lang) {
    if (next === lang) return;
    const audio = audioRef.current;
    pendingRatio.current = audio && audio.duration ? audio.currentTime / audio.duration : 0;
    wantPlay.current = !audio?.paused;
    setLang(next);
    try {
      localStorage.setItem("kyojin-lang", next);
    } catch {
      /* ignore */
    }
  }

  function goTo(index: number) {
    pendingRatio.current = 0;
    wantPlay.current = Boolean(audioRef.current && !audioRef.current.paused);
    setCurrent(0);
    setSegmentIndex(index);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantPlay.current = true;
      void audio.play().catch(() => setAudioError("The audio file did not start. Try the other scene, or rebuild this episode."));
    } else {
      wantPlay.current = false;
      audio.pause();
    }
  }

  if (!segment) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-lg text-muted-foreground">
          Season {episode.season} · Episode {episode.episode}
        </p>
        <h1 className="mt-1 text-4xl font-semibold leading-tight">{episode.titleEn}</h1>
        <p className="mt-1 text-2xl">{episode.titleJa}</p>
      </div>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="text-lg text-muted-foreground">
          Scene {segmentIndex + 1} of {episode.segments.length}
        </p>
        <h2 className="mt-1 text-3xl font-semibold leading-snug">
          {lang === "ja" ? segment.titleJa : segment.titleEn}
        </h2>
        <p className="mt-2 text-xl tabular-nums">
          {formatClock(position.current)} / {formatClock(position.total)}
        </p>
        <label className="mt-3 block text-lg" htmlFor="scene-position">
          Position in this scene
        </label>
        <input
          id="scene-position"
          className="seek mt-1"
          type="range"
          min={0}
          max={Math.max(sceneDuration, 0.1)}
          step={0.1}
          value={Math.min(current, sceneDuration || 0)}
          aria-valuetext={formatClock(current)}
          onChange={(event) => {
            const next = Number(event.target.value);
            setCurrent(next);
            if (audioRef.current) audioRef.current.currentTime = next;
          }}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" size="touch" variant={lang === "ja" ? "default" : "outline"} aria-pressed={lang === "ja"} onClick={() => switchLanguage("ja")}>
            Japanese
          </Button>
          <Button type="button" size="touch" variant={lang === "en" ? "default" : "outline"} aria-pressed={lang === "en"} onClick={() => switchLanguage("en")}>
            English
          </Button>
        </div>
        <p className="mt-2 text-base text-muted-foreground">
          {lang === "ja" ? "Japanese narrator, Nanami" : "English narrator, Guy"}. The scene stays put when you switch.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" size="touch" variant="outline" onClick={() => goTo(Math.max(0, segmentIndex - 1))} disabled={segmentIndex === 0}>
            Previous
          </Button>
          <Button type="button" size="touch" onClick={togglePlay}>
            {playing ? "Pause" : "Play"}
          </Button>
        </div>
        <Button
          type="button"
          size="touch"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => goTo(Math.min(episode.segments.length - 1, segmentIndex + 1))}
          disabled={segmentIndex === episode.segments.length - 1}
        >
          Next scene
        </Button>
        {audioError ? <p className="mt-3 text-lg text-destructive">{audioError}</p> : null}
      </section>

      <section className="rounded-3xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Read along</h2>
          <Button
            type="button"
            size="touch"
            variant={furigana ? "default" : "outline"}
            aria-pressed={furigana}
            onClick={() => {
              const next = !furigana;
              setFurigana(next);
              try {
                localStorage.setItem("kyojin-furigana", next ? "on" : "off");
              } catch {
                /* ignore */
              }
            }}
          >
            Furigana
          </Button>
        </div>
        <Transcript
          primary={lang}
          furigana={furigana}
          ja={segment.ja}
          en={segment.en}
          tokens={segment.tokens}
          onPick={setActive}
        />
      </section>

      <Link
        href={`/listen/${episode.id}/words`}
        className={cn(buttonVariants({ size: "touch", variant: "secondary" }), "w-full")}
      >
        Words in this episode
      </Link>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Scenes</h2>
        <ol className="flex flex-col gap-3">
          {episode.segments.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => goTo(index)}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-xl",
                  index === segmentIndex ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                <span>
                  {index + 1}. {lang === "ja" ? item.titleJa : item.titleEn}
                </span>
                <span className="shrink-0 tabular-nums">{formatClock(lang === "ja" ? item.jaDuration : item.enDuration)}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-lg leading-relaxed text-muted-foreground">{episode.personalUse} Watch the episode on your own legal copy. This audio is an original summary, not the show.</p>

      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (segmentIndex < episode.segments.length - 1) {
            pendingRatio.current = 0;
            wantPlay.current = true;
            setSegmentIndex((index) => index + 1);
            setCurrent(0);
          } else {
            wantPlay.current = false;
            setPlaying(false);
          }
        }}
        onError={() => setAudioError("This scene’s audio is missing.")}
      />

      <Sheet open={Boolean(active)} onOpenChange={(open) => { if (!open) setActive(null); }}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pt-6">
          {active ? (
            <>
              <SheetHeader className="p-0">
                <SheetTitle className="text-5xl leading-tight">{active.surface}</SheetTitle>
                <SheetDescription className="text-2xl text-foreground">
                  {active.reading || "Reading unavailable"}
                </SheetDescription>
              </SheetHeader>
              <p className="mt-4 text-2xl leading-snug">
                {active.meaning ?? "No English gloss for this word yet."}
              </p>
              <p className="mt-2 text-lg capitalize text-muted-foreground">
                {active.posLabel}
                {active.source === "glossary" ? " · series glossary" : ""}
              </p>
              {active.note ? <p className="mt-4 text-xl leading-relaxed">{active.note}</p> : null}
              {active.grammar ? <p className="mt-4 text-xl leading-relaxed">{active.grammar}</p> : null}
              {active.senses.length ? (
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  Also: {active.senses.join("; ")}
                </p>
              ) : null}
              <Button type="button" size="touch" variant="outline" className="mt-6 mb-4 w-full" onClick={() => setActive(null)}>
                Close
              </Button>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Transcript({
  primary,
  furigana,
  ja,
  en,
  tokens,
  onPick,
}: {
  primary: Lang;
  furigana: boolean;
  ja: string;
  en: string;
  tokens: AnnotatedToken[];
  onPick: (token: AnnotatedToken) => void;
}) {
  const japanese = (
    <p className={cn("leading-[2.15]", primary === "ja" ? "text-[1.7rem]" : "text-2xl")}>
      {tokens.map((token, index) =>
        token.pos === "記号" ? (
          <span key={`${token.surface}-${index}`}>{token.surface}</span>
        ) : (
          <button
            key={`${token.surface}-${index}`}
            type="button"
            className={cn(
              "mx-0.5 my-1 inline rounded-lg px-1 py-0.5 text-left underline-offset-[0.45em] hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring",
              token.key && "underline decoration-dotted",
            )}
            onClick={() => onPick(token)}
            aria-label={`${token.surface}, ${token.reading || "no reading"}, ${token.meaning ?? "no definition"}`}
          >
            {furigana && token.rubies.some((ruby) => ruby.reading) ? (
              <Ruby token={token} />
            ) : (
              token.surface
            )}
          </button>
        ),
      )}
    </p>
  );
  const english = (
    <p className={cn("leading-relaxed", primary === "en" ? "text-2xl" : "text-xl")}>{en || ja}</p>
  );
  return (
    <div className="mt-4 flex flex-col gap-5">
      {primary === "ja" ? japanese : english}
      <div>
        <p className="mb-2 text-lg text-muted-foreground">{primary === "ja" ? "English" : "Japanese"}</p>
        {primary === "ja" ? english : japanese}
      </div>
    </div>
  );
}

function Ruby({ token }: { token: AnnotatedToken }) {
  return (
    <>
      {token.rubies.map((ruby, index) =>
        ruby.reading ? (
          <ruby key={`${ruby.text}-${index}`}>
            {ruby.text}
            <rt>{ruby.reading}</rt>
          </ruby>
        ) : (
          <span key={`${ruby.text}-${index}`}>{ruby.text}</span>
        ),
      )}
    </>
  );
}
