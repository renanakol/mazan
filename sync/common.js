'use strict';
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const CLOUD = {
  url: 'https://wyhdovdxqgrykhzsjsly.supabase.co',
  key: 'sb_publishable_OAZnA8cb_muOHpFIJfhGnQ_viY5swER'
};

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = () => BROWSERS.find(p => fs.existsSync(p));

const LOG = path.join(__dirname, 'sync.log');
function log(...args) {
  const line = `[${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}] ${args.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch (_) {}
}

async function connect(app) {
  const sb = createClient(CLOUD.url, CLOUD.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email: app.email, password: app.password });
  if (error) throw new Error('הכניסה לאפליקציה נכשלה: ' + error.message);
  const uid = data.user.id;
  const { data: mem, error: e1 } = await sb.from('household_members').select('household_id, member_key').eq('user_id', uid).maybeSingle();
  if (e1) throw e1;
  if (!mem) throw new Error('החשבון עוד לא משויך למשק בית. פתחו משק בית באפליקציה קודם.');
  const { data: hh, error: e2 } = await sb.from('households').select('id, config').eq('id', mem.household_id).single();
  if (e2) throw e2;
  return { sb, householdId: hh.id, config: hh.config || {}, me: mem.member_key };
}

module.exports = { CLOUD, browserPath, log, connect };
