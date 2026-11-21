import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/ptcli.js', import.meta.url));
const template = fileURLToPath(new URL('../assets/template/', import.meta.url));
const run = (args, cwd) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });

function setup(t) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ptcli-restore-doc-test-'));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  run(['new', 'app', '--yes', '--no-git', '--agent', 'codex', '--template', template], work);
  return { work, root: path.join(work, 'app') };
}

test('new includes recovery instructions without inventing a remote', (t) => {
  const { root } = setup(t);
  const doc = fs.readFileSync(path.join(root, 'doc', 'RESTORE.md'), 'utf8');
  assert.match(doc, /未設定/);
  assert.match(doc, /ptcli new 'recreated-project' --yes --app 'main' --agent 'codex'/);
  assert.doesNotMatch(doc, /ptcli restore '/);
  for (const name of ['serve.js', 'serve.sh', 'src']) {
    assert.equal(fs.existsSync(path.join(root, 'doc', name)), false);
  }
});

test('restore-doc reads origin and its clone command restores committed content', (t) => {
  const { root, work } = setup(t);
  const remote = path.join(work, "remote's $(touch injected).git");
  git(['init', '--bare', remote], work);
  git(['init', '-b', 'main'], root);
  git(['remote', 'add', 'origin', remote], root);
  fs.writeFileSync(path.join(root, 'projects', 'main', 'app.txt'), 'application content');
  run(['restore-doc'], root);
  const doc = fs.readFileSync(path.join(root, 'doc', 'RESTORE.md'), 'utf8');
  git(['add', '-A'], root);
  git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture'], root);
  git(['push', 'origin', 'HEAD:main'], root);
  git(['symbolic-ref', 'HEAD', 'refs/heads/main'], remote);

  const clone = doc.match(/```bash\n(git clone[^\n]+)\n```/)[1];
  execFileSync('/bin/sh', ['-c', clone], { cwd: work, stdio: 'pipe' });
  assert.equal(fs.readFileSync(path.join(work, 'restored-project', 'projects', 'main', 'app.txt'), 'utf8'), 'application content');
  assert.equal(fs.existsSync(path.join(work, 'injected')), false);

  run(['restore', remote, 'via-cli'], work);
  assert.match(run(['doctor', 'via-cli'], work), /構造に問題はありません/);
  assert.equal(fs.readFileSync(path.join(work, 'via-cli', 'projects', 'main', 'app.txt'), 'utf8'), 'application content');
  assert.throws(() => run(['restore', remote, 'via-cli'], work));
  assert.equal(fs.readFileSync(path.join(work, 'via-cli', 'projects', 'main', 'app.txt'), 'utf8'), 'application content');
});

test('restore-doc handles a missing origin without inheriting a parent repository', (t) => {
  const { root, work } = setup(t);
  git(['init'], work);
  git(['remote', 'add', 'origin', 'https://example.invalid/parent.git'], work);
  run(['restore-doc'], root);
  const doc = fs.readFileSync(path.join(root, 'doc', 'RESTORE.md'), 'utf8');
  assert.match(doc, /未設定/);
  assert.doesNotMatch(doc, /parent.git/);
  git(['init'], root);
  run(['restore-doc'], root);
  assert.match(fs.readFileSync(path.join(root, 'doc', 'RESTORE.md'), 'utf8'), /未設定/);
});

test('restore-doc refuses credential-bearing or multiline URLs without changing the document', (t) => {
  const { root } = setup(t);
  git(['init'], root);
  git(['remote', 'add', 'origin', 'https://example.invalid/repo.git'], root);
  const target = path.join(root, 'doc', 'RESTORE.md');
  const before = fs.readFileSync(target, 'utf8');
  for (const remote of [
    'https://user:secret@example.invalid/repo.git',
    'ssh://git:secret@example.invalid/repo.git',
    'https://example.invalid/repo.git?token=secret',
    'https://example.invalid/repo.git\n```',
  ]) {
    git(['remote', 'set-url', 'origin', remote], root);
    assert.throws(() => run(['restore-doc'], root));
    assert.equal(fs.readFileSync(target, 'utf8'), before);
  }
});

test('new records a supplied remote and the skeleton command recreates the selected agent', (t) => {
  const { work } = setup(t);
  const remote = 'ssh://git@example.invalid/team/repo.git';
  run(['new', 'second', '--yes', '--no-git', '--remote', remote, '--agent', 'codex', '--template', template], work);
  const doc = fs.readFileSync(path.join(work, 'second', 'doc', 'RESTORE.md'), 'utf8');
  assert.ok(doc.includes(`ptcli restore '${remote}' 'restored-project'`));
  const command = doc.match(/ptcli new ([^\n]+)/)[1];
  execFileSync('/bin/sh', ['-c', 'exec "$1" "$2" new ' + command, 'sh', process.execPath, cli], { cwd: work, stdio: 'pipe' });
  const manifest = JSON.parse(fs.readFileSync(path.join(work, 'recreated-project', '.ptcli.json'), 'utf8'));
  assert.equal(manifest.agent, 'codex');
  assert.ok(fs.existsSync(path.join(work, 'recreated-project', '.codex', 'skills')));
});
