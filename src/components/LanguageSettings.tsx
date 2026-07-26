"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TRANSLATE_LANGUAGES } from "@/lib/guide/translate";
import { useTranslatePreference } from "./TranslateProvider";

export function LanguageSettings() {
  const { language, languageName, ready, setLanguage } = useTranslatePreference();
  const [draft, setDraft] = useState(language);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(language);
  }, [language]);

  function save() {
    setLanguage(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="language-settings">
      <p className="language-settings-lead">
        Choose a language once. The app stays translated as you move between
        Tutor, Library, Paths, and concept pages. Formulas stay in English.
      </p>

      <label className="language-field" htmlFor="mpg-language-select">
        <span className="language-field-label">Display language</span>
        <select
          id="mpg-language-select"
          className="language-select"
          value={draft}
          disabled={!ready}
          onChange={(event) => setDraft(event.target.value)}
        >
          {TRANSLATE_LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="language-actions">
        <button
          type="button"
          className="language-save-btn"
          disabled={!ready || draft === language}
          onClick={save}
        >
          {saved ? "Saved" : "Apply language"}
        </button>
        {language !== "en" ? (
          <p className="language-current" role="status">
            Active: {languageName}
          </p>
        ) : null}
      </div>

      <p className="language-note muted">
        Translation is provided by Google Translate. Page text may be sent to
        Google when a language other than English is active.{" "}
        <Link href="/privacy/">Privacy policy</Link>
      </p>
    </section>
  );
}
