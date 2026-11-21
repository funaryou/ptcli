import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

test('packed CLI creates a project and adds an agent without a sibling template', (t) => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ptcli-package-test-'));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], {
    cwd: packageRoot, encoding: 'utf8', stdio: 'pipe',
  }))[0];
  assert.ok(packed.files.some(({ path: name }) => name === 'assets/template/doc/rules/md-rule.md'));
  assert.ok(packed.files.some(({ path: name }) => name === 'assets/template/skills/new-skill/SKILL.md'));
  assert.ok(packed.files.every(({ path: name }) => !name.split('/').includes('.git')));
  execFileSync('tar', ['-xzf', path.join(work, packed.filename), '-C', work]);
  const cli = path.join(work, 'package', 'bin', 'ptcli.js');
  const run = (args) => execFileSync(process.execPath, [cli, ...args], {
    cwd: work, encoding: 'utf8', stdio: 'pipe',
    env: { ...process.env, PTCLI_TEMPLATE: '', PTCLI_SKILLS: '' },
  });
  run(['new', 'app', '--yes', '--no-git', '--agent', 'codex']);
  const root = path.join(work, 'app');
  assert.ok(fs.existsSync(path.join(root, 'doc', 'RESTORE.md')));
  assert.ok(fs.existsSync(path.join(root, '.codex', 'skills', 'new-skill', 'SKILL.md')));
  run(['add-agent', 'app', '--agent', 'claude-code']);
  assert.ok(fs.existsSync(path.join(root, '.claude', 'skills', 'new-skill', 'SKILL.md')));
  assert.match(run(['doctor', 'app']), /構造に問題はありません/);
});
