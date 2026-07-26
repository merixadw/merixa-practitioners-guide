import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Terms of use</h1>
      <p className="muted">Last updated: 20 July 2026</p>

      <h2>Learning support</h2>
      <p>
        The Guide is educational and supports workplace preparation. It is not
        an exam tuition platform and does not provide statutory audit,
        assurance, legal, tax, valuation, investment, or guaranteed compliance
        advice.
      </p>

      <h2>Professional sources</h2>
      <p>
        Cards are concise concept explanations attributed to their relevant
        professional bodies. Always verify current requirements in the official
        standard or professional body source before making a material conclusion.
      </p>

      <h2>Purchase</h2>
      <p>
        Guide unlock is a one-time, non-consumable Apple purchase (£7.99 /
        €8.99 / $9.99). It does not auto-renew. It includes Offline Library
        access and AI Premium for 30 days from unlock. After that month,
        optional AI Premium (£7.99 / €8.99 / $9.99 per month) is the
        auto-renewable online coach subscription (managed in Apple
        Subscriptions); if you do not subscribe, the app stays Offline Library.
        Premium uses a daily pace that resets each calendar day (about 10 live
        asks, up to 5 heavy coach modes) so capacity lasts the month. Restore
        purchases with the same Apple ID after reinstalling or changing devices.
        Billing is iOS-only in v1.
      </p>

      <h2>ML answers</h2>
      <p>
        Offline Tutor teaches from Guide cards on device. Live AI Premium
        answers are grounded in cited Guide cards but can still be incomplete.
        Professional judgement and review remain required. When today&apos;s
        live pace is used, Library stays open and coaching continues tomorrow.
      </p>

      <p className="legal-links">
        <Link href="/privacy/">Privacy</Link>
        <Link href="/support/">Support</Link>
        <Link href="/">Back to Tutor</Link>
      </p>
    </article>
  );
}
