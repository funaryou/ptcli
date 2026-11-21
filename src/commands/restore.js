import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { log, ok, warn } from '../lib/ui.js';
import { exists, isEmptyDir, moveDir } from '../lib/fsx.js';
import { git } from '../lib/git.js';
import { MANIFEST_NAME, readManifest, validateManifest } from '../lib/manifest.js';
import { resolveSkillsRoot, resolveTemplateRoot } from '../lib/paths.js';
import { addAgentTo } from './add-agent.js';

function deriveName(url) {
  const cleaned = url.replace(/\/+$/, '').replace(/\.git$/, '');
  return path.basename(cleaned) || 'restored-project';
}

function optionalTemplateRoot(explicit) {
  try {
    return resolveTemplateRoot(explicit);
  } catch {
    return null;
  }
}

export async function runRestore(positional, flags) {
  const url = flags.url || positional[0];
  if (!url) {
    throw new Error('使い方: ptcli restore <git-url> [dir]');
  }

  const name = flags.name || positional[1] || deriveName(url);
  const target = path.resolve(process.cwd(), name);

  if (exists(target) && !isEmptyDir(target)) {
    throw new Error(`${target} は空ではありません`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ptcli-restore-'));

  try {
    log(`clone: ${url}`);
    git(['clone', url, tmp], process.cwd());

    const manifest = readManifest(tmp);
    if (!manifest) {
      warn(`${MANIFEST_NAME} が見つかりません。テンプレート外のリポジトリとして続行します`);
    } else {
      const { errors } = validateManifest(manifest, tmp);
      if (errors.length > 0) {
        throw new Error(`復元先の検証に失敗しました:\n- ${errors.join('\n- ')}`);
      }
    }

    if (flags.agent) {
      const source = resolveSkillsRoot(flags.from, optionalTemplateRoot(flags.template));
      const result = addAgentTo(tmp, {
        agentValue: flags.agent,
        source,
        force: Boolean(flags.force),
      });
      ok(`スキルを再適用しました: ${result.agent.label}`);
    }

    if (exists(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }

    moveDir(tmp, target);
    ok(`復元しました: ${target}`);
    log('');
    log('次の手順:');
    log(`  cd ${path.relative(process.cwd(), target) || '.'}`);
    log('  ptcli doctor');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
