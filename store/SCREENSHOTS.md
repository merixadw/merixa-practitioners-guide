# Screenshot kit (P3)

Capture on a Mac with Simulator or device. App Store requires device-sized
screenshots — do not upload desktop browser crops.

## Required sizes (minimum)

| Device class | Portrait size |
|---|---|
| iPhone 6.7" (e.g. 15 Pro Max / 16 Plus) | 1290 × 2796 |
| iPhone 6.1" (e.g. 15 / 16) | 1179 × 2556 |

iPhone-only for v1 (`TARGETED_DEVICE_FAMILY = 1` unless you intentionally ship iPad).

## Capture set (5–6 frames)

Use preview unlock + StoreKit config. Prefer light theme for 1–4; one dark frame optional.

1. **Tutor home** — Welcome + Continue path (if available) + coach chip; brand readable.
2. **Spreadsheet demo** — Live AI answer with spreadsheet visual mid-walkthrough (Lite or Premium sandbox).
3. **Library concept** — Definition → At work visible; storyline clear.
4. **Paths** — Flagship shelf open with a step and “Live demo” link.
5. **Paywall / Online coach sheet** — Unlock + Lite + Premium comparison (pricing clarity for review).
6. **Optional dark Tutor** — Same as frame 1 in dark mode.

## How to shoot (Simulator)

```bash
npm run ios:sync
npx cap open ios
```

1. Attach `storekit/Products.storekit` to the Run scheme (Edit Scheme → Run → Options → StoreKit Configuration).
2. Pick iPhone 16 Plus (6.7") then iPhone 16 (6.1").
3. Unlock Guide → subscribe Lite or Premium in-app for frames 2+.
4. ⌘S for screenshots; keep status bar clean (~9:41, full battery) if Simulator allows.
5. Save PNGs into `store/screenshots/6.7/` and `store/screenshots/6.1/` (gitignored binaries).

## Naming

```
01-tutor-home.png
02-spreadsheet-demo.png
03-library-concept.png
04-paths.png
05-upgrade-sheet.png
06-tutor-dark.png   # optional
```

## Caption ideas (optional)

- Offline Tutor + live AI coaching
- Step-by-step spreadsheet working examples
- Library storyline practitioners trust
- Paths that return you to Tutor
- Unlock once — AI optional
