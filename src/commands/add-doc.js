import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from '../lib/fsx.js';
import { resolveSkillsRoot, resolveTemplateRoot } from '../lib/paths.js';
import { ok, warn } from '../lib/ui.js';
import { addAgentTo } from './add-agent.js';

const EXCLUDE = new Set(['.git', '.DS_Store', 'node_modules', 'serve.js', 'serve.sh', 'src', 'README.md']);

function stat(target) {
  return fs.lstatSync(target, { throwIfNoEntry: false });
}

function checkDirectory(target) {
  const entry = stat(target);
  if (entry && !entry.isDirectory()) {
    throw new Error(`通常のディレクトリではありません: ${target}`);
  }
}

function copyMissing(source, destination) {
  ensureDir(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name) || entry.isSymbolicLink()) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const current = stat(to);
    if (entry.isDirectory() && (!current || current.isDirectory())) {
      copyMissing(from, to);
    } else if (!current && entry.isFile()) {
      fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    } else {
      warn(`既存のためスキップ: ${to}`);
    }
  }
}

export function runAddDoc(positional, flags) {
  const dir = path.resolve(positional[0] || process.cwd());
  const template = resolveTemplateRoot(flags.template);
  const source = path.join(template, 'doc');
  if (!fs.statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`文書テンプレートがありません: ${source}`);
  }
  checkDirectory(dir);
  checkDirectory(path.join(dir, 'doc'));
  if (flags.demo !== false) checkDirectory(path.join(dir, 'demo'));
  const skills = flags.agent && flags.agent !== 'none'
    ? resolveSkillsRoot(undefined, template) : null;
  if (skills && !fs.statSync(skills, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`スキルのコピー元がありません: ${skills}`);
  }

  copyMissing(source, path.join(dir, 'doc'));
  ok('doc/ を追加しました（既存ファイルは保持）');
  if (flags.demo !== false) {
    const demo = path.join(dir, 'demo');
    ensureDir(demo);
    const keep = path.join(demo, '.gitkeep');
    if (!stat(keep)) fs.writeFileSync(keep, '', { flag: 'wx' });
    ok('demo/ を追加しました');
  }
  if (skills) {
    const result = addAgentTo(dir, { agentValue: flags.agent, source: skills });
    ok(`エージェント: ${result.agent.label} / コピー: ${result.copied} / スキップ: ${result.skipped}`);
  }
}
