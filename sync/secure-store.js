'use strict';
/* שמירה מוצפנת של פרטי הכניסה בעזרת Windows DPAPI:
   רק המשתמש הזה במחשב הזה יכול לפענח את הקובץ. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'accounts.secure');

function ps(script, input) {
  const env = { ...process.env }; delete env.PSModulePath; // מונע התנגשות עם מודולים של PowerShell 7
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { input, env, encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
}
const PRE = 'Add-Type -AssemblyName System.Security; $in = [Console]::In.ReadToEnd().Trim(); ';

function save(obj) {
  const b64 = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
  const enc = ps(PRE + "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String($in), $null, 'CurrentUser'))", b64).trim();
  fs.writeFileSync(FILE, enc, 'utf8');
}

function load() {
  if (!fs.existsSync(FILE)) return null;
  const enc = fs.readFileSync(FILE, 'utf8').trim();
  const b64 = ps(PRE + "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($in), $null, 'CurrentUser'))", enc).trim();
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

module.exports = { save, load, FILE };
