import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <p className="eyebrow">Legal</p>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated: 20 July 2026</p>

      <h2>On-device data</h2>
      <p>
        Saved concepts, recently viewed cards, theme, usage habits, and
        entitlement state are stored locally on your device. Merixa does not
        require an account.
      </p>

      <h2>Tutor</h2>
      <p>
        The Practitioner&apos;s Guide learning experience spans Tutor, Library,
        Paths, and Saved. The tutor teaches from retrieved Guide cards. When the live ML
        service is configured, the request may include your question, recent chat
        turns, retrieved cards, and a short on-device habit summary (preferred
        bodies and themes). Merixa does not create a user account or keep a
        server-side profile of your chat.
      </p>

      <h2>Background corpus learning</h2>
      <p>
        Merixa may run a scheduled enrichment job that rewrites allowlisted Guide
        excerpts into teaching summaries, workplace examples, and common mistakes.
        That job uses source excerpts and citation checks. It does not train on
        your private chat history.
      </p>

      <h2>On-device usage habits</h2>
      <p>
        To improve usability over time, the app stores anonymous usage patterns
        on this device only: screens you open, filters you use, concepts you
        open or save, and how you continue tutor lessons. These habits personalise
        starters and retrieval. Clear site data to reset them.
      </p>

      <h2>Translation</h2>
      <p>
        Optional translation is configured on the Language page. When you choose
        a language other than English, visible page text is processed by
        Google&apos;s translation service under Google&apos;s privacy terms.
        Formula blocks are excluded from translation where possible.
      </p>

      <h2>Purchase</h2>
      <p>
        Guide unlock (£7.99 / €8.99 / $9.99 once) is an Apple non-consumable
        In-App Purchase and includes AI Premium for 30 days from unlock. After
        that month, optional AI Premium (£7.99 / €8.99 / $9.99 per month) is an
        auto-renewable subscription to keep the online coach; otherwise the app
        continues as Offline Library. Premium uses a daily pace that resets each
        calendar day. Purchase receipts are verified with Apple before the app
        unlocks access. Merixa does not receive full payment card details.
        Restore and subscription management use your Apple ID (iOS Settings →
        Subscriptions).
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:privacy@merixa.co.uk">privacy@merixa.co.uk</a>
      </p>
      <p className="legal-links">
        <Link href="/terms/">Terms</Link>
        <Link href="/support/">Support</Link>
        <Link href="/">Back to Tutor</Link>
      </p>
    </article>
  );
}
