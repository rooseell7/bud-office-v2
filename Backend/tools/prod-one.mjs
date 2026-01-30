import fs from 'fs';
import { spawnSync } from 'child_process';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1) Optional: build+sync frontend
run('npm', ['run', 'frontend:sync:build']);

// 2) Backend build
run('npm', ['run', 'build']);

// 3) Start prod
run('npm', ['run', 'start:prod']);
