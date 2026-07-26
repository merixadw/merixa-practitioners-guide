# Real workbooks (S0)

Tutor spreadsheet demos export as real `.xlsx` files — Save and Share from the
sheet chrome. No network required; the file is built from the demo payload.

## Behaviour

| Action | Web | Native (iOS) |
|---|---|---|
| **Save .xlsx** | Browser download | Writes `Documents/Merixa/Workbooks/*.xlsx` |
| **Share** | Web Share API (fallback: download) | System share sheet with the file attached |

Catalog of recent saves: `localStorage` key `merixa.guide.savedWorkbooks.v1`.

## Mac / Xcode (Files app visibility)

After `npx cap add ios`, set in `ios/App/App/Info.plist`:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

Then workbooks under Merixa appear in the Files app → On My iPhone.

Also run:

```bash
npm install
npx cap sync ios
```

Plugins required: `@capacitor/filesystem`, `@capacitor/share` (same major as Cap 8).

## Manual check

1. Open Tutor → ask for a worked example with a spreadsheet visual
2. Step through cells → **Save .xlsx** → confirm file opens in Excel/Numbers
3. **Share** → Mail / Files / AirDrop
4. Background the app → reopen → file still on device
5. Airplane mode → Save still works from the last demo on screen

## Professor multi-tab (S3 · Premium)

Premium judgement / board / stress / harder / implication builds:

`Working` · `Checks` · `Watch-fors` · (`Memo` for board pack) · `Coach`

Lite stays on `Working` + `Coach` only. Harder example and Implication drill
surface Save/Share as the primary artefact in chat.
