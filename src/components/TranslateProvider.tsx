"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  includedLanguageCodes,
  languageLabel,
  PAGE_LANGUAGE,
  readTranslateLanguage,
  setGoogTransCookie,
  writeTranslateLanguage,
} from "@/lib/guide/translate";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages?: string;
              autoDisplay?: boolean;
              layout?: number;
            },
            elementId: string,
          ): void;
          InlineLayout: {
            SIMPLE: number;
          };
        };
      };
    };
  }
}

const SCRIPT_ID = "google-translate-script";
const MOUNT_ID = "google-translate-engine";
const COMBO_POLL_MS = 120;
const COMBO_POLL_MAX = 40;

type TranslateContextValue = {
  language: string;
  languageName: string;
  ready: boolean;
  setLanguage: (code: string) => void;
};

const TranslateContext = createContext<TranslateContextValue | null>(null);

function loadGoogleTranslateScript(onReady: () => void) {
  window.googleTranslateElementInit = onReady;

  if (document.getElementById(SCRIPT_ID)) {
    if (window.google?.translate) onReady();
    return;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

function findTranslateSelect(): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>(".goog-te-combo");
}

function applyViaSelect(targetCode: string): boolean {
  const select = findTranslateSelect();
  if (!select) return false;

  if (targetCode === PAGE_LANGUAGE) {
    if (select.value === PAGE_LANGUAGE || select.value === "") return true;
    select.value = PAGE_LANGUAGE;
  } else {
    select.value = targetCode;
  }

  select.dispatchEvent(new Event("change"));
  return true;
}

function waitForSelect(): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const tick = () => {
      const select = findTranslateSelect();
      if (select) {
        resolve(select);
        return;
      }
      attempts += 1;
      if (attempts >= COMBO_POLL_MAX) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, COMBO_POLL_MS);
    };
    tick();
  });
}

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState(PAGE_LANGUAGE);
  const [ready, setReady] = useState(false);
  const engineReady = useRef(false);
  const applying = useRef(false);

  const applyLanguage = useCallback(async (code: string, reloadIfNeeded = false) => {
    if (applying.current) return;
    applying.current = true;

    writeTranslateLanguage(code);
    setGoogTransCookie(code);
    setLanguageState(code);

    const applied = applyViaSelect(code);
    if (!applied && code !== PAGE_LANGUAGE && reloadIfNeeded) {
      window.location.reload();
      return;
    }

    if (!applied && code !== PAGE_LANGUAGE) {
      const select = await waitForSelect();
      if (select) {
        select.value = code;
        select.dispatchEvent(new Event("change"));
      }
    }

    applying.current = false;
  }, []);

  useEffect(() => {
    const stored = readTranslateLanguage();
    setGoogTransCookie(stored);
    setLanguageState(stored);

    loadGoogleTranslateScript(() => {
      if (engineReady.current) return;
      const mount = document.getElementById(MOUNT_ID);
      if (!mount || !window.google?.translate) return;

      mount.innerHTML = "";
      new window.google.translate.TranslateElement(
        {
          pageLanguage: PAGE_LANGUAGE,
          includedLanguages: includedLanguageCodes(),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        MOUNT_ID,
      );
      engineReady.current = true;

      void (async () => {
        await waitForSelect();
        setReady(true);
        if (stored !== PAGE_LANGUAGE) {
          await applyLanguage(stored, true);
        }
      })();
    });
  }, [applyLanguage]);

  useEffect(() => {
    if (!ready || language === PAGE_LANGUAGE) return;

    const timeout = window.setTimeout(() => {
      void applyLanguage(language, false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [pathname, ready, language, applyLanguage]);

  const setLanguage = useCallback(
    (code: string) => {
      const next = code || PAGE_LANGUAGE;
      const needsReload =
        next !== PAGE_LANGUAGE &&
        (language === PAGE_LANGUAGE || next !== language);

      void applyLanguage(next, needsReload);

      if (next === PAGE_LANGUAGE && language !== PAGE_LANGUAGE) {
        window.location.reload();
      }
    },
    [applyLanguage, language],
  );

  return (
    <TranslateContext.Provider
      value={{
        language,
        languageName: languageLabel(language),
        ready,
        setLanguage,
      }}
    >
      <div id={MOUNT_ID} className="google-translate-engine" aria-hidden="true" />
      {children}
    </TranslateContext.Provider>
  );
}

export function useTranslatePreference() {
  const context = useContext(TranslateContext);
  if (!context) {
    throw new Error("useTranslatePreference requires TranslateProvider");
  }
  return context;
}
