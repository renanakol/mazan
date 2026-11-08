'use strict';
/* סנכרון עם הענן: התחברות, משק בית משותף, תנועות בזמן אמת.
   המצב המקומי (state) נשאר מקור האמת של הממשק; save() מסמן שינוי,
   והסנכרון שולח רק את ההפרשים לענן. */

const CACHE_KEY = 'mazan.cloud.v1';
const PREFS_KEY = 'mazan.prefs';
const LEGACY_KEY = 'mazan.v1';
const DEVICE_SETTINGS = ['theme', 'scale'];

const Cloud = {
  sb: null,
  session: null,
  household: null,      // { id, name }
  me: null,             // member_key של המשתמש המחובר
  memberRows: [],
  status: 'idle',       // idle | saving | error | offline
  recovery: false,
  snapTx: new Map(),    // id -> json של מה שידוע שנמצא בענן
  snapConfig: '',
  timer: null,
  channel: null,
  pendingRender: false,

  async boot() {
    if (typeof supabase === 'undefined') { this.status = 'offline'; renderBootError('לא הצלחתי לטעון את רכיב החיבור לענן. בדקו חיבור לאינטרנט ורעננו.'); return; }
    this.sb = supabase.createClient(CLOUD_CONFIG.url, CLOUD_CONFIG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    this.sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { this.recovery = true; this.session = session; render(); return; }
      const changedUser = (session?.user?.id || null) !== (this.session?.user?.id || null);
      this.session = session;
      if (changedUser) setTimeout(() => this.afterAuth(), 0);
    });
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    await this.afterAuth();
  },

  async afterAuth() {
    this.unsubscribe();
    this.household = null; this.me = null;
    if (!this.session) { state = null; render(); return; }
    // מציגים מיד את העותק השמור במכשיר, אם יש
    const cache = readJSON(CACHE_KEY);
    if (cache && cache.userId === this.session.user.id && cache.state) {
      this.household = cache.household; this.me = cache.me; state = withPrefs(cache.state); render();
    } else { renderLoading(); }
    try { await this.loadHousehold(); }
    catch (e) { console.error(e); this.status = 'offline'; if (!state) renderBootError('לא הצלחתי להתחבר לענן. בדקו חיבור לאינטרנט ורעננו.'); else render(); }
  },

  async loadHousehold() {
    const uid = this.session.user.id;
    const { data: mem, error } = await this.sb.from('household_members').select('household_id, member_key').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    if (!mem) { this.household = null; state = null; localStorage.removeItem(CACHE_KEY); render(); return; }
    this.me = mem.member_key;
    const [{ data: hh, error: e1 }, { data: members, error: e2 }] = await Promise.all([
      this.sb.from('households').select('id, name, config').eq('id', mem.household_id).single(),
      this.sb.from('household_members').select('user_id, member_key').eq('household_id', mem.household_id)
    ]);
    if (e1) throw e1; if (e2) throw e2;
    this.household = { id: hh.id, name: hh.name };
    this.memberRows = members || [];
    const rows = await this.fetchAllTx(hh.id);
    state = buildStateFromCloud(hh.config, rows);
    this.snapConfig = JSON.stringify(configFromState(state));
    this.snapTx = new Map(state.transactions.map(t => [t.id, JSON.stringify(txToRow(t, hh.id))]));
    // אם הקונפיגורציה בענן ריקה (משק בית חדש), נדחוף את ברירת המחדל
    if (!hh.config || !hh.config.categories) this.snapConfig = '';
    this.writeCache();
    this.subscribe();
    this.status = 'idle';
    ui.imp = null;
    render();
    if (!this.snapConfig) this.schedule(0);
  },

  async fetchAllTx(hid) {
    const all = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await this.sb.from('transactions').select('*').eq('household_id', hid).order('date').range(from, from + page - 1);
      if (error) throw error;
      all.push(...data);
      if (data.length < page) break;
    }
    return all;
  },

  writeCache() {
    if (!this.session || !this.household || !state) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: this.session.user.id, household: this.household, me: this.me, state })); } catch (_) {}
  },

  schedule(delay = 500) {
    this.writeCache();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), delay);
  },

  async sync() {
    if (!this.household || !state) return;
    const hid = this.household.id;
    const cfg = configFromState(state); const cfgStr = JSON.stringify(cfg);
    const upserts = []; const seen = new Set();
    for (const t of state.transactions) {
      seen.add(t.id);
      const row = txToRow(t, hid); const s = JSON.stringify(row);
      if (this.snapTx.get(t.id) !== s) upserts.push([row, s]);
    }
    const deletes = [...this.snapTx.keys()].filter(id => !seen.has(id));
    if (cfgStr === this.snapConfig && !upserts.length && !deletes.length) { this.setStatus('idle'); return; }
    this.setStatus('saving');
    try {
      if (cfgStr !== this.snapConfig) {
        const { error } = await this.sb.from('households').update({ config: cfg }).eq('id', hid);
        if (error) throw error;
        this.snapConfig = cfgStr;
      }
      for (let i = 0; i < upserts.length; i += 500) {
        const chunk = upserts.slice(i, i + 500);
        const { error } = await this.sb.from('transactions').upsert(chunk.map(c => c[0]));
        if (error) throw error;
        chunk.forEach(([row, s]) => this.snapTx.set(row.id, s));
      }
      for (let i = 0; i < deletes.length; i += 200) {
        const chunk = deletes.slice(i, i + 200);
        const { error } = await this.sb.from('transactions').delete().in('id', chunk);
        if (error) throw error;
        chunk.forEach(id => this.snapTx.delete(id));
      }
      this.setStatus('idle');
    } catch (e) {
      console.error(e);
      this.setStatus('error');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.sync(), 8000);
    }
  },

  setStatus(s) {
    this.status = s;
    const el = document.getElementById('sync-status');
    if (el) el.innerHTML = syncStatusHtml();
  },

  subscribe() {
    const hid = this.household.id;
    this.channel = this.sb.channel('hh-' + hid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, p => this.onTx(p))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: 'id=eq.' + hid }, p => this.onHousehold(p))
      .subscribe();
  },
  unsubscribe() { if (this.channel) { this.sb.removeChannel(this.channel); this.channel = null; } },

  onTx(p) {
    if (!state || !this.household) return;
    if (p.eventType === 'DELETE') {
      const id = p.old && p.old.id; if (!id || !this.snapTx.has(id)) return;
      this.snapTx.delete(id);
      state.transactions = state.transactions.filter(t => t.id !== id);
    } else {
      const row = p.new; if (!row || row.household_id !== this.household.id) return;
      const t = rowToTx(row); const s = JSON.stringify(txToRow(t, row.household_id));
      if (this.snapTx.get(t.id) === s) return; // הד של שינוי שלנו
      this.snapTx.set(t.id, s);
      const i = state.transactions.findIndex(x => x.id === t.id);
      if (i >= 0) state.transactions[i] = t; else state.transactions.push(t);
    }
    this.remoteRender();
  },
  onHousehold(p) {
    if (!state || !p.new || !p.new.config) return;
    const s = JSON.stringify(p.new.config);
    if (s === this.snapConfig) return;
    this.snapConfig = s;
    Object.assign(state, normalizeConfig(p.new.config));
    state.settings = withDeviceSettings(state.settings);
    this.remoteRender();
  },
  remoteRender() {
    this.writeCache();
    clearTimeout(this.rr);
    this.rr = setTimeout(() => {
      const d = document.getElementById('dlg');
      if (d && d.open) { this.pendingRender = true; return; }
      const a = document.activeElement;
      if (a && a.id) rerenderKeepFocus(a); else render();
    }, 150);
  },

  async createHousehold(withLocal) {
    let cfg = configFromState(defaultState());
    let legacyTx = [];
    if (withLocal) {
      const legacy = readJSON(LEGACY_KEY);
      if (legacy && Array.isArray(legacy.categories)) { cfg = configFromState(normalizeState(legacy)); legacyTx = legacy.transactions || []; }
    }
    const { data: hid, error } = await this.sb.rpc('create_household', { p_name: 'משק הבית שלנו', p_config: cfg });
    if (error) throw error;
    if (legacyTx.length) {
      const rows = legacyTx.map(t => txToRow({ ...t, id: isUuid(t.id) ? t.id : uid() }, hid));
      for (let i = 0; i < rows.length; i += 500) {
        const { error: e } = await this.sb.from('transactions').upsert(rows.slice(i, i + 500));
        if (e) throw e;
      }
    }
    await this.loadHousehold();
  },
  async joinHousehold(code) {
    const { error } = await this.sb.rpc('join_household', { p_code: code });
    if (error) throw error;
    await this.loadHousehold();
  },
  async createInvite() {
    const { data, error } = await this.sb.rpc('create_invite', { p_household: this.household.id });
    if (error) throw error;
    return data;
  },
  async signOut() {
    await this.sync();
    localStorage.removeItem(CACHE_KEY);
    await this.sb.auth.signOut();
  }
};

/* ---------- המרות ---------- */
function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }
function isUuid(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s)); }
function txToRow(t, hid) {
  return { id: t.id, household_id: hid, date: t.date, amount: Math.round((+t.amount || 0) * 100) / 100, type: t.type, description: t.desc, category_id: t.categoryId || null, member_key: t.memberId || null, provider: t.provider || 'manual', note: t.note || '', hash: t.hash || null };
}
function rowToTx(r) {
  return { id: r.id, date: String(r.date).slice(0, 10), amount: +r.amount, type: r.type, desc: r.description, categoryId: r.category_id || null, memberId: r.member_key || null, provider: r.provider, note: r.note || '', hash: r.hash || null };
}
function configFromState(s) {
  const settings = { ...s.settings }; DEVICE_SETTINGS.forEach(k => delete settings[k]);
  return { version: s.version || 1, members: s.members, categories: s.categories, rules: s.rules, goals: s.goals, settings };
}
function normalizeConfig(cfg) {
  const base = normalizeState({ ...defaultState(), ...(cfg || {}), transactions: [] });
  return { version: base.version, members: base.members, categories: base.categories, rules: base.rules, goals: base.goals, settings: base.settings };
}
function withDeviceSettings(settings) {
  const prefs = readJSON(PREFS_KEY) || {};
  const out = { ...settings };
  DEVICE_SETTINGS.forEach(k => { out[k] = prefs[k] ?? defaultState().settings[k]; });
  return out;
}
function withPrefs(s) { s.settings = withDeviceSettings(s.settings); return s; }
function buildStateFromCloud(cfg, rows) {
  const s = { ...normalizeConfig(cfg), transactions: rows.map(rowToTx) };
  s.settings = withDeviceSettings(s.settings);
  return s;
}
function savePrefs() {
  if (!state) return;
  const p = {}; DEVICE_SETTINGS.forEach(k => p[k] = state.settings[k]);
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) {}
}
function syncStatusHtml() {
  const map = { idle: ['ok', 'מסונכרן לענן'], saving: ['', 'שומר…'], error: ['err', 'שגיאת סנכרון, מנסה שוב'], offline: ['err', 'אין חיבור לענן'] };
  const [cls, txt] = map[Cloud.status] || map.idle;
  return `<span class="sync ${cls}"><span class="sync-dot" aria-hidden="true"></span>${txt}</span>`;
}
