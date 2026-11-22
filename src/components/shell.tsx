"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Episodes" },
  { href: "/glossary", label: "Glossary" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleNight() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("kyojin-theme", next ? "dark" : "light");
    } catch {
      /* private mode */
    }
    setNight(next);
  }

  return (
    <>
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pt-4">
        <Link href="/" className="min-h-14 text-2xl font-semibold tracking-tight">
          Kyojin Hour
        </Link>
        <Button type="button" size="touch" variant="outline" onClick={toggleNight} aria-pressed={night}>
          {night ? "Day" : "Night"}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-2 pb-[env(safe-area-inset-bottom)]">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-h-16 items-center justify-center text-lg font-semibold",
                  active ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
