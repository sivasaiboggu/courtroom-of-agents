// Courtroom of Agents — UI + orchestration. Pure logic lives in js/courtroom.js,
// recorded cases in js/seed.js.
(function () {
  'use strict';
  var C = window.Courtroom;
  var SEED = window.SeedCases || [];

  var LS_TRIALS = 'coa.trials.v1';
  var LS_SETTINGS = 'coa.settings.v1';
  var REPLAY_DELAY_MS = 1100;

  var settings = loadSettings();
  var current = null;      // { case, turns, objections, verdict, mode, startedAt, finishedAt }
  var playing = false;
  var playTimer = null;

  // ---------- storage ----------
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(LS_SETTINGS)) || {}; }
    catch (e) { return {}; }
  }
  function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
  function loadTrials() {
    try { return JSON.parse(localStorage.getItem(LS_TRIALS)) || []; }
    catch (e) { return []; }
  }
  function saveTrial(trial) {
    var trials = loadTrials();
    var i = trials.findIndex(function (t) { return t.id === trial.id; });
    if (i >= 0) trials[i] = trial; else trials.unshift(trial);
    localStorage.setItem(LS_TRIALS, JSON.stringify(trials));
    renderHistoryCount();
  }

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function speakerName(s) {
    return s === 'prosecutor' ? 'Prosecutor' : s === 'defender' ? 'Defender' : 'Judge';
  }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(ts) { return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }

  // ---------- navigation ----------
  var views = ['library', 'new', 'trial', 'history', 'settings'];
  function showView(name) {
    views.forEach(function (v) { $('view-' + v).hidden = v !== name; });
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === name);
    });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-nav]').forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-nav');
      if (name === 'history') renderHistory(); // re-read saved trials each visit
      showView(name);
    });
  });
  $('back-btn').addEventListener('click', function () { stopPlayback(); showView('library'); });

  // ---------- key status ----------
  function renderKeyStatus() {
    var live = !!settings.key;
    $('key-status').classList.toggle('live', live);
    $('key-label').textContent = live ? 'Live ready · ' + (settings.model || 'gemini-3.5-flash') : 'Replay only — no key';
    $('new-form-note').textContent = live
      ? 'Key saved. Opening a trial will run a live debate with Gemini.'
      : 'No key saved. You can still open a trial — you will get a preparation brief, not a debate. Add a key in Settings for a live trial.';
    $('new-form-note').className = 'form-note' + (live ? ' ok' : '');
  }

  // ---------- library ----------
  function verdictBadge(v) {
    var b = el('span', 'badge verdict-' + v.decision, v.decision);
    return b;
  }
  function renderLibrary() {
    var grid = $('case-grid');
    grid.innerHTML = '';
    SEED.forEach(function (c) {
      var card = el('button', 'case-card');
      card.type = 'button';
      card.appendChild(el('span', 'case-no', c.number + ' · Stakes: ' + c.stakes));
      card.appendChild(el('h3', null, c.question));
      card.appendChild(el('p', 'ctx', c.context));
      var foot = el('div', 'case-foot');
      foot.appendChild(el('span', 'badge replay', 'Recorded replay'));
      foot.appendChild(verdictBadge(c.verdict));
      foot.appendChild(el('span', 'conf', 'Confidence ' + c.verdict.confidence + '%'));
      card.appendChild(foot);
      card.addEventListener('click', function () { openSeedCase(c.id); });
      grid.appendChild(card);
    });
  }

  // ---------- history ----------
  function renderHistoryCount() { $('history-count').textContent = String(loadTrials().length); }
  function renderHistory() {
    var list = $('history-list');
    list.innerHTML = '';
    var trials = loadTrials();
    if (!trials.length) {
      list.appendChild(el('p', 'empty', 'No trials yet. Play a recorded case or bring a decision and one will appear here.'));
      return;
    }
    trials.forEach(function (t) {
      var item = el('div', 'history-item');
      var left = el('div');
      left.appendChild(el('h3', null, t.case.question));
      left.appendChild(el('p', null, (t.verdict ? 'Verdict: ' + t.verdict.decision + ' · ' + t.verdict.confidence + '% confidence' : 'Trial stopped before a verdict') + ' · ' + fmtDate(t.startedAt)));
      item.appendChild(left);
      var right = el('div', 'case-foot');
      right.appendChild(el('span', 'badge ' + (t.mode === 'live' ? 'live' : 'replay'), t.mode === 'live' ? 'Live' : 'Replay'));
      var open = el('button', 'btn small', 'Reopen');
      open.type = 'button';
      open.addEventListener('click', function () { openSavedTrial(t.id); });
      var del = el('button', 'btn small danger', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () {
        var rest = loadTrials().filter(function (x) { return x.id !== t.id; });
        localStorage.setItem(LS_TRIALS, JSON.stringify(rest));
        renderHistory(); renderHistoryCount();
      });
      right.appendChild(open); right.appendChild(del);
      item.appendChild(right);
      list.appendChild(item);
    });
  }
  $('clear-history-btn').addEventListener('click', function () {
    if (!confirm('Delete all saved trials?')) return;
    localStorage.removeItem(LS_TRIALS);
    renderHistory(); renderHistoryCount();
  });

  // ---------- trial view ----------
  function resetTrialView() {
    $('transcript').innerHTML = '';
    $('objections-list').innerHTML = '';
    $('objection-input').value = '';
    $('challenge-input').value = '';
    $('challenge-result').innerHTML = '';
    $('challenge-box').hidden = true;
    $('verdict-body').hidden = true;
    $('verdict-empty').hidden = false;
    $('export-btn').disabled = true;
    $('copy-verdict-btn').disabled = true;
    $('play-btn').disabled = false;
    setScores(null);
    $('round-marker').textContent = 'Not started';
    $('trial-status').textContent = 'Press play. Turns appear one at a time.';
  }

  function setScores(turns, verdictScores) {
    var p = { e: 0, l: 0, r: 0, n: 0 }, d = { e: 0, l: 0, r: 0, n: 0 };
    if (verdictScores) {
      p = { e: verdictScores.prosecution.evidence, l: verdictScores.prosecution.logic, r: verdictScores.prosecution.risk, n: 1 };
      d = { e: verdictScores.defence.evidence, l: verdictScores.defence.logic, r: verdictScores.defence.risk, n: 1 };
    } else if (turns) {
      turns.forEach(function (t) {
        if (!t.scores) return;
        var acc = t.speaker === 'prosecutor' ? p : t.speaker === 'defender' ? d : null;
        if (!acc) return;
        acc.e += t.scores.evidence; acc.l += t.scores.logic; acc.r += t.scores.risk; acc.n++;
      });
    }
    [['p', p], ['d', d]].forEach(function (pair) {
      var key = pair[0], acc = pair[1];
      var num = $('score-' + key), bar = $('bar-' + key);
      if (!acc.n) { num.textContent = '—'; bar.style.width = '0%'; return; }
      var mean = (acc.e + acc.l + acc.r) / (3 * acc.n);
      num.textContent = mean.toFixed(1) + ' / 10';
      bar.style.width = (mean * 10) + '%';
    });
  }

  function renderTurn(turn, index) {
    var li = el('li', 'turn ' + turn.speaker);
    li.id = 'turn-' + (index + 1);
    var head = el('div', 'turn-head');
    head.appendChild(el('span', 'turn-speaker ' + turn.speaker, speakerName(turn.speaker)));
    head.appendChild(el('span', 'turn-meta', 'Turn ' + (index + 1) + ' · Round ' + turn.round + ' · ' + turn.kind));
    if (turn.durationMs != null) head.appendChild(el('span', 'turn-meta', (turn.durationMs / 1000).toFixed(1) + 's'));
    if (turn.kind === 'argument' && turn.speaker !== 'judge' && /steelman/i.test(turn.text)) head.appendChild(el('span', 'steelman-tag', 'Steelman included'));
    li.appendChild(head);
    li.appendChild(el('p', null, turn.text));
    if (turn.scores) {
      li.appendChild(el('p', 'turn-scores', 'Evidence ' + turn.scores.evidence + ' · Logic ' + turn.scores.logic + ' · Risk ' + turn.scores.risk));
    }
    $('transcript').appendChild(li);
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function renderVerdict(v) {
    $('verdict-empty').hidden = true;
    var body = $('verdict-body');
    body.hidden = false;
    body.innerHTML = '';
    body.appendChild(el('p', 'verdict-decision', v.decision));
    body.appendChild(el('p', 'verdict-conf', 'Confidence ' + v.confidence + '% · ' + (current.mode === 'live' ? 'Live verdict' : 'Recorded verdict')));
    if (v.scores) {
      body.appendChild(el('h4', null, 'Rubric scores'));
      ['prosecution', 'defence'].forEach(function (side) {
        var s = v.scores[side];
        [['Evidence', s.evidence], ['Logic', s.logic], ['Risk', s.risk]].forEach(function (row) {
          var r = el('div', 'rubric-row');
          r.appendChild(el('span', null, row[0]));
          var bar = el('span', 'rb'); bar.appendChild(el('span'));
          bar.firstChild.style.width = (row[1] * 10) + '%';
          r.appendChild(bar);
          r.appendChild(el('span', null, String(row[1])));
          body.appendChild(r);
        });
        body.appendChild(el('p', 'verdict-conf', (side === 'prosecution' ? 'Prosecution' : 'Defence') + ' total: ' + (s.evidence + s.logic + s.risk) + ' / 30'));
      });
    }
    body.appendChild(el('h4', null, 'Strongest arguments — prosecution'));
    var up = el('ul'); v.topArguments.prosecution.forEach(function (a) { up.appendChild(el('li', null, a)); });
    body.appendChild(up);
    body.appendChild(el('h4', null, 'Strongest arguments — defence'));
    var ud = el('ul'); v.topArguments.defence.forEach(function (a) { ud.appendChild(el('li', null, a)); });
    body.appendChild(ud);
    body.appendChild(el('h4', null, 'Open risks'));
    var ur = el('ul'); (v.risks || []).forEach(function (r) { ur.appendChild(el('li', null, r)); });
    body.appendChild(ur);
    body.appendChild(el('h4', null, 'Citations — the lines the verdict relies on'));
    v.citations.forEach(function (ct) {
      var b = el('button', 'cite');
      b.type = 'button';
      b.innerHTML = '';
      var q = el('span', null, '\u201C' + ct.quote + '\u201D');
      var s = el('small', null, 'Turn ' + ct.turn + ' — tap to jump to the line');
      b.appendChild(q); b.appendChild(s);
      b.addEventListener('click', function () {
        var target = $('turn-' + ct.turn);
        if (target) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          target.classList.add('flash');
          setTimeout(function () { target.classList.remove('flash'); }, 2000);
        }
      });
      body.appendChild(b);
    });
    if (v.reasoning) body.appendChild(el('p', null, v.reasoning));
    if (current.revision) {
      var rev = el('p', 'revision-note', current.revision.note);
      body.appendChild(rev);
    }
    $('challenge-box').hidden = false;
    $('export-btn').disabled = false;
    $('copy-verdict-btn').disabled = false;
    setScores(null, v.scores);
  }

  function renderObjections() {
    var list = $('objections-list');
    list.innerHTML = '';
    (current.objections || []).forEach(function (o) {
      list.appendChild(el('li', null, o.text));
    });
  }

  function openTrial(trial) {
    stopPlayback();
    current = trial;
    resetTrialView();
    $('docket-number').textContent = trial.case.number || trial.case.id;
    $('docket-question').textContent = trial.case.question;
    $('docket-context').textContent = trial.case.context || '';
    $('docket-stakes').textContent = 'Stakes: ' + trial.case.stakes;
    $('docket-mode').textContent = trial.mode === 'live' ? 'Live debate' : 'Recorded replay — not a live debate';
    $('docket-date').textContent = fmtDate(trial.startedAt);
    renderObjections();
    showView('trial');
  }

  function openSeedCase(id) {
    var c = SEED.find(function (x) { return x.id === id; });
    if (!c) return;
    openTrial({
      id: uid(), case: c, seedId: c.id,
      turns: [], objections: [], verdict: null,
      mode: 'replay', startedAt: Date.now(), finishedAt: null,
      seedTurns: c.turns, seedVerdict: c.verdict
    });
    $('play-btn').textContent = 'Play the trial';
    $('trial-status').textContent = 'Recorded replay. Press play — turns appear one at a time, exactly as recorded.';
  }

  function openSavedTrial(id) {
    var t = loadTrials().find(function (x) { return x.id === id; });
    if (!t) return;
    openTrial(t);
    t.turns.forEach(function (turn, i) { renderTurn(turn, i); });
    renderObjections();
    setScores(t.turns, t.verdict ? t.verdict.scores : null);
    if (t.verdict) renderVerdict(t.verdict);
    $('round-marker').textContent = t.verdict ? 'Trial complete' : 'Trial stopped before a verdict';
    $('trial-status').textContent = t.verdict ? 'Trial complete. The full transcript and verdict are below.' : 'This trial stopped before a verdict. The turns that were recorded are below.';
    $('play-btn').disabled = true;
    $('export-btn').disabled = !t.turns.length;
  }

  function stopPlayback() {
    playing = false;
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  }

  // ---------- replay ----------
  function finishTrial() {
    current.finishedAt = Date.now();
    $('round-marker').textContent = 'Trial complete';
    $('play-btn').disabled = true;
    if (current.mode === 'replay' && current.objections.length) {
      current.revision = C.replayRevision(current.verdict, current.objections[current.objections.length - 1].text);
    }
    if (current.verdict) renderVerdict(current.verdict);
    $('trial-status').textContent = 'Trial complete. The verdict is on the right — click a citation to jump to the line it relies on.';
    saveTrial(current);
  }

  function playReplay() {
    if (playing || !current || current.mode !== 'replay') return;
    playing = true;
    $('play-btn').disabled = true;
    var turns = current.seedTurns;
    var i = current.turns.length;
    $('trial-status').textContent = 'Playing the recorded trial…';
    (function step() {
      if (!playing) return;
      if (i >= turns.length) { playing = false; current.verdict = current.seedVerdict; finishTrial(); return; }
      var t = turns[i];
      var turn = { round: t.round, speaker: t.speaker, kind: t.kind, text: t.text, scores: t.scores || null };
      current.turns.push(turn);
      renderTurn(turn, i);
      setScores(current.turns);
      $('round-marker').textContent = 'Round ' + t.round + ' of 3';
      i++;
      playTimer = setTimeout(step, REPLAY_DELAY_MS);
    })();
  }

  // ---------- live trial ----------
  function liveTrial() {
    if (!settings.key) { $('trial-status').textContent = 'No key saved — add one in Settings to run a live trial.'; return; }
    if (playing) return;
    playing = true;
    $('play-btn').disabled = true;
    var model = settings.model || 'gemini-3.5-flash';
    var order = C.buildTurnOrder(3);
    // Each completed slot recorded exactly one turn, so resuming after a
    // failure restarts at the first unrecorded slot instead of repeating turns.
    var idx = current.turns.length;
    $('trial-status').textContent = 'Live trial running with ' + model + '. Each turn is one call to Gemini.';
    (function step() {
      if (idx >= order.length) { playing = false; return; }
      var slot = order[idx];
      $('round-marker').textContent = slot.kind === 'verdict' ? 'Judge delivering the verdict' : 'Round ' + slot.round + ' of 3 — ' + speakerName(slot.speaker);
      var started = performance.now();
      var promise;
      if (slot.kind === 'verdict') {
        promise = C.callGemini(model, settings.key, C.buildJudgePrompt(current.case, current.turns, current.objections))
          .then(function (text) {
            var parsed = C.parseVerdict(text, current.turns.length);
            if (parsed.ok) return parsed.verdict;
            return C.callGemini(model, settings.key, C.buildJudgePrompt(current.case, current.turns, current.objections) + '\n\nYour last reply was not valid verdict JSON (' + (parsed.reason || 'no JSON') + '). Reply with JSON only, in the exact shape requested.')
              .then(function (text2) {
                var p2 = C.parseVerdict(text2, current.turns.length);
                if (!p2.ok) throw new Error('The judge could not produce a valid verdict (' + (p2.reason || 'bad JSON') + '). The transcript is saved; the verdict is not.');
                return p2.verdict;
              });
          });
      } else if (slot.kind === 'cross-examination') {
        var prompt = 'You are the JUDGE. Ask each side one pointed question about a weak spot in its case so far. ' +
          'DECISION: ' + current.case.question + '\nCONTEXT: ' + (current.case.context || '') + '\n\nTRANSCRIPT SO FAR:\n' +
          current.turns.map(function (t, i) { return 'Turn ' + (i + 1) + ' [' + t.speaker + ']: ' + t.text; }).join('\n') +
          '\n\nReply with the two questions only, one per side, 120 words or fewer in total.';
        promise = C.callGemini(model, settings.key, prompt)
          .then(function (text) { return { cross: text }; });
      } else {
        promise = C.liveTurn(model, settings.key, slot.speaker, current.case, current.turns, current.objections)
          .then(function (r) {
            if (!r.ok) throw new Error('The ' + slot.speaker + ' could not produce a usable turn (' + r.reason + '). The trial stops here with the turns recorded so far.');
            return { text: r.text };
          });
      }
      promise.then(function (result) {
        var durationMs = Math.round(performance.now() - started);
        if (slot.kind === 'verdict') {
          current.verdict = result;
          current.turns.push({ round: slot.round, speaker: 'judge', kind: 'verdict', text: 'Verdict delivered: ' + result.decision + ' (confidence ' + result.confidence + '%).', durationMs: durationMs });
          renderTurn(current.turns[current.turns.length - 1], current.turns.length - 1);
          playing = false;
          finishTrial();
          return;
        }
        var turn = { round: slot.round, speaker: slot.speaker, kind: slot.kind, text: result.cross || result.text, durationMs: durationMs };
        current.turns.push(turn);
        renderTurn(turn, current.turns.length - 1);
        idx++;
        step();
      }).catch(function (err) {
        playing = false;
        current.finishedAt = Date.now();
        saveTrial(current);
        $('trial-status').textContent = 'Trial stopped: ' + err.message;
        $('play-btn').disabled = false;
        $('play-btn').textContent = 'Resume the trial';
        $('export-btn').disabled = !current.turns.length;
      });
    })();
    // The step loop is driven by promises: each completed slot advances idx
    // in .then and calls step() again; the verdict slot ends the run.
  }

  $('play-btn').addEventListener('click', function () {
    if (!current) return;
    if (current.mode === 'replay') playReplay();
    else liveTrial();
  });

  // ---------- objection ----------
  $('objection-btn').addEventListener('click', function () {
    if (!current) return;
    var text = $('objection-input').value.trim();
    if (!text) return;
    current.objections.push({ text: text, afterTurn: current.turns.length });
    $('objection-input').value = '';
    renderObjections();
    if (current.mode === 'replay' && current.verdict) {
      current.revision = C.replayRevision(current.verdict, text);
      renderVerdict(current.verdict);
      saveTrial(current);
    }
    $('trial-status').textContent = current.mode === 'live'
      ? 'Objection filed. The judge will address it in the next cross-examination or the verdict.'
      : 'Objection filed against the recorded verdict. See the revision note under the verdict.';
  });

  // ---------- challenge ----------
  $('challenge-btn').addEventListener('click', function () {
    if (!current || !current.verdict) return;
    var text = $('challenge-input').value.trim();
    if (!text) return;
    var result = $('challenge-result');
    if (current.mode === 'replay') {
      result.innerHTML = '';
      result.appendChild(el('p', null, 'This is a recorded case, so the judge cannot re-rule here. Your challenge is saved with the trial: "' + text + '". Add a key in Settings and run this decision live to put the challenge to a real judge.'));
      current.objections.push({ text: 'Challenge: ' + text, afterTurn: current.turns.length });
      renderObjections();
      saveTrial(current);
      return;
    }
    result.textContent = 'Asking the judge…';
    var model = settings.model || 'gemini-3.5-flash';
    C.callGemini(model, settings.key, C.buildChallengePrompt(current.case, current.verdict, text))
      .then(function (reply) {
        var parsed = C.extractJson(reply);
        result.innerHTML = '';
        if (!parsed) { result.appendChild(el('p', null, 'The judge did not answer in a usable form. The original verdict stands.')); return; }
        if (parsed.changed) {
          // A revised verdict is still a verdict: it must pass the same
          // validation as a first verdict, or the original stands.
          var check = C.validateVerdict(parsed.verdict, current.turns.length);
          if (!parsed.verdict || !check.ok) {
            result.appendChild(el('p', null, 'The judge said the verdict should change, but did not give a usable revised verdict' + (check.reason ? ' (' + check.reason + ')' : '') + '. The original verdict stands.'));
            return;
          }
          current.verdict = parsed.verdict;
          current.verdict.challenged = true;
          renderVerdict(current.verdict);
          saveTrial(current);
          result.appendChild(el('p', 'changed', 'The judge changed its mind.'));
          result.appendChild(el('p', null, parsed.note || ''));
        } else {
          result.appendChild(el('p', null, 'The judge stands by the verdict. ' + (parsed.note || '')));
        }
      })
      .catch(function (err) {
        result.textContent = 'The challenge failed: ' + err.message;
      });
  });

  // ---------- export / copy ----------
  $('export-btn').addEventListener('click', function () {
    if (!current) return;
    var md = C.exportMarkdown(current);
    var blob = new Blob([md], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (current.case.id || 'trial') + '-transcript.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  $('copy-verdict-btn').addEventListener('click', function () {
    if (!current || !current.verdict) return;
    var v = current.verdict;
    var text = 'Verdict: ' + v.decision + ' (confidence ' + v.confidence + '%)\n' +
      'Prosecution: ' + v.topArguments.prosecution.join(' / ') + '\n' +
      'Defence: ' + v.topArguments.defence.join(' / ') + '\n' +
      'Risks: ' + (v.risks || []).join(' / ');
    navigator.clipboard.writeText(text).then(function () {
      $('copy-verdict-btn').textContent = 'Copied';
      setTimeout(function () { $('copy-verdict-btn').textContent = 'Copy verdict'; }, 1500);
    }).catch(function () {
      $('copy-verdict-btn').textContent = 'Copy failed';
      setTimeout(function () { $('copy-verdict-btn').textContent = 'Copy verdict'; }, 1500);
    });
  });

  // ---------- new decision ----------
  $('fill-example-btn').addEventListener('click', function () {
    $('q').value = 'Should we raise prices by 20% for new customers?';
    $('ctx').value = 'A 9-person SaaS. 310 paying customers at $29/month. Churn is 4% a month. Two competitors raised prices last quarter and did not lose customers publicly. New signups have grown 12% in three months.';
    document.querySelector('input[name="stakes"][value="medium"]').checked = true;
  });

  $('new-case-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('q').value.trim();
    var ctx = $('ctx').value.trim();
    var stakes = (document.querySelector('input[name="stakes"]:checked') || {}).value || 'medium';
    if (!q) return;
    var brief = $('brief');
    if (!settings.key) {
      // Honest path: no key, no fake debate. A preparation brief instead.
      brief.hidden = false;
      brief.innerHTML = '';
      brief.appendChild(el('h3', null, 'Preparation brief — not a trial'));
      brief.appendChild(el('p', null, 'There is no live debate without a Gemini key, so this is not a trial and nothing below is an argument from an agent. It is the brief the three agents would work from.'));
      var ol = el('ol');
      [
        'Prosecutor must answer: what is the strongest evidence that "' + q + '" is a mistake, and what does it cost if it goes wrong?',
        'Defender must answer: what is the strongest evidence the decision is right, and what does waiting cost?',
        'Judge must answer: which side has the facts, which side has the logic, and what risk is neither side naming?'
      ].forEach(function (s) { ol.appendChild(el('li', null, s)); });
      brief.appendChild(ol);
      var p = el('p');
      p.appendChild(document.createTextNode('To run the real trial, '));
      var b = el('button', 'btn small primary', 'add a key in Settings');
      b.type = 'button';
      b.addEventListener('click', function () { showView('settings'); });
      p.appendChild(b);
      p.appendChild(document.createTextNode(' — or play a recorded case from the library.'));
      brief.appendChild(p);
      return;
    }
    brief.hidden = true;
    var theCase = {
      id: 'coa-custom-' + Date.now().toString(36),
      number: 'COA-CUSTOM-' + new Date().toISOString().slice(0, 10),
      question: q, context: ctx, stakes: stakes
    };
    openTrial({
      id: uid(), case: theCase, turns: [], objections: [], verdict: null,
      mode: 'live', startedAt: Date.now(), finishedAt: null
    });
    $('play-btn').textContent = 'Start the live trial';
    $('trial-status').textContent = 'Live trial ready. Press start — each turn is one call to Gemini.';
  });

  // ---------- settings ----------
  $('save-key-btn').addEventListener('click', function () {
    var key = $('api-key').value.trim();
    if (!key) { $('settings-note').textContent = 'Paste a key first.'; return; }
    settings.key = key;
    settings.model = $('model').value;
    saveSettings();
    $('api-key').value = '';
    $('settings-note').textContent = 'Key saved in this browser only.';
    $('settings-note').className = 'form-note ok';
    renderKeyStatus();
  });
  $('remove-key-btn').addEventListener('click', function () {
    delete settings.key;
    saveSettings();
    $('settings-note').textContent = 'Key removed. Recorded cases still play.';
    $('settings-note').className = 'form-note';
    renderKeyStatus();
  });
  $('model').addEventListener('change', function () {
    settings.model = $('model').value;
    saveSettings();
    renderKeyStatus();
  });

  // ---------- init ----------
  if (settings.model) $('model').value = settings.model;
  renderKeyStatus();
  renderLibrary();
  renderHistory();
  renderHistoryCount();
  showView('library');
  // Deep link: ?case=<seed id>&autoplay=1 (or #case=... for file:// URLs,
  // where a query string does not navigate) opens a recorded trial directly.
  var params = new URLSearchParams(window.location.search || '');
  var hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  var deepCase = params.get('case') || hashParams.get('case');
  var autoplay = params.get('autoplay') || hashParams.get('autoplay');
  if (deepCase && SEED.some(function (c) { return c.id === deepCase; })) {
    openSeedCase(deepCase);
    if (autoplay === '1') {
      // Let the trial view paint before the replay starts.
      setTimeout(playReplay, 400);
    }
  } else if (params.get('view') === 'settings' || hashParams.get('view') === 'settings') {
    showView('settings');
  }
})();
