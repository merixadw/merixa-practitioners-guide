"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATALOG, PRODUCT_IDS, loadStorePrices } from "@/lib/entitlements";
import { useEntitlements } from "./EntitlementsProvider";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const lockedBuild = process.env.NEXT_PUBLIC_GUIDE_PREVIEW_LOCKED === "true";
  const { unlocked, ready, purchase, restore, nativeBilling } =
    useEntitlements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storePrice, setStorePrice] = useState<string | null>(null);

  const mustGate = nativeBilling || lockedBuild;

  useEffect(() => {
    if (!nativeBilling) return;
    let cancelled = false;
    void loadStorePrices().then((prices) => {
      if (!cancelled && prices.unlock) setStorePrice(prices.unlock);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeBilling]);

  // Web preview: never block first paint on entitlements bootstrap.
  // (SSR starts with ready=false; Device Lab / slow hydrate used to stick on "Loading…".)
  if (!mustGate) {
    return children;
  }

  if (!ready) {
    return (
      <section className="paywall" aria-busy="true">
        <p className="eyebrow">
          Merixa · Practitioner&apos;s Guide
        </p>
        <h1>Checking App Store access…</h1>
      </section>
    );
  }

  if (unlocked) return children;

  const unlock = CATALOG.unlock;
  const priceLabel = storePrice ?? unlock.price.gbp;
  const priceHint = storePrice
    ? "one-time · App Store"
    : `once · ${unlock.price.eur} / ${unlock.price.usd}`;

  return (
    <section className="paywall">
      <p className="eyebrow">One-time unlock · first month of AI included</p>
      <h1>Keep a practitioner&apos;s guide in your pocket.</h1>
      <p>
        Library, Paths, and Saved offline — plus AI Premium free for 30 days.
        After that, subscribe only if you want to keep live coaching.
      </p>
      <p className="paywall-price">
        {priceLabel} <span>{priceHint}</span>
      </p>
      <ul className="paywall-benefits">
        <li>Full Library concept detail</li>
        <li>Paths and Saved for browsing</li>
        <li>AI Premium included for 30 days</li>
        <li>Then subscribe — or stay Offline</li>
      </ul>
      {error ? <p className="paywall-error">{error}</p> : null}
      <button
        type="button"
        className="primary-button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void purchase("unlock")
            .catch((err: unknown) => {
              const message =
                err instanceof Error
                  ? err.message
                  : "Purchase could not complete. Try again.";
              setError(message);
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Working…" : nativeBilling ? "Unlock with Apple" : "Unlock Guide"}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void restore()
            .catch((err: unknown) => {
              const message =
                err instanceof Error
                  ? err.message
                  : "Restore failed. Use the same Apple ID.";
              setError(message);
            })
            .finally(() => setBusy(false));
        }}
      >
        Restore purchase
      </button>
      <p className="paywall-note">
        StoreKit product <code>{PRODUCT_IDS.unlock}</code>. Unlock includes 30
        days of AI Premium; afterwards subscribe at{" "}
        {CATALOG.aiPremium.price.gbp}/mo or keep Offline Library. Offline Tutor
        stays with Guide unlock.
        {nativeBilling
          ? " Purchases are verified with Apple before access is granted."
          : " Web builds use a preview shell; native iOS uses StoreKit."}
      </p>
      <p className="legal-links">
        <Link href="/privacy/">Privacy</Link>
        <Link href="/terms/">Terms</Link>
        <Link href="/support/">Support</Link>
      </p>
    </section>
  );
}
