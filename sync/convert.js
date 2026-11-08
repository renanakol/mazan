'use strict';
/* המרת תנועות מהבנק/האשראי לפורמט של מאזן, סיווג ומניעת כפילויות.
   הלוגיקה תואמת את app.js כדי שתנועות מסונכרנות ומיובאות יתנהגו אותו דבר. */
const crypto = require('crypto');

// ספק באפליקציה -> חברה בספריית הסנכרון ושדות הכניסה שלה
const PROVIDERS = {
  hapoalim: { name: 'בנק הפועלים', kind: 'bank', company: 'hapoalim', fields: [['userCode', 'קוד משתמש'], ['password', 'סיסמה']] },
  leumi:    { name: 'בנק לאומי',   kind: 'bank', company: 'leumi',    fields: [['username', 'שם משתמש'], ['password', 'סיסמה']] },
  isracard: { name: 'ישראכרט',     kind: 'card', company: 'isracard', fields: [['id', 'תעודת זהות'], ['card6Digits', '6 ספרות אחרונות של הכרטיס'], ['password', 'סיסמה']] },
  amex:     { name: 'אמריקן אקספרס', kind: 'card', company: 'amex',   fields: [['id', 'תעודת זהות'], ['card6Digits', '6 ספרות אחרונות של הכרטיס'], ['password', 'סיסמה']] },
  cal:      { name: 'כאל',         kind: 'card', company: 'visaCal',  fields: [['username', 'שם משתמש'], ['password', 'סיסמה']] },
  max:      { name: 'מקס',         kind: 'card', company: 'max',      fields: [['username', 'שם משתמש'], ['password', 'סיסמה']] }
};

const GROUP_KIND = { income: 'income', fixed: 'expense', variable: 'expense', periodic: 'expense', debt: 'expense', transfer: 'neutral' };

function israelDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); // YYYY-MM-DD
}

function categorize(cfg, desc, type, provider) {
  const d = ` ${String(desc || '').toLowerCase()} `;
  const pkind = (PROVIDERS[provider] || {}).kind || 'bank';
  const cats = new Map((cfg.categories || []).map(c => [c.id, c]));
  const fits = c => {
    if (!c || !c.enabled) return false;
    const k = GROUP_KIND[c.group];
    if (k === 'neutral') return pkind === 'bank';
    return k === type;
  };
  const hits = (cfg.rules || []).filter(r => r.pattern && d.includes(r.pattern.toLowerCase()) && fits(cats.get(r.categoryId)))
    .sort((a, b) => b.pattern.length - a.pattern.length);
  if (hits.length) return hits[0].categoryId;
  let best = null, bestLen = 0;
  for (const c of cats.values()) {
    if (!fits(c)) continue;
    for (const kw of c.keywords || []) {
      const k = kw.toLowerCase();
      if (k.length > bestLen && d.includes(k)) { best = c.id; bestLen = k.length; }
    }
  }
  return best;
}

const txHash = t => `${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.desc.trim()}|${t.provider}|${t.memberId}`;

/* מקבל תוצאת סריקה ומחזיר תנועות בפורמט האפליקציה (לפני סינון כפילויות) */
function convertScrape(result, provider, memberId) {
  const out = [];
  for (const acc of result.accounts || []) {
    for (const s of acc.txns || []) {
      if (s.status && s.status !== 'completed') continue; // תנועות ממתינות ייקלטו כשיושלמו
      const raw = typeof s.chargedAmount === 'number' && s.chargedAmount !== 0 ? s.chargedAmount : s.originalAmount;
      if (typeof raw !== 'number' || !raw) continue;
      // בתשלומים: כל תשלום נרשם בחודש החיוב שלו
      const when = s.type === 'installments' && s.processedDate ? s.processedDate : s.date;
      if (!when) continue;
      let desc = String(s.description || '').trim();
      const memo = String(s.memo || '').trim();
      if (memo && !desc.includes(memo)) desc = desc ? `${desc} - ${memo}` : memo;
      if (s.type === 'installments' && s.installments) desc += ` (תשלום ${s.installments.number}/${s.installments.total})`;
      if (!desc) desc = 'תנועה ללא תיאור';
      out.push({ date: israelDate(when), desc, amount: Math.round(Math.abs(raw) * 100) / 100, type: raw < 0 ? 'expense' : 'income', provider, memberId, note: '' });
    }
  }
  return out;
}

/* מסנן כפילויות מול מה שכבר קיים בענן, מסווג ומוסיף מזהים */
function prepareNew(incoming, existingRows, cfg, members) {
  const existing = {};
  for (const r of existingRows) {
    const t = { date: String(r.date).slice(0, 10), amount: +r.amount, type: r.type, desc: r.description, provider: r.provider, memberId: r.member_key };
    const h = r.hash || txHash(t);
    existing[h] = (existing[h] || 0) + 1;
  }
  const seen = {}; const fresh = [];
  for (const t of incoming) {
    const h = txHash(t);
    seen[h] = (seen[h] || 0) + 1;
    if (seen[h] <= (existing[h] || 0)) continue;
    let categoryId = categorize(cfg, t.desc, t.type, t.provider);
    if (!categoryId && t.type === 'income' && /משכורת|שכר עבודה|^שכר/.test(t.desc)) categoryId = t.memberId === (members[0] || {}).id ? 'salary1' : 'salary2';
    fresh.push({ ...t, id: crypto.randomUUID(), hash: h, categoryId });
  }
  return fresh;
}

function toRow(t, householdId) {
  return { id: t.id, household_id: householdId, date: t.date, amount: t.amount, type: t.type, description: t.desc, category_id: t.categoryId || null, member_key: t.memberId, provider: t.provider, note: t.note || '', hash: t.hash };
}

module.exports = { PROVIDERS, categorize, convertScrape, prepareNew, toRow, txHash, israelDate };
