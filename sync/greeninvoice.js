'use strict';
/* חיבור לחשבונית ירוקה (morning) לקריאת מסמכים פתוחים שעוד לא שולמו = הכנסות עסק צפויות.
   קריאה בלבד: רק חיפוש מסמכים, בלי יצירה או שינוי. */

const ENV = {
  live:    { token: 'https://api.morning.co/idp/v1/oauth/token',          api: 'https://api.greeninvoice.co.il/api/v1' },
  sandbox: { token: 'https://api.sandbox.morning.dev/idp/v1/oauth/token', api: 'https://sandbox.d.greeninvoice.co.il/api/v1' }
};
const OPEN_TYPES = [300, 305]; // חשבון עסקה / דרישת תשלום, חשבונית מס
const TYPE_NAMES = { 300: 'חשבון עסקה', 305: 'חשבונית מס' };

async function getToken(cred) {
  const env = ENV[cred.env || 'live'];
  const res = await fetch(env.token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials', client_id: cred.id, client_secret: cred.secret }) });
  const body = await res.json().catch(() => ({}));
  const token = body.accessToken || body.access_token || body.token;
  if (!res.ok || !token) throw new Error(`הכניסה לחשבונית ירוקה נכשלה (${res.status}). בדקו את מפתח ה-API.`);
  return token;
}

async function searchOpen(cred, token) {
  const env = ENV[cred.env || 'live'];
  const from = new Date(); from.setFullYear(from.getFullYear() - 2);
  const items = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(`${env.api}/documents/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ page, pageSize: 100, type: OPEN_TYPES, status: [0], fromDate: from.toISOString().slice(0, 10), toDate: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10), sort: 'documentDate' })
    });
    if (!res.ok) throw new Error(`חיפוש המסמכים בחשבונית ירוקה נכשל (${res.status}).`);
    const body = await res.json();
    items.push(...(body.items || []));
    if (!body.pages || page >= body.pages) break;
  }
  return items;
}

/* ממיר מסמך מחשבונית ירוקה לשורה בטבלת הכנסות צפויות */
function toExpected(doc, householdId) {
  const amount = +doc.amount || 0;
  const rate = doc.currency && doc.currency !== 'ILS' ? (+doc.currencyRate || 1) : 1;
  const date = v => (v ? String(v).slice(0, 10) : null);
  const desc = doc.description || (doc.income || []).map(i => i.description).filter(Boolean).join(', ');
  return {
    household_id: householdId, source: 'greeninvoice', external_id: String(doc.id),
    number: String(doc.number ?? ''), doc_type: doc.type ?? null,
    client: (doc.client && doc.client.name) || '', description: `${TYPE_NAMES[doc.type] || 'מסמך'}${desc ? ' · ' + desc : ''}`.slice(0, 300),
    amount, currency: doc.currency || 'ILS', amount_ils: Math.round(amount * rate * 100) / 100,
    doc_date: date(doc.documentDate), due_date: date(doc.dueDate || doc.paymentDueDate),
    url: (doc.url && (doc.url.he || doc.url.origin || doc.url.en)) || null,
    updated_at: new Date().toISOString()
  };
}

/* מסנכרן: מעדכן מסמכים פתוחים ומוחק מסמכים שנסגרו (שולמו) */
async function syncGreenInvoice(ctx, cred) {
  const token = await getToken(cred);
  const docs = await searchOpen(cred, token);
  const rows = docs.filter(d => d.status === 0 || d.status === undefined).map(d => toExpected(d, ctx.householdId));
  if (rows.length) {
    const { error } = await ctx.sb.from('expected_income').upsert(rows);
    if (error) throw error;
  }
  const keep = new Set(rows.map(r => r.external_id));
  const { data: existing, error: e2 } = await ctx.sb.from('expected_income').select('external_id').eq('household_id', ctx.householdId).eq('source', 'greeninvoice');
  if (e2) throw e2;
  const gone = (existing || []).map(r => r.external_id).filter(id => !keep.has(id));
  if (gone.length) {
    const { error } = await ctx.sb.from('expected_income').delete().eq('household_id', ctx.householdId).eq('source', 'greeninvoice').in('external_id', gone);
    if (error) throw error;
  }
  return { open: rows.length, total: rows.reduce((s, r) => s + r.amount_ils, 0), closed: gone.length };
}

module.exports = { getToken, syncGreenInvoice, toExpected };
