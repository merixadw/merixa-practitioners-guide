import type { CapacitorConfig } from "@capacitor/cli";

/**
 * webDir must stay `out` — produced by `npm run build:web`
 * (static export + stamped /guide shells + corpus). See CAPACITOR_SHIP.md.
 */
const config: CapacitorConfig = {
  appId: "uk.co.merixa.practitionersguide",
  appName: "Merixa Practitioner's Guide",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  plugins: {
    NativePurchases: {
      // Capgo StoreKit 2 — no extra config required for iOS.
    },
  },
};

export default config;
