import Link from "next/link";
import { LanguageSettings } from "@/components/LanguageSettings";

export default function LanguagePage() {
  return (
    <article className="legal-page">
      <p className="eyebrow">Settings</p>
      <h1>Language</h1>
      <LanguageSettings />
      <p className="legal-links">
        <Link href="/support/">Support</Link>
        <Link href="/">Back to Tutor</Link>
      </p>
    </article>
  );
}
