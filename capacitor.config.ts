import type { CapacitorConfig } from "@capacitor/cli";

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
