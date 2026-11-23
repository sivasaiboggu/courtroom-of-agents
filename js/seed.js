// Seeded case library. These are pre-recorded transcripts, written as real
// trials. They are labelled "Recorded replay" everywhere in the UI and are
// never presented as live debates.
(function (root) {
  'use strict';

  var SEED_CASES = [
    {
      id: 'coa-2026-001',
      number: 'COA-2026-001',
      question: 'Should we kill our free tier?',
      context: 'A 14-person SaaS startup. 4,200 free accounts, 310 paying customers. Free tier costs about $1,900 a month in hosting and support. 11% of paying customers started on free. Churn among paying customers rose 8% last quarter. The free tier has no usage cap on the core feature.',
      stakes: 'high',
      turns: [
        { round: 1, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The steelman for keeping the free tier is that it is our largest source of new paying customers — 11% of them started there. But that funnel is leaking: we pay $1,900 a month to host 4,200 accounts that mostly never convert, and the uncapped core feature means our heaviest users are the ones paying nothing. A free tier that costs more to run than the customers it produces is not a funnel, it is a subsidy for people who will never pay.' },
        { round: 1, speaker: 'defender', kind: 'argument', scores: { evidence: 8, logic: 7, risk: 6 },
          text: 'The steelman for killing it is the $1,900 a month and the support load. But the free tier is the reason anyone has heard of us: those 4,200 accounts are our word of mouth, our public templates, our search presence. Kill it and the top of the funnel does not shrink a little, it disappears — and with paying churn already up 8%, we would be cutting our only growing source of new accounts at the exact moment we need it most.' },
        { round: 2, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 8 },
          text: 'The defence says the free tier is our discovery engine, and discovery matters. But discovery that never converts is just traffic. Of 4,200 free accounts, roughly 34 a year become paying customers at the current rate — each one costs us about $670 in hosting alone to acquire. A capped trial or a paid starter plan would keep discovery and force the decision. The risk is not killing the tier; the risk is another year of paying to host our own competition for attention.' },
        { round: 2, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 7 },
          text: 'The prosecution prices the free tier like a paid channel, and that is the wrong test. Those 34 conversions a year are the customers with the lowest acquisition cost we have — no ads, no sales calls. And the $1,900 is not the real number: half of it is support, which a usage cap would cut without killing the tier. The honest fix is a cap and a 14-day full trial, not removing the door that 4,200 people walked through.' },
        { round: 2, speaker: 'judge', kind: 'cross-examination',
          text: 'Prosecutor: you say each conversion costs $670 in hosting. Show the working — is that $1,900 a month divided by 34 conversions a year, and does it ignore that support cost falls if you cap usage? Defender: you say a cap fixes the cost. What cap, exactly, and what happens to the free users who hit it — do they convert, or do they leave and tell people the product got worse?' },
        { round: 3, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 8, logic: 9, risk: 8 },
          text: 'The steelman for a cap is that it preserves discovery while cutting cost, and it is a fair point. But a cap is still a free tier with a new argument attached: every cap we set will be negotiated by our heaviest users in public. The numbers are the numbers — 34 conversions a year against $22,800 a year in cost, while paying churn rises 8%. Kill the tier, replace it with a 14-day trial and a $9 starter plan, and put the $1,900 a month into keeping the customers we already have.' },
        { round: 3, speaker: 'defender', kind: 'argument', scores: { evidence: 6, logic: 7, risk: 8 },
          text: 'The prosecution wants certainty the numbers cannot give: we do not know how many of the 34 would have found us without the free tier, and we do not know what a $9 plan does to signups. What we do know is that killing the tier is irreversible in reputation — you cannot quietly bring back a free plan after announcing it is gone. A cap is reversible. When the downside is permanent and the upside is $1,900 a month, the cautious move is the cap, not the cut.' },
        { round: 3, speaker: 'judge', kind: 'cross-examination',
          text: 'Both sides now agree the real choice is between killing the tier and capping it — neither of you defends the uncapped tier as it stands. Prosecutor: if the cap were set at the 90th percentile of current free usage, would your cost argument survive? Defender: if the cap cut conversions from 34 to 20 a year, would you still call it reversible?' }
      ],
      verdict: {
        decision: 'amend', confidence: 71,
        scores: { prosecution: { evidence: 8, logic: 8, risk: 8 }, defence: { evidence: 7, logic: 7, risk: 7 } },
        topArguments: {
          prosecution: [
            'The uncapped free tier costs $22,800 a year to produce about 34 paying customers — roughly $670 per conversion in hosting alone.',
            'Paying churn is already up 8%; spending on non-paying users while losing paying ones is the wrong order of priorities.',
            'A 14-day trial plus a $9 starter plan keeps a low-friction entry without an open-ended subsidy.'
          ],
          defence: [
            'The free tier is the cheapest acquisition channel the company has — 11% of paying customers started there, with no ad or sales spend.',
            'Killing the tier is irreversible in reputation; a usage cap achieves most of the saving and can be undone.',
            'Half the $1,900 monthly cost is support, which a cap would cut directly.'
          ]
        },
        risks: [
          'A hard kill could cut new signups to near zero for a quarter, with no way to measure what was lost.',
          'A $9 starter plan is untested — it may convert worse than the free tier did.',
          'Heavy free users hitting a cap may complain publicly, which reads the same as a price rise.'
        ],
        citations: [
          { turn: 1, quote: 'we pay $1,900 a month to host 4,200 accounts that mostly never convert' },
          { turn: 4, quote: 'half of it is support, which a usage cap would cut without killing the tier' },
          { turn: 7, quote: 'killing the tier is irreversible in reputation' }
        ],
        reasoning: 'Neither side defends the tier as it stands, so the question is kill versus cap. The cost argument is real and quantified; the irreversibility argument is real and unquantified. Amend the decision: cap the free tier at the 90th percentile of current usage, add a 14-day full trial, and review conversions after one quarter before any further cut.'
      }
    },
    {
      id: 'coa-2026-002',
      number: 'COA-2026-002',
      question: 'Should we hire a junior engineer instead of a senior for the platform role?',
      context: 'A seed-stage team of 6 needs one platform engineer. Senior candidates ask ₹35–45 LPA; a strong junior asks ₹10–12 LPA. The platform is a single Node service with a Postgres database, no on-call rotation yet. The CTO can mentor 4 hours a week. Runway is 14 months.',
      stakes: 'high',
      turns: [
        { round: 1, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 8 },
          text: 'The steelman for the junior is the money: ₹25 lakh a year saved extends runway by almost two months. But this is the platform role — the one service everything else depends on. A junior has never designed a migration, never debugged a production outage at 2 a.m., never said no to a shortcut that would have cost a week later. With 14 months of runway and a CTO who can mentor only 4 hours a week, you are hiring a single point of failure and calling it a saving.' },
        { round: 1, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 7, risk: 6 },
          text: 'The steelman for the senior is experience under pressure, and nobody disputes that. But the platform is one Node service and one database — it is not a distributed system, and it does not need a principal engineer to keep it running. A strong junior at ₹11 LPA, mentored properly, ships the same roadmap for a third of the price, and the ₹25 lakh saved is the difference between hiring a second engineer later or not. Paying senior money for junior-sized work is how runway dies quietly.' },
        { round: 2, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The defence says the system is simple, and today it is. Simple systems become complicated the week a customer asks for the feature that touches the billing path, and that week is when you find out whether your platform engineer has done it before. The CTO has 4 hours a week to mentor — that is not a mentorship plan, it is a hope. One bad migration by an unsupervised junior costs more than the salary gap, and it costs it in customer trust, which runway cannot buy back.' },
        { round: 2, speaker: 'defender', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The prosecution prices the junior at the cost of the worst day, and the senior at the cost of the best day. Seniors also ship bad migrations — the difference is they cost three times as much while doing it. The honest comparison is not junior versus perfect senior; it is a junior with code review, staging, and backups against a senior you cannot afford to keep if the next round slips. And a junior who grows with the system is the engineer you still have in two years.' },
        { round: 2, speaker: 'judge', kind: 'cross-examination',
          text: 'Prosecutor: you assume the junior works unsupervised, but the CTO has 4 hours a week and the team has code review. What specifically breaks with that in place? Defender: you say a senior is unaffordable if the round slips — but if the round slips, is a junior the hire that keeps the company alive, or the one that makes the platform the reason it slips?' },
        { round: 3, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 9 },
          text: 'The steelman for the junior is retention: someone who grows with the system stays. But retention only matters if the system survives its first year, and the first year is exactly when the platform is most fragile. Four hours of mentoring a week does not cover on-call judgement, and there is no on-call rotation yet, so the junior is on call alone from day one. Hire the senior, even on a 12-month contract, and revisit the junior hire when the platform has tests, runbooks, and a second pair of hands.' },
        { round: 3, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 7, risk: 7 },
          text: 'The prosecution keeps moving the requirement: first it was experience, then it was on-call judgement, now it is runbooks that do not exist yet. Those runbooks are exactly what a junior writes in their first month, with review. The senior on a 12-month contract leaves just as the system gets complicated, taking the knowledge with them. Hire the junior, pair them with a part-time senior advisor for the first quarter, and spend the saving on the second engineer this team actually needs.' },
        { round: 3, speaker: 'judge', kind: 'cross-examination',
          text: 'Both sides now accept some senior input is needed — the disagreement is how much and for how long. Prosecutor: would a part-time senior advisor for one quarter satisfy your on-call concern? Defender: if the advisor costs ₹8 lakh for the quarter, does your saving still hold?' }
      ],
      verdict: {
        decision: 'amend', confidence: 64,
        scores: { prosecution: { evidence: 7, logic: 8, risk: 8 }, defence: { evidence: 7, logic: 7, risk: 7 } },
        topArguments: {
          prosecution: [
            'The platform is a single point of failure and the junior would be on call alone, with only 4 hours of mentoring a week.',
            'One bad migration costs more in customer trust than the ₹25 lakh salary gap saves.',
            'Runway of 14 months does not survive a platform incident that loses a paying customer.'
          ],
          defence: [
            'The system is one Node service and one database — junior-sized work at a third of the price.',
            'The ₹25 lakh saving funds a second hire later; senior money for this scope burns runway quietly.',
            'A junior who grows with the system is the engineer still there in two years.'
          ]
        },
        risks: [
          'A part-time advisor may not be available when an incident happens at night.',
          'The junior may leave after a year of training, taking the investment with them.',
          'A contract senior leaves after 12 months with undocumented knowledge.'
        ],
        citations: [
          { turn: 1, quote: 'you are hiring a single point of failure and calling it a saving' },
          { turn: 4, quote: 'a junior with code review, staging, and backups against a senior you cannot afford to keep' },
          { turn: 7, quote: 'pair them with a part-time senior advisor for the first quarter' }
        ],
        reasoning: 'The prosecution proves the risk is real and the mentoring budget is thin; the defence proves the scope is small and the saving is material. Neither side wins outright. Amend: hire the junior, with a paid senior advisor for the first quarter and a written rule that no migration ships without the advisor\'s review until the runbooks exist.'
      }
    },
    {
      id: 'coa-2026-003',
      number: 'COA-2026-003',
      question: 'Should we cut the reporting feature to ship on time?',
      context: 'A B2B analytics product. Launch is in 5 weeks. Reporting (scheduled PDF exports) is 60% built and is the last big feature; cutting it saves 3 weeks. 6 of 12 pilot customers asked for reporting in onboarding; 2 of them said it was the reason they signed up. The team is 5 engineers, no one free to help.',
      stakes: 'medium',
      turns: [
        { round: 1, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 8, logic: 7, risk: 8 },
          text: 'The steelman for cutting is the date: five weeks, no spare hands, and a launch that slips loses the quarter. But 6 of 12 pilot customers asked for reporting, and 2 said it was the reason they signed up. Cutting the feature those two bought is not a scope decision, it is breaking the promise that got them in the door. A launch that ships on time with your two most committed pilots already disappointed is a launch that starts with churn.' },
        { round: 1, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 6 },
          text: 'The steelman for keeping it is the two pilots who asked for it by name. But reporting is 60% built with the hardest 40% still ahead — scheduling, delivery, failure handling — and it is the work most likely to slip the date. Shipping the core product to 12 pilots in five weeks teaches us more than shipping everything to 2 pilots in eight. The two can get a manual export from support for a month; a missed launch window cannot be recovered by hand.' },
        { round: 2, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 7 },
          text: 'The defence offers manual exports from support, which means the feature still exists — just done by a human, slowly, and unmeasured. That is not cutting scope, it is hiding it. And the 6 of 12 who asked for reporting did not ask for a workaround; they asked because their managers need a PDF on Monday morning. If the launch story is "everything except the thing your boss asked for", the pilot feedback will be about the missing feature, not the product.' },
        { round: 2, speaker: 'defender', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The prosecution treats the 60% as progress, but 60% of a reporting feature is 0% of a working one — nothing ships until scheduling and delivery work. The three weeks saved are not idle time; they are the buffer that keeps the core product stable for all 12 pilots. A manual export for two customers for one month is a fair trade for a launch that works. The feature is cut from the launch, not from the product — it ships in the next release, six weeks later.' },
        { round: 2, speaker: 'judge', kind: 'cross-examination',
          text: 'Prosecutor: if the two pilots get a weekly manual export and a written date for the real feature, is the promise still broken? Defender: you say the hardest 40% is ahead — name it. Is it scheduling, delivery, or failure handling that actually threatens the date?' },
        { round: 3, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 8 },
          text: 'The steelman for the cut is the buffer: three weeks of stability for the core product is worth real money. But the buffer argument assumes the saved time is used well, and a team that is already behind does not usually bank spare weeks. The honest price of the cut is two pilots who signed up for reporting, told their managers it was coming, and will now explain why it is not. That conversation happens in week one of the pilot, not in the next release.' },
        { round: 3, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 7, risk: 8 },
          text: 'The prosecution is right that the two pilots will have an awkward conversation, and we should own it with them directly, before launch, with a date. But launching late has the same conversation with all twelve pilots, plus a missed quarter. The choice is not between disappointing two customers and disappointing nobody — it is between disappointing two with a plan, and disappointing twelve with a delay. Ship on time, export by hand, and put reporting first in the next release.' },
        { round: 3, speaker: 'judge', kind: 'cross-examination',
          text: 'Both sides agree the two pilots need a direct conversation before launch. The remaining question is whether the manual export is a real bridge or a polite fiction. Defender: who in support does the export, and what happens the week they are on leave? Prosecutor: if the answer is a named person and a written date, does your objection stand?' }
      ],
      verdict: {
        decision: 'uphold', confidence: 68,
        scores: { prosecution: { evidence: 8, logic: 8, risk: 7 }, defence: { evidence: 7, logic: 8, risk: 7 } },
        topArguments: {
          prosecution: [
            'Two of twelve pilots signed up because of reporting — cutting it breaks the promise that won them.',
            'A manual export is the same work done slowly and unmeasured, not a real cut.',
            'Pilot feedback will be dominated by the missing feature instead of the product.'
          ],
          defence: [
            '60% built is 0% working — the hardest part (scheduling, delivery, failure handling) is still ahead.',
            'Three weeks saved is the stability buffer for the core product for all twelve pilots.',
            'A manual export for two customers for one month is a fair, bounded trade for an on-time launch.'
          ]
        },
        risks: [
          'The two pilots may churn before the next release if the manual export feels second-class.',
          'Support may not have the capacity to do weekly exports reliably.',
          'The next release could slip too, turning a six-week delay into a twelve-week one.'
        ],
        citations: [
          { turn: 1, quote: '2 said it was the reason they signed up' },
          { turn: 4, quote: '60% of a reporting feature is 0% of a working one' },
          { turn: 7, quote: 'disappointing two with a plan, and disappointing twelve with a delay' }
        ],
        reasoning: 'The prosecution\'s promise argument is strong, but the defence\'s arithmetic is stronger: the choice is two disappointed pilots with a plan versus twelve with a delay. Uphold the cut — on the condition that the two pilots are told directly before launch, get a named person doing the weekly export, and a written date for the real feature in the next release.'
      }
    },
    {
      id: 'coa-2026-004',
      number: 'COA-2026-004',
      question: 'Should we switch payment vendors from Stripe to Razorpay?',
      context: 'An Indian SaaS with 80% of customers in India, 20% abroad. Current vendor charges 2% + GST on domestic cards and 3% on international. The alternative charges 2% flat domestic, 3% international, and settles in INR a day faster. Migration is estimated at 2 engineer-weeks, including moving 310 saved cards. 4 failed payments a month are currently traced to the vendor.',
      stakes: 'medium',
      turns: [
        { round: 1, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 8 },
          text: 'The steelman for switching is the rate: 2% flat domestic and a day faster settlement is real money on Indian volume. But the migration moves 310 saved cards, and saved cards are where payments break — every failed re-authentication is a customer who has to re-enter details, and some will not bother. Two engineer-weeks is the estimate; migrations never take the estimate. You are risking the revenue you already have to save a fraction of a percent on the revenue you might get.' },
        { round: 1, speaker: 'defender', kind: 'argument', scores: { evidence: 8, logic: 7, risk: 6 },
          text: 'The steelman for staying is that the current vendor works and migrations break things. But 80% of our customers are in India, and the alternative is built for exactly that market — better UPI support, faster INR settlement, and 2% flat instead of 2% plus GST. On our volume that is roughly ₹18,000 a month, every month, forever. Four failed payments a month are already traced to the current vendor. Staying is not free; it is a quiet monthly payment for the comfort of not changing.' },
        { round: 2, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The defence quotes ₹18,000 a month as if it were certain, but it depends on volume staying the same through a migration that touches every paying customer. The 310 saved cards are the risk: if even 5% fail to migrate cleanly, that is 15 customers asked to re-enter payment details in the same month we are telling them nothing has changed. One of those 15 is a customer who churns, and the saving for the year is gone in a single lost account.' },
        { round: 2, speaker: 'defender', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 7 },
          text: 'The prosecution prices the migration at its worst case and the status quo at its best. The 5% failure number is invented — card migration between major vendors is a solved process with token portability, and the vendor does it with a success rate they will put in writing. The two engineer-weeks are real work, but they are two weeks once, against ₹18,000 a month forever. And the international 20% keeps the same 3% either way, so nothing about the global business changes.' },
        { round: 2, speaker: 'judge', kind: 'cross-examination',
          text: 'Prosecutor: your 5% failure figure — is it from a past migration, or an assumption? If the vendor guarantees a migration success rate in writing, does your argument hold? Defender: the ₹18,000 a month — show the volume it assumes, and say what happens to it if three customers churn during the move.' },
        { round: 3, speaker: 'prosecutor', kind: 'argument', scores: { evidence: 7, logic: 8, risk: 9 },
          text: 'The steelman for switching is that the saving compounds: ₹18,000 a month is ₹2.16 lakh a year, and that is not small for a team this size. But compounding works both ways — a migration done badly compounds too, in failed renewals that show up months later when a card that was supposed to migrate silently fails at renewal time. The cautious move is a pilot: move new signups first, watch them for a month, and migrate saved cards only when the pilot proves the numbers.' },
        { round: 3, speaker: 'defender', kind: 'argument', scores: { evidence: 8, logic: 8, risk: 7 },
          text: 'The prosecution has now conceded the saving is real and the risk is manageable — a pilot is a switch, just a slower one. A pilot on new signups proves nothing about saved cards, which is the part the prosecution is actually worried about. Run the pilot on 30 saved cards with the vendor\'s written guarantee, measure the failure rate for real instead of arguing about 5%, and then decide with numbers instead of fears.' },
        { round: 3, speaker: 'judge', kind: 'cross-examination',
          text: 'Both sides now agree on a measured move rather than a big-bang switch or staying put. The disagreement is only what to measure first. Prosecutor: is 30 saved cards enough to trust the result? Defender: if 2 of those 30 fail, do you still proceed?' }
      ],
      verdict: {
        decision: 'amend', confidence: 73,
        scores: { prosecution: { evidence: 7, logic: 8, risk: 8 }, defence: { evidence: 8, logic: 8, risk: 7 } },
        topArguments: {
          prosecution: [
            'Migrating 310 saved cards is where payments break; a 5% failure rate means 15 customers re-entering details.',
            'Two engineer-weeks is an estimate, and migrations rarely take the estimate.',
            'A failed renewal months later is the cost that shows up after the saving has been counted.'
          ],
          defence: [
            '₹18,000 a month, every month, on mostly-Indian volume — ₹2.16 lakh a year for a team this size.',
            'The alternative is built for the Indian market: better UPI support and a day faster INR settlement.',
            'Four failed payments a month are already traced to the current vendor.'
          ]
        },
        risks: [
          'Token portability may not cover every card type; some customers will have to re-enter details regardless.',
          'Running two vendors in parallel during a pilot doubles reconciliation work for finance.',
          'The saving assumes volume holds; churn during the move eats it directly.'
        ],
        citations: [
          { turn: 2, quote: 'roughly ₹18,000 a month, every month, forever' },
          { turn: 3, quote: 'if even 5% fail to migrate cleanly, that is 15 customers asked to re-enter payment details' },
          { turn: 7, quote: 'measure the failure rate for real instead of arguing about 5%' }
        ],
        reasoning: 'The saving is real and quantified; the migration risk is real and unmeasured. Both sides end up arguing for measurement, not for their original position. Amend: do not switch outright. Migrate 30 saved cards as a pilot with a written success-rate guarantee from the vendor, measure the actual failure rate, and decide on the full migration with that number in hand.'
      }
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = { SEED_CASES: SEED_CASES };
  root.SeedCases = SEED_CASES;
})(typeof window !== 'undefined' ? window : globalThis);
