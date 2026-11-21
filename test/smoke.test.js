import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '..', 'bin', 'ptcli.js');
const template = path.resolve(here, '..', 'assets', 'template');

function run(args, cwd) {
  return execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ptcli-test-'));
}

test('new creates the v2 structure and doctor passes', () => {
  const work = tempDir();

  try {
    const output = run(['new', 'app', '--yes', '--no-git', '--template', template], work);
    assert.match(output, /プロジェクトを作成しました/);

    const root = path.join(work, 'app');
    assert.ok(fs.existsSync(path.join(root, '.ptcli.json')));
    assert.ok(fs.existsSync(path.join(root, 'projects', 'main', '.gitkeep')));
    assert.ok(fs.existsSync(path.join(root, 'demo', '.gitkeep')));
    assert.ok(fs.existsSync(path.join(root, '.opencode', 'skills')));

    const doctor = run(['doctor', 'app'], work);
    assert.match(doctor, /構造に問題はありません/);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test('add-agent is idempotent and backs up on force', () => {
  const work = tempDir();

  try {
    run(['new', 'app', '--yes', '--no-git', '--template', template], work);

    const first = run(['add-agent', 'app', '--agent', 'codex', '--from', path.join(template, 'skills')], work);
    assert.match(first, /コピー: 4/);

    const second = run(['add-agent', 'app', '--agent', 'codex', '--from', path.join(template, 'skills')], work);
    assert.match(second, /スキップ: 4/);

    const skill = path.join(work, 'app', '.codex', 'skills', 'new-skill', 'SKILL.md');
    fs.appendFileSync(skill, '\nchanged\n');

    const third = run(
      ['add-agent', 'app', '--agent', 'codex', '--from', path.join(template, 'skills'), '--force'],
      work,
    );
    assert.match(third, /置換: 1/);

    const backups = path.join(work, 'app', '.ptcli', 'backup');
    assert.ok(fs.existsSync(backups));
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test('doctor fails when the manifest is missing', () => {
  const work = tempDir();

  try {
    assert.throws(() => run(['doctor'], work));
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});
