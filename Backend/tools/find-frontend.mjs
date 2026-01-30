import fs from 'fs';
import path from 'path';

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function getPkg(dir) {
  const pj = path.join(dir, 'package.json');
  if (!fs.existsSync(pj)) return null;
  return readJson(pj);
}

function print(p) {
  process.stdout.write(p || '');
}

// 1) explicit env
const explicit = (process.env.FRONTEND_DIR || '').trim();
if (explicit) {
  const abs = path.resolve(explicit);
  const pkg = getPkg(abs);
  if (pkg) {
    print(abs);
    process.exit(0);
  }
}

// 2) scan parent folder
const backendRoot = process.cwd();
const parent = path.resolve(backendRoot, '..');

let best = '';
let bestScore = -1;

if (isDir(parent)) {
  const entries = fs.readdirSync(parent, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(parent, e.name);
    const pkg = getPkg(dir);
    if (!pkg) continue;

    const dn = String(e.name).toLowerCase();
    const nm = String(pkg.name || '').toLowerCase();

    let s = 0;
    if (dn.includes('frontend')) s += 5;
    if (nm.includes('frontend')) s += 5;
    if (dn.includes('bud') || dn.includes('office')) s += 2;
    if (fs.existsSync(path.join(dir, 'vite.config.ts'))) s += 2;
    if (fs.existsSync(path.join(dir, 'vite.config.js'))) s += 2;
    if (fs.existsSync(path.join(dir, 'src'))) s += 1;

    if (s > bestScore) {
      bestScore = s;
      best = dir;
    }
  }
}

print(best);
