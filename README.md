# Courtroom of Agents

Put any decision on trial. A prosecutor argues against it, a defender argues
for it, and a judge scores both sides and delivers a verdict that cites the
transcript line by line.

## How it works

1. **Pick a recorded case** from the library, or **bring your own decision**
   (question + context + stakes).
2. The trial runs in a fixed procedure: **3 rounds, hard cap**. Prosecutor,
   then defender, each round; the judge cross-examines after rounds 2 and 3,
   then delivers the verdict.
3. **Anti-agreement rules are enforced, not suggested**: each advocate must
   steelman the other side's strongest point once per round before rebutting
   it; "I agree" and equivalent phrases are banned in code — a live turn
   containing one is re-requested once, then dropped with a note in the
   transcript. The judge scores (Evidence / Logic / Risk, 0–10 each) rather
   than summarising, and the verdict must cite at least 3 specific turns
   with quoted lines, or it is rejected and retried.
4. **Object** at any point to inject a fact ("churn rose 8% last quarter");
   the judge must address it. **Challenge the verdict** in one sentence —
   if the challenge finds a real gap, the judge revises, and both verdicts
   stay on the record.
5. **Export** the full transcript as Markdown. Every trial is saved in the
   browser's local storage; reopen or delete it from History.

## No key? It still works

There are no API keys in this repo and none are needed to demo it. The four
cases in the library are **pre-recorded transcripts, labelled "Recorded
replay" on every screen** — they play turn by turn with the same UI as a
live trial. They are never presented as live debates.

A custom decision without a key gets a **preparation brief** — the three
questions each side must answer — labelled plainly as a brief, not a trial.
Nothing is faked.

## Live trials (your own free key)

Get a free key from [Google AI Studio](https://aistudio.google.com/apikey),
paste it in Settings. It is stored in `localStorage` only and sent only to
Google's API. Default model is `gemini-3.5-flash` (free tier; verified
23 Nov 2026 — `gemini-2.5-flash` returns 404 "no longer available to new
users" for new keys). `gemini-3.8-flash` and `gemini-3.5-flash-lite` are
also offered. If the API fails mid-trial, the trial stops at the last
completed turn, the partial transcript is saved, and the app says so — it
never invents the missing turns.

## Run it

No build step, no server. Open `index.html` in a browser, or serve the
folder with any static host (`python3 -m http.server`, GitHub Pages).

Deep links: `index.html?case=coa-2026-001&autoplay=1` (or
`#case=coa-2026-001&autoplay=1` for `file://` URLs) opens a recorded case
and plays it.

## Tests

```sh
node --test tests/courtroom.test.js   # 15 tests, 0 failures
node scripts/smoke.mjs               # 19 checks in headless Chrome
node scripts/shots.mjs               # screenshots at 1280px + 390px
```

Unit tests cover the turn order and round cap, banned-phrase detection,
prompt rules, verdict parsing/validation, the Gemini client (stubbed
fetch), the one-retry rule, the honest replay revision, Markdown export,
and the seed library (every verdict valid, every citation quoting a line
that actually appears in the cited turn). The smoke test drives the real
UI in headless Chrome: replay, verdict, citation jump, objection,
challenge, the no-key brief, key save/remove, and history.

## Design

Burgundy `#7F1D1D` on paper `#FAF7F1`, Source Serif 4 (self-hosted) with
IBM Plex Mono for case numbers and scores. The signature idea is the court
docket: case numbers, ruled transcript lines, "Exhibit" evidence labels,
a verdict set like a stamp. References: Mobbin (dense record layout),
Land-book (type-led hierarchy), Minimal Gallery (restraint). No gradients,
no glows, no emoji, no cliché copy.

## Honest limits

- No key, no live debate. Recorded cases are replays.
- Live debate needs network access to Google's API and a free key.
- A verdict is a model judgement, not a fact. The transcript and
  citations exist so you can check the reasoning.
- No server, no accounts, no sharing: trials live in the user's browser
  only. The plan's Next.js + FastAPI + LangGraph + SQLite architecture
  was deliberately replaced with a serverless single-page app so the demo
  never depends on a backend being up; the debate procedure (fixed
  rounds, forced stances, rubric judge, cited verdict) is implemented
  in full in `js/courtroom.js`.

## Files

- `index.html`, `styles.css` — UI
- `js/courtroom.js` — pure debate logic + Gemini client (also the unit-test target)
- `js/seed.js` — the four recorded cases
- `js/app.js` — UI orchestration, replay/live runners, storage
- `tests/courtroom.test.js` — unit tests
- `scripts/shots.mjs`, `scripts/smoke.mjs` — headless-Chrome screenshots + smoke test
- `fonts/` — self-hosted Source Serif 4 + IBM Plex Mono (OFL)
- `PLAN.md` — the deepened SaaS-level plan
- `screenshots/` — desktop + mobile renders

## License

MIT — see `LICENSE`.
