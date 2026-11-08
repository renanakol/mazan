'use strict';
/* בדיקה של ההמרה, הסיווג ומניעת הכפילויות, בלי חיבור לבנק או לענן */
const assert = require('assert');
const { convertScrape, prepareNew, toRow } = require('./convert');

const cfg = {
  members: [{ id: 'm1', name: 'רננה' }, { id: 'm2', name: 'אורי' }],
  categories: [
    { id: 'food', group: 'variable', enabled: true, keywords: ['שופרסל', 'רמי לוי'] },
    { id: 'fuel', group: 'variable', enabled: true, keywords: ['פז ', 'סונול'] },
    { id: 'refunds', group: 'income', enabled: true, keywords: ['זיכוי'] },
    { id: 'card_charge', group: 'transfer', enabled: true, keywords: ['מקס איט', 'כאל'] },
    { id: 'salary1', group: 'income', enabled: true, keywords: [] },
    { id: 'salary2', group: 'income', enabled: true, keywords: [] },
    { id: 'gifts', group: 'periodic', enabled: true, keywords: [] }
  ],
  rules: [{ pattern: 'מתנות יפות', categoryId: 'gifts' }]
};

const cardResult = { success: true, accounts: [{ accountNumber: '1234', txns: [
  { type: 'normal', date: '2026-10-11T22:00:00.000Z', processedDate: '2026-11-02T22:00:00.000Z', chargedAmount: -312.5, originalAmount: -312.5, description: 'שופרסל דיל', status: 'completed' },
  { type: 'normal', date: '2026-10-12T22:00:00.000Z', chargedAmount: -250, description: 'סונול ראשון', status: 'completed' },
  { type: 'normal', date: '2026-10-12T22:00:00.000Z', chargedAmount: -250, description: 'סונול ראשון', status: 'completed' }, // אותו סכום פעמיים באותו יום
  { type: 'normal', date: '2026-10-13T22:00:00.000Z', chargedAmount: 120, description: 'זיכוי זארה', status: 'completed' },
  { type: 'installments', date: '2026-08-01T21:00:00.000Z', processedDate: '2026-11-01T22:00:00.000Z', chargedAmount: -100, description: 'מתנות יפות', installments: { number: 3, total: 6 }, status: 'completed' },
  { type: 'normal', date: '2026-10-14T22:00:00.000Z', chargedAmount: -50, description: 'ממתין', status: 'pending' }
] }] };

const conv = convertScrape(cardResult, 'max', 'm2');
assert.strictEqual(conv.length, 5, 'pending skipped');
assert.strictEqual(conv[0].date, '2026-10-12', 'Israel date of transaction');
assert.deepStrictEqual([conv[0].type, conv[0].amount], ['expense', 312.5]);
assert.strictEqual(conv[3].type, 'income');
assert.strictEqual(conv[4].date, '2026-11-02', 'installment uses charge date');
assert.ok(conv[4].desc.includes('3/6'));

let fresh = prepareNew(conv, [], cfg, cfg.members);
assert.strictEqual(fresh.length, 5);
assert.deepStrictEqual(fresh.map(t => t.categoryId), ['food', 'fuel', 'fuel', 'refunds', 'gifts']);

// הרצה שנייה: מה שכבר בענן לא נכנס שוב, כולל שתי תנועות זהות
const rows = fresh.map(t => toRow(t, 'h'));
assert.strictEqual(prepareNew(conv, rows, cfg, cfg.members).length, 0, 'no duplicates on rerun');
// אם בענן יש רק אחת מהשתיים הזהות, השנייה תיכנס
assert.strictEqual(prepareNew(conv, rows.filter((_, i) => i !== 2), cfg, cfg.members).length, 1);

// בנק: חיוב כרטיס לא נספר, משכורת לפי בעלים
const bank = convertScrape({ accounts: [{ txns: [
  { type: 'normal', date: '2026-10-09T21:00:00.000Z', chargedAmount: -2500, description: 'מקס איט פיננ', status: 'completed' },
  { type: 'normal', date: '2026-10-01T21:00:00.000Z', chargedAmount: 13500, description: 'משכורת', memo: 'חברת אופק', status: 'completed' }
] }] }, 'hapoalim', 'm1');
const fb = prepareNew(bank, [], cfg, cfg.members);
assert.deepStrictEqual(fb.map(t => t.categoryId), ['card_charge', 'salary1']);
assert.strictEqual(fb[1].desc, 'משכורת - חברת אופק');

// עסק: זיהוי לפי מילת מפתח, כלל שנלמד, וחשבון עסקי
const cfgB = { ...cfg, categories: [...cfg.categories,
  { id: 'biz_software', group: 'biz_expense', enabled: true, keywords: ['adobe', 'canva'] },
  { id: 'biz_misc', group: 'biz_expense', enabled: true, keywords: [] },
  { id: 'subscriptions', group: 'fixed', enabled: true, keywords: ['spotify', 'canva'] }],
  bizRules: [{ pattern: 'חומרי גלם בע"מ', biz: true }, { pattern: 'canva', biz: false }],
  settings: { bizKeywords: ['adobe', 'canva'] } };
const bt = convertScrape({ accounts: [{ txns: [
  { type: 'normal', date: '2026-10-05T21:00:00.000Z', chargedAmount: -89, description: 'ADOBE *CREATIVE CLOUD', status: 'completed' },
  { type: 'normal', date: '2026-10-06T21:00:00.000Z', chargedAmount: -400, description: 'חומרי גלם בע"מ', status: 'completed' },
  { type: 'normal', date: '2026-10-07T21:00:00.000Z', chargedAmount: -50, description: 'CANVA PRO', status: 'completed' },
  { type: 'normal', date: '2026-10-08T21:00:00.000Z', chargedAmount: -30, description: 'Spotify', status: 'completed' }
] }] }, 'cal', 'joint');
const fbz = prepareNew(bt, [], cfgB, cfg.members);
assert.deepStrictEqual(fbz.map(t => t.biz), [true, true, false, false], 'keyword, learned biz rule, learned home rule overrides keyword');
assert.deepStrictEqual(fbz.map(t => t.categoryId), ['biz_software', null, 'subscriptions', 'subscriptions']);
assert.strictEqual(toRow(fbz[0], 'h').is_business, true);
assert.ok(prepareNew(bt, [], cfgB, cfg.members, true).every(t => t.biz), 'business account marks all');

console.log('כל הבדיקות עברו ✔');
