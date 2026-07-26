# Device Lab — iOS design preview on Windows

Local **environment suite** for layout and UI testing of Merixa (and any URL) inside iPhone / iPad frames.

This is **not** Apple’s Simulator. On Windows you cannot run Xcode Simulator natively. Use this lab for design; use a Mac or cloud Mac for StoreKit / Cap plugins / TestFlight.

## Quick start

**Terminal 1 — app**

```bash
npm run dev
```

**Terminal 2 — lab**

```bash
npm run device-lab
```

Opens a free port starting at **3920** (auto-skips if busy) with App URL `http://127.0.0.1:3000/ask/`.

**Requires `npm run dev` running.** The lab pings that URL (up to 60s) — Next’s first compile can be slow; a short timeout used to falsely show “Cannot reach”.

If frames still show **Loading…**, hard-reload the lab after AccessGate web-preview fix (web no longer blocks on entitlements bootstrap). Clear saved lab URL in the App URL field if it still points at a dead host.

| Control | Purpose |
|--------|---------|
| Devices | iPhone 16 Pro / Pro Max / SE / iPad mini |
| Orientation | Portrait / landscape |
| Scale | Fit multiple frames on one screen |
| Safe-area guides | Visualise notch / home-indicator insets |
| Presets | Phone only · Phone + SE · + iPad |

Point **App URL** at any local or staging build (other ports, preview deploys).

## What this covers

- Bottom nav, Tutor chat, Library, Paths, sheets / modals at phone widths  
- Safe-area collisions (status bar, home indicator)  
- Side-by-side SE vs Pro layout checks  

## What needs real iOS

| Need | Path |
|------|------|
| Capacitor native shell | Mac + Xcode: `npm run ios:sync` then `npm run cap:open` |
| StoreKit / IAP | Device or Simulator on macOS |
| Push / Keychain / biometric | Real device or Simulator |
| App Store screenshots | Simulator or device (see `store/SCREENSHOTS.md`) |

### Cloud / Mac options (real Simulator)

1. **Mac in the cloud** — [MacStadium](https://www.macstadium.com/), [AWS EC2 Mac](https://aws.amazon.com/ec2/instance-types/mac/), [GitHub macOS runners](https://docs.github.com/en/actions/using-github-hosted-runners) for CI builds.  
2. **Browser-hosted iOS streams** — [Appetize.io](https://appetize.io/), [BrowserStack App Live](https://www.browserstack.com/app-live) (upload `.ipa` or stream a build).  
3. **Physical iPhone** — TestFlight / USB debug once you have a signed build from a Mac.

Apple’s licence does **not** allow running macOS in a VM on non-Apple hardware. Prefer cloud Mac or a real Mac mini for Simulator.

## Capacitor note

This repo’s `ios/` tree is currently a stub (`.gitkeep`). Full native project generation needs a Mac:

```bash
npx cap add ios   # on macOS, once
npm run ios:sync
npm run cap:open
```

Until then, **Device Lab + `npm run dev`** is the Windows design loop.

## Scripts

| Script | Action |
|--------|--------|
| `npm run device-lab` | Serve lab (auto free port from :3920) and open browser |
| `npm run device-lab:serve` | Serve only (no auto-open) |
