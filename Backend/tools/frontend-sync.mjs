import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const backendRoot = process.cwd();
const build = process.argv.includes('--build');

// Find frontend
const find = spawnSync('node', ['tools/find-frontend.mjs'], { encoding: 'utf8', shell: true });
const frontendDir = (find.stdout || '').toString().trim();

if (!frontendDir) {
  console.log('[frontend-sync] Frontend not found. Set FRONTEND_DIR to your frontend folder. Skipping.');
  process.exit(0);
}

console.log('[frontend-sync] Frontend:', frontendDir);

if (build) {
  if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
    console.log('[frontend-sync] npm ci (frontend)');
    run('npm', ['ci'], { cwd: frontendDir });
  }
  console.log('[frontend-sync] npm run build (frontend)');
  run('npm', ['run', 'build'], { cwd: frontendDir });
}

const distDir = path.join(frontendDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('[frontend-sync] dist folder not found:', distDir);
  console.log('[frontend-sync] Run with --build or build frontend first.');
  process.exit(1);
}

const publicDir = path.join(backendRoot, 'public');
rmrf(publicDir);
fs.mkdirSync(publicDir, { recursive: true });
copyDir(distDir, publicDir);

console.log('[frontend-sync] Copied dist -> backend/public');
