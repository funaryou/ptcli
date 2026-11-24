import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/ptcli.js', import.meta.url));
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ptcli-add-doc-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = (...args) => execFileSync(process.execPath, [cli, 'add-doc', ...args], {
    cwd: dir, encoding: 'utf8', stdio: 'pipe',
    env: { ...process.env, PTCLI_TEMPLATE: '', PTCLI_SKILLS: '' },
  });
  return { dir, run };
}

test('add-doc adds docs and demo without scaffolding an app or overwriting files', (t) => {
  const { dir, run } = setup(t);
  fs.mkdirSync(path.join(dir, 'doc', 'rules'), { recursive: true });
  const rule = path.join(dir, 'doc', 'rules', 'md-rule.md');
  fs.writeFileSync(rule, 'custom rules');
  run();
  run();
  assert.equal(fs.readFileSync(rule, 'utf8'), 'custom rules');
  assert.ok(fs.existsSync(path.join(dir, 'doc', 'materials')));
  assert.ok(fs.existsSync(path.join(dir, 'demo', '.gitkeep')));
  for (const name of ['projects', '.ptcli.json', '.git', '.gitignore', '.opencode', 'AGENTS.md']) {
    assert.ok(!fs.existsSync(path.join(dir, name)), name);
  }
});

for (const agent of ['opencode', 'codex']) {
  test(`add-doc supports a target and ${agent} skills`, (t) => {
    const { dir, run } = setup(t);
    run('existing', '--agent', agent);
    const target = path.join(dir, 'existing');
    assert.ok(fs.existsSync(path.join(target, `.${agent}`, 'skills', 'new-skill', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(target, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(target, 'demo')));
    assert.ok(!fs.existsSync(path.join(target, '.ptcli.json')));
  });
}

test('add-doc supports custom templates and doc only', (t) => {
  const { dir, run } = setup(t);
  const template = path.join(dir, 'template');
  fs.mkdirSync(path.join(template, 'doc'), { recursive: true });
  fs.writeFileSync(path.join(template, 'doc', 'custom.md'), 'custom');
  run('target', '--template', template, '--no-demo');
  assert.equal(fs.readFileSync(path.join(dir, 'target', 'doc', 'custom.md'), 'utf8'), 'custom');
  assert.ok(!fs.existsSync(path.join(dir, 'target', 'demo')));
});

test('add-doc does not follow existing symlinks or replace file-directory conflicts', (t) => {
  const { dir, run } = setup(t);
  fs.mkdirSync(path.join(dir, 'outside'));
  fs.symlinkSync(path.join(dir, 'outside'), path.join(dir, 'doc'));
  assert.throws(() => run());
  assert.deepEqual(fs.readdirSync(path.join(dir, 'outside')), []);
  fs.unlinkSync(path.join(dir, 'doc'));
  fs.mkdirSync(path.join(dir, 'doc'));
  fs.writeFileSync(path.join(dir, 'doc', 'materials'), 'keep');
  run();
  assert.equal(fs.readFileSync(path.join(dir, 'doc', 'materials'), 'utf8'), 'keep');
});
