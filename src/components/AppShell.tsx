"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccessGate } from "./AccessGate";
import { CutEndCacheBootstrap } from "./CutEndCacheBootstrap";
import { EntitlementsProvider } from "./EntitlementsProvider";
import { GuideStateProvider } from "./GuideState";
import { HabitsProvider } from "./HabitsProvider";
import { RetentionSheets } from "./RetentionSheets";
import { ThemeToggle } from "./ThemeToggle";
import { TranslateProvider } from "./TranslateProvider";
import { SeamlessCorpusProvider } from "@/lib/guide/seamless-corpus";

const NAV = [
  {
    href: "/",
    label: "Tutor",
    icon: "tutor",
    matches: (path: string) => path === "/" || path.startsWith("/ask"),
  },
  {
    href: "/library/",
    label: "Library",
    icon: "guide",
    matches: (path: string) =>
      path.startsWith("/library") || path.startsWith("/guide/"),
  },
  {
    href: "/paths/",
    label: "Paths",
    icon: "paths",
    matches: (path: string) => path.startsWith("/paths"),
  },
  {
    href: "/saved/",
    label: "Saved",
    icon: "saved",
    matches: (path: string) => path.startsWith("/saved"),
  },
] as const;

function screenTitle(pathname: string): string | null {
  if (pathname === "/" || pathname.startsWith("/ask")) return null;
  if (pathname.startsWith("/guide/")) return null;
  if (pathname.startsWith("/library")) return "Library";
  if (pathname.startsWith("/paths")) return "Paths";
  if (pathname.startsWith("/saved")) return "Saved";
  if (pathname.startsWith("/privacy")) return "Privacy";
  if (pathname.startsWith("/terms")) return "Terms";
  if (pathname.startsWith("/support")) return "Support";
  if (pathname.startsWith("/language")) return "Language";
  return "Merixa";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const legalRoute = ["/privacy", "/terms", "/support", "/language"].some(
    (route) => pathname.startsWith(route),
  );
  const chatRoute = pathname === "/" || pathname.startsWith("/ask");
  const detailRoute = pathname.startsWith("/guide/");
  const title = screenTitle(pathname);
  const shellClass = [
    "app-shell",
    "ml-owned",
    chatRoute ? "chat-mode" : "",
    detailRoute ? "detail-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <GuideStateProvider>
      <HabitsProvider>
        <EntitlementsProvider>
          <TranslateProvider>
            <SeamlessCorpusProvider>
              <CutEndCacheBootstrap />
              <RetentionSheets />
              <div className={shellClass}>
              <a className="skip-link" href="#main-content">
                Skip to content
              </a>

              {title ? (
                <header className="app-header">
                  <div className="screen-heading">
                    <p className="screen-kicker">
                      <span className="screen-kicker-mark">Merixa</span>
                      <span className="screen-kicker-sep" aria-hidden="true">
                        ·
                      </span>
                      <span>Practitioner&apos;s Guide</span>
                    </p>
                    <h1 className="screen-title">{title}</h1>
                  </div>
                  <ThemeToggle compact />
                </header>
              ) : null}

              <main
                id="main-content"
                className={
                  chatRoute
                    ? "app-main chat-main"
                    : detailRoute
                      ? "app-main detail-main"
                      : "app-main"
                }
                tabIndex={-1}
              >
                {legalRoute ? children : <AccessGate>{children}</AccessGate>}
              </main>

              <nav className="bottom-nav" aria-label="Primary" hidden={legalRoute}>
                {NAV.map((item) => {
                  const active = item.matches(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        active
                          ? item.label === "Tutor"
                            ? "bottom-link active primary"
                            : "bottom-link active"
                          : item.label === "Tutor"
                            ? "bottom-link primary"
                            : "bottom-link"
                      }
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={`nav-icon nav-icon-${item.icon}`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            </SeamlessCorpusProvider>
          </TranslateProvider>
        </EntitlementsProvider>
      </HabitsProvider>
    </GuideStateProvider>
  );
}
