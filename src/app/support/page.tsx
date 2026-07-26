import Link from "next/link";

export default function SupportPage() {
  return (
    <article className="legal-page">
      <p className="eyebrow">Help</p>
      <h1>Support</h1>

      <h2>Access — Offline and Online</h2>
      <p>
        Guide unlock is £7.99 once (also €8.99 / $9.99) via Apple In-App Purchase
        and includes AI Premium for 30 days. On iOS, use Restore Purchase with
        the same Apple ID if access is missing after reinstalling. Purchases are
        verified with Apple before the app unlocks. Manage or cancel
        subscriptions in Apple Subscriptions.
      </p>
      <ul>
        <li>
          <strong>First 30 days</strong> — unlock includes live AI Premium
          coaching alongside full Library, Paths, and Saved.
        </li>
        <li>
          <strong>Offline</strong> (after the included month, if you do not
          subscribe) — full Library, Paths, and Saved for reading; assisted
          training chips need Premium again.
        </li>
        <li>
          <strong>AI Premium</strong> (£7.99/mo after the included month) — keep
          live coach with daily pace: about 10 live asks per day and up to 5
          heavy modes (board pack, judgement, stress-test, harder example,
          implication). Pace resets tomorrow. Compressed on-device inventory
          keeps heavy coaching first; replaying from inventory does not use
          today&apos;s pace.
        </li>
      </ul>
      <p>
        AI Lite is no longer offered. Existing Lite subscribers keep online
        access until their current period ends (treated as Premium access).
        When today&apos;s pace is used, Library stays open, inventory replays
        still work, and live coaching continues the next day.
      </p>

      <h2>What&apos;s new and continue path</h2>
      <p>
        When the Library grows over the air, Tutor shows a What&apos;s new badge.
        Your last Paths step also appears on Tutor home so you can continue
        offline or with a live spreadsheet demo.
      </p>

      <h2>App Store</h2>
      <p>
        Billing is iOS In-App Purchase only in v1. Create or manage AI
        subscriptions in Apple Subscriptions (Settings → Apple ID →
        Subscriptions).
      </p>

      <h2>Tutor chat offline</h2>
      <p>
        Offline mode retrieves Guide cards and teaches in short chat steps.
        Live tutor responses need AI Premium and a configured tutor service.
        Your saved cards and on-device habits continue to work offline.
        Corpus updates can still arrive over the air.
      </p>

      <h2>Workplace application</h2>
      <p>
        Open a concept in Library or Paths and choose a live demo or lesson in
        Tutor. With AI, Paths return you to Tutor for the next demonstration;
        Library keeps the paced card.
      </p>

      <h2>Language</h2>
      <p>
        Set your display language once on the{" "}
        <Link href="/language/">Language</Link> page. Translation applies across
        Tutor, Library, Paths, and all concept pages until you switch back to
        English.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@merixa.co.uk">support@merixa.co.uk</a>
      </p>

      <p className="legal-links">
        <Link href="/language/">Language</Link>
        <Link href="/privacy/">Privacy</Link>
        <Link href="/terms/">Terms</Link>
        <Link href="/">Back to Tutor</Link>
      </p>
    </article>
  );
}
