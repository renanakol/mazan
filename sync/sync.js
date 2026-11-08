'use strict';
/* סנכרון יומי: מושך תנועות (קריאה בלבד) מכל החשבונות שהוגדרו ומעלה לענן.
   שימוש:  node sync.js            סנכרון רגיל
           node sync.js --months 12  משיכה של 12 חודשים אחורה
           node sync.js --show       הצגת הדפדפן (לבדיקה או כשנדרש קוד SMS) */
const fs = require('fs');
const path = require('path');
const { createScraper } = require('israeli-bank-scrapers');
const store = require('./secure-store');
const { PROVIDERS, convertScrape, prepareNew, toRow } = require('./convert');
const { browserPath, log, connect } = require('./common');

const STATE_FILE = path.join(__dirname, 'state.json');
const args = process.argv.slice(2);
const argVal = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const MONTHS = argVal('--months') ? Math.max(1, Math.min(24, +argVal('--months'))) : null;
const SHOW = args.includes('--show');
const ONLY = argVal('--only'); // provider:member

const ERRORS = {
  INVALID_PASSWORD: 'פרטי הכניסה שגויים. עדכנו אותם בהגדרת הסנכרון.',
  CHANGE_PASSWORD: 'האתר מבקש להחליף סיסמה. החליפו באתר ועדכנו בהגדרת הסנכרון.',
  ACCOUNT_BLOCKED: 'החשבון חסום באתר. פנו לבנק או לחברת האשראי.',
  TIMEOUT: 'האתר לא הגיב בזמן. ננסה שוב בפעם הבאה.',
  TWO_FACTOR_RETRIEVER_MISSING: 'האתר דורש קוד SMS. הריצו את הסנכרון ידנית עם --show.',
  GENERIC: 'שגיאה כללית בקריאת האתר.'
};

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return {}; } };
const writeState = s => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');

async function fetchExisting(sb, hid, provider, member, fromDate) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('transactions').select('date, amount, type, description, provider, member_key, hash')
      .eq('household_id', hid).eq('provider', provider).eq('member_key', member).gte('date', fromDate).range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

async function status(ctx, provider, member, ok, message, added = 0) {
  await ctx.sb.from('sync_status').upsert({ household_id: ctx.householdId, provider, member_key: member, last_run: new Date().toISOString(), ok, message, added });
}

async function main() {
  const secrets = store.load();
  if (!secrets || !secrets.app || !(secrets.accounts || []).length) { log('אין הגדרות. הריצו קודם: node setup.js'); process.exitCode = 1; return; }
  const exe = browserPath();
  if (!exe) { log('לא נמצא Chrome או Edge במחשב.'); process.exitCode = 1; return; }
  const ctx = await connect(secrets.app);
  const members = ctx.config.members || [];
  const state = readState();
  let failures = 0;

  for (const acc of secrets.accounts) {
    const key = `${acc.provider}:${acc.member}`;
    if (ONLY && ONLY !== key) continue;
    const p = PROVIDERS[acc.provider];
    const who = acc.member === 'joint' ? 'משותף' : (members.find(m => m.id === acc.member) || {}).name || acc.member;
    const label = `${p.name} (${who})`;
    const start = new Date();
    if (MONTHS) start.setMonth(start.getMonth() - MONTHS);
    else if (state[key] && state[key].lastSuccess) { const d = new Date(state[key].lastSuccess); d.setDate(d.getDate() - 60); start.setTime(d.getTime()); }
    else start.setMonth(start.getMonth() - 12); // הרצה ראשונה: שנה אחורה
    log(`${label}: קורא תנועות מ-${start.toLocaleDateString('he-IL')}…`);
    try {
      const scraper = createScraper({ companyId: p.company, startDate: start, combineInstallments: false, showBrowser: SHOW, executablePath: exe, timeout: 120000, defaultTimeout: 120000 });
      const result = await scraper.scrape(acc.credentials);
      if (!result.success) {
        const msg = ERRORS[result.errorType] || `${ERRORS.GENERIC} ${result.errorMessage || ''}`.trim();
        log(`${label}: נכשל – ${msg}`);
        await status(ctx, acc.provider, acc.member, false, msg);
        failures++; continue;
      }
      const incoming = convertScrape(result, acc.provider, acc.member);
      const fromDate = incoming.reduce((m, t) => (t.date < m ? t.date : m), start.toISOString().slice(0, 10));
      const existing = await fetchExisting(ctx.sb, ctx.householdId, acc.provider, acc.member, fromDate);
      const fresh = prepareNew(incoming, existing, ctx.config, members, !!acc.business);
      for (let i = 0; i < fresh.length; i += 500) {
        const { error } = await ctx.sb.from('transactions').insert(fresh.slice(i, i + 500).map(t => toRow(t, ctx.householdId)));
        if (error) throw error;
      }
      const auto = fresh.filter(t => t.categoryId).length;
      log(`${label}: ${incoming.length} תנועות נקראו, ${fresh.length} חדשות נוספו (${auto} סווגו אוטומטית).`);
      await status(ctx, acc.provider, acc.member, true, fresh.length ? `נוספו ${fresh.length} תנועות` : 'אין תנועות חדשות', fresh.length);
      state[key] = { lastSuccess: new Date().toISOString() };
      writeState(state);
    } catch (e) {
      log(`${label}: שגיאה – ${e.message}`);
      try { await status(ctx, acc.provider, acc.member, false, 'שגיאה: ' + e.message.slice(0, 200)); } catch (_) {}
      failures++;
    }
  }
  await ctx.sb.auth.signOut();
  log(failures ? `הסתיים עם ${failures} שגיאות.` : 'הסנכרון הסתיים בהצלחה.');
  process.exitCode = failures ? 2 : 0;
}

main().catch(e => { log('שגיאה: ' + e.message); process.exitCode = 1; });
