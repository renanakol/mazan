'use strict';
/* הגדרת הסנכרון: מריצים בעצמכם בחלון טרמינל:  node setup.js
   הסיסמאות שמוקלדות לא מוצגות על המסך, ונשמרות מוצפנות רק במחשב הזה. */
const readline = require('readline');
const store = require('./secure-store');
const { PROVIDERS } = require('./convert');
const { connect } = require('./common');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
rl._writeToOutput = function (s) { if (!muted) rl.output.write(s); else if (s.includes('\n')) rl.output.write('\n'); else rl.output.write('*'); };
const ask = q => new Promise(r => rl.question(q, a => r(a.trim())));
const askHidden = q => new Promise(r => { rl.output.write(q); muted = true; rl.question('', a => { muted = false; r(a); }); });

const SECRET_FIELDS = new Set(['password', 'id', 'card6Digits', 'userCode']);

async function main() {
  console.log('\n=== הגדרת סנכרון אוטומטי למאזן ===');
  console.log('הפרטים נשמרים מוצפנים רק במחשב הזה, ומשמשים לקריאת תנועות בלבד.\n');
  let data = null;
  try { data = store.load(); } catch (_) { data = null; }
  data ||= { app: null, accounts: [] };

  let ctx = null;
  if (data.app) {
    try { ctx = await connect(data.app); console.log(`מחובר לאפליקציה בתור ${data.app.email}.`); }
    catch (e) { console.log(e.message); data.app = null; }
  }
  while (!data.app) {
    const email = await ask('האימייל שלך באפליקציית מאזן: ');
    const password = await askHidden('הסיסמה לאפליקציה: ');
    try { ctx = await connect({ email, password }); data.app = { email, password }; console.log('מחובר!\n'); }
    catch (e) { console.log(e.message + '\n'); }
  }
  const members = [...((ctx.config.members || []).length ? ctx.config.members : [{ id: 'm1', name: 'בן/בת זוג 1' }, { id: 'm2', name: 'בן/בת זוג 2' }]), { id: 'joint', name: 'חשבון משותף' }];

  for (;;) {
    console.log('\nחשבונות מוגדרים:');
    if (!data.accounts.length) console.log('  (אין עדיין)');
    data.accounts.forEach((a, i) => console.log(`  ${i + 1}. ${PROVIDERS[a.provider].name} – ${(members.find(m => m.id === a.member) || {}).name || a.member}${a.business ? ' (עסק)' : ''}`));
    console.log('\nמה לעשות?  [1] הוספת חשבון   [2] מחיקת חשבון   [3] שמירה ויציאה   [4] יציאה בלי לשמור');
    const c = await ask('בחירה: ');
    if (c === '1') {
      const keys = Object.keys(PROVIDERS);
      keys.forEach((k, i) => console.log(`  [${i + 1}] ${PROVIDERS[k].name}`));
      const pi = +(await ask('איזה בנק או חברת אשראי? ')) - 1;
      if (!keys[pi]) { console.log('בחירה לא תקינה.'); continue; }
      members.forEach((m, i) => console.log(`  [${i + 1}] ${m.name}`));
      const mi = +(await ask('של מי החשבון? ')) - 1;
      if (!members[mi]) { console.log('בחירה לא תקינה.'); continue; }
      const p = PROVIDERS[keys[pi]];
      console.log(`פרטי הכניסה לאתר ${p.name} (כמו באפליקציה של ${p.name} בטלפון):`);
      const credentials = {};
      for (const [field, label] of p.fields) credentials[field] = SECRET_FIELDS.has(field) ? await askHidden(`  ${label}: `) : await ask(`  ${label}: `);
      const business = /^(כ|כן|y|yes)$/i.test(await ask('זה חשבון או כרטיס של העסק? כל התנועות בו יסומנו כעסק (כ/ל): '));
      data.accounts = data.accounts.filter(a => !(a.provider === keys[pi] && a.member === members[mi].id));
      data.accounts.push({ provider: keys[pi], member: members[mi].id, business, credentials });
      console.log('נוסף. בסיום שמרו (3), ואז אפשר לבדוק עם: node sync.js --only ' + `${keys[pi]}:${members[mi].id}`);
    } else if (c === '2') {
      const i = +(await ask('מספר החשבון למחיקה: ')) - 1;
      if (data.accounts[i]) { data.accounts.splice(i, 1); console.log('נמחק.'); }
    } else if (c === '3') {
      store.save(data); console.log(`נשמר מוצפן בקובץ ${store.FILE}`); break;
    } else if (c === '4') break;
  }
  rl.close();
}

main().catch(e => { console.error('שגיאה:', e.message); rl.close(); process.exitCode = 1; });
