// Courtroom of Agents — logic tests. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/courtroom.js');
const { SEED_CASES } = require('../js/seed.js');

test('turn order is fixed and capped at 3 rounds', () => {
  const order = C.buildTurnOrder(3);
  assert.equal(order.length, 9); // 3 rounds x 2 advocates + 2 cross-exams + verdict
  assert.deepEqual(order.map(o => o.speaker), [
    'prosecutor', 'defender',
    'prosecutor', 'defender', 'judge',
    'prosecutor', 'defender', 'judge', 'judge'
  ]);
  assert.equal(order[8].kind, 'verdict');
  assert.equal(C.buildTurnOrder(99).length, 9, 'asking for 99 rounds still caps at 3');
  assert.equal(C.buildTurnOrder(1).length, 3);
  assert.equal(C.nextSpeaker(order, 9), null);
  assert.equal(C.nextSpeaker(order, 0).speaker, 'prosecutor');
});

test('banned phrases are caught, including agreement', () => {
  assert.equal(C.containsBannedPhrase('I agree with the defence here.'), 'i agree');
  assert.equal(C.containsBannedPhrase("You're right about the cost."), "you're right");
  assert.equal(C.containsBannedPhrase('As my colleague said, the numbers matter.'), 'as my colleague said');
  assert.equal(C.containsBannedPhrase('The steelman is strong, but the cost argument fails on the numbers.'), null);
  assert.equal(C.validateTurn('I agree, let us move on.').ok, false);
  assert.equal(C.validateTurn('').ok, false);
  assert.equal(C.validateTurn('too short').ok, false);
  assert.equal(C.validateTurn('The steelman for the other side is the funnel, but the cost per conversion is $670 and that number has not been answered.').ok, true);
});

test('agent prompts force opposing stances and a steelman', () => {
  const theCase = { question: 'Should we kill the free tier?', context: 'Costs $1,900 a month.', stakes: 'high' };
  const p = C.buildAgentPrompt('prosecutor', theCase, [], []);
  const d = C.buildAgentPrompt('defender', theCase, [], []);
  assert.match(p, /AGAINST the decision/);
  assert.match(d, /FOR the decision/);
  assert.match(p, /steelman/i);
  assert.match(p, /Never say "I agree"/);
  assert.match(p, /Do not invent facts/);
  assert.match(d, /steelman/i);
  assert.ok(!p.includes('argue FOR the decision'), 'prosecutor prompt must not argue for');
  assert.ok(!d.includes('argue AGAINST the decision'), 'defender prompt must not argue against');
});

test('judge prompt demands citations and rubric scores', () => {
  const turns = [{ speaker: 'prosecutor', round: 1, text: 'Costs $1,900 a month.' }];
  const prompt = C.buildJudgePrompt({ question: 'Q?', context: 'C', stakes: 'low' }, turns, []);
  assert.match(prompt, /at least 3 specific turns/);
  assert.match(prompt, /evidence.*logic.*risk/s);
  assert.match(prompt, /Turn 1/);
});

test('verdict parsing accepts good JSON and rejects bad verdicts', () => {
  const good = JSON.stringify({
    decision: 'amend', confidence: 71,
    scores: { prosecution: { evidence: 8, logic: 8, risk: 8 }, defence: { evidence: 7, logic: 7, risk: 7 } },
    topArguments: { prosecution: ['a', 'b', 'c'], defence: ['d', 'e', 'f'] },
    risks: ['r1'], citations: [{ turn: 1, quote: 'costs $1,900 a month' }, { turn: 2, quote: 'the funnel is real' }, { turn: 3, quote: 'reputation is permanent' }],
    reasoning: 'Both sides have a point.'
  });
  const parsed = C.parseVerdict('Here is my verdict:\n' + good + '\nDone.', 8);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.verdict.decision, 'amend');

  const noCitations = JSON.parse(good); noCitations.citations = noCitations.citations.slice(0, 2);
  assert.equal(C.validateVerdict(noCitations, 8).ok, false);
  const badDecision = JSON.parse(good); badDecision.decision = 'maybe';
  assert.equal(C.validateVerdict(badDecision, 8).ok, false);
  const outOfRange = JSON.parse(good); outOfRange.citations[0].turn = 99;
  assert.equal(C.validateVerdict(outOfRange, 8).ok, false);
  const badScore = JSON.parse(good); badScore.scores.prosecution.evidence = 11;
  assert.equal(C.validateVerdict(badScore, 8).ok, false);
  assert.equal(C.parseVerdict('no json here at all', 8).ok, false);
  assert.equal(C.parseVerdict('', 8).ok, false);
});

test('side totals add the three rubric scores', () => {
  const totals = C.sideTotals({ prosecution: { evidence: 8, logic: 8, risk: 8 }, defence: { evidence: 7, logic: 7, risk: 7 } });
  assert.deepEqual(totals, { prosecution: 24, defence: 21 });
});

test('replay revision is honest: it never claims a live re-ruling', () => {
  const rev = C.replayRevision({ decision: 'amend' }, 'Churn rose 8%.');
  assert.equal(rev.changed, false);
  assert.match(rev.note, /Recorded case/);
  assert.match(rev.note, /cannot re-rule without a live key/);
  assert.match(rev.note, /Churn rose 8%/);
});

test('markdown export contains the record and labels replays', () => {
  const trial = {
    mode: 'replay', startedAt: 1700000000000,
    case: { id: 'coa-2026-001', question: 'Should we kill our free tier?', context: 'Costs money.', stakes: 'high' },
    turns: [
      { round: 1, speaker: 'prosecutor', kind: 'argument', text: 'It costs too much.' },
      { round: 1, speaker: 'defender', kind: 'argument', text: 'It brings customers.' }
    ],
    objections: [{ text: 'Churn rose 8%.' }],
    verdict: {
      decision: 'amend', confidence: 71,
      scores: { prosecution: { evidence: 8, logic: 8, risk: 8 }, defence: { evidence: 7, logic: 7, risk: 7 } },
      topArguments: { prosecution: ['a', 'b', 'c'], defence: ['d', 'e', 'f'] },
      risks: ['r1'], citations: [{ turn: 1, quote: 'It costs too much.' }], reasoning: 'Split.'
    }
  };
  const md = C.exportMarkdown(trial);
  assert.match(md, /# Trial record — Should we kill our free tier\?/);
  assert.match(md, /recorded replay, not a live debate/);
  assert.match(md, /Turn 1 — Prosecutor/);
  assert.match(md, /Churn rose 8%/);
  assert.match(md, /Decision: \*\*amend\*\*/);
  assert.match(md, /Turn 1: "It costs too much\."/);
});

test('seed library: 4 cases, full trials, valid verdicts', () => {
  assert.equal(SEED_CASES.length, 4);
  const ids = new Set();
  for (const c of SEED_CASES) {
    assert.ok(c.id && !ids.has(c.id), 'unique id for ' + c.id);
    ids.add(c.id);
    assert.ok(c.question.length > 10);
    assert.ok(c.context.length > 50);
    assert.ok(['low', 'medium', 'high'].includes(c.stakes));
    // Transcript must match the fixed turn order exactly, minus the
    // verdict slot: in a recorded case the verdict is a separate record,
    // not a spoken turn.
    const expected = C.buildTurnOrder(3).filter(o => o.kind !== 'verdict').map(o => o.speaker + ':' + o.kind);
    const actual = c.turns.map(t => t.speaker + ':' + t.kind);
    assert.deepEqual(actual, expected, c.id + ' transcript must follow the fixed turn order');
    assert.equal(c.turns.length, 8, c.id + ' has 8 turns (6 advocates + 2 cross-exams)');
    for (const t of c.turns) {
      assert.ok(t.text.length > 100, c.id + ' turn text must be a real argument');
      assert.equal(C.containsBannedPhrase(t.text), null, c.id + ' recorded turn must contain no banned phrase');
    }
    const check = C.validateVerdict(c.verdict, c.turns.length);
    assert.equal(check.ok, true, c.id + ' verdict invalid: ' + check.reason);
    // Every citation must quote words that actually appear in the cited turn.
    for (const ct of c.verdict.citations) {
      const turnText = c.turns[ct.turn - 1].text.toLowerCase();
      assert.ok(turnText.includes(ct.quote.toLowerCase()), c.id + ' citation turn ' + ct.turn + ' does not contain its quote');
    }
  }
});

test('gemini client: builds the right request and reads the reply', async () => {
  let seen = null;
  const stubFetch = async (url, opts) => {
    seen = { url, opts };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello from the model' }] } }] }) };
  };
  const text = await C.callGemini('gemini-3.5-flash', 'AIza-test', 'Say hi', stubFetch);
  assert.equal(text, 'hello from the model');
  assert.match(seen.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash:generateContent/);
  assert.equal(seen.opts.headers['x-goog-api-key'], 'AIza-test');
  const body = JSON.parse(seen.opts.body);
  assert.equal(body.contents[0].parts[0].text, 'Say hi');
});

test('gemini client: surfaces API errors instead of inventing a reply', async () => {
  const stubFetch = async () => ({ ok: false, status: 400, text: async () => '{"error":{"message":"API key not valid"}}' });
  await assert.rejects(() => C.callGemini('gemini-3.5-flash', 'bad-key', 'hi', stubFetch), /Gemini API error 400/);
});

test('liveTurn retries once on a banned phrase, then gives up honestly', async () => {
  let calls = 0;
  const stubFetch = async () => {
    calls++;
    const text = calls === 1 ? 'I agree with the defence, good point.' : 'The steelman is the funnel, but the cost per conversion is $670 and that has not been answered by any number the defence gave.';
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) };
  };
  const r = await C.liveTurn('gemini-3.5-flash', 'k', 'prosecutor', { question: 'Q?', context: '', stakes: 'low' }, [], [], stubFetch);
  assert.equal(r.ok, true);
  assert.equal(calls, 2);
  assert.match(r.text, /steelman/);

  let calls2 = 0;
  const stubBad = async () => {
    calls2++;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'I agree, you are right.' }] } }] }) };
  };
  const r2 = await C.liveTurn('gemini-3.5-flash', 'k', 'prosecutor', { question: 'Q?', context: '', stakes: 'low' }, [], [], stubBad);
  assert.equal(r2.ok, false);
  assert.equal(calls2, 2, 'exactly one retry, then it stops instead of faking a turn');
});

test('challenge prompt includes the verdict and the challenge', () => {
  const p = C.buildChallengePrompt({ question: 'Q?' }, { decision: 'amend', confidence: 70 }, 'You ignored the migration cost.');
  assert.match(p, /migration cost/);
  assert.match(p, /amend/);
  assert.match(p, /Change the verdict only if/);
});
