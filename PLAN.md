# Courtroom of Agents — Plan (deepened to SaaS level)

## 1. What it is

Courtroom of Agents puts any decision on trial. You bring a decision —
"Should we kill our free tier?" — and three agents argue it in a fixed,
recorded procedure: the Prosecutor argues against the decision, the
Defender argues for it, and the Judge cross-examines both and delivers a
verdict that cites specific lines from the transcript. Nothing about the
trial is a summary after the fact; the transcript is the record, the
verdict is built from it, and you can challenge it.

Target user: a founder, product lead, or manager who has to make a
decision they will have to defend later, and wants the strongest version
of both sides on the record before they commit.

Core promise: in under five minutes, you get the strongest case for and
against a decision, a scored verdict with citations, and a transcript you
can hand to anyone who asks why.

## 2. Stack (verified 23 Nov 2026)

- Single-page app, plain HTML + CSS + vanilla JS. No build step, no
  server to keep alive. Opens from `index.html` directly, deploys to any
  static host (GitHub Pages).
- Live debate: Google Gemini API, REST `v1beta/models/{model}:generateContent`,
  model `gemini-3.5-flash` by default (free tier). Verified by web search
  23 Nov 2026: `gemini-2.5-flash` returns 404 "no longer available to new
  users" for new keys; `gemini-3.5-flash` and `gemini-3.5-flash-lite`
  answer on new free keys. Model picker also offers `gemini-3.8-flash`
  and `gemini-3.5-flash-lite`. Key is pasted by the user in Settings and
  stored in `localStorage` only — it never leaves the user's browser
  except in calls to Google's API.
- Persistence: `localStorage` (saved trials, settings). No account, no
  backend. A hosted SaaS version would move storage to Postgres and the
  Gemini calls behind an API, but this build is deliberately serverless
  so the demo never depends on a backend being up.
- Fonts self-hosted: Source Serif 4 (variable, OFL) + IBM Plex Mono.
- Tests: Node's built-in `node:test`, no dependencies.

## 3. Feature set

### 3.1 Bring a decision (new trial)
- Decision question (required, e.g. "Should we kill our free tier?").
- Context (free text: numbers, constraints, what is at stake).
- Stakes picker: Low / Medium / High — changes how hard the Judge
  weighs risk in the verdict.
- Side labels are fixed by the procedure, not chosen by the user:
  Prosecutor always argues AGAINST the decision, Defender always FOR it.
- Two paths after submit:
  - With an API key: a live trial runs (Section 3.2).
  - Without a key: no fake debate. The app shows a preparation brief —
    the question restated, the stakes, and the three questions each side
    must answer — labelled plainly as a brief, not a trial, with a clear
    path to add a key or open a recorded case instead.

### 3.2 Live trial (key present)
- Fixed procedure, hard cap of 3 rounds. Turn order per round:
  Prosecutor → Defender → (Judge cross-examination after round 2 and
  after round 3). No extra rounds, no free-form drift.
- Anti-agreement rules, enforced in every system prompt and checked in
  code: each side must steelman the other side's strongest point once
  per round before rebutting it; the phrases "I agree", "you're right",
  "as my colleague said" and equivalents are banned; a turn that
  contains a banned phrase is rejected and re-requested once, then
  dropped with a note in the transcript if it fails again.
- Judge scores each side live on a rubric — Evidence (0–10), Logic
  (0–10), Risk (0–10) — shown as bars beside the transcript. The Judge
  scores; it does not summarise.
- Per-turn timer: each turn shows how long it took; a turn that takes
  over 60 seconds is marked slow in the transcript.
- Verdict (structured JSON, validated, one retry on bad output):
  decision (uphold / overturn / amend), confidence 0–100, top 3
  arguments for each side, open risks, and at least 3 citations that
  reference specific turns by number and quote the line.
- If the API fails mid-trial: the trial stops at the last completed
  turn, the partial transcript is saved, and the app says so plainly.
  It never invents the missing turns.

### 3.3 Recorded cases (no key needed)
- Four seeded decisions, each with a full pre-recorded transcript and
  verdict, written as a real trial and labelled "Recorded replay" on
  every screen: (1) kill the free tier, (2) hire a junior engineer
  instead of a senior, (3) cut the reporting feature, (4) switch payment
  vendors. Replay plays turn by turn with the same UI as a live trial,
  so the demo works with no key at all.
- Case library shows each case's question, stakes, verdict, and
  confidence at a glance.

### 3.4 Objection
- At any point during a trial (live or replay), the user can raise an
  objection: a fact to inject ("churn rose 8% last quarter").
- Live: the fact is appended to the next Judge prompt and the Judge
  addresses it in the next cross-examination; if raised after the
  verdict, the Judge issues a revised verdict noting what changed.
- Replay: the objection is recorded against the transcript and the Judge
  issues a short written revision based on the recorded verdict (the
  revision is labelled as a recorded-case revision, not a live ruling).
- Objections are part of the saved transcript and the export.

### 3.5 Challenge the verdict
- After any verdict, the user can challenge it in one sentence
  ("You ignored the migration cost").
- Live: the challenge goes to the Judge, which answers it and may revise
  the verdict; the original and revised verdicts are both kept.
- Replay: the challenge box explains that a live challenge needs a key
  and offers to save the challenge text with the case instead.

### 3.6 Verdict panel
- Decision, confidence, per-side rubric bars, top 3 arguments each side,
  open risks, and citations that link back to the cited turn in the
  transcript (click a citation, the transcript scrolls to that turn).
- Copy verdict, export full transcript as Markdown (includes case,
  turns, scores, objections, verdict, and whether it was live or a
  replay).

### 3.7 Saved trials & history
- Every completed trial (live or replay, plus custom decisions) is saved
  locally with its full transcript and verdict. History list shows
  question, verdict, confidence, date, and live/replay badge. Reopen any
  trial; delete any trial; clear all.

### 3.8 Settings
- Gemini API key (password field, stored in `localStorage` only, with a
  "Remove key" button), model picker, link to Google AI Studio to get a
  free key. Key status shown in the header (Live / Replay only).

## 4. Data model

```
Case {
  id, question, context, stakes: low|medium|high,
  source: "seeded" | "custom",
  createdAt
}
Turn {
  id, caseId, round: 1..3, speaker: prosecutor|defender|judge,
  kind: argument|steelman|rebuttal|cross-examination|verdict,
  text, durationMs, createdAt,
  bannedPhraseRejected?: boolean
}
Score { turnId, side: prosecution|defence, evidence, logic, risk } // 0-10 each
Objection { id, caseId, text, afterTurnId, addressedInTurnId?, revision? }
Verdict {
  decision: uphold|overturn|amend, confidence: 0..100,
  topArguments: { prosecution: [string x3], defence: [string x3] },
  risks: [string], citations: [{ turnId, quote }],
  challenged?: boolean, revisedVerdict?: Verdict, revisionNote?
}
Trial { case, turns[], scores[], objections[], verdict, mode: live|replay, startedAt, finishedAt }
```

Stored in `localStorage` under `coa.trials.v1` (array of Trial) and
`coa.settings.v1` (key, model). Seeded cases live in `js/seed.js` and are
never written into the user's trial history until played.

## 5. Complete user flow, end to end

1. Land on the Case Library. Four recorded cases are listed with their
   verdicts; a "Bring a decision" form sits at the top.
2. Pick a recorded case → the trial screen opens, labelled "Recorded
   replay". Press Play: turns appear one at a time (about 1.2s apart),
   scores fill in beside them, the round marker advances.
3. Mid-replay, raise an objection ("churn rose 8% last quarter") → it is
   pinned in the transcript; when the verdict arrives, a Judge revision
   note addresses it.
4. Verdict panel opens: decision, confidence, top arguments, risks,
   citations. Click a citation → the cited turn is highlighted.
5. Export the transcript as Markdown, or save the trial to history.
6. Bring your own decision: fill in the question + context + stakes.
   Without a key you get the preparation brief and a prompt to add a
   key; with a key the live trial runs in the same UI, turn by turn as
   each Gemini call returns, ending in a verdict you can challenge.
7. Challenge the verdict with one sentence → the Judge answers; if it
   changes its mind, both verdicts stay visible.
8. History: reopen, re-read, delete, or export any past trial.

## 6. Anti-agreement design (mandatory)

- Forced opposing stances: system prompts assign each agent a side and
  forbid arguing the other side's position.
- Steelman rule: once per round each advocate must state the other
  side's strongest point fairly before rebutting it.
- Banned-phrase check in code (`bannedPhrases`, `containsBannedPhrase`,
  `validateTurn` in `js/courtroom.js`): a live turn containing a banned
  phrase is re-requested once, then dropped with a transcript note.
- Hard round cap: `MAX_ROUNDS = 3`, enforced by the turn-order builder
  and tested.
- Judge cites specific lines: verdict JSON schema requires ≥3 citations
  with `turnId` + quoted text; validation rejects a verdict without
  them and retries once.

## 7. Design identity

- Burgundy `#7F1D1D` as the single accent; paper `#FAF7F1`, ink
  `#1C1917`, ruled lines `#E3DCCF`. Source Serif 4 for display and body,
  IBM Plex Mono for case numbers, timestamps, and scores.
- Signature idea: the court docket. Every screen reads like a case file:
  a docket header with case number and date, ruled transcript lines,
  "Exhibit" labels on evidence, a verdict stamped in burgundy.
- References (from the playbook): Mobbin (real app flows — the trial
  screen borrows its dense, scannable record layout), Land-book
  (editorial landing — the library page borrows its restrained,
  type-led hierarchy), Minimal Gallery (restraint — one accent, no
  decoration).
- No gradients, no glows, no emoji, no cliché copy. Plain human words.

## 8. Honest limits

- No key, no live debate. Recorded cases are labelled replays everywhere.
- Live debate needs network access to Google's API and a free key; the
  app cannot run it offline.
- Model judgements are judgements, not facts: the verdict is only as
  good as the arguments and the context given. The transcript and
  citations exist so the user can check the reasoning.
- The Judge's scores are rubric scores from the model, not measurements.
- This build has no server, no accounts, and no sharing: trials live in
  the user's browser only.

## 9. 2-minute demo script

- 0:00–0:15 — "Every team decision is a debate nobody records." Open
  the library; the free-tier case is already there.
- 0:15–0:50 — Play the replay. Prosecutor and Defender trade two
  rounds; point out the steelman in round 1 and the Judge's live scores.
- 0:50–1:20 — The Judge delivers the verdict: decision, confidence,
  and three citations. Click a citation; the transcript jumps to the line.
- 1:20–1:45 — Hit Objection, inject "churn rose 8% last quarter",
  watch the Judge revise the verdict.
- 1:45–2:00 — Export the transcript as Markdown; open a second seeded
  case to show the library is real.

## 10. Launch checklist

- [ ] `node --test tests/` passes with 0 failures
- [ ] Screenshots at 1280px and 390px, zero horizontal overflow, read
      and fixed
- [ ] All four seeded replays play end to end with verdicts
- [ ] Live trial runs once with a real key (author's key, not shipped)
- [ ] Objection + challenge + export work in both modes
- [ ] README + MIT LICENSE present; no key or secret in the repo

## 11. v2 ideas

1. Team rooms: share a trial link, colleagues add objections before the verdict.
2. Multi-model jury: run the Judge on a second model and show where the two disagree.
3. Evidence upload: attach a doc or sheet; turns must cite it or say they cannot.
4. Decision log: verdicts tied to the actual decision taken and its outcome, reviewed 90 days later.
5. Voice: read the transcript aloud, one voice per agent.
