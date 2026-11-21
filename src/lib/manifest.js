import path from 'node:path';
import { exists, readJson } from './fsx.js';

export const MANIFEST_NAME = '.ptcli.json';
export const TEMPLATE_VERSION = '2.0.0';

export const AGENTS = {
  opencode: { label: 'opencode', dir: '.opencode' },
  'claude-code': { label: 'claude-code', dir: '.claude' },
  codex: { label: 'codex', dir: '.codex' },
  cursor: { label: 'cursor', dir: '.cursor' },
  continue: { label: 'continue', dir: '.continue' },
  windsurf: { label: 'windsurf', dir: '.windsurf' },
  none: { label: 'none', dir: null },
};

export function resolveAgent(value) {
  if (!value) return AGENTS.opencode;
  if (AGENTS[value]) return AGENTS[value];

  const dir = value.startsWith('.') || value.includes('/') ? value : `.${value}`;
  return { label: value, dir };
}

export function createManifest({ appName, agent, agentDir, templateVersion = TEMPLATE_VERSION }) {
  return {
    templateVersion,
    apps: [{ name: appName, path: `projects/${appName}` }],
    agent,
    agentDir,
    docPreview: false,
    createdAt: new Date().toISOString(),
  };
}

export function readManifest(dir) {
  const target = path.join(dir, MANIFEST_NAME);
  if (!exists(target)) return null;
  return readJson(target);
}

export function validateManifest(manifest, dir) {
  const errors = [];
  const warnings = [];

  if (!manifest) {
    errors.push(`${MANIFEST_NAME} が見つかりません`);
    return { errors, warnings };
  }

  if (!manifest.templateVersion) {
    warnings.push('templateVersion が未設定です');
  }

  if (!Array.isArray(manifest.apps) || manifest.apps.length === 0) {
    errors.push('apps が空です');
  } else {
    for (const app of manifest.apps) {
      if (!app?.path) {
        errors.push('apps[] に path がない項目があります');
        continue;
      }
      if (!exists(path.join(dir, app.path))) {
        errors.push(`アプリのパスが存在しません: ${app.path}`);
      }
    }
  }

  if (manifest.agent && manifest.agent !== 'none') {
    const skillsDir = manifest.agentDir
      ? path.join(dir, manifest.agentDir, 'skills')
      : null;
    if (skillsDir && !exists(skillsDir)) {
      warnings.push(`スキルディレクトリがありません: ${path.relative(dir, skillsDir)}`);
    }
  }

  if (!exists(path.join(dir, 'demo'))) {
    warnings.push('demo/ がありません');
  }

  if (!exists(path.join(dir, '.git'))) {
    warnings.push('Gitリポジトリではありません（.git がない）');
  }

  return { errors, warnings };
}
