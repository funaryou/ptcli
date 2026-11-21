import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { copyDir, ensureDir, exists, hashDir, writeFile, writeJson } from '../lib/fsx.js';
import { MANIFEST_NAME, readManifest, resolveAgent } from '../lib/manifest.js';
import { resolveSkillsRoot, resolveTemplateRoot } from '../lib/paths.js';
import { ok, warn } from '../lib/ui.js';

const SKIP = new Set(['.git', '.DS_Store', 'node_modules']);

const BEGIN = '<!-- ptcli:begin -->';
const END = '<!-- ptcli:end -->';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function copyEntry(from, to, isDirectory) {
  if (isDirectory) {
    copyDir(from, to, { exclude: ['.DS_Store'] });
  } else {
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
  }
}

function sameEntry(from, to, isDirectory) {
  if (!isDirectory) {
    return fs.readFileSync(from).equals(fs.readFileSync(to));
  }
  return hashDir(from) === hashDir(to);
}

function writeAgentsBlock(dir, agent) {
  const target = path.join(dir, 'AGENTS.md');
  const block = [
    BEGIN,
    '## AIエージェント設定',
    '',
    `- エージェント: ${agent.label}`,
    `- スキル: \`${agent.dir}/skills/\``,
    `- manifest: \`${MANIFEST_NAME}\``,
    END,
  ].join('\n');

  if (!exists(target)) {
    writeFile(target, `${block}\n`);
    return;
  }

  const current = fs.readFileSync(target, 'utf8');
  const start = current.indexOf(BEGIN);
  const end = current.indexOf(END);

  if (start !== -1 && end > start) {
    const next = `${current.slice(0, start)}${block}${current.slice(end + END.length)}`;
    writeFile(target, next);
  } else {
    writeFile(target, `${current.trimEnd()}\n\n${block}\n`);
  }
}

export function addAgentTo(dir, { agentValue, source, force = false } = {}) {
  const manifest = readManifest(dir);
  const agent = resolveAgent(agentValue || manifest?.agent || 'opencode');

  if (!agent.dir) {
    warn('agent=none のためスキルは配置しません');
    return { agent, copied: 0, skipped: 0, replaced: 0 };
  }

  const destRoot = path.join(dir, agent.dir, 'skills');
  ensureDir(destRoot);

  const entries = fs
    .readdirSync(source, { withFileTypes: true })
    .filter((entry) => !SKIP.has(entry.name));

  let copied = 0;
  let skipped = 0;
  let replaced = 0;

  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(destRoot, entry.name);
    const isDirectory = entry.isDirectory();

    if (!exists(to)) {
      copyEntry(from, to, isDirectory);
      copied += 1;
      continue;
    }

    if (sameEntry(from, to, isDirectory)) {
      skipped += 1;
      continue;
    }

    if (!force) {
      warn(`既存のためスキップ: ${entry.name}（上書きは --force）`);
      skipped += 1;
      continue;
    }

    const backupRoot = path.join(dir, '.ptcli', 'backup', timestamp());
    ensureDir(backupRoot);
    fs.cpSync(to, path.join(backupRoot, entry.name), { recursive: true });
    fs.rmSync(to, { recursive: true, force: true });
    copyEntry(from, to, isDirectory);
    replaced += 1;
  }

  if (manifest) {
    manifest.agent = agent.label;
    manifest.agentDir = agent.dir;
    writeJson(path.join(dir, MANIFEST_NAME), manifest);
  }

  writeAgentsBlock(dir, agent);

  return { agent, copied, skipped, replaced };
}

export async function runAddAgent(positional, flags) {
  const dir = path.resolve(flags.dir || positional[0] || process.cwd());

  let templateRoot = null;
  try {
    templateRoot = resolveTemplateRoot(flags.template);
  } catch {
    // テンプレートがなくても --from で指定できる
  }

  const source = resolveSkillsRoot(flags.from, templateRoot);

  const result = addAgentTo(dir, {
    agentValue: flags.agent,
    source,
    force: Boolean(flags.force),
  });

  ok(`エージェント: ${result.agent.label}`);
  ok(`コピー: ${result.copied} / 置換: ${result.replaced} / スキップ: ${result.skipped}`);
}
