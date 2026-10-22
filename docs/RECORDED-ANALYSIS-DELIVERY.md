# Recorded Radio and LSS analysis

This bounded subflow accepts supplied files. It does not acquire radio signals or galaxies,compute a period/dispersion,or complete either original exercise. Manual measurements stay manual.

## Radio data

Open `http://127.0.0.1:5173/#pulsar-analysis` after local candidate promotion. Choose **Radio data**,then load an admitted `.PLR` recording. Close Properties,place the panel/reference cursors manually (keyboard or pointer),and use **Record current measurements…**. Cancel leaves the confirmed list unchanged;OK records the entered comment and manual values. Review is currently read-only.

Synthetic UI control: `/home/dobleuber/Documents/Codex/2026-10-18/task-3/manual-recorded-lab-controls/synthetic-ui-control.plr`. This is a test vector,not an original observation. Download original recording bytes,load them again and compare their SHA-256. This is byte copying,not a native writer. Switch to Observatory and back,or use browser history:confirmed measurements remain;hidden tools stop pan/late loads. Reload discards this workspace,as the visible warning states. It is excluded from Save investigation.

## LSS data

Open `http://127.0.0.1:5173/#lss-wedge` after local candidate promotion. Load the admitted saved LSS text header/records;inspect a row or plotted point. Open Options,change grid/point size,then Cancel to preserve the committed options or OK to apply. The background input is disabled and inert under Options;the App header and investigation toolbar are also inert until Options closes. Leaving the route through browser history or a hash change while Options is open still cancels the unconfirmed draft;committed options and rows stay.

Synthetic controls: `synthetic-lss-a.txt` and `synthetic-lss-b.txt` in the same local control folder. Load A,then B:answer the retain/replace questions explicitly. Cancel/Escape preserves the confirmed rows. A waiting question is named in the polite status even when focus stays elsewhere. Try `invalid-recording.plr` in the Radio route to check rejection without replacing confirmed work. Cancel the browser file chooser to keep the current data.

Download plotted data exports a new OpenVireo CSV with source hashes and saved binary32 values;it is not the native writer. Original raw lines and receipts remain visible. Navigation preserves confirmed rows/options;reload discards this window-local workspace. Save investigation does not include it.

## Evidence and limits

Claude authored/reviewed the isolated fronts;Codex independently checked their state/scientific contracts,controlled before/after boundaries,types/build and desktop/mobile browser flows. The latest frontend receipts are [PLR](PULSAR-ANALYSIS-VALIDATION.json) and [LSS](WEDGE-PLOT-VALIDATION.json). The LSS receipt's source hashes and1799-unit run describe the standalone snapshot(i18n coverage pin48);the combined App pins49 because it also contains `PulsarAnalysis.tsx`,recorded separately as its `integratedOverride`. App-route behavior is exercised by [the route spec](../tests/recorded-analysis-navigation.spec.ts). Aggregate App validation and the separate integration review must pass before local promotion. No push or deployment is part of this increment.

Browser focus/live-region checks are Chromium DOM evidence,not NVDA/VoiceOver or Windows timing/pixel fidelity. A controlled disabled-at-commit fixture is explicitly separate from observed host behavior. Numerical Single/Number/Extended policies are declared;no native FPU oracle is claimed. The LSS Options/import overlap rule currently lives in React;direct pure-core callers can still request that overlap. Host inertness under LSS Options is DOM/Chromium accessibility-tree evidence;a scripted `element.click()` still bypasses `inert`,as the HTML specification allows. No missing date/catalog/measurement is filled in.

Panel text in both routes comes from their own typed English catalogs(`PulsarMessages`,`WedgeMessages`,with typed override props);the shared `en.json` provides only the navigation/route-shell keys,and the App passes no overrides. A future shared-catalog locale would therefore translate the shell but not the panel bodies until those overrides are wired. This is a recorded wiring limit for optional later locales;it does not change P01's acceptance for the authored English UI.

The next supported original flow is transactional PLR Review:working copy,confirmed Delete,outer Cancel/OK. Its recovered contract is prepared;it is not implemented by this delivery. Full acceptance remains1complete/37partial/19contract-gated/1not-started of58functional capabilities,plus6quality rows.
