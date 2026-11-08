'use strict';

/* ================= קבועים ועזרים ================= */
const STORE_KEY = 'mazan.v1';
const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const SHORT_MONTHS = ['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];
const GOAL_COLORS = ['#1d6b57', '#4b55c9', '#b5336f', '#b7740a', '#0b8378', '#6b4fc9'];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = n => nf.format(Math.round(n || 0));
const fmt2 = n => nf2.format(n || 0);
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const currentYm = () => todayStr().slice(0, 7);
const ymLabel = ym => { const [y, m] = ym.split('-'); return `${HEB_MONTHS[+m - 1]} ${y}`; };
const shiftYm = (ym, d) => { let [y, m] = ym.split('-').map(Number); m += d; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${pad(m)}`; };
const dateLabel = s => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y.slice(2)}`; };
const providerById = id => PROVIDERS.find(p => p.id === id) || PROVIDERS[PROVIDERS.length - 1];

const ICONS = {
  month: '<path d="M4 5h16v15H4zM4 9h16M8 3v4M16 3v4"/>',
  tx: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  year: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  prev: '<path d="M9 6l6 6-6 6"/>',
  next: '<path d="M15 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  wallet: '<path d="M3 7h18v13H3zM3 7l3-4h12l3 4M16 13.5h2"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
};
const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${ICONS[name]}</svg>`;

/* ================= מצב ונתונים ================= */
function defaultState() {
  return {
    version: 1,
    members: [{ id: 'm1', name: 'רננה' }, { id: 'm2', name: 'אורי' }],
    categories: CATEGORY_LIBRARY.map(([id, name, group, on, keywords]) => ({ id, name, group, enabled: on, budget: 0, keywords, custom: false })),
    transactions: [],
    rules: [],
    goals: [],
    settings: { theme: 'auto', scale: 1, setupDone: false, monthlySavingsTarget: 0 }
  };
}

let state = null; // נטען מהענן אחרי התחברות (cloud.js)
const ui = { route: 'month', ym: currentYm(), year: new Date().getFullYear(), filters: { q: '', cat: '', member: '', type: '', scope: '' }, setupStep: 1, settingsTab: 'categories', onlyActive: true, imp: null, authMode: 'login', busy: false };

function normalizeState(s) {
  if (!s || !Array.isArray(s.categories)) return defaultState();
  s = JSON.parse(JSON.stringify(s));
  // הוספת סעיפים חדשים מהספרייה לגרסאות קודמות
  const have = new Set(s.categories.map(c => c.id));
  CATEGORY_LIBRARY.forEach(([id, name, group, on, keywords]) => {
    if (!have.has(id)) s.categories.push({ id, name, group, enabled: on, budget: 0, keywords, custom: false });
    else { const c = s.categories.find(x => x.id === id); if (!c.custom && !c.keywordsEdited) c.keywords = keywords; }
  });
  s.settings = Object.assign(defaultState().settings, s.settings || {});
  s.rules ||= []; s.bizRules ||= []; s.aiTried ||= []; s.goals ||= []; s.transactions ||= [];
  if (!Array.isArray(s.members) || s.members.length < 2) s.members = defaultState().members;
  return s;
}
function save() { savePrefs(); Cloud.schedule(); }
const myMember = () => (state.members.some(m => m.id === Cloud.me) ? Cloud.me : state.members[0].id);

const cat = id => state.categories.find(c => c.id === id);
const groupOf = id => GROUPS.find(g => g.id === id);
const kindOfCat = c => (c ? groupOf(c.group).kind : null);
const JOINT = { id: 'joint', name: 'משותף' };
const owners = () => [...state.members, JOINT];
const memberName = id => (owners().find(m => m.id === id) || {}).name || '';
const ownerOptions = sel => owners().map(m => `<option value="${m.id}" ${sel === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
const isCounted = t => { const c = cat(t.categoryId); return !c || c.group !== 'transfer'; };
const isBizGroup = gid => !!(groupOf(gid) || {}).biz;

/* ================= זיהוי עסק מול בית ================= */
const DEFAULT_BIZ_KEYWORDS = ['adobe', 'canva', 'figma', 'wix', 'zoom.us', 'notion', 'slack', 'dropbox', 'godaddy', 'namecheap', 'shopify', 'mailchimp', 'monday.com', 'hubspot', 'squarespace', 'webflow', 'envato', 'freepik', 'shutterstock', 'google ads', 'facebk ads', 'meta ads', 'linkedin', 'חשבונית ירוקה', 'greeninvoice', 'icount', 'חשבונית מס', 'רואה חשבון', 'רו"ח', 'הנהלת חשבונות', 'מקדמות מס', 'מע"מ', 'דפוס', 'ציוד משרדי', 'אופיס דיפו', 'office depot', 'סליקה'];
const bizKeywords = () => (Array.isArray(state.settings.bizKeywords) ? state.settings.bizKeywords : DEFAULT_BIZ_KEYWORDS);
/* מחזיר true/false: חוקים שלמדנו מהמשתמש קודם, אחר כך מילות מפתח של עסק */
function detectBiz(desc) {
  const d = ` ${String(desc || '').toLowerCase()} `;
  const hit = (state.bizRules || []).filter(r => r.pattern && d.includes(r.pattern.toLowerCase())).sort((a, b) => b.pattern.length - a.pattern.length)[0];
  if (hit) return !!hit.biz;
  return bizKeywords().some(k => k && d.includes(k.toLowerCase()));
}
function rememberBiz(pattern, biz) {
  state.bizRules = (state.bizRules || []).filter(r => r.pattern !== pattern);
  state.bizRules.push({ id: uid(), pattern, biz });
}

/* ================= סיווג אוטומטי ================= */
function categorize(desc, type, provider, biz = false) {
  const d = ` ${String(desc || '').toLowerCase()} `;
  const pkind = providerById(provider).kind;
  const fits = c => {
    if (!c || !c.enabled) return false;
    const k = kindOfCat(c);
    if (k === 'neutral') return pkind === 'bank';
    if (isBizGroup(c.group) !== !!biz) return false;
    return k === type;
  };
  // חוקים של המשתמש קודם
  const userHits = state.rules.filter(r => r.pattern && d.includes(r.pattern.toLowerCase()) && fits(cat(r.categoryId)))
    .sort((a, b) => b.pattern.length - a.pattern.length);
  if (userHits.length) return userHits[0].categoryId;
  let best = null, bestLen = 0;
  for (const c of state.categories) {
    if (!fits(c)) continue;
    for (const kw of c.keywords || []) {
      const k = kw.toLowerCase();
      if (k.length > bestLen && d.includes(k)) { best = c.id; bestLen = k.length; }
    }
  }
  return best;
}

/* מסווג תנועות שעוד לא סווגו לפי מילות מפתח וחוקים. מחזיר כמה סווגו */
function autoCategorizeAll() {
  let n = 0;
  for (const t of state.transactions) {
    if (t.categoryId) continue;
    const c = categorize(t.desc, t.type, t.provider, t.biz);
    if (c) { t.categoryId = c; n++; }
  }
  return n;
}

/* ================= חישובים ================= */
function txOfMonth(ym) { return state.transactions.filter(t => t.date.startsWith(ym)); }
function monthStats(ym) {
  const txs = txOfMonth(ym);
  let income = 0, expense = 0; const byCat = {}; const byGroup = {}; let uncategorized = 0;
  const biz = { income: 0, expense: 0, count: 0 };
  for (const t of txs) {
    if (!isCounted(t)) continue;
    if (t.biz) { // עסק: נספר בנפרד מתקציב הבית
      biz[t.type] += t.amount; biz.count++;
      if (!t.categoryId) uncategorized++;
      const k = t.categoryId || '__none_biz'; byCat[k] = (byCat[k] || 0) + t.amount;
      continue;
    }
    if (t.type === 'income') income += t.amount; else expense += t.amount;
    const key = t.categoryId || '__none';
    if (!t.categoryId) uncategorized++;
    byCat[key] = (byCat[key] || 0) + t.amount;
    const c = cat(t.categoryId);
    const g = c ? c.group : (t.type === 'income' ? 'income' : 'variable');
    if (t.type === 'expense') byGroup[g] = (byGroup[g] || 0) + t.amount;
  }
  return { txs, income, expense, balance: income - expense, byCat, byGroup, uncategorized, biz };
}
function yearMatrix(year) {
  const m = {}; // catId -> [12]
  const inc = Array(12).fill(0), exp = Array(12).fill(0), bInc = Array(12).fill(0), bExp = Array(12).fill(0);
  for (const t of state.transactions) {
    if (!t.date.startsWith(String(year)) || !isCounted(t)) continue;
    const mi = +t.date.slice(5, 7) - 1;
    const key = t.categoryId || (t.biz ? (t.type === 'income' ? '__none_bin' : '__none_bex') : (t.type === 'income' ? '__none_in' : '__none_ex'));
    (m[key] ||= Array(12).fill(0))[mi] += t.amount;
    if (t.biz) { if (t.type === 'income') bInc[mi] += t.amount; else bExp[mi] += t.amount; }
    else if (t.type === 'income') inc[mi] += t.amount; else exp[mi] += t.amount;
  }
  return { m, inc, exp, bInc, bExp };
}
const totalBudget = kind => state.categories.filter(c => c.enabled && kindOfCat(c) === kind && !isBizGroup(c.group)).reduce((s, c) => s + (+c.budget || 0), 0);

/* הכנסות עסק צפויות (מסמכים פתוחים מחשבונית ירוקה) לחודש מסוים; בחודש הנוכחי כוללים גם מסמכים באיחור */
function expectedFor(ym) {
  const cur = currentYm();
  return (Cloud.expected || []).map(e => ({ ...e, when: String(e.due_date || e.doc_date || '').slice(0, 10) }))
    .filter(e => e.when && (e.when.startsWith(ym) || (ym === cur && e.when < cur)))
    .sort((a, b) => a.when.localeCompare(b.when));
}

/* ================= ניווט ================= */
const ROUTES = [
  { id: 'month', label: 'חודשי', icon: 'month', title: 'סיכום חודשי' },
  { id: 'tx', label: 'תנועות', icon: 'tx', title: 'תנועות' },
  { id: 'year', label: 'שנתי', icon: 'year', title: 'סיכום שנתי' },
  { id: 'goals', label: 'יעדים', icon: 'goals', title: 'יעדים ומטרות' },
  { id: 'settings', label: 'הגדרות', icon: 'settings', title: 'הגדרות' }
];
function renderNav() {
  $('#nav').innerHTML = `
    <div class="brand"><img src="icon.svg" alt=""><div>מאזן<small>${esc(state.members.map(m => m.name).join(' ו'))}</small></div></div>
    <ul>${ROUTES.map(r => `<li><a href="#/${r.id}" ${ui.route === r.id ? 'aria-current="page"' : ''}>${icon(r.icon)}<span>${r.label}</span></a></li>`).join('')}</ul>
    <div class="nav-foot"><div id="sync-status" aria-live="polite">${syncStatusHtml()}</div><div class="small">${esc(Cloud.session?.user?.email || '')}</div></div>`;
}
function readRoute() {
  const r = (location.hash.replace(/^#\/?/, '') || 'month').split('?')[0];
  ui.route = ROUTES.some(x => x.id === r) ? r : 'month';
}
window.addEventListener('hashchange', () => { readRoute(); render(true); });

/* ================= רינדור ================= */
function applyPrefs() {
  const root = document.documentElement;
  const st = state ? state.settings : (readJSON(PREFS_KEY) || {});
  if (!st.theme || st.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = st.theme;
  root.style.setProperty('--scale', st.scale || 1);
}
function render(focusMain = false) {
  applyPrefs();
  if (Cloud.recovery) { document.body.classList.add('setup-mode'); $('#view').innerHTML = viewRecovery(); document.title = 'סיסמה חדשה · מאזן'; return; }
  if (!Cloud.session) { document.body.classList.add('setup-mode'); $('#view').innerHTML = viewAuth(); document.title = 'כניסה · מאזן'; return; }
  if (!Cloud.household || !state) { document.body.classList.add('setup-mode'); $('#view').innerHTML = viewHousehold(); document.title = 'משק הבית · מאזן'; return; }
  document.body.classList.toggle('setup-mode', !state.settings.setupDone);
  if (!state.settings.setupDone) { $('#view').innerHTML = viewSetup(); document.title = 'ברוכים הבאים · מאזן'; return; }
  renderNav();
  const route = ROUTES.find(r => r.id === ui.route);
  document.title = `${route.title} · מאזן`;
  const views = { month: viewMonth, tx: viewTx, year: viewYear, goals: viewGoals, settings: viewSettings };
  $('#view').innerHTML = views[ui.route]();
  if (focusMain) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
}

function monthSwitcher() {
  return `<div class="switcher" role="group" aria-label="בחירת חודש">
    <button class="icon-btn" data-action="month-shift" data-d="-1" aria-label="לחודש הקודם">${icon('prev')}</button>
    <span class="label" aria-live="polite">${ymLabel(ui.ym)}</span>
    <button class="icon-btn" data-action="month-shift" data-d="1" aria-label="לחודש הבא">${icon('next')}</button>
  </div>`;
}

/* ---------- מסך חודשי ---------- */
function viewMonth() {
  const s = monthStats(ui.ym);
  const exp = expectedFor(ui.ym).map(e => ({ ...e, url: /^https:\/\//.test(e.url || '') ? e.url : null }));
  const expTotal = exp.reduce((a, e) => a + (+e.amount_ils || 0), 0);
  const expLate = exp.filter(e => e.when < currentYm()).length;
  const budgetExp = totalBudget('expense');
  const target = +state.settings.monthlySavingsTarget || 0;
  const hasTx = s.txs.length > 0;

  let callouts = '';
  if (s.uncategorized) callouts += `<div class="callout">${icon('alert')}<div class="grow">יש ${s.uncategorized} תנועות שעוד לא סווגו לסעיף, ולכן הן לא מופיעות בתקציב.</div><button class="btn sm primary" data-action="open-qc">לסיווג מהיר</button></div>`;
  if (!hasTx) callouts += `<div class="callout info">${icon('info')}<div class="grow">אין עדיין תנועות ב${ymLabel(ui.ym)}. אפשר לייבא קובץ מהבנק או מחברת האשראי, או להוסיף תנועה ידנית.</div><div class="btn-row"><button class="btn sm primary" data-action="open-import">ייבוא קובץ</button><button class="btn sm" data-action="add-tx">הוספה ידנית</button></div></div>`;

  return `
  <div class="page-head">
    <div><h1>סיכום חודשי</h1><p class="sub">כמה נכנס, כמה יצא, ואיפה אנחנו מול התקציב</p></div>
    ${monthSwitcher()}
  </div>
  ${callouts}
  <section class="grid kpis" aria-label="נתונים עיקריים">
    <div class="card kpi"><div class="k-label"><span class="dot" style="background:var(--c-income)"></span>הכנסות</div><div class="k-value num">${fmt(s.income)}</div><div class="k-sub">${totalBudget('income') ? `מתוך צפי של ${fmt(totalBudget('income'))}` : '&nbsp;'}</div></div>
    <div class="card kpi"><div class="k-label"><span class="dot" style="background:var(--c-debt)"></span>הוצאות</div><div class="k-value num">${fmt(s.expense)}</div><div class="k-sub">${budgetExp ? `מתוך תקציב של ${fmt(budgetExp)}` : '&nbsp;'}</div></div>
    <div class="card kpi"><div class="k-label">יתרה החודש</div><div class="k-value num ${s.balance >= 0 ? 'pos' : 'neg'}">${s.balance < 0 ? '−' : ''}${fmt(Math.abs(s.balance))}</div><div class="k-sub">${s.balance >= 0 ? 'נשאר לנו כסף' : 'הוצאנו יותר ממה שנכנס'}</div></div>
    <div class="card kpi"><div class="k-label">יעד חיסכון חודשי</div>${target ? `<div class="k-value num ${s.balance >= target ? 'pos' : ''}">${Math.max(0, Math.round(s.balance / target * 100))}%</div><div class="k-sub">יעד: ${fmt(target)} לחודש</div>` : `<div class="k-value">—</div><div class="k-sub"><a href="#/goals">להגדרת יעד</a></div>`}</div>
  </section>

  ${s.biz.count || exp.length ? `<section class="card biz-card" aria-labelledby="h-biz" style="margin-bottom:16px">
    <div class="card-head"><h2 id="h-biz"><span class="dot" style="background:var(--c-biz)"></span> העסק החודש</h2><a class="btn sm" href="#/tx" data-action="filter-biz">לתנועות העסק</a></div>
    <div class="grid kpis" style="margin:0">
      <div><div class="k-label muted small">הכנסות העסק</div><div class="num" style="font-size:1.3rem;font-weight:700">${fmt(s.biz.income)}</div>${expTotal ? `<div class="small muted">ועוד <span class="num">${fmt(expTotal)}</span> צפויות</div>` : ''}</div>
      <div><div class="k-label muted small">הוצאות העסק</div><div class="num" style="font-size:1.3rem;font-weight:700">${fmt(s.biz.expense)}</div></div>
      <div><div class="k-label muted small">רווח</div><div class="num ${s.biz.income - s.biz.expense >= 0 ? 'pos' : 'neg'}" style="font-size:1.3rem;font-weight:700">${fmt(s.biz.income - s.biz.expense)}</div></div>
    </div>
    ${exp.length ? `<details style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">
      <summary style="cursor:pointer"><strong>הכנסות צפויות מחשבונית ירוקה: <span class="num">${fmt(expTotal)}</span></strong> <span class="muted small">(${exp.length} מסמכים פתוחים${expLate ? `, ${expLate} באיחור` : ''})</span></summary>
      <ul class="rule-list" style="margin-top:8px">${exp.map(e => `<li><div class="grow"><div class="tx-desc">${esc(e.client || 'לקוח')} · מס׳ ${esc(e.number)}</div><div class="tx-meta">${esc(e.description)} · ${e.when < currentYm() ? '<span class="neg">באיחור, מ־' + dateLabel(e.when) + '</span>' : dateLabel(e.when)}</div></div><span class="num" style="font-weight:600">${fmt(e.amount_ils)}</span>${e.url ? `<a class="btn sm" href="${esc(e.url)}" target="_blank" rel="noopener">מסמך<span class="sr-only"> ${esc(e.number)} (נפתח בחלון חדש)</span></a>` : ''}</li>`).join('')}</ul>
    </details>` : ''}
    <p class="small muted" style="margin-top:8px">תנועות העסק לא נכללות בהכנסות, בהוצאות ובתקציב של הבית שלמעלה.</p>
  </section>` : ''}
  <div class="grid two">
    <section class="card" aria-labelledby="h-budget">
      <div class="card-head"><h2 id="h-budget">ביצוע מול תקציב</h2><a class="btn sm" href="#/settings" data-action="settings-tab" data-tab="categories">עריכת תקציב</a></div>
      ${budgetBlock(s)}
    </section>
    <div class="stack">
      <section class="card" aria-labelledby="h-split">
        <div class="card-head"><h2 id="h-split">לאן הלך הכסף</h2></div>
        ${donutBlock(s)}
      </section>
      <section class="card" aria-labelledby="h-recent">
        <div class="card-head"><h2 id="h-recent">תנועות אחרונות</h2><a class="btn sm" href="#/tx">לכל התנועות</a></div>
        ${recentBlock(s)}
      </section>
    </div>
  </div>`;
}

function budgetBlock(s) {
  const groups = GROUPS.filter(g => g.kind === 'expense' && !g.biz);
  let any = false;
  const html = groups.map(g => {
    const cats = state.categories.filter(c => c.group === g.id && (c.enabled || s.byCat[c.id]) && ((+c.budget) || s.byCat[c.id]));
    if (!cats.length) return '';
    any = true;
    const gSum = cats.reduce((a, c) => a + (s.byCat[c.id] || 0), 0);
    const gBud = cats.reduce((a, c) => a + (+c.budget || 0), 0);
    return `<div class="budget-group"><h3><span class="dot" style="background:${g.color}"></span>${g.name}<span class="num">${fmt(gSum)}${gBud ? ` / ${fmt(gBud)}` : ''}</span></h3>
      ${cats.map(c => budgetRow(c, s.byCat[c.id] || 0)).join('')}</div>`;
  }).join('');
  if (!any) return `<div class="empty">${icon('wallet')}<p>עוד לא הוגדר תקציב לסעיפים, ואין הוצאות החודש.</p><div class="btn-row"><a class="btn primary" href="#/settings" data-action="settings-tab" data-tab="categories">הגדרת תקציב חודשי</a></div></div>`;
  return html;
}
function budgetRow(c, actual) {
  const b = +c.budget || 0;
  const pct = b ? actual / b : 0;
  const cls = !b ? '' : pct > 1 ? 'over' : pct > .85 ? 'near' : '';
  const note = !b ? 'לא הוגדר תקציב' : pct > 1 ? `חריגה של ${fmt(actual - b)}` : `נשארו ${fmt(b - actual)}`;
  return `<div class="brow">
    <div class="brow-top"><span>${esc(c.name)}</span><span class="amt num"><strong>${fmt(actual)}</strong>${b ? ` מתוך ${fmt(b)}` : ''}</span></div>
    ${b ? `<div class="bar ${cls}" role="progressbar" aria-label="${esc(c.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}" aria-valuetext="${Math.round(pct * 100)} אחוז מהתקציב"><span style="width:${Math.min(100, pct * 100)}%"></span></div>` : ''}
    <div class="brow-note ${cls === 'over' ? 'over' : ''}">${note}</div>
  </div>`;
}
function donutBlock(s) {
  const parts = GROUPS.filter(g => g.kind === 'expense' && !g.biz).map(g => ({ g, v: s.byGroup[g.id] || 0 })).filter(p => p.v > 0);
  const total = parts.reduce((a, p) => a + p.v, 0);
  if (!total) return `<p class="muted">אין הוצאות בחודש הזה.</p>`;
  const R = 60, C = 2 * Math.PI * R; let off = 0;
  const arcs = parts.map(p => { const len = p.v / total * C; const a = `<circle r="${R}" cx="85" cy="85" fill="none" stroke="${p.g.color}" stroke-width="26" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`; off += len; return a; }).join('');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 170 170" role="img" aria-label="חלוקת ההוצאות לפי סוג: ${parts.map(p => `${p.g.name} ${Math.round(p.v / total * 100)} אחוז`).join(', ')}">
      <circle r="${R}" cx="85" cy="85" fill="none" stroke="var(--surface-2)" stroke-width="26"/>${arcs}
      <text x="85" y="82" text-anchor="middle" style="font-size:12px;fill:var(--muted)">סה״כ</text>
      <text x="85" y="102" text-anchor="middle" style="font-size:17px;font-weight:700;fill:var(--text)">${esc(fmt(total))}</text>
    </svg>
    <ul class="legend">${parts.map(p => `<li><span class="dot" style="background:${p.g.color}"></span>${p.g.name}<span class="num">${fmt(p.v)}</span><span class="pct">${Math.round(p.v / total * 100)}%</span></li>`).join('')}</ul>
  </div>`;
}
function recentBlock(s) {
  const list = [...s.txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  if (!list.length) return `<p class="muted">אין תנועות.</p>`;
  return `<ul class="rule-list">${list.map(t => `<li><div class="grow"><div class="tx-desc">${esc(t.desc)}</div><div class="tx-meta">${dateLabel(t.date)} · ${t.categoryId ? esc(cat(t.categoryId)?.name || '') : '<span class="tag none">לא מסווג</span>'}</div></div><span class="num ${t.type === 'income' ? 'pos' : ''}" style="font-weight:600">${t.type === 'income' ? '+' : ''}${fmt(t.amount)}</span></li>`).join('')}</ul>`;
}

/* ---------- תנועות ---------- */
function catOptions(type, selected, biz = false) {
  const groups = GROUPS.filter(g => ((type === 'income' ? g.kind === 'income' : g.kind === 'expense') && !!g.biz === !!biz) || g.kind === 'neutral');
  return `<option value="">— לא מסווג —</option>` + groups.map(g => {
    const cats = state.categories.filter(c => c.group === g.id && (c.enabled || c.id === selected));
    if (!cats.length) return '';
    return `<optgroup label="${esc(g.name)}">${cats.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`;
  }).join('');
}
function filteredTx() {
  const f = ui.filters; const q = f.q.trim().toLowerCase();
  return txOfMonth(ui.ym).filter(t =>
    (!q || t.desc.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q)) &&
    (!f.cat || (f.cat === '__none' ? !t.categoryId : t.categoryId === f.cat)) &&
    (!f.member || t.memberId === f.member) &&
    (!f.type || t.type === f.type) &&
    (!f.scope || (f.scope === 'biz' ? t.biz : !t.biz))
  ).sort((a, b) => b.date.localeCompare(a.date) || a.desc.localeCompare(b.desc));
}
function viewTx() {
  const f = ui.filters;
  const list = filteredTx();
  const sumIn = list.filter(t => t.type === 'income' && isCounted(t)).reduce((a, t) => a + t.amount, 0);
  const sumOut = list.filter(t => t.type === 'expense' && isCounted(t)).reduce((a, t) => a + t.amount, 0);
  const allCatsOpt = GROUPS.map(g => { const cs = state.categories.filter(c => c.group === g.id && c.enabled); return cs.length ? `<optgroup label="${esc(g.name)}">${cs.map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : ''; }).join('');
  return `
  <div class="page-head">
    <div><h1>תנועות</h1><p class="sub">כל ההכנסות וההוצאות של החודש, עם סיווג לסעיפים</p></div>
    ${monthSwitcher()}
  </div>
  <div class="btn-row" style="margin-bottom:16px">
    <button class="btn primary" data-action="open-import">${icon('upload')}ייבוא מהבנק / אשראי</button>
    <button class="btn" data-action="add-tx">${icon('plus')}הוספת תנועה</button>
    ${(() => { const n = unknownPlaces().length; return n ? `<button class="btn" data-action="open-qc">סיווג מהיר · ${n} ${n === 1 ? 'מקום לא מוכר' : 'מקומות לא מוכרים'}</button>` : ''; })()}
    ${state.settings.ai !== false && Cloud.aiStatus !== 'missing_key' ? `<button class="btn" data-action="ai-run" ${Cloud.aiBusy ? 'disabled' : ''}>${Cloud.aiBusy ? 'מסווג…' : 'סיווג חכם (AI)'}</button>` : ''}
  </div>
  <section class="card">
    <div class="filters" role="search" aria-label="סינון תנועות">
      <div class="field search"><label for="f-q" class="sr-only">חיפוש</label><input id="f-q" class="input" type="search" placeholder="חיפוש לפי שם בית עסק או הערה" value="${esc(f.q)}" data-filter="q"></div>
      <div class="field"><label for="f-cat" class="sr-only">סעיף</label><select id="f-cat" class="input" data-filter="cat"><option value="">כל הסעיפים</option><option value="__none" ${f.cat === '__none' ? 'selected' : ''}>לא מסווגות</option>${allCatsOpt}</select></div>
      <div class="field"><label for="f-mem" class="sr-only">מי</label><select id="f-mem" class="input" data-filter="member"><option value="">כל החשבונות</option>${ownerOptions(f.member)}</select></div>
      <div class="field"><label for="f-type" class="sr-only">סוג</label><select id="f-type" class="input" data-filter="type"><option value="">הכנסות והוצאות</option><option value="expense" ${f.type === 'expense' ? 'selected' : ''}>הוצאות</option><option value="income" ${f.type === 'income' ? 'selected' : ''}>הכנסות</option></select></div>
      <div class="field"><label for="f-scope" class="sr-only">בית או עסק</label><select id="f-scope" class="input" data-filter="scope"><option value="">בית ועסק</option><option value="home" ${f.scope === 'home' ? 'selected' : ''}>בית בלבד</option><option value="biz" ${f.scope === 'biz' ? 'selected' : ''}>עסק בלבד</option></select></div>
    </div>
    <p class="small muted" aria-live="polite" style="margin-bottom:8px">${list.length} תנועות · הכנסות <span class="num">${fmt(sumIn)}</span> · הוצאות <span class="num">${fmt(sumOut)}</span></p>
    ${list.length ? `<table class="tx-table">
      <caption class="sr-only">תנועות ${ymLabel(ui.ym)}</caption>
      <thead><tr><th scope="col">תאריך</th><th scope="col">תיאור</th><th scope="col">מקור</th><th scope="col">סעיף</th><th scope="col" style="text-align:end">סכום</th><th scope="col"><span class="sr-only">פעולות</span></th></tr></thead>
      <tbody>${list.map(txRow).join('')}</tbody></table>`
      : `<div class="empty">${icon('tx')}<p>${state.transactions.length ? 'אין תנועות שמתאימות לסינון.' : 'עוד אין תנועות. מתחילים בייבוא קובץ מהבנק או מהאשראי.'}</p></div>`}
  </section>`;
}
function txRow(t) {
  const p = providerById(t.provider);
  const counted = isCounted(t);
  return `<tr>
    <td class="c-date num">${dateLabel(t.date)}</td>
    <td class="c-desc"><div class="tx-desc">${esc(t.desc)}</div>${t.note ? `<div class="tx-meta">${esc(t.note)}</div>` : ''}${t.aiNote ? `<div class="tx-ai"><span class="sr-only">הסבר משוער: </span>${esc(t.aiNote)}</div>` : ''}</td>
    <td class="c-src"><div class="small">${esc(p.name)}</div><div class="tx-meta">${esc(memberName(t.memberId))}</div></td>
    <td class="c-cat"><label class="sr-only" for="c-${t.id}">סעיף עבור ${esc(t.desc)}</label><select id="c-${t.id}" class="input sm" data-action="set-cat" data-id="${t.id}">${catOptions(t.type, t.categoryId, t.biz)}</select></td>
    <td class="amount num ${t.type === 'income' ? 'in' : ''}" ${counted ? '' : 'style="opacity:.55;text-decoration:line-through"'}>${t.type === 'income' ? '+' : ''}${fmt2(t.amount)}</td>
    <td class="tx-actions"><button class="biz-toggle" data-action="toggle-biz" data-id="${t.id}" aria-pressed="${t.biz ? 'true' : 'false'}" aria-label="הוצאת עסק: ${esc(t.desc)}" title="סימון כתנועת עסק">עסק</button><button class="icon-btn sm" data-action="edit-tx" data-id="${t.id}" aria-label="עריכת ${esc(t.desc)}">${icon('edit')}</button><button class="icon-btn sm danger" data-action="del-tx" data-id="${t.id}" aria-label="מחיקת ${esc(t.desc)}">${icon('trash')}</button></td>
  </tr>`;
}

/* ---------- שנתי ---------- */
function viewYear() {
  const Y = ui.year; const { m, inc, exp, bInc, bExp } = yearMatrix(Y);
  const bTotIn = bInc.reduce((a, b) => a + b, 0), bTotEx = bExp.reduce((a, b) => a + b, 0);
  const hasBiz = bTotIn + bTotEx > 0 || state.transactions.some(t => t.biz);
  const totIn = inc.reduce((a, b) => a + b, 0), totEx = exp.reduce((a, b) => a + b, 0);
  const monthsWithData = inc.map((v, i) => v + exp[i] > 0).filter(Boolean).length || 1;
  const rate = totIn ? Math.round((totIn - totEx) / totIn * 100) : 0;

  const rowsFor = g => {
    const cats = state.categories.filter(c => c.group === g.id && (m[c.id] || (!ui.onlyActive && c.enabled) || (ui.onlyActive && c.enabled && +c.budget)));
    const NONE = { income: '__none_in', variable: '__none_ex', biz_income: '__none_bin', biz_expense: '__none_bex' };
    const extra = NONE[g.id] && m[NONE[g.id]] ? [{ id: NONE[g.id], name: 'לא מסווג' }] : [];
    const all = [...cats, ...extra];
    if (!all.length) return '';
    const gArr = Array(12).fill(0); all.forEach(c => (m[c.id] || []).forEach((v, i) => gArr[i] += v));
    const gTot = gArr.reduce((a, b) => a + b, 0);
    const gBud = all.reduce((a, c) => a + (+c.budget || 0), 0) * 12;
    return `<tr class="grp"><td><span class="dot" style="background:${g.color}"></span> ${g.name}</td>${gArr.map(v => `<td class="num">${v ? fmt(v) : ''}</td>`).join('')}<td class="num">${fmt(gTot)}</td><td class="num">${fmt(gTot / monthsWithData)}</td><td class="num">${gBud ? fmt(gBud) : ''}</td></tr>` +
      all.map(c => { const arr = m[c.id] || Array(12).fill(0); const tot = arr.reduce((a, b) => a + b, 0); const bud = (+c.budget || 0) * 12; const over = g.kind === 'expense' && bud && tot > bud;
        return `<tr><td>${esc(c.name)}</td>${arr.map(v => `<td class="num ${v ? '' : 'zero'}">${v ? fmt(v) : '–'}</td>`).join('')}<td class="num col-sum ${over ? 'over' : ''}">${fmt(tot)}</td><td class="num">${fmt(tot / monthsWithData)}</td><td class="num">${bud ? fmt(bud) : '–'}</td></tr>`; }).join('');
  };

  return `
  <div class="page-head">
    <div><h1>סיכום שנתי</h1><p class="sub">תמונה מלאה של השנה לפי סעיפים, מתעדכנת אוטומטית</p></div>
    <div class="switcher" role="group" aria-label="בחירת שנה">
      <button class="icon-btn" data-action="year-shift" data-d="-1" aria-label="לשנה הקודמת">${icon('prev')}</button>
      <span class="label" aria-live="polite">${Y}</span>
      <button class="icon-btn" data-action="year-shift" data-d="1" aria-label="לשנה הבאה">${icon('next')}</button>
    </div>
  </div>
  <section class="grid kpis" aria-label="סיכום השנה">
    <div class="card kpi"><div class="k-label"><span class="dot" style="background:var(--c-income)"></span>הכנסות השנה</div><div class="k-value num">${fmt(totIn)}</div><div class="k-sub">ממוצע ${fmt(totIn / monthsWithData)} לחודש</div></div>
    <div class="card kpi"><div class="k-label"><span class="dot" style="background:var(--c-debt)"></span>הוצאות השנה</div><div class="k-value num">${fmt(totEx)}</div><div class="k-sub">ממוצע ${fmt(totEx / monthsWithData)} לחודש</div></div>
    <div class="card kpi"><div class="k-label">מאזן שנתי</div><div class="k-value num ${totIn - totEx >= 0 ? 'pos' : 'neg'}">${totIn - totEx < 0 ? '−' : ''}${fmt(Math.abs(totIn - totEx))}</div><div class="k-sub">${monthsWithData} חודשים עם נתונים</div></div>
    <div class="card kpi"><div class="k-label">שיעור חיסכון</div><div class="k-value num ${rate >= 0 ? '' : 'neg'}">${rate}%</div><div class="k-sub">מתוך ההכנסות</div></div>
  </section>
  <section class="card" aria-labelledby="h-chart">
    <div class="card-head"><h2 id="h-chart">הכנסות מול הוצאות לפי חודש</h2>
      <ul class="legend" style="display:flex;gap:16px;flex:none"><li><span class="dot" style="background:var(--c-income)"></span>הכנסות</li><li><span class="dot" style="background:var(--c-debt)"></span>הוצאות</li></ul></div>
    ${yearChart(inc, exp)}
  </section>
  <section class="card" aria-labelledby="h-ytable">
    <div class="card-head"><h2 id="h-ytable">פירוט לפי סעיפים</h2>
      <label class="toggle-row small"><input type="checkbox" data-action="toggle-active" ${ui.onlyActive ? 'checked' : ''}> להציג רק סעיפים עם נתונים או תקציב</label></div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="טבלת סיכום שנתי, ניתנת לגלילה">
      <table class="year-table">
        <thead><tr><th scope="col">סעיף</th>${HEB_MONTHS.map(n => `<th scope="col">${n}</th>`).join('')}<th scope="col">סה״כ</th><th scope="col">ממוצע</th><th scope="col">תקציב שנתי</th></tr></thead>
        <tbody>
          ${GROUPS.filter(g => g.kind !== 'neutral' && !g.biz).map(rowsFor).join('')}
          <tr class="total"><td>סה״כ הכנסות</td>${inc.map(v => `<td class="num">${fmt(v)}</td>`).join('')}<td class="num">${fmt(totIn)}</td><td class="num">${fmt(totIn / monthsWithData)}</td><td></td></tr>
          <tr class="total"><td>סה״כ הוצאות</td>${exp.map(v => `<td class="num">${fmt(v)}</td>`).join('')}<td class="num">${fmt(totEx)}</td><td class="num">${fmt(totEx / monthsWithData)}</td><td></td></tr>
          <tr class="total"><td>הפרש</td>${inc.map((v, i) => `<td class="num ${v - exp[i] < 0 ? 'neg' : ''}">${fmt(v - exp[i])}</td>`).join('')}<td class="num">${fmt(totIn - totEx)}</td><td class="num">${fmt((totIn - totEx) / monthsWithData)}</td><td></td></tr>
          ${hasBiz ? `<tr><td colspan="16" style="background:var(--surface);border-bottom:0;padding-top:20px"><strong>העסק</strong> <span class="muted small">(לא נכלל בסיכומי הבית)</span></td></tr>
          ${GROUPS.filter(g => g.biz).map(rowsFor).join('')}
          <tr class="total"><td>רווח העסק</td>${bInc.map((v, i) => `<td class="num ${v - bExp[i] < 0 ? 'neg' : ''}">${fmt(v - bExp[i])}</td>`).join('')}<td class="num">${fmt(bTotIn - bTotEx)}</td><td class="num">${fmt((bTotIn - bTotEx) / monthsWithData)}</td><td></td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </section>`;
}
function yearChart(inc, exp) {
  const W = 760, H = 260, padT = 16, padB = 30, padS = 56;
  const max = Math.max(1000, ...inc, ...exp);
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const top = Math.ceil(max / step) * step;
  const y = v => padT + (H - padT - padB) * (1 - v / top);
  const slot = (W - padS - 8) / 12;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = top / 4 * i; g += `<line class="grid-line" x1="8" x2="${W - padS}" y1="${y(v)}" y2="${y(v)}"/><text x="${W - padS + 6}" y="${y(v) + 4}" text-anchor="start">${v >= 1000 ? Math.round(v / 1000) + 'K' : v}</text>`; }
  const bw = Math.min(18, slot / 3);
  for (let i = 0; i < 12; i++) {
    const cx = W - padS - slot * (i + .5); // ינואר בצד ימין
    g += `<rect x="${cx}" y="${y(inc[i])}" width="${bw}" height="${y(0) - y(inc[i])}" rx="3" fill="var(--c-income)"><title>${HEB_MONTHS[i]} הכנסות ${fmt(inc[i])}</title></rect>`;
    g += `<rect x="${cx - bw - 2}" y="${y(exp[i])}" width="${bw}" height="${y(0) - y(exp[i])}" rx="3" fill="var(--c-debt)"><title>${HEB_MONTHS[i]} הוצאות ${fmt(exp[i])}</title></rect>`;
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${SHORT_MONTHS[i]}</text>`;
  }
  const desc = HEB_MONTHS.map((n, i) => `${n}: הכנסות ${fmt(inc[i])}, הוצאות ${fmt(exp[i])}`).join('; ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="תרשים עמודות של הכנסות והוצאות לפי חודש. ${esc(desc)}">${g}</svg>`;
}

/* ---------- יעדים ---------- */
function monthsUntil(ym) { if (!ym) return null; const [y, m] = ym.split('-').map(Number); const [cy, cm] = currentYm().split('-').map(Number); return Math.max(1, (y - cy) * 12 + (m - cm)); }
function viewGoals() {
  const target = +state.settings.monthlySavingsTarget || 0;
  const s = monthStats(currentYm());
  const totalNeeded = state.goals.reduce((a, g) => { const left = Math.max(0, g.target - g.saved); const mm = monthsUntil(g.deadline); return a + (mm ? left / mm : 0); }, 0);
  return `
  <div class="page-head">
    <div><h1>יעדים ומטרות</h1><p class="sub">חיסכון למטרות, ויעד חודשי שנמדד מול היתרה בפועל</p></div>
    <button class="btn primary" data-action="add-goal">${icon('plus')}יעד חדש</button>
  </div>
  <section class="card" aria-labelledby="h-mt">
    <div class="card-head"><h2 id="h-mt">יעד חיסכון חודשי</h2></div>
    <form class="form-grid two" data-form="monthly-target">
      <div class="field"><label for="mt">כמה נרצה לחסוך בכל חודש (₪)</label><input id="mt" name="mt" class="input" type="number" min="0" step="50" inputmode="numeric" value="${target || ''}"></div>
      <div class="field"><span class="lbl">החודש עד עכשיו</span><p style="padding-top:8px"><span class="num ${s.balance >= 0 ? 'pos' : 'neg'}" style="font-weight:700;font-size:1.2rem">${fmt(s.balance)}</span> <span class="muted small">יתרה ב${ymLabel(currentYm())}</span></p></div>
      <div><button class="btn primary" type="submit">שמירה</button></div>
    </form>
    ${totalNeeded ? `<p class="small muted" style="margin-top:12px">כדי לעמוד בכל היעדים בזמן צריך להפריש בערך <strong class="num">${fmt(totalNeeded)}</strong> בחודש.</p>` : ''}
  </section>
  <h2 style="margin:24px 0 12px">מטרות חיסכון</h2>
  ${state.goals.length ? `<div class="goals-grid">${state.goals.map(goalCard).join('')}</div>`
    : `<div class="card empty">${icon('goals')}<p>עוד אין מטרות. למשל: קרן חירום, חופשה, רכב, דירה.</p><div class="btn-row"><button class="btn primary" data-action="add-goal">יצירת מטרה ראשונה</button></div></div>`}`;
}
function goalCard(g) {
  const pct = g.target ? Math.min(1, g.saved / g.target) : 0;
  const R = 32, C = 2 * Math.PI * R;
  const mm = monthsUntil(g.deadline);
  const left = Math.max(0, g.target - g.saved);
  return `<article class="card goal" aria-labelledby="g-${g.id}">
    <div class="goal-top">
      <svg class="ring" viewBox="0 0 76 76" role="img" aria-label="${Math.round(pct * 100)} אחוז הושלם"><circle cx="38" cy="38" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="8"/><circle cx="38" cy="38" r="${R}" fill="none" stroke="${g.color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>
      <div><h3 id="g-${g.id}">${esc(g.name)}</h3><p class="small muted">${g.deadline ? `עד ${ymLabel(g.deadline)}` : 'ללא תאריך יעד'}</p></div>
    </div>
    <div class="goal-stats">
      <div><span>נחסך</span><strong class="num">${fmt(g.saved)}</strong></div>
      <div><span>יעד</span><strong class="num">${fmt(g.target)}</strong></div>
      <div><span>נשאר</span><strong class="num">${fmt(left)}</strong></div>
      <div><span>לחודש</span><strong class="num">${left && mm ? fmt(left / mm) : '—'}</strong></div>
    </div>
    <div class="btn-row">
      <button class="btn sm primary" data-action="deposit-goal" data-id="${g.id}">הפקדה</button>
      <button class="btn sm" data-action="edit-goal" data-id="${g.id}">עריכה</button>
      <button class="icon-btn sm danger" data-action="del-goal" data-id="${g.id}" aria-label="מחיקת היעד ${esc(g.name)}">${icon('trash')}</button>
    </div>
  </article>`;
}

/* ---------- הגדרות ---------- */
const SETTINGS_TABS = [['categories', 'סעיפים ותקציב'], ['connections', 'חשבונות וייבוא'], ['rules', 'חוקי סיווג'], ['account', 'חשבון ושיתוף'], ['general', 'כללי וגיבוי']];
function settingsAccount() {
  const joined = Cloud.memberRows.map(r => r.member_key);
  const full = joined.length >= 2;
  return `
  <section class="card">
    <h2 style="margin-bottom:10px">החשבון שלי</h2>
    <p>מחובר/ת בתור <bdi><strong>${esc(Cloud.session.user.email)}</strong></bdi>, ומסומן/ת באפליקציה בתור <strong>${esc(memberName(Cloud.me))}</strong>.</p>
    <div class="btn-row" style="margin-top:14px"><button class="btn" data-action="sign-out">יציאה מהחשבון</button></div>
  </section>
  <section class="card">
    <h2 style="margin-bottom:10px">שיתוף משק הבית</h2>
    <ul class="rule-list" style="margin-bottom:12px">${state.members.map(m => `<li><div class="grow">${esc(m.name)}</div>${joined.includes(m.id) ? '<span class="pill ok">מחובר/ת</span>' : '<span class="pill">עוד לא הצטרף/ה</span>'}</li>`).join('')}</ul>
    ${full ? '<p class="small muted">שניכם מחוברים. כל שינוי מופיע אצל השני מיד.</p>' : `
      <p class="small" style="margin-bottom:10px">כדי לצרף את בן או בת הזוג: יוצרים קוד הזמנה ושולחים אותו. הם נרשמים באפליקציה עם האימייל שלהם ומזינים את הקוד. הקוד תקף לשבוע ולשימוש אחד.</p>
      <div class="btn-row" style="align-items:center"><button class="btn primary" data-action="make-invite">יצירת קוד הזמנה</button>
      ${ui.invite ? `<output class="num" style="font-size:1.4rem;font-weight:700;letter-spacing:.15em" dir="ltr" aria-label="קוד הזמנה">${esc(ui.invite)}</output><button class="btn sm" data-action="copy-invite">העתקה</button>` : ''}</div>`}
  </section>`;
}
function viewSettings() {
  const tab = ui.settingsTab;
  const body = { categories: settingsCategories, connections: settingsConnections, rules: settingsRules, account: settingsAccount, general: settingsGeneral }[tab]();
  return `
  <div class="page-head"><div><h1>הגדרות</h1><p class="sub">בוחרים אילו סעיפים להציג, קובעים תקציב ומנהלים חשבונות</p></div></div>
  <nav class="settings-nav" aria-label="חלקי ההגדרות">${SETTINGS_TABS.map(([id, n]) => `<a href="#/settings" data-action="settings-tab" data-tab="${id}" ${tab === id ? 'aria-current="true"' : ''}>${n}</a>`).join('')}</nav>
  ${body}`;
}
function settingsCategories() {
  const bi = totalBudget('income'), be = totalBudget('expense');
  return `
  <section class="card">
    <div class="card-head"><h2>סעיפים ותקציב חודשי</h2><button class="btn sm" data-action="add-cat">${icon('plus')}סעיף חדש</button></div>
    <p class="small muted" style="margin-bottom:14px">מסמנים את הסעיפים הרלוונטיים לכם ומזינים תקציב חודשי. להוצאות תקופתיות, הזינו ממוצע לחודש (סכום שנתי חלקי 12).
    צפי הכנסות: <strong class="num">${fmt(bi)}</strong> · תקציב הוצאות: <strong class="num">${fmt(be)}</strong> · פער: <strong class="num ${bi - be >= 0 ? 'pos' : 'neg'}">${fmt(bi - be)}</strong></p>
    ${GROUPS.map(g => {
      const cats = state.categories.filter(c => c.group === g.id);
      return `<fieldset class="cat-group"><legend><span class="dot" style="background:${g.color}"></span>${g.name}</legend>
        <div class="gh"><span class="small muted">${g.hint || ''}</span><span class="btn-row"><button class="btn link small" data-action="group-all" data-group="${g.id}" data-on="1">סימון הכל</button><button class="btn link small" data-action="group-all" data-group="${g.id}" data-on="0">ניקוי</button></span></div>
        <ul class="cat-list">${cats.map(c => `<li class="cat-item ${c.enabled ? '' : 'off'}">
          <input type="checkbox" id="ce-${c.id}" data-action="cat-enable" data-id="${c.id}" ${c.enabled ? 'checked' : ''}>
          <label for="ce-${c.id}" class="cname">${esc(c.name)}${c.custom ? ' <span class="tag">שלי</span>' : ''}</label>
          <span class="btn-row" style="flex-wrap:nowrap;align-items:center">
            ${g.kind !== 'neutral' ? `<label class="sr-only" for="cb-${c.id}">תקציב חודשי ל${esc(c.name)}</label><input id="cb-${c.id}" class="input sm budget" type="number" min="0" step="10" inputmode="numeric" placeholder="₪ לחודש" value="${+c.budget || ''}" data-action="cat-budget" data-id="${c.id}" ${c.enabled ? '' : 'disabled'}>` : ''}
            <button class="icon-btn sm" data-action="edit-cat" data-id="${c.id}" aria-label="עריכת הסעיף ${esc(c.name)}">${icon('edit')}</button>
          </span></li>`).join('')}</ul></fieldset>`;
    }).join('')}
  </section>`;
}
function lastImport(provider, member) {
  const ds = state.transactions.filter(t => t.provider === provider && t.memberId === member).map(t => t.date).sort();
  return ds.length ? { count: ds.length, last: ds[ds.length - 1] } : null;
}
function settingsConnections() {
  const provs = PROVIDERS.filter(p => p.kind !== 'manual' && p.id !== 'other');
  return `
  <section class="card">
    <div class="card-head"><h2>חשבונות בנק וכרטיסי אשראי</h2></div>
    <div class="callout info">${icon('link')}<div class="grow"><strong>סנכרון אוטומטי לקריאה בלבד.</strong> תוכנת הסנכרון במחשב הביתי מושכת כל יום את התנועות מהבנק ומחברות האשראי, ופרטי הכניסה נשמרים מוצפנים רק שם. אפשר תמיד לייבא גם קובץ אקסל ידנית.</div></div>
    <ul class="provider-list">${provs.map(p => `<li class="provider">
      <div class="p-head"><h3>${esc(p.name)}</h3><span class="pill">${p.kind === 'bank' ? 'בנק' : 'אשראי'}</span></div>
      ${owners().filter(m => m.id !== 'joint' || lastImport(p.id, 'joint') || (Cloud.syncRows || []).some(r => r.provider === p.id && r.member_key === 'joint')).map(m => {
        const li = lastImport(p.id, m.id);
        const ss = (Cloud.syncRows || []).find(r => r.provider === p.id && r.member_key === m.id);
        const when = ss ? new Date(ss.last_run).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="small"><strong>${esc(m.name)}:</strong> ${li ? `${li.count} תנועות, עד ${dateLabel(li.last)}` : '<span class="muted">אין תנועות</span>'}
          ${ss ? `<div><span class="pill ${ss.ok ? 'ok' : ''}" ${ss.ok ? '' : 'style="background:var(--danger-soft);color:var(--danger)"'}>${ss.ok ? 'סונכרן' : 'הסנכרון נכשל'} · ${esc(when)}</span>${ss.ok ? '' : `<div class="neg" style="margin-top:4px">${esc(ss.message)}</div>`}</div>` : ''}</div>`;
      }).join('')}
      <div class="btn-row" style="margin-top:4px"><button class="btn sm" data-action="open-import" data-provider="${p.id}">${icon('upload')}ייבוא קובץ</button></div>
    </li>`).join('')}</ul>
  </section>
  ${(() => {
    const gi = (Cloud.syncRows || []).find(r => r.provider === 'greeninvoice');
    const n = (Cloud.expected || []).length, tot = (Cloud.expected || []).reduce((a, e) => a + (+e.amount_ils || 0), 0);
    return `<section class="card">
    <div class="card-head"><h2><span class="dot" style="background:var(--c-biz)"></span> חשבונית ירוקה</h2>${gi ? `<span class="pill ${gi.ok ? 'ok' : ''}">${gi.ok ? 'מחובר' : 'שגיאה'}</span>` : '<span class="pill">לא מחובר</span>'}</div>
    <p class="small" style="margin-bottom:8px">מסמכים פתוחים שעוד לא שולמו (חשבונות עסקה וחשבוניות מס) מוצגים כ<strong>הכנסות עסק צפויות</strong> במסך החודשי, לפי תאריך המסמך. כשמסמך נסגר כשולם בחשבונית ירוקה, הוא יורד מהרשימה.</p>
    ${gi ? `<p class="small">${gi.ok ? `${n} מסמכים פתוחים, <span class="num">${fmt(tot)}</span> צפויים` : `<span class="neg">${esc(gi.message)}</span>`} · עודכן ${esc(new Date(gi.last_run).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }))}</p>`
      : '<p class="small muted">כדי לחבר: בתוכנת הסנכרון במחשב הביתי (node setup.js) בוחרים <strong>[5] חיבור לחשבונית ירוקה</strong> ומזינים מפתח API.</p>'}
  </section>`;
  })()}
  <section class="card">
    <h2 style="margin-bottom:10px">איך מורידים קובץ?</h2>
    <ol class="steps small">
      <li>נכנסים לאתר הבנק או חברת האשראי מהמחשב.</li>
      <li>פותחים את פירוט העסקאות או התנועות בחשבון, ובוחרים את החודש.</li>
      <li>לוחצים על ייצוא / הורדה לאקסל.</li>
      <li>כאן באפליקציה: ייבוא קובץ, בוחרים מקור ובעלים, בודקים את התצוגה המקדימה ומאשרים. תנועות כפולות מדולגות אוטומטית.</li>
    </ol>
    <p class="small muted" style="margin-top:10px">טיפ: חיוב החודשי של כרטיס האשראי בעו״ש מסווג אוטומטית כ״לא נספר״, כדי שההוצאות לא ייספרו פעמיים.</p>
  </section>`;
}
function settingsRules() {
  return `
  <section class="card">
    <div class="card-head"><h2>חוקי סיווג אישיים</h2></div>
    <p class="small muted" style="margin-bottom:12px">כשתיאור התנועה מכיל את הטקסט, היא תסווג לסעיף שבחרתם. חוקים נוספים נוצרים אוטומטית כשמשנים סעיף לתנועה ובוחרים ״לזכור״.</p>
    <form class="form-grid two" data-form="add-rule" style="margin-bottom:12px">
      <div class="field"><label for="r-p">טקסט בתיאור</label><input id="r-p" name="pattern" class="input" required placeholder="למשל: שופרסל דיל"></div>
      <div class="field"><label for="r-c">סעיף</label><select id="r-c" name="categoryId" class="input" required>${GROUPS.map(g => `<optgroup label="${esc(g.name)}">${state.categories.filter(c => c.group === g.id && c.enabled).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="btn-row"><button class="btn primary" type="submit">הוספת חוק</button><button class="btn" type="button" data-action="recat-all">החלה מחדש על תנועות לא מסווגות</button></div>
    </form>
    ${state.rules.length ? `<ul class="rule-list">${state.rules.map(r => `<li><div class="grow"><strong>${esc(r.pattern)}</strong> <span class="muted">←</span> ${esc(cat(r.categoryId)?.name || '?')}</div><button class="icon-btn sm danger" data-action="del-rule" data-id="${r.id}" aria-label="מחיקת החוק ${esc(r.pattern)}">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted small">אין עדיין חוקים אישיים. הסיווג הבסיסי מזהה רשתות מוכרות (סופרים, דלק, תקשורת ועוד).</p>'}
  </section>
  <section class="card">
    <div class="card-head"><h2>סיווג חכם (בינה מלאכותית)</h2>
      <label class="toggle-row"><input type="checkbox" data-action="ai-toggle" ${state.settings.ai !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary)"> פעיל</label></div>
    <p class="small" style="margin-bottom:8px">כשמגיעה תנועה שהמערכת לא מכירה, היא נשלחת לסיווג חכם, שבוחר סעיף, מזהה אם זו הוצאת עסק וכותב הסבר קצר מה זה כנראה. כל שם בית עסק נשלח פעם אחת, והתשובה נשמרת כחוק לפעמים הבאות. נשלחים רק התיאור, הסוג (הכנסה או הוצאה) ורשימת הסעיפים, בלי סכומים, תאריכים או פרטי חשבון.</p>
    ${Cloud.aiStatus === 'missing_key' ? `<div class="callout" style="margin-top:10px">${icon('info')}<div class="grow"><strong>לא חובה. בינתיים אפשר לסווג מקומות לא מוכרים ב״סיווג מהיר״ במסך התנועות. להפעלה בעתיד:</strong>
      <ol class="steps" style="margin-top:6px"><li>יוצרים מפתח API ב־<a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a> (נדרש אמצעי תשלום; העלות לסיווג היא אגורות בודדות לחודש).</li>
      <li>ב־Supabase: Edge Functions ← Secrets ← מוסיפים <code dir="ltr">ANTHROPIC_API_KEY</code> עם המפתח (<a href="https://supabase.com/dashboard/project/wyhdovdxqgrykhzsjsly/functions/secrets" target="_blank" rel="noopener">קישור ישיר</a>).</li>
      <li>חוזרים לכאן ולוחצים ״סיווג חכם״ במסך התנועות.</li></ol></div></div>` : Cloud.aiStatus === 'idle' && (state.aiTried || []).length ? `<p class="small pos">פעיל: סווגו עד עכשיו ${state.aiTried.length} שמות.</p>` : ''}
  </section>
  <section class="card">
    <div class="card-head"><h2><span class="dot" style="background:var(--c-biz)"></span> זיהוי תשלומי עסק</h2></div>
    <p class="small muted" style="margin-bottom:12px">תנועה שהתיאור שלה מכיל אחת מהמילים כאן מסומנת אוטומטית כ״עסק״ ולא נספרת בתקציב הבית. הוסיפו את הספקים של העסק שלכם, למשל ספקי חומרים, תוכנות וכלים. מפרידים בפסיק.</p>
    <form class="form-grid" data-form="biz-keywords" style="margin-bottom:12px">
      <div class="field"><label for="bk">מילים שמזהות עסק</label><textarea id="bk" name="keywords" class="input" rows="4">${esc(bizKeywords().join(', '))}</textarea></div>
      <div class="btn-row"><button class="btn primary" type="submit">שמירה</button><button class="btn" type="button" data-action="redetect-biz">זיהוי מחדש בכל התנועות</button></div>
    </form>
    <h3 style="margin:8px 0">מה למדנו ממך</h3>
    ${(state.bizRules || []).length ? `<ul class="rule-list">${state.bizRules.map(r => `<li><div class="grow"><strong>${esc(r.pattern)}</strong> <span class="muted">←</span> ${r.biz ? '<span class="tag biz">תמיד עסק</span>' : '<span class="tag">תמיד בית</span>'}</div><button class="icon-btn sm danger" data-action="del-bizrule" data-id="${r.id}" aria-label="מחיקת הכלל ${esc(r.pattern)}">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted small">עוד אין. כשמסמנים תנועה כעסק או מחזירים אותה לבית, אפשר לבחור ״לזכור״ והכלל יופיע כאן.</p>'}
  </section>`;
}
function settingsGeneral() {
  const st = state.settings;
  return `
  <section class="card">
    <h2 style="margin-bottom:14px">בני הבית</h2>
    <form class="form-grid two" data-form="members">
      ${state.members.map((m, i) => `<div class="field"><label for="mn-${i}">שם ${i + 1}</label><input id="mn-${i}" name="m${i}" class="input" value="${esc(m.name)}" required></div>`).join('')}
      <div><button class="btn primary" type="submit">שמירת שמות</button></div>
    </form>
  </section>
  <section class="card">
    <h2 style="margin-bottom:14px">תצוגה ונגישות</h2>
    <div class="form-grid two">
      <div class="field"><span class="lbl" id="th-l">ערכת צבעים</span><div class="seg" role="radiogroup" aria-labelledby="th-l">
        ${[['auto', 'לפי המכשיר'], ['light', 'בהירה'], ['dark', 'כהה']].map(([v, n]) => `<label><input type="radio" name="theme" value="${v}" data-action="set-theme" ${st.theme === v ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="field"><span class="lbl" id="sc-l">גודל טקסט</span><div class="seg" role="radiogroup" aria-labelledby="sc-l">
        ${[[1, 'רגיל'], [1.125, 'גדול'], [1.25, 'גדול מאוד']].map(([v, n]) => `<label><input type="radio" name="scale" value="${v}" data-action="set-scale" ${+st.scale === v ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
    </div>
  </section>
  <section class="card">
    <h2 style="margin-bottom:6px">גיבוי ושחזור</h2>
    <p class="small muted" style="margin-bottom:14px">הנתונים נשמרים בענן ומשותפים לשניכם. אפשר בנוסף לשמור עותק גיבוי כקובץ.</p>
    <div class="btn-row">
      <button class="btn" data-action="export-json">${icon('download')}ייצוא גיבוי</button>
      <label class="btn">${icon('upload')}שחזור מגיבוי<input type="file" accept="application/json,.json" class="sr-only" data-action="import-json"></label>
      <button class="btn" data-action="demo-data">טעינת נתוני דוגמה</button>
      <button class="btn danger" data-action="reset-all">${icon('trash')}מחיקת כל הנתונים</button>
    </div>
  </section>`;
}

/* ---------- התחברות ומשק בית ---------- */
const heroHtml = (title, sub) => `<div class="hero"><img src="icon.svg" alt=""><h1>${title}</h1><p>${sub}</p></div>`;
function renderLoading() { document.body.classList.add('setup-mode'); $('#view').innerHTML = `<div class="setup">${heroHtml('מאזן', 'טוען את הנתונים…')}</div>`; }
function renderBootError(msg) { document.body.classList.add('setup-mode'); $('#view').innerHTML = `<div class="setup">${heroHtml('מאזן', '')}<div class="callout" role="alert">${icon('alert')}<div class="grow">${esc(msg)}</div><button class="btn sm" onclick="location.reload()">רענון</button></div></div>`; }
function viewAuth() {
  const m = ui.authMode;
  const titles = { login: 'כניסה', signup: 'הרשמה', reset: 'איפוס סיסמה' };
  return `<div class="setup" style="max-width:460px">${heroHtml('מאזן', 'התקציב המשותף שלכם, מכל מכשיר')}
    <section class="card">
      ${m !== 'reset' ? `<div class="seg" role="tablist" aria-label="כניסה או הרשמה" style="margin-bottom:16px;display:flex">
        <label style="flex:1"><input type="radio" name="am" value="login" data-action="auth-mode" ${m === 'login' ? 'checked' : ''}><span style="text-align:center">כניסה</span></label>
        <label style="flex:1"><input type="radio" name="am" value="signup" data-action="auth-mode" ${m === 'signup' ? 'checked' : ''}><span style="text-align:center">הרשמה</span></label></div>` : `<h2 style="margin-bottom:12px">${titles.reset}</h2>`}
      <form class="form-grid" data-form="auth" novalidate>
        <div class="field"><label for="a-email">אימייל</label><input id="a-email" name="email" class="input" type="email" autocomplete="email" required dir="ltr"></div>
        ${m !== 'reset' ? `<div class="field"><label for="a-pass">סיסמה</label><input id="a-pass" name="password" class="input" type="password" minlength="8" required dir="ltr" autocomplete="${m === 'signup' ? 'new-password' : 'current-password'}">${m === 'signup' ? '<span class="hint">לפחות 8 תווים</span>' : ''}</div>` : ''}
        <p id="auth-msg" class="small" role="alert"></p>
        <button class="btn primary" type="submit" ${ui.busy ? 'disabled' : ''}>${m === 'login' ? 'כניסה' : m === 'signup' ? 'יצירת חשבון' : 'שליחת קישור לאיפוס'}</button>
        ${m === 'login' ? `<button class="btn link small" type="button" data-action="auth-reset">שכחתי סיסמה</button>` : ''}
        ${m === 'reset' ? `<button class="btn link small" type="button" data-action="auth-back">חזרה לכניסה</button>` : ''}
      </form>
    </section>
    <p class="small muted" style="text-align:center;margin-top:14px">כל אחד מכם נרשם עם האימייל שלו, ואז מצטרפים לאותו משק בית.</p>
  </div>`;
}
function viewRecovery() {
  return `<div class="setup" style="max-width:460px">${heroHtml('סיסמה חדשה', 'בחרו סיסמה חדשה לחשבון')}
    <section class="card"><form class="form-grid" data-form="new-password">
      <div class="field"><label for="np">סיסמה חדשה</label><input id="np" name="password" class="input" type="password" minlength="8" required dir="ltr" autocomplete="new-password"><span class="hint">לפחות 8 תווים</span></div>
      <p id="auth-msg" class="small" role="alert"></p>
      <button class="btn primary" type="submit">שמירה</button>
    </form></section></div>`;
}
function viewHousehold() {
  const legacy = readJSON(LEGACY_KEY);
  const hasLegacy = legacy && Array.isArray(legacy.transactions) && (legacy.transactions.length || legacy.settings?.setupDone);
  return `<div class="setup" style="max-width:620px">${heroHtml('משק הבית שלכם', `מחובר/ת בתור <bdi>${esc(Cloud.session.user.email)}</bdi>`)}
    <section class="card">
      <h2 style="margin-bottom:6px">פותחים משק בית חדש</h2>
      <p class="small muted" style="margin-bottom:14px">מי שנרשם ראשון פותח את משק הבית, ואחר כך שולח קוד הזמנה לבן או בת הזוג.</p>
      ${hasLegacy ? `<label class="toggle-row" style="margin-bottom:14px"><input type="checkbox" id="hh-legacy" checked style="width:20px;height:20px;accent-color:var(--primary)"> להעלות את הנתונים שכבר הוזנו בדפדפן הזה (${legacy.transactions.length} תנועות)</label>` : ''}
      <button class="btn primary" data-action="hh-create" ${ui.busy ? 'disabled' : ''}>פתיחת משק בית</button>
    </section>
    <section class="card">
      <h2 style="margin-bottom:6px">מצטרפים עם קוד הזמנה</h2>
      <p class="small muted" style="margin-bottom:14px">קיבלת קוד מבן או בת הזוג? מזינים אותו כאן.</p>
      <form class="form-grid two" data-form="join">
        <div class="field"><label for="j-code">קוד הזמנה</label><input id="j-code" name="code" class="input" required dir="ltr" autocomplete="off" style="text-transform:uppercase;letter-spacing:.1em" maxlength="8"></div>
        <div style="align-self:end"><button class="btn primary" type="submit" ${ui.busy ? 'disabled' : ''}>הצטרפות</button></div>
      </form>
      <p id="hh-msg" class="small neg" role="alert" style="margin-top:8px"></p>
    </section>
    <p style="text-align:center;margin-top:14px"><button class="btn link small" data-action="sign-out">יציאה מהחשבון</button></p>
  </div>`;
}
const AUTH_ERRORS = [
  [/invalid login credentials/i, 'האימייל או הסיסמה לא נכונים.'],
  [/email not confirmed/i, 'צריך קודם לאשר את כתובת האימייל דרך הקישור שנשלח אליך.'],
  [/already registered|already exists/i, 'כבר יש חשבון עם האימייל הזה. אפשר להיכנס.'],
  [/password should be|weak password/i, 'הסיסמה חלשה מדי. בחרו סיסמה ארוכה יותר.'],
  [/rate limit|too many/i, 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'],
  [/invalid invite/i, 'הקוד לא תקין, כבר נוצל או שפג תוקפו.'],
  [/household full/i, 'במשק הבית הזה כבר יש שני חברים.'],
  [/already in household/i, 'החשבון הזה כבר משויך למשק בית.']
];
const authError = e => (AUTH_ERRORS.find(([rx]) => rx.test(e?.message || '')) || [null, 'משהו השתבש. נסו שוב.'])[1];

/* ---------- אשף פתיחה ---------- */
function viewSetup() {
  const step = ui.setupStep;
  const steps = `<ol class="progress-steps" aria-label="שלב ${step} מתוך 3">${[1, 2, 3].map(i => `<li class="${i <= step ? 'done' : ''}"></li>`).join('')}</ol>`;
  let body = '';
  if (step === 1) body = `
    <section class="card"><h2 style="margin-bottom:6px">מי מנהל את התקציב?</h2><p class="small muted" style="margin-bottom:14px">השמות ישמשו לסימון של מי כל חשבון וכל תנועה.</p>
    <form class="form-grid two" data-form="setup-names" id="setup-form">
      ${state.members.map((m, i) => `<div class="field"><label for="sn-${i}">שם ${i + 1}</label><input id="sn-${i}" name="m${i}" class="input" value="${esc(m.name)}" required></div>`).join('')}
    </form></section>
    <div class="setup-actions"><span></span><button class="btn primary" type="submit" form="setup-form">המשך</button></div>`;
  if (step === 2) body = `
    <section class="card"><h2 style="margin-bottom:6px">אילו סעיפים רלוונטיים לכם?</h2><p class="small muted" style="margin-bottom:14px">הרשימה מבוססת על הרישומית של פעמונים. סמנו את מה שמתאים. תמיד אפשר לשנות ולהוסיף סעיפים בהגדרות.</p>
    ${GROUPS.filter(g => g.kind !== 'neutral').map(g => `<fieldset class="cat-group"><legend><span class="dot" style="background:${g.color}"></span>${g.name}</legend>
      <div class="gh"><span class="small muted">${g.hint || ''}</span><span class="btn-row"><button class="btn link small" type="button" data-action="group-all" data-group="${g.id}" data-on="1">סימון הכל</button><button class="btn link small" type="button" data-action="group-all" data-group="${g.id}" data-on="0">ניקוי</button></span></div>
      <div class="check-grid">${state.categories.filter(c => c.group === g.id).map(c => `<label><input type="checkbox" data-action="cat-enable" data-id="${c.id}" ${c.enabled ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</div></fieldset>`).join('')}
    </section>
    <div class="setup-actions"><button class="btn" data-action="setup-step" data-step="1">חזרה</button><button class="btn primary" data-action="setup-step" data-step="3">המשך</button></div>`;
  if (step === 3) body = `
    <section class="card"><h2 style="margin-bottom:6px">הכל מוכן</h2>
    <p style="margin-bottom:12px">מה עכשיו?</p>
    <ol class="steps">
      <li>מורידים קובץ אקסל של התנועות מהבנק ומכרטיסי האשראי, ומייבאים אותו במסך ״תנועות״.</li>
      <li>קובעים תקציב חודשי לכל סעיף בהגדרות (אפשר גם אחרי חודש של מעקב, כדי לראות קודם מה המצב).</li>
      <li>מגדירים יעדי חיסכון במסך ״יעדים״.</li>
    </ol></section>
    <div class="setup-actions"><button class="btn" data-action="setup-step" data-step="2">חזרה</button><span class="btn-row"><button class="btn" data-action="setup-finish" data-demo="1">להתחיל עם נתוני דוגמה</button><button class="btn primary" data-action="setup-finish">בואו נתחיל</button></span></div>`;
  return `<div class="setup"><div class="hero"><img src="icon.svg" alt=""><h1>ברוכים הבאים למאזן</h1><p>מעקב פשוט אחר הכנסות והוצאות, חודש אחרי חודש</p></div>${steps}${body}</div>`;
}

/* ================= דיאלוגים ================= */
const dlg = () => $('#dlg');
function openDialog(title, body, foot, wide = false) {
  const d = dlg();
  d.className = 'dlg' + (wide ? ' wide' : '');
  d.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">${title}</h2><button class="icon-btn" data-action="close-dlg" aria-label="סגירה">${icon('close')}</button></div><div class="dlg-body">${body}</div>${foot ? `<div class="dlg-foot">${foot}</div>` : ''}`;
  if (!d.open) d.showModal();
  const first = d.querySelector('.dlg-body input:not([type=hidden]), .dlg-body select, .dlg-body textarea, .dlg-body button');
  if (first) first.focus();
}
function closeDialog() { if (dlg().open) dlg().close(); afterDialogClosed(); }
function afterDialogClosed() {
  ui.imp = null;
  const wasQc = ui.qc; ui.qc = false;
  if (Cloud.pendingRender || wasQc) { Cloud.pendingRender = false; render(); }
}

function txDialog(t) {
  const isNew = !t;
  t = t || { date: ui.ym === currentYm() ? todayStr() : ui.ym + '-01', type: 'expense', amount: '', desc: '', categoryId: '', memberId: myMember(), provider: 'manual', note: '' };
  openDialog(isNew ? 'תנועה חדשה' : 'עריכת תנועה', `
    <form class="form-grid two" data-form="tx" id="tx-form" data-id="${t.id || ''}">
      <div class="field" style="grid-column:1/-1"><span class="lbl" id="tt-l">סוג</span><div class="seg" role="radiogroup" aria-labelledby="tt-l">
        <label><input type="radio" name="type" value="expense" ${t.type === 'expense' ? 'checked' : ''} data-action="tx-type"><span>הוצאה</span></label>
        <label><input type="radio" name="type" value="income" ${t.type === 'income' ? 'checked' : ''} data-action="tx-type"><span>הכנסה</span></label></div></div>
      <div class="field"><label for="t-amount">סכום (₪)</label><input id="t-amount" name="amount" class="input" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${t.amount}"></div>
      <div class="field"><label for="t-date">תאריך</label><input id="t-date" name="date" class="input" type="date" required value="${t.date}"></div>
      <div class="field" style="grid-column:1/-1"><label for="t-desc">תיאור</label><input id="t-desc" name="desc" class="input" required value="${esc(t.desc)}" placeholder="למשל: שופרסל, משכורת"></div>
      <div class="field" style="grid-column:1/-1"><label class="toggle-row"><input type="checkbox" name="biz" id="t-biz" data-action="tx-biz" ${t.biz ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary)"> תנועה של העסק (לא נספרת בתקציב הבית)</label></div>
      <div class="field"><label for="t-cat">סעיף</label><select id="t-cat" name="categoryId" class="input">${catOptions(t.type, t.categoryId, t.biz)}</select></div>
      <div class="field"><label for="t-mem">חשבון של</label><select id="t-mem" name="memberId" class="input">${ownerOptions(t.memberId)}</select></div>
      <div class="field" style="grid-column:1/-1"><label for="t-note">הערה (לא חובה)</label><input id="t-note" name="note" class="input" value="${esc(t.note || '')}"></div>
    </form>`,
    `<button class="btn primary" type="submit" form="tx-form">שמירה</button><button class="btn" data-action="close-dlg">ביטול</button>`);
}
function goalDialog(g) {
  const isNew = !g;
  g = g || { name: '', target: '', saved: 0, deadline: '', color: GOAL_COLORS[state.goals.length % GOAL_COLORS.length] };
  openDialog(isNew ? 'יעד חדש' : 'עריכת יעד', `
    <form class="form-grid two" data-form="goal" id="goal-form" data-id="${g.id || ''}">
      <div class="field" style="grid-column:1/-1"><label for="g-name">שם היעד</label><input id="g-name" name="name" class="input" required value="${esc(g.name)}" placeholder="למשל: קרן חירום"></div>
      <div class="field"><label for="g-target">סכום יעד (₪)</label><input id="g-target" name="target" class="input" type="number" min="1" step="100" required value="${g.target}"></div>
      <div class="field"><label for="g-saved">כבר נחסך (₪)</label><input id="g-saved" name="saved" class="input" type="number" min="0" step="1" value="${g.saved}"></div>
      <div class="field"><label for="g-dl">עד חודש</label><input id="g-dl" name="deadline" class="input" type="month" value="${g.deadline || ''}"><span class="hint">לא חובה. משמש לחישוב כמה לחסוך בחודש.</span></div>
      <input type="hidden" name="color" value="${g.color}">
    </form>`,
    `<button class="btn primary" type="submit" form="goal-form">שמירה</button><button class="btn" data-action="close-dlg">ביטול</button>`);
}
function depositDialog(g) {
  openDialog(`הפקדה ל״${esc(g.name)}״`, `
    <form class="form-grid" data-form="deposit" id="dep-form" data-id="${g.id}">
      <div class="field"><label for="d-amt">סכום (₪)</label><input id="d-amt" name="amount" class="input" type="number" step="1" required inputmode="numeric"><span class="hint">אפשר להזין מספר שלילי כדי למשוך.</span></div>
    </form>`, `<button class="btn primary" type="submit" form="dep-form">הוספה</button><button class="btn" data-action="close-dlg">ביטול</button>`);
}
function catDialog(c) {
  const isNew = !c;
  c = c || { name: '', group: 'variable', keywords: [], custom: true };
  openDialog(isNew ? 'סעיף חדש' : 'עריכת סעיף', `
    <form class="form-grid" data-form="cat" id="cat-form" data-id="${c.id || ''}">
      <div class="field"><label for="k-name">שם הסעיף</label><input id="k-name" name="name" class="input" required value="${esc(c.name)}"></div>
      <div class="field"><label for="k-group">סוג</label><select id="k-group" name="group" class="input">${GROUPS.map(g => `<option value="${g.id}" ${c.group === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select></div>
      <div class="field"><label for="k-kw">מילות מפתח לסיווג אוטומטי</label><textarea id="k-kw" name="keywords" class="input" rows="3" placeholder="מופרדות בפסיק, למשל: שופרסל, רמי לוי">${esc((c.keywords || []).join(', '))}</textarea></div>
    </form>`,
    `<button class="btn primary" type="submit" form="cat-form">שמירה</button>${!isNew && c.custom ? `<button class="btn danger" data-action="del-cat" data-id="${c.id}">מחיקת הסעיף</button>` : ''}<button class="btn" data-action="close-dlg">ביטול</button>`);
}
/* סיווג מהיר: כל המקומות שלא סווגו, מקובצים לפי תיאור. בחירה אחת חלה על כל התנועות ונשמרת כחוק */
function unknownPlaces() {
  const map = new Map();
  for (const t of state.transactions) {
    if (t.categoryId) continue;
    const k = `${t.type}|${t.biz ? 1 : 0}|${t.desc}`;
    const g = map.get(k) || { key: k, desc: t.desc, type: t.type, biz: !!t.biz, count: 0, total: 0, last: '', aiNote: t.aiNote };
    g.count++; g.total += t.amount; if (t.date > g.last) g.last = t.date; if (!g.aiNote && t.aiNote) g.aiNote = t.aiNote;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
function quickClassifyDialog() {
  const list = unknownPlaces();
  ui.qc = true;
  openDialog('סיווג מהיר', list.length ? `
    <p class="small muted" style="margin-bottom:10px">אלה המקומות שהמערכת עוד לא מכירה, מהסכום הגדול לקטן. בוחרים סעיף פעם אחת, והוא חל על כל התנועות מאותו מקום, וגם על תנועות עתידיות.</p>
    <ul class="rule-list">${list.map((g, i) => `<li style="flex-wrap:wrap">
      <div class="grow" style="min-width:180px"><div class="tx-desc">${esc(g.desc)}</div>
        <div class="tx-meta">${g.type === 'income' ? 'הכנסה' : 'הוצאה'}${g.biz ? ' · עסק' : ''} · ${g.count} ${g.count === 1 ? 'תנועה' : 'תנועות'} · <span class="num">${fmt(g.total)}</span> · אחרונה ${dateLabel(g.last)}</div>
        ${g.aiNote ? `<div class="tx-ai">${esc(g.aiNote)}</div>` : ''}</div>
      <label class="sr-only" for="qc-${i}">סעיף עבור ${esc(g.desc)}</label>
      <select id="qc-${i}" class="input sm" style="max-width:240px" data-action="qc-set" data-key="${esc(g.key)}">${catOptions(g.type, '', g.biz)}</select>
    </li>`).join('')}</ul>` : `<div class="empty">${icon('tx')}<p>כל התנועות מסווגות.</p></div>`,
    `<button class="btn primary" data-action="close-dlg">סיום</button>`, true);
}
function applyQuick(key, categoryId) {
  const [type, bizFlag, ...rest] = key.split('|'); const desc = rest.join('|'); const biz = bizFlag === '1';
  let n = 0;
  for (const t of state.transactions) if (!t.categoryId && t.desc === desc && t.type === type && !!t.biz === biz) { t.categoryId = categoryId; n++; }
  state.rules = state.rules.filter(r => r.pattern !== desc);
  state.rules.push({ id: uid(), pattern: desc, categoryId });
  save();
  return n;
}

function confirmDialog(title, text, action, label = 'מחיקה') {
  openDialog(title, `<p>${text}</p>`, `<button class="btn primary" data-action="${action}" style="background:var(--danger);border-color:var(--danger)">${label}</button><button class="btn" data-action="close-dlg">ביטול</button>`);
}

/* ================= ייבוא קבצים ================= */
function importDialog(provider = '') {
  ui.imp = { provider: provider || 'isracard', member: myMember(), rows: null };
  renderImport();
}
function renderImport() {
  const imp = ui.imp;
  const provOpts = PROVIDERS.filter(p => p.kind !== 'manual').map(p => `<option value="${p.id}" ${imp.provider === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  let body = `<div class="form-grid two" style="margin-bottom:14px">
      <div class="field"><label for="i-prov">מאיפה הקובץ?</label><select id="i-prov" class="input" data-imp="provider">${provOpts}</select></div>
      <div class="field"><label for="i-mem">של מי החשבון?</label><select id="i-mem" class="input" data-imp="member">${ownerOptions(imp.member)}</select></div>
      <div class="field" style="grid-column:1/-1"><label class="toggle-row"><input type="checkbox" id="i-biz" data-action="imp-biz" ${imp.biz ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary)"> זה חשבון או כרטיס של העסק (כל התנועות יסומנו כעסק)</label>
        <span class="hint">בלי הסימון, תנועות עסק יזוהו אוטומטית לפי שם בית העסק (תוכנות, רואה חשבון וכו׳), ואפשר לתקן אחר כך.</span></div>
    </div>`;
  let foot = `<button class="btn" data-action="close-dlg">ביטול</button>`;
  if (!imp.rows) {
    body += `<label class="dropzone" id="dropzone">${icon('upload', 'style="width:36px;height:36px;color:var(--primary)"')}<p style="font-weight:600;margin-top:8px">בחירת קובץ אקסל או CSV</p><p class="small muted">או גרירה לכאן · קבצי ‎.xlsx ‎.xls ‎.csv</p><input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-action="import-file"></label>
      ${typeof XLSX === 'undefined' ? `<p class="small neg" style="margin-top:10px">רכיב קריאת האקסל לא נטען (צריך חיבור לאינטרנט). אפשר עדיין לייבא קובץ CSV.</p>` : ''}`;
  } else {
    const h = imp.headers;
    const sel = (key, label, optional) => `<div class="field"><label for="m-${key}">${label}</label><select id="m-${key}" class="input" data-map="${key}">${optional ? '<option value="-1">— אין —</option>' : ''}${h.map((x, i) => `<option value="${i}" ${imp.map[key] === i ? 'selected' : ''}>${esc(x || `עמודה ${i + 1}`)}</option>`).join('')}</select></div>`;
    const parsed = buildImported();
    const fresh = parsed.filter(p => !p.dup);
    const autoCat = fresh.filter(p => p.categoryId).length;
    const bizCount = fresh.filter(p => p.biz).length;
    body += `<p class="small" style="margin-bottom:10px">קובץ: <strong>${esc(imp.fileName)}</strong> · <button class="btn link small" data-action="imp-reset">קובץ אחר</button></p>
      <details ${imp.mapOpen ? 'open' : ''} style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:500">התאמת עמודות (זוהה אוטומטית)</summary>
        <div class="form-grid two" style="margin-top:10px">
          ${sel('date', 'תאריך')}${sel('desc', 'תיאור / בית עסק')}${sel('desc2', 'פרטים נוספים לתיאור', true)}
          <div class="field"><label for="m-mode">איך מופיע הסכום?</label><select id="m-mode" class="input" data-map="mode">
            <option value="positive_expense" ${imp.map.mode === 'positive_expense' ? 'selected' : ''}>עמודה אחת: חיובי = הוצאה (כרטיס אשראי)</option>
            <option value="negative_expense" ${imp.map.mode === 'negative_expense' ? 'selected' : ''}>עמודה אחת: שלילי = הוצאה</option>
            <option value="two" ${imp.map.mode === 'two' ? 'selected' : ''}>שתי עמודות: חובה וזכות (בנק)</option></select></div>
          ${imp.map.mode === 'two' ? sel('debit', 'עמודת חובה (הוצאה)') + sel('credit', 'עמודת זכות (הכנסה)') : sel('amount', 'סכום')}
        </div></details>
      <p aria-live="polite" style="margin-bottom:8px"><strong>${fresh.length}</strong> תנועות חדשות · ${autoCat} סווגו אוטומטית${bizCount ? ` · ${bizCount} זוהו כעסק` : ''}${parsed.length - fresh.length ? ` · ${parsed.length - fresh.length} כבר קיימות וידולגו` : ''}</p>
      ${parsed.length ? `<div class="table-scroll"><table class="preview-table"><thead><tr><th scope="col">תאריך</th><th scope="col">תיאור</th><th scope="col">סכום</th><th scope="col">סעיף</th></tr></thead><tbody>
        ${parsed.slice(0, 8).map(p => `<tr ${p.dup ? 'style="opacity:.5"' : ''}><td class="num">${dateLabel(p.date)}</td><td>${esc(p.desc)}</td><td class="num ${p.type === 'income' ? 'pos' : ''}">${p.type === 'income' ? '+' : ''}${fmt2(p.amount)}</td><td>${p.dup ? 'קיים' : (p.biz ? '<span class="tag biz">עסק</span> ' : '') + (p.categoryId ? esc(cat(p.categoryId).name) : '<span class="tag none">לא מסווג</span>')}</td></tr>`).join('')}
        </tbody></table></div>${parsed.length > 8 ? `<p class="small muted" style="margin-top:6px">ועוד ${parsed.length - 8}…</p>` : ''}`
        : `<p class="neg">לא נמצאו תנועות. בדקו את התאמת העמודות למעלה.</p>`}`;
    foot = `<button class="btn primary" data-action="imp-confirm" ${fresh.length ? '' : 'disabled'}>ייבוא ${fresh.length} תנועות</button>` + foot;
  }
  openDialog('ייבוא תנועות מקובץ', body, foot, true);
  const dz = $('#dropzone');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) readImportFile(e.dataTransfer.files[0]); });
  }
}
function decodeText(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (_) { return new TextDecoder('windows-1255').decode(buf); }
}
function parseHtmlTables(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [];
  for (const tr of doc.querySelectorAll('tr')) {
    const cells = [...tr.children].filter(c => /^(TD|TH)$/.test(c.tagName))
      .map(c => (c.textContent || '').replace(/[‎‏ ]/g, ' ').replace(/\s+/g, ' ').trim());
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  const head = text.split('\n').slice(0, 15).join('\n');
  const cnt = ch => (head.match(new RegExp(ch, 'g')) || []).length;
  const delim = [['\t', cnt('\t')], [';', cnt(';')], [',', cnt(',')]].sort((a, b) => b[1] - a[1])[0][0];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === '') q = true; // גרש באמצע שדה (כמו ש"ח) נשאר כמו שהוא
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
async function readImportFile(file) {
  try {
    let rows;
    const buf = await file.arrayBuffer();
    const head = new TextDecoder('latin1').decode(buf.slice(0, 512)).replace(/^﻿|^\xEF\xBB\xBF/, '').trimStart().toLowerCase();
    if (head.startsWith('<')) {
      // קובץ "אקסל" שהוא בעצם דף אינטרנט (כך מייצאים לאומי, הפועלים ועוד): קוראים את הטבלאות ישירות
      rows = parseHtmlTables(decodeText(buf));
    } else if (/\.(csv|txt)$/i.test(file.name)) {
      // בנקים בישראל מייצאים לפעמים ב-UTF-8 ולפעמים ב-Windows-1255
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (_) { text = new TextDecoder('windows-1255').decode(buf); }
      rows = parseCSV(text.replace(/^﻿/, ''));
    } else {
      if (typeof XLSX === 'undefined') { toast('רכיב קריאת האקסל לא נטען. בדקו חיבור לאינטרנט.'); return; }
      // raw: לא לפרש תאריכים טקסטואליים בפורמט אמריקאי
      const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: true });
      // לוקחים את הגיליון עם הכי הרבה שורות
      rows = wb.SheetNames.map(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })).sort((a, b) => b.length - a.length)[0] || [];
    }
    // שתי גישות: לפי שורת כותרות, או זיהוי עמודות לפי התוכן (לקבצים בלי כותרות, כמו לאומי). בוחרים את מה שמוצא יותר תנועות.
    const candidates = [];
    const hi = detectHeader(rows);
    if (hi >= 0) { const headers = rows[hi].map(x => String(x).trim()); candidates.push({ rows: rows.slice(hi + 1), headers, map: autoMap(headers, providerById(ui.imp.provider).kind) }); }
    const inf = inferColumns(rows);
    if (inf) candidates.push(inf);
    let best = null, bestN = -1;
    for (const c of candidates) { Object.assign(ui.imp, c); const n = buildImported().length; if (n > bestN) { best = c; bestN = n; } }
    if (!best || bestN <= 0) { ui.imp.rows = null; toast('לא הצלחתי לזהות תנועות בקובץ. נסו לייצא שוב מהאתר, או קובץ אחר.'); renderImport(); return; }
    Object.assign(ui.imp, best, { fileName: file.name });
    renderImport();
  } catch (e) {
    console.error(e); toast(`לא הצלחתי לקרוא את הקובץ (${String(e && e.message || e).slice(0, 80)})`);
  }
}
const HDR_RX = /תאריך|תיאור|סכום|בית ה?עסק|פרטים|חובה|זכות|אסמכתא|יתרה|הפעולה|פעולה|חיוב|date|amount|description/i;
function detectHeader(rows) {
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const score = (rows[i] || []).filter(c => typeof c === 'string' && c.length < 40 && HDR_RX.test(c)).length;
    if (score >= 2) return i;
  }
  return -1;
}
/* זיהוי עמודות לפי התוכן, לקבצים בלי שורת כותרות */
function inferColumns(rows) {
  const isDate = v => (v instanceof Date) || /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(String(v).trim()) || /^\d{4}-\d{2}-\d{2}/.test(String(v).trim());
  const data = rows.filter(r => (r || []).some(isDate));
  if (data.length < 1) return null;
  const width = Math.max(...data.map(r => r.length));
  const stats = Array.from({ length: width }, () => ({ date: 0, num: 0, dec: 0, text: 0, other: 0, filled: 0, neg: 0 }));
  for (const r of data) for (let i = 0; i < width; i++) {
    const v = r[i]; const s = String(v ?? '').trim(); if (!s) continue;
    const st = stats[i]; st.filled++;
    if (isDate(v)) st.date++;
    else if (typeof v === 'number' || /^-?[\d,]+(\.\d+)?-?$/.test(s.replace(/[₪\s]/g, ''))) { st.num++; if (/\.\d/.test(s) || (typeof v === 'number' && v % 1)) st.dec++; if (s.startsWith('-') || s.endsWith('-') || v < 0) st.neg++; }
    else if (/[a-zא-ת]/i.test(s)) st.text++; // תיאור: יש בו אותיות
    else st.other++;                         // למשל מספר חשבון 12345/67
  }
  const n = data.length;
  const dateCol = stats.reduce((b, s, i) => (s.date > (stats[b]?.date ?? -1) ? i : b), 0);
  const textCols = stats.map((s, i) => [i, s.text]).filter(([i, t]) => i !== dateCol && t > 0).sort((a, b) => b[1] - a[1]);
  if (!textCols.length) return null;
  const descCol = textCols[0][0];
  const numCols = stats.map((s, i) => ({ i, ...s })).filter(s => s.i !== dateCol && s.i !== descCol && s.num > 0 && s.text === 0 && s.other === 0);
  // יתרה: העמודה המספרית האחרונה שמלאה כמעט תמיד ויש בה עשרוניים; אסמכתא: מספרים שלמים שמלאים תמיד
  const full = numCols.filter(s => s.filled >= n * .9);
  const sparse = numCols.filter(s => s.filled < n * .9);
  const map = { date: dateCol, desc: descCol, desc2: -1, amount: -1, debit: -1, credit: -1, mode: 'negative_expense' };
  const exclusive = (a, b) => data.every(r => !(String(r[a] ?? '').trim() && String(r[b] ?? '').trim()));
  if (sparse.length >= 2 && exclusive(sparse[0].i, sparse[1].i)) { map.mode = 'two'; map.debit = sparse[0].i; map.credit = sparse[1].i; map.amount = sparse[0].i; }
  else {
    const amt = full.filter(s => s.neg > 0 && s.dec > 0)[0] || sparse[0] || full.filter(s => s.dec > 0)[0];
    if (!amt) return null;
    map.amount = map.debit = map.credit = amt.i;
  }
  const label = i => {
    if (i === map.date) return 'תאריך'; if (i === map.desc) return 'תיאור';
    if (map.mode === 'two' && i === map.debit) return 'חובה'; if (map.mode === 'two' && i === map.credit) return 'זכות';
    if (map.mode !== 'two' && i === map.amount) return 'סכום';
    const sample = data.map(r => String(r[i] ?? '').trim()).find(Boolean);
    return `עמודה ${i + 1}${sample ? ` (למשל: ${sample.slice(0, 18)})` : ''}`;
  };
  return { rows, headers: Array.from({ length: width }, (_, i) => label(i)), map };
}
function autoMap(h, kind) {
  const find = (...rxs) => { for (const rx of rxs) { const i = h.findIndex(x => rx.test(x)); if (i >= 0) return i; } return -1; };
  const map = {
    date: find(/תאריך עסקה|תאריך רכישה|תאריך ביצוע/, /^תאריך$/, /תאריך/, /date/i),
    desc: find(/שם בית ה?עסק/, /בית ה?עסק/, /תיאור/, /הפעולה|פעולה/, /פרטים/, /description/i),
    amount: find(/סכום חיוב|סכום החיוב/, /סכום ב?ש"ח|סכום ב?₪/, /^סכום$/, /סכום/, /amount/i),
    desc2: -1,
    debit: find(/^חובה|בחובה/),
    credit: find(/^זכות|בזכות/)
  };
  if (map.date < 0) map.date = 0;
  if (map.desc < 0) map.desc = 1;
  const det = find(/^פרטים|פרטים נוספים|הערות/);
  if (det >= 0 && det !== map.desc) map.desc2 = det;
  map.mode = map.debit >= 0 && map.credit >= 0 ? 'two' : kind === 'card' ? 'positive_expense' : 'negative_expense';
  if (map.amount < 0) map.amount = Math.max(0, map.debit);
  if (map.debit < 0) map.debit = map.amount;
  if (map.credit < 0) map.credit = map.amount;
  return map;
}
function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) { const d = new Date(v.getTime() + 12 * 3600e3); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  if (typeof v === 'number' && v > 20000 && v < 80000 && typeof XLSX !== 'undefined') { const d = XLSX.SSF.parse_date_code(v); return `${d.y}-${pad(d.m)}-${pad(d.d)}`; }
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; const mo = +m[2], d = +m[1]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return `${y}-${pad(mo)}-${pad(d)}`; }
  return null;
}
function parseAmount(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/[‎‏‪-‮₪,\s]|ש"ח|NIS/g, '');
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}
const txHash = t => `${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.desc.trim()}|${t.provider}|${t.memberId}`;
function buildImported() {
  const imp = ui.imp, map = imp.map; const out = [];
  for (const r of imp.rows) {
    const date = parseDate(r[map.date]);
    const extra = map.desc2 >= 0 ? String(r[map.desc2] ?? '').trim() : '';
    const desc = [String(r[map.desc] ?? '').trim(), extra].filter(Boolean).join(' - ');
    if (!date || !desc || /סה"כ|סה״כ|סך הכל|יתרה לסוף/.test(desc)) continue;
    let amount, type;
    if (map.mode === 'two') {
      const d = Math.abs(parseAmount(r[map.debit]) || 0), c = Math.abs(parseAmount(r[map.credit]) || 0);
      if (d > 0) { amount = d; type = 'expense'; } else if (c > 0) { amount = c; type = 'income'; } else continue;
    } else {
      const a = parseAmount(r[map.amount]);
      if (!a) continue;
      if (map.mode === 'positive_expense') { type = a > 0 ? 'expense' : 'income'; } else { type = a < 0 ? 'expense' : 'income'; }
      amount = Math.abs(a);
    }
    out.push({ date, desc, amount: Math.round(amount * 100) / 100, type, provider: imp.provider, memberId: imp.member });
  }
  // זיהוי כפילויות
  const existing = {}; state.transactions.forEach(t => { const h = t.hash || txHash(t); existing[h] = (existing[h] || 0) + 1; });
  const seen = {};
  for (const p of out) { p.hash = txHash(p); seen[p.hash] = (seen[p.hash] || 0) + 1; p.dup = seen[p.hash] <= (existing[p.hash] || 0);
    p.biz = !!ui.imp.biz || detectBiz(p.desc);
    p.categoryId = p.dup ? null : categorize(p.desc, p.type, p.provider, p.biz);
    if (!p.dup && !p.categoryId && !p.biz && p.memberId !== 'joint' && p.type === 'income' && /משכורת|שכר עבודה|^שכר/.test(p.desc)) p.categoryId = p.memberId === state.members[0].id ? 'salary1' : 'salary2'; }
  return out;
}
function confirmImport() {
  const fresh = buildImported().filter(p => !p.dup);
  fresh.forEach(p => { delete p.dup; state.transactions.push({ id: uid(), note: '', ...p }); });
  save();
  const auto = fresh.filter(p => p.categoryId).length;
  const latest = fresh.map(p => p.date).sort().pop();
  closeDialog();
  if (latest) ui.ym = latest.slice(0, 7);
  toast(`יובאו ${fresh.length} תנועות, ${auto} מהן סווגו אוטומטית.`);
  location.hash = '#/tx'; render(true);
  Cloud.aiClassify();
}

/* ================= נתוני דוגמה ================= */
function loadDemo() {
  const want = ['salary1', 'salary2', 'rent', 'arnona', 'vaad', 'insurance', 'subscriptions', 'mobile', 'internet', 'food', 'restaurants', 'fuel', 'transport', 'electricity', 'water', 'gas', 'fun', 'bank_fees', 'clothing', 'health', 'gifts', 'vacation', 'savings', 'card_charge', 'beauty', 'purchases'];
  state.categories.forEach(c => { if (want.includes(c.id)) c.enabled = true; });
  const budgets = { salary1: 13500, salary2: 11000, rent: 5200, arnona: 650, vaad: 180, insurance: 320, subscriptions: 90, mobile: 110, internet: 100, food: 3200, restaurants: 700, fuel: 900, transport: 200, electricity: 450, water: 150, gas: 60, fun: 400, bank_fees: 30, clothing: 500, health: 250, gifts: 300, vacation: 800, savings: 2000, beauty: 200, purchases: 400 };
  Object.entries(budgets).forEach(([id, b]) => { const c = cat(id); if (c) c.budget = b; });
  const [m1, m2] = state.members.map(m => m.id);
  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  const now = new Date(); const tx = [];
  for (let back = 9; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const maxDay = back === 0 ? now.getDate() : 28;
    const add = (day, desc, amount, type, provider, memberId) => { if (day <= maxDay) tx.push({ date: `${ym}-${pad(day)}`, desc, amount, type, provider, memberId }); };
    add(1, 'משכורת - חברת אופק בע"מ', 13500, 'income', 'hapoalim', m1);
    add(10, 'משכורת - עיריית תל אביב', rnd(10800, 11300), 'income', 'leumi', m2);
    add(2, 'העברה - שכר דירה', 5200, 'expense', 'hapoalim', m1);
    add(5, 'עיריית תל אביב ארנונה', 648, 'expense', 'hapoalim', m1);
    add(10, 'ישראכרט חיוב חודשי', rnd(5000, 7000), 'expense', 'hapoalim', m1);
    add(10, 'כאל חיוב חודשי', rnd(2000, 3500), 'expense', 'leumi', m2);
    add(15, 'הפקדה לחיסכון', 2000, 'expense', 'leumi', m2);
    add(3, 'חברת החשמל לישראל', rnd(330, 620), 'expense', 'isracard', m1);
    add(4, 'פרטנר', 109.9, 'expense', 'isracard', m1);
    add(4, 'Spotify', 29.9, 'expense', 'cal', m2);
    add(6, 'בזק בינלאומי', 99, 'expense', 'isracard', m1);
    add(7, 'הראל ביטוח', 318, 'expense', 'cal', m2);
    add(12, 'מי אביבים', rnd(120, 190), 'expense', 'isracard', m1);
    for (let k = 0; k < 8; k++) add(2 + k * 3, ['שופרסל דיל', 'רמי לוי', 'ויקטורי', 'יוחננוף'][k % 4], rnd(180, 520), 'expense', k % 2 ? 'cal' : 'isracard', k % 2 ? m2 : m1);
    for (let k = 0; k < 4; k++) add(5 + k * 6, ['וולט', 'ארומה', 'תן ביס', 'מסעדת הדסון'][k], rnd(45, 260), 'expense', 'cal', m2);
    add(8, 'פז דלק', rnd(250, 330), 'expense', 'isracard', m1); add(21, 'סונול', rnd(230, 320), 'expense', 'isracard', m1);
    add(14, 'פנגו חניה', rnd(20, 60), 'expense', 'cal', m2);
    add(17, 'רב-קו', 100, 'expense', 'cal', m2);
    add(19, 'סופר-פארם', rnd(80, 260), 'expense', 'isracard', m1);
    if (back % 2 === 0) add(22, 'yes planet', rnd(90, 160), 'expense', 'cal', m2);
    if (back % 3 === 0) add(24, 'זארה', rnd(200, 600), 'expense', 'isracard', m1);
    if (back % 4 === 1) add(26, 'מתנה לחתונה', 500, 'expense', 'leumi', m2);
    if (back === 4) add(9, 'Booking.com', 3200, 'expense', 'isracard', m1);
    add(25, 'עסקה כללית', rnd(40, 150), 'expense', 'cal', m2);
  }
  tx.forEach(t => { t.id = uid(); t.note = ''; t.hash = txHash(t); t.categoryId = categorize(t.desc, t.type, t.provider); });
  // משכורות לפי בעלים
  tx.forEach(t => { if (t.desc.startsWith('משכורת')) t.categoryId = t.memberId === m1 ? 'salary1' : 'salary2'; if (t.desc.includes('שכר דירה')) t.categoryId = 'rent'; });
  state.transactions.push(...tx);
  state.goals = state.goals.length ? state.goals : [
    { id: uid(), name: 'קרן חירום', target: 40000, saved: 18500, deadline: shiftYm(currentYm(), 12), color: GOAL_COLORS[0] },
    { id: uid(), name: 'חופשה בקיץ', target: 12000, saved: 3500, deadline: shiftYm(currentYm(), 8), color: GOAL_COLORS[2] }
  ];
  if (!state.settings.monthlySavingsTarget) state.settings.monthlySavingsTarget = 3000;
}

/* ================= Toast ================= */
let toastTimer;
function toast(msg, actionLabel, onAction) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
  el.classList.add('show');
  if (actionLabel) el.querySelector('button').onclick = () => { onAction(); el.classList.remove('show'); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 9000 : 4500);
}

/* ================= אירועים ================= */
function memberSalaryNames() {
  const s1 = cat('salary1'), s2 = cat('salary2');
  if (s1 && /^משכורת/.test(s1.name)) s1.name = `משכורת ${state.members[0].name}`;
  if (s2 && /^משכורת/.test(s2.name)) s2.name = `משכורת ${state.members[1].name}`;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const a = el.dataset.action, id = el.dataset.id;
  switch (a) {
    case 'month-shift': ui.ym = shiftYm(ui.ym, +el.dataset.d); render(); $(`[data-action="month-shift"][data-d="${el.dataset.d}"]`)?.focus(); break;
    case 'year-shift': ui.year += +el.dataset.d; render(); $(`[data-action="year-shift"][data-d="${el.dataset.d}"]`)?.focus(); break;
    case 'filter-none': ui.filters = { q: '', cat: '__none', member: '', type: '', scope: '' }; break;
    case 'filter-biz': ui.filters = { q: '', cat: '', member: '', type: '', scope: 'biz' }; break;
    case 'toggle-biz': {
      const t = state.transactions.find(x => x.id === id);
      const setBiz = (x, v) => { x.biz = v; const c = cat(x.categoryId); if (!c || (c.group !== 'transfer' && isBizGroup(c.group) !== v)) x.categoryId = categorize(x.desc, x.type, x.provider, v); };
      setBiz(t, !t.biz);
      save(); rerenderKeepFocus(el);
      const b = $(`[data-action="toggle-biz"][data-id="${id}"]`); if (b) b.focus();
      const same = state.transactions.filter(x => x.id !== t.id && x.desc === t.desc && !!x.biz !== t.biz);
      toast(`${t.biz ? 'סומן כעסק' : 'הוחזר לבית'}. לזכור ש״${t.desc}״ ${t.biz ? 'הוא תמיד עסק' : 'הוא תמיד בית'}${same.length ? ` ולעדכן עוד ${same.length} תנועות` : ''}?`, 'כן, לזכור', () => {
        rememberBiz(t.desc, t.biz); same.forEach(x => setBiz(x, t.biz)); save(); render();
      });
      break;
    }
    case 'settings-tab': e.preventDefault(); ui.settingsTab = el.dataset.tab; if (el.dataset.tab === 'connections') Cloud.refreshSyncStatus(true); if (ui.route !== 'settings') location.hash = '#/settings'; else { render(); $(`[data-tab="${el.dataset.tab}"]`)?.focus(); } break;
    case 'add-tx': txDialog(); break;
    case 'edit-tx': txDialog(state.transactions.find(t => t.id === id)); break;
    case 'del-tx': { const t = state.transactions.find(x => x.id === id); ui.pendingDel = id; confirmDialog('מחיקת תנועה', `למחוק את התנועה ״${esc(t.desc)}״ על סך ${fmt2(t.amount)}?`, 'do-del-tx'); break; }
    case 'do-del-tx': state.transactions = state.transactions.filter(t => t.id !== ui.pendingDel); save(); closeDialog(); render(); toast('התנועה נמחקה'); break;
    case 'close-dlg': closeDialog(); break;
    case 'open-import': importDialog(el.dataset.provider); break;
    case 'imp-reset': ui.imp.rows = null; renderImport(); break;
    case 'imp-confirm': confirmImport(); break;
    case 'add-goal': goalDialog(); break;
    case 'edit-goal': goalDialog(state.goals.find(g => g.id === id)); break;
    case 'deposit-goal': depositDialog(state.goals.find(g => g.id === id)); break;
    case 'del-goal': ui.pendingDel = id; confirmDialog('מחיקת יעד', 'למחוק את היעד? הסכומים שנרשמו בו יימחקו.', 'do-del-goal'); break;
    case 'do-del-goal': state.goals = state.goals.filter(g => g.id !== ui.pendingDel); save(); closeDialog(); render(); break;
    case 'add-cat': catDialog(); break;
    case 'edit-cat': catDialog(cat(id)); break;
    case 'del-cat': state.categories = state.categories.filter(c => c.id !== id); state.transactions.forEach(t => { if (t.categoryId === id) t.categoryId = null; }); state.rules = state.rules.filter(r => r.categoryId !== id); save(); closeDialog(); render(); break;
    case 'group-all': state.categories.filter(c => c.group === el.dataset.group).forEach(c => c.enabled = el.dataset.on === '1'); save(); render(); $(`[data-action="group-all"][data-group="${el.dataset.group}"][data-on="${el.dataset.on}"]`)?.focus(); break;
    case 'del-rule': state.rules = state.rules.filter(r => r.id !== id); save(); render(); break;
    case 'open-qc': quickClassifyDialog(); break;
    case 'ai-run': {
      Cloud.aiClassify(true).then(n => toast(Cloud.aiStatus === 'missing_key' ? 'הסיווג החכם עוד לא מופעל, צריך מפתח API' : Cloud.aiStatus === 'error' ? 'הסיווג החכם נכשל, נסו שוב' : `סווגו ${n} תנועות`));
      render(); break;
    }
    case 'del-bizrule': state.bizRules = (state.bizRules || []).filter(r => r.id !== id); save(); render(); break;
    case 'redetect-biz': {
      let n = 0;
      state.transactions.forEach(t => { const c = cat(t.categoryId); if (c && c.group === 'transfer') return; const v = detectBiz(t.desc); if (v !== !!t.biz) { t.biz = v; if (!c || isBizGroup(c.group) !== v) t.categoryId = categorize(t.desc, t.type, t.provider, v); n++; } });
      save(); render(); toast(`עודכנו ${n} תנועות`); break;
    }
    case 'recat-all': { let n = 0; state.transactions.forEach(t => { if (!t.categoryId) { const c = categorize(t.desc, t.type, t.provider); if (c) { t.categoryId = c; n++; } } }); save(); render(); toast(`סווגו ${n} תנועות`); break; }
    case 'export-json': {
      const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const lnk = document.createElement('a');
      lnk.href = url; lnk.download = `mazan-backup-${todayStr()}.json`; document.body.appendChild(lnk); lnk.click(); lnk.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      break;
    }
    case 'demo-data': loadDemo(); save(); toast('נטענו נתוני דוגמה'); location.hash = '#/month'; render(); break;
    case 'reset-all': confirmDialog('מחיקת כל הנתונים', 'כל התנועות, הסעיפים, החוקים והיעדים יימחקו מהענן, אצל שניכם, ולא יהיה אפשר לשחזר אותם בלי קובץ גיבוי. כדאי לייצא גיבוי קודם. להמשיך?', 'do-reset', 'מחיקת הכל'); break;
    case 'do-reset': { const members = state.members; state = defaultState(); state.members = members; ui.setupStep = 1; save(); closeDialog(); location.hash = '#/month'; render(); break; }
    case 'auth-reset': ui.authMode = 'reset'; render(); $('#a-email')?.focus(); break;
    case 'auth-back': ui.authMode = 'login'; render(); $('#a-email')?.focus(); break;
    case 'sign-out': Cloud.signOut(); break;
    case 'hh-create': {
      ui.busy = true; el.disabled = true;
      Cloud.createHousehold(!!$('#hh-legacy')?.checked).catch(err => { const m = $('#hh-msg'); if (m) m.textContent = authError(err); }).finally(() => { ui.busy = false; if (!Cloud.household) render(); });
      break;
    }
    case 'make-invite': Cloud.createInvite().then(c => { ui.invite = c; render(); $('[data-action="copy-invite"]')?.focus(); }).catch(() => toast('לא הצלחתי ליצור קוד. נסו שוב.')); break;
    case 'copy-invite': navigator.clipboard?.writeText(ui.invite).then(() => toast('הקוד הועתק')).catch(() => toast('לא הצלחתי להעתיק, אפשר להעתיק ידנית')); break;
    case 'setup-step': ui.setupStep = +el.dataset.step; render(); $('#view h2')?.focus?.(); window.scrollTo(0, 0); break;
    case 'setup-finish': state.settings.setupDone = true; memberSalaryNames(); if (el.dataset.demo) loadDemo(); save(); location.hash = '#/month'; render(true); break;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.filter) { ui.filters[el.dataset.filter] = el.value; rerenderKeepFocus(el); return; }
  if (el.dataset.imp) { ui.imp[el.dataset.imp] = el.value; if (el.dataset.imp === 'provider' && ui.imp.rows) ui.imp.map = autoMap(ui.imp.headers, providerById(el.value).kind); renderImport(); $(`[data-imp="${el.dataset.imp}"]`)?.focus(); return; }
  if (el.dataset.map) { ui.imp.map[el.dataset.map] = el.dataset.map === 'mode' ? el.value : +el.value; ui.imp.mapOpen = true; renderImport(); $(`[data-map="${el.dataset.map}"]`)?.focus(); return; }
  const a = el.dataset.action; if (!a) return;
  switch (a) {
    case 'qc-set': {
      if (!el.value) break;
      const n = applyQuick(el.dataset.key, el.value);
      const idx = $$('[data-action="qc-set"]').indexOf(el);
      toast(`${n} ${n === 1 ? 'תנועה סווגה' : 'תנועות סווגו'} ל״${cat(el.value).name}״, ונשמר לפעמים הבאות`);
      quickClassifyDialog();
      const sels = $$('[data-action="qc-set"]'); (sels[Math.min(idx, sels.length - 1)] || $('.dlg-foot .btn'))?.focus();
      break;
    }
    case 'auth-mode': ui.authMode = el.value; render(); $(`[data-action="auth-mode"][value="${el.value}"]`)?.focus(); break;
    case 'set-cat': {
      const t = state.transactions.find(x => x.id === el.dataset.id); t.categoryId = el.value || null; save();
      if (t.categoryId) {
        const same = state.transactions.filter(x => x.id !== t.id && x.desc === t.desc && x.type === t.type && x.categoryId !== t.categoryId);
        toast(`סווג ל״${cat(t.categoryId).name}״.${same.length ? ` להחיל גם על ${same.length} תנועות דומות ולזכור לפעם הבאה?` : ' לזכור לפעם הבאה?'}`, 'כן, לזכור', () => {
          state.rules = state.rules.filter(r => r.pattern !== t.desc);
          state.rules.push({ id: uid(), pattern: t.desc, categoryId: t.categoryId });
          same.forEach(x => x.categoryId = t.categoryId); save(); rerenderKeepFocus(el);
        });
      }
      rerenderKeepFocus(el); break;
    }
    case 'cat-enable': { const c = cat(el.dataset.id); c.enabled = el.checked; save(); if (state.settings.setupDone) rerenderKeepFocus(el); break; }
    case 'cat-budget': { const c = cat(el.dataset.id); c.budget = Math.max(0, +el.value || 0); save(); rerenderKeepFocus(el); break; }
    case 'toggle-active': ui.onlyActive = el.checked; rerenderKeepFocus(el); break;
    case 'ai-toggle': state.settings.ai = el.checked; save(); rerenderKeepFocus(el); if (el.checked) Cloud.aiClassify(); break;
    case 'set-theme': state.settings.theme = el.value; save(); rerenderKeepFocus(el); break;
    case 'set-scale': state.settings.scale = +el.value; save(); rerenderKeepFocus(el); break;
    case 'tx-type': case 'tx-biz': {
      const type = ($('input[name="type"]:checked') || {}).value || 'expense';
      $('#t-cat').innerHTML = catOptions(type, '', $('#t-biz').checked); break;
    }
    case 'imp-biz': ui.imp.biz = el.checked; if (ui.imp.rows) { renderImport(); $('#i-biz')?.focus(); } break;
    case 'import-file': if (el.files[0]) readImportFile(el.files[0]); break;
    case 'import-json': {
      const f = el.files[0]; if (!f) return;
      f.text().then(txt => { const s = JSON.parse(txt); if (!s || !Array.isArray(s.transactions) || !Array.isArray(s.categories)) throw new Error('bad'); state = withPrefs(normalizeState(s)); state.transactions.forEach(t => { if (!isUuid(t.id)) t.id = uid(); }); save(); render(); toast('הגיבוי שוחזר ונשמר בענן'); })
        .catch(() => toast('הקובץ אינו גיבוי תקין של מאזן'));
      break;
    }
  }
});

let searchTimer;
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.filter === 'q') { clearTimeout(searchTimer); searchTimer = setTimeout(() => { ui.filters.q = el.value; rerenderKeepFocus(el); }, 250); }
});

function rerenderKeepFocus(el) {
  const sel = el.id ? `#${CSS.escape(el.id)}` : null;
  const pos = el.selectionStart;
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
  if (sel) { const n = $(sel); if (n) { n.focus({ preventScroll: true }); if (pos != null && n.setSelectionRange && n.type === 'search') n.setSelectionRange(pos, pos); } }
}

document.addEventListener('submit', e => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f).entries());
  const msg = t => { const m = $('#auth-msg') || $('#hh-msg'); if (m) m.textContent = t; };
  switch (kind) {
    case 'auth': {
      const email = (fd.email || '').trim(), password = fd.password || '';
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg('נא להזין כתובת אימייל תקינה.'); $('#a-email').focus(); return; }
      if (ui.authMode !== 'reset' && password.length < 8) { msg('הסיסמה צריכה להיות לפחות 8 תווים.'); $('#a-pass').focus(); return; }
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; msg('');
      const redirect = location.origin + location.pathname;
      const p = ui.authMode === 'login' ? Cloud.sb.auth.signInWithPassword({ email, password })
        : ui.authMode === 'signup' ? Cloud.sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })
        : Cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      p.then(({ data, error }) => {
        if (error) { msg(authError(error)); btn.disabled = false; return; }
        if (ui.authMode === 'signup' && !data.session) msg(`נשלח מייל אימות אל ${email}. לוחצים על הקישור שבו, ואז נכנסים כאן.`);
        if (ui.authMode === 'reset') msg(`אם יש חשבון עם ${email}, נשלח אליו קישור לאיפוס סיסמה.`);
        btn.disabled = false;
      }).catch(() => { msg('אין חיבור. נסו שוב.'); btn.disabled = false; });
      break;
    }
    case 'new-password': {
      if ((fd.password || '').length < 8) { msg('הסיסמה צריכה להיות לפחות 8 תווים.'); return; }
      Cloud.sb.auth.updateUser({ password: fd.password }).then(({ error }) => {
        if (error) { msg(authError(error)); return; }
        Cloud.recovery = false; history.replaceState(null, '', location.pathname + '#/month'); toast('הסיסמה עודכנה'); Cloud.afterAuth();
      });
      break;
    }
    case 'join': {
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; msg('');
      Cloud.joinHousehold(fd.code || '').catch(err => { msg(authError(err)); btn.disabled = false; });
      break;
    }
    case 'setup-names': state.members.forEach((m, i) => m.name = (fd['m' + i] || m.name).trim()); memberSalaryNames(); ui.setupStep = 2; save(); render(); window.scrollTo(0, 0); break;
    case 'members': state.members.forEach((m, i) => m.name = (fd['m' + i] || m.name).trim()); memberSalaryNames(); save(); render(); toast('השמות נשמרו'); break;
    case 'monthly-target': state.settings.monthlySavingsTarget = Math.max(0, +fd.mt || 0); save(); render(); toast('יעד החיסכון נשמר'); break;
    case 'tx': {
      const data = { date: fd.date, type: fd.type, amount: Math.abs(+fd.amount), desc: fd.desc.trim(), categoryId: fd.categoryId || null, memberId: fd.memberId, note: fd.note.trim(), biz: !!fd.biz };
      if (f.dataset.id) Object.assign(state.transactions.find(t => t.id === f.dataset.id), data);
      else { const t = { id: uid(), provider: 'manual', ...data }; if (!t.categoryId) t.categoryId = categorize(t.desc, t.type, 'manual', t.biz);t.hash = txHash(t); state.transactions.push(t); }
      save(); closeDialog(); ui.ym = data.date.slice(0, 7); render(); toast('התנועה נשמרה'); break;
    }
    case 'goal': {
      const data = { name: fd.name.trim(), target: +fd.target, saved: +fd.saved || 0, deadline: fd.deadline || '', color: fd.color };
      if (f.dataset.id) Object.assign(state.goals.find(g => g.id === f.dataset.id), data); else state.goals.push({ id: uid(), ...data });
      save(); closeDialog(); render(); break;
    }
    case 'deposit': { const g = state.goals.find(x => x.id === f.dataset.id); g.saved = Math.max(0, g.saved + (+fd.amount || 0)); save(); closeDialog(); render(); toast(`עודכן: ${fmt(g.saved)} נחסכו ל״${g.name}״`); break; }
    case 'cat': {
      const data = { name: fd.name.trim(), group: fd.group, keywords: fd.keywords.split(/[,،\n]/).map(s => s.trim()).filter(Boolean) };
      if (f.dataset.id) Object.assign(cat(f.dataset.id), data, { keywordsEdited: true }); else state.categories.push({ id: 'c_' + uid().slice(0, 8), enabled: true, budget: 0, custom: true, ...data });
      save(); closeDialog(); render(); break;
    }
    case 'biz-keywords': state.settings.bizKeywords = fd.keywords.split(/[,،\n]/).map(s => s.trim()).filter(Boolean); save(); render(); toast('נשמר. אפשר ללחוץ ״זיהוי מחדש״ כדי להחיל על תנועות קיימות'); break;
    case 'add-rule': state.rules.push({ id: uid(), pattern: fd.pattern.trim(), categoryId: fd.categoryId }); save(); render(); toast('החוק נוסף'); break;
  }
});

dlg().addEventListener('close', afterDialogClosed); // גם סגירה במקש Esc

/* ================= הפעלה ================= */
readRoute();
applyPrefs();
Cloud.boot();
