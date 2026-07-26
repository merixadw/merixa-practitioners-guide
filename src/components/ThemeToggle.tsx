"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
const STORAGE_KEY = "mpg-theme";

function readTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Use the light default when storage is unavailable.
  }
  return "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this session.
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readTheme();
      applyTheme(stored);
      setTheme(stored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}${compact ? "" : " roomy"}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      disabled={!ready}
      onClick={toggle}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-glyph sun" />
        <span className="theme-switch-glyph moon" />
        <span className="theme-switch-thumb" />
      </span>
    </button>
  );
}
