import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** CLI package root */
export const PACKAGE_ROOT = path.resolve(here, '..', '..');

const TEMPLATE_MARKERS = ['skills', 'doc'];

function looksLikeTemplate(candidate) {
  if (!candidate) return false;
  return TEMPLATE_MARKERS.some((marker) => fs.existsSync(path.join(candidate, marker)));
}

/**
 * Resolve the template root in this order:
 *   1. --template
 *   2. PTCLI_TEMPLATE
 *   3. bundled `assets/template`
 */
export function resolveTemplateRoot(explicit) {
  const candidates = [
    explicit,
    process.env.PTCLI_TEMPLATE,
    path.resolve(PACKAGE_ROOT, 'assets', 'template'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (looksLikeTemplate(resolved)) return resolved;
  }

  throw new Error(
    'テンプレートが見つかりません。--template <path> か 環境変数 PTCLI_TEMPLATE を指定してください。',
  );
}

export function resolveSkillsRoot(explicit, templateRoot) {
  if (explicit) return path.resolve(explicit);
  if (process.env.PTCLI_SKILLS) return path.resolve(process.env.PTCLI_SKILLS);
  if (templateRoot) {
    const candidate = path.join(templateRoot, 'skills');
    if (fs.existsSync(candidate)) return candidate;
  }
  const bundled = path.resolve(PACKAGE_ROOT, 'assets', 'skills');
  if (fs.existsSync(bundled)) return bundled;
  throw new Error('スキルのコピー元が見つかりません。--from <path> を指定してください。');
}
