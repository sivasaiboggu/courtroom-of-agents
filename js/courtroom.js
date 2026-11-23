// Courtroom of Agents — pure logic (no DOM, no network except via injected fetch).
// Works in Node (tests) and in the browser (window.Courtroom).
(function (root) {
  'use strict';

  var MAX_ROUNDS = 3;
  var TURN_TIMEOUT_MS = 60000;

  // Phrases that mean an advocate has stopped arguing its side.
  var BANNED_PHRASES = [
    'i agree', "you're right", 'you are right', 'as my colleague said',
    'as the prosecutor said', 'as the defender said', 'i concede the point',
    'we both agree', 'i completely agree', 'good point, i agree',
    'i accept that', 'fair enough, i agree'
  ];

  function containsBannedPhrase(text) {
    if (!text) return null;
    var lower = text.toLowerCase();
    for (var i = 0; i < BANNED_PHRASES.length; i++) {
      if (lower.indexOf(BANNED_PHRASES[i]) !== -1) return BANNED_PHRASES[i];
    }
    return null;
  }

  // A live turn is usable only if it is non-empty and argues its own side.
  function validateTurn(text) {
    if (!text || !text.trim()) return { ok: false, reason: 'empty turn' };
    var banned = containsBannedPhrase(text);
    if (banned) return { ok: false, reason: 'banned phrase: "' + banned + '"' };
    if (text.trim().length < 40) return { ok: false, reason: 'turn too short to argue anything' };
    return { ok: true };
  }

  // Fixed turn order. Hard cap: never more than MAX_ROUNDS rounds.
  // Per round: prosecutor, defender. Judge cross-examines after round 2
  // and after round 3, then delivers the verdict.
  function buildTurnOrder(rounds) {
    var n = Math.max(1, Math.min(MAX_ROUNDS, rounds || MAX_ROUNDS));
    var order = [];
    for (var r = 1; r <= n; r++) {
      order.push({ round: r, speaker: 'prosecutor', kind: 'argument' });
      order.push({ round: r, speaker: 'defender', kind: 'argument' });
      if (r >= 2) order.push({ round: r, speaker: 'judge', kind: 'cross-examination' });
    }
    order.push({ round: n, speaker: 'judge', kind: 'verdict' });
    return order;
  }

  function nextSpeaker(order, doneCount) {
    if (doneCount >= order.length) return null;
    return order[doneCount];
  }

  // ---- Prompts (anti-agreement rules live here) ----

  var SHARED_RULES = [
    'You are arguing in a recorded courtroom debate about a real decision.',
    'Never say "I agree", "you\'re right", "as my colleague said", or anything that concedes the other side\'s point.',
    'Once per round, state the other side\'s strongest point fairly (a steelman) in one sentence, then rebut it directly.',
    'Argue only from the facts in the case context. Do not invent facts: if a fact is not given, say what you would need to know instead of inventing it.',
    'Keep your turn to 90–140 words. Plain language, no slogans.'
  ].join('\n');

  function buildAgentPrompt(side, theCase, priorTurns, objections) {
    var role = side === 'prosecutor'
      ? 'You are the PROSECUTOR. Your job is to argue AGAINST the decision. The decision must not go ahead unless the defence proves it should.'
      : 'You are the DEFENDER. Your job is to argue FOR the decision. The decision should go ahead unless the prosecution proves it should not.';
    var lines = [role, '', 'DECISION: ' + theCase.question,
      'CONTEXT: ' + (theCase.context || 'No further context given.'),
      'STAKES: ' + theCase.stakes, '', SHARED_RULES, ''];
    if (priorTurns && priorTurns.length) {
      lines.push('TRANSCRIPT SO FAR:');
      priorTurns.forEach(function (t) {
        lines.push('[' + t.speaker + ', round ' + t.round + '] ' + t.text);
      });
      lines.push('');
    }
    if (objections && objections.length) {
      lines.push('OBJECTIONS RAISED BY THE PERSON WHO BROUGHT THIS CASE (treat as facts to address):');
      objections.forEach(function (o) { lines.push('- ' + o.text); });
      lines.push('');
    }
    lines.push('Now give your turn. Start with your steelman sentence, then your argument.');
    return lines.join('\n');
  }

  function buildJudgePrompt(theCase, turns, objections) {
    var lines = [
      'You are the JUDGE. You do not take a side. You score the arguments and deliver a verdict.',
      '',
      'DECISION: ' + theCase.question,
      'CONTEXT: ' + (theCase.context || 'No further context given.'),
      'STAKES: ' + theCase.stakes,
      '',
      'Score each side 0–10 on: evidence (facts cited, not invented), logic (the argument holds together), risk (honest about what could go wrong).',
      'Your verdict must cite at least 3 specific turns by their number and quote the exact line you are relying on.',
      ''
    ];
    if (objections && objections.length) {
      lines.push('OBJECTIONS RAISED (address each in your verdict):');
      objections.forEach(function (o) { lines.push('- ' + o.text); });
      lines.push('');
    }
    lines.push('FULL TRANSCRIPT (turns are numbered):');
    turns.forEach(function (t, i) {
      lines.push('Turn ' + (i + 1) + ' [' + t.speaker + ', round ' + t.round + ']: ' + t.text);
    });
    lines.push('', 'Reply with JSON ONLY, no other text, in exactly this shape:',
      '{"decision":"uphold|overturn|amend","confidence":0-100,',
      '"scores":{"prosecution":{"evidence":0-10,"logic":0-10,"risk":0-10},"defence":{"evidence":0-10,"logic":0-10,"risk":0-10}},',
      '"topArguments":{"prosecution":["...","...","..."],"defence":["...","...","..."]},',
      '"risks":["...","..."],',
      '"citations":[{"turn":1,"quote":"exact words from that turn"}, ...],',
      '"reasoning":"two or three sentences"}');
    return lines.join('\n');
  }

  function buildChallengePrompt(theCase, verdict, challenge) {
    return [
      'You are the JUDGE in a recorded courtroom debate. You already delivered a verdict. The person who brought the case challenges it.',
      '',
      'DECISION: ' + theCase.question,
      'YOUR VERDICT: ' + JSON.stringify(verdict),
      'CHALLENGE: ' + challenge,
      '',
      'Answer in JSON ONLY: {"changed":true|false,"note":"one or two sentences answering the challenge directly","verdict": <the full verdict object, revised if changed, otherwise unchanged>}.',
      'Change the verdict only if the challenge points at a real gap in the reasoning or a fact the verdict missed. Say so plainly if it does not.'
    ].join('\n');
  }

  // ---- Verdict parsing / validation ----

  function extractJson(text) {
    if (!text) return null;
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
  }

  function isScore(n) { return typeof n === 'number' && n >= 0 && n <= 10; }

  function validateVerdict(v, turnCount) {
    if (!v || typeof v !== 'object') return { ok: false, reason: 'not an object' };
    if (['uphold', 'overturn', 'amend'].indexOf(v.decision) === -1)
      return { ok: false, reason: 'decision must be uphold, overturn or amend' };
    if (typeof v.confidence !== 'number' || v.confidence < 0 || v.confidence > 100)
      return { ok: false, reason: 'confidence must be 0–100' };
    if (!v.scores || !v.scores.prosecution || !v.scores.defence)
      return { ok: false, reason: 'missing side scores' };
    var sides = ['prosecution', 'defence'];
    for (var i = 0; i < sides.length; i++) {
      var s = v.scores[sides[i]];
      if (!isScore(s.evidence) || !isScore(s.logic) || !isScore(s.risk))
        return { ok: false, reason: 'scores for ' + sides[i] + ' must be 0–10' };
    }
    if (!v.topArguments || !Array.isArray(v.topArguments.prosecution) ||
        v.topArguments.prosecution.length < 3 || !Array.isArray(v.topArguments.defence) ||
        v.topArguments.defence.length < 3)
      return { ok: false, reason: 'need at least 3 top arguments per side' };
    if (!Array.isArray(v.citations) || v.citations.length < 3)
      return { ok: false, reason: 'verdict must cite at least 3 turns' };
    for (var j = 0; j < v.citations.length; j++) {
      var c = v.citations[j];
      if (typeof c.turn !== 'number' || c.turn < 1 || (turnCount && c.turn > turnCount))
        return { ok: false, reason: 'citation turn ' + c.turn + ' is out of range' };
      if (!c.quote || c.quote.length < 8)
        return { ok: false, reason: 'citation needs a quoted line' };
    }
    return { ok: true };
  }

  function parseVerdict(text, turnCount) {
    var v = extractJson(text);
    if (!v) return { ok: false, reason: 'no JSON found in model reply', verdict: null };
    var check = validateVerdict(v, turnCount);
    return { ok: check.ok, reason: check.reason || null, verdict: check.ok ? v : null };
  }

  function sideTotals(scores) {
    var out = {};
    ['prosecution', 'defence'].forEach(function (side) {
      var s = scores[side] || {};
      out[side] = (s.evidence || 0) + (s.logic || 0) + (s.risk || 0);
    });
    return out;
  }

  // ---- Replay revision (objection after a recorded verdict) ----
  // Honest and deterministic: it does not pretend the model re-ruled.
  // It records the objection against the verdict and states what would
  // have to change for the verdict to move.
  function replayRevision(verdict, objectionText) {
    return {
      note: 'Recorded case — the Judge cannot re-rule without a live key. ' +
        'This objection is filed against the recorded verdict: "' + objectionText + '". ' +
        'It would matter if it changes one of the three cited lines or adds a risk the verdict missed. ' +
        'Add a key in Settings to put this case to a live Judge.',
      changed: false,
      objection: objectionText
    };
  }

  // ---- Markdown export ----

  function exportMarkdown(trial) {
    var c = trial.case;
    var L = [];
    L.push('# Trial record — ' + c.question);
    L.push('');
    L.push('- Case: ' + c.id + ' · Stakes: ' + c.stakes + ' · Mode: ' + trial.mode +
      (trial.mode === 'replay' ? ' (recorded replay, not a live debate)' : ' (live debate)'));
    L.push('- Opened: ' + new Date(trial.startedAt).toISOString());
    if (c.context) { L.push('', '## Context', '', c.context); }
    L.push('', '## Transcript', '');
    trial.turns.forEach(function (t, i) {
      var name = t.speaker === 'prosecutor' ? 'Prosecutor' : t.speaker === 'defender' ? 'Defender' : 'Judge';
      L.push('**Turn ' + (i + 1) + ' — ' + name + ' (round ' + t.round + ', ' + t.kind + ')**');
      L.push('');
      L.push(t.text);
      L.push('');
    });
    if (trial.objections && trial.objections.length) {
      L.push('## Objections', '');
      trial.objections.forEach(function (o) { L.push('- ' + o.text); });
      L.push('');
    }
    var v = trial.verdict;
    if (v) {
      L.push('## Verdict', '');
      L.push('- Decision: **' + v.decision + '** · Confidence: ' + v.confidence + '%');
      var totals = sideTotals(v.scores || {});
      L.push('- Scores (of 30): prosecution ' + totals.prosecution + ' · defence ' + totals.defence);
      L.push('', '### Strongest arguments — prosecution', '');
      v.topArguments.prosecution.forEach(function (a) { L.push('- ' + a); });
      L.push('', '### Strongest arguments — defence', '');
      v.topArguments.defence.forEach(function (a) { L.push('- ' + a); });
      L.push('', '### Open risks', '');
      (v.risks || []).forEach(function (r) { L.push('- ' + r); });
      L.push('', '### Citations', '');
      v.citations.forEach(function (ct) { L.push('- Turn ' + ct.turn + ': "' + ct.quote + '"'); });
      if (v.reasoning) { L.push('', v.reasoning); }
    }
    return L.join('\n');
  }

  // ---- Gemini REST client (fetch injected so tests can stub it) ----

  function geminiUrl(model) {
    return 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent';
  }

  function extractText(data) {
    try {
      var parts = data.candidates[0].content.parts;
      return parts.map(function (p) { return p.text || ''; }).join('');
    } catch (e) { return ''; }
  }

  function callGemini(model, key, prompt, fetchFn, timeoutMs) {
    var fetchImpl = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchImpl) return Promise.reject(new Error('no fetch available in this environment'));
    var timeout = timeoutMs || TURN_TIMEOUT_MS;
    var controller = null;
    var signal = undefined;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      signal = controller.signal;
      var timer = setTimeout(function () { controller.abort(); }, timeout);
      if (timer.unref) timer.unref(); // do not keep a test process alive
    }
    return fetchImpl(geminiUrl(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      }),
      signal: signal
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (body) {
        var err = new Error('Gemini API error ' + res.status + ': ' + body.slice(0, 300));
        err.status = res.status;
        throw err;
      });
      return res.json();
    }).then(function (data) {
      var text = extractText(data);
      if (!text.trim()) throw new Error('Gemini returned an empty reply');
      return text;
    });
  }

  // One live advocate turn: call, validate, retry once on a banned phrase
  // or empty reply, then give up with a transcript note instead of faking it.
  function liveTurn(model, key, side, theCase, priorTurns, objections, fetchFn) {
    var prompt = buildAgentPrompt(side, theCase, priorTurns, objections);
    return callGemini(model, key, prompt, fetchFn).then(function (text) {
      var check = validateTurn(text);
      if (check.ok) return { ok: true, text: text };
      return callGemini(model, key, prompt + '\n\nYour previous reply was rejected (' + check.reason + '). Give a new turn that follows the rules.', fetchFn)
        .then(function (text2) {
          var check2 = validateTurn(text2);
          return check2.ok
            ? { ok: true, text: text2 }
            : { ok: false, reason: check2.reason, text: text2 };
        });
    });
  }

  var api = {
    MAX_ROUNDS: MAX_ROUNDS, TURN_TIMEOUT_MS: TURN_TIMEOUT_MS,
    BANNED_PHRASES: BANNED_PHRASES,
    containsBannedPhrase: containsBannedPhrase,
    validateTurn: validateTurn,
    buildTurnOrder: buildTurnOrder, nextSpeaker: nextSpeaker,
    buildAgentPrompt: buildAgentPrompt, buildJudgePrompt: buildJudgePrompt,
    buildChallengePrompt: buildChallengePrompt,
    extractJson: extractJson, validateVerdict: validateVerdict,
    parseVerdict: parseVerdict, sideTotals: sideTotals,
    replayRevision: replayRevision, exportMarkdown: exportMarkdown,
    geminiUrl: geminiUrl, extractText: extractText,
    callGemini: callGemini, liveTurn: liveTurn
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Courtroom = api;
})(typeof window !== 'undefined' ? window : globalThis);
