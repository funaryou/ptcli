import path from 'node:path';
import process from 'node:process';
import { fail, log, ok, warn } from '../lib/ui.js';
import { MANIFEST_NAME, readManifest, validateManifest } from '../lib/manifest.js';

export async function runDoctor(positional, flags) {
  const dir = path.resolve(flags.dir || positional[0] || process.cwd());
  const manifest = readManifest(dir);
  const { errors, warnings } = validateManifest(manifest, dir);

  log(`検査対象: ${dir}`);
  log('');

  if (manifest) {
    ok(`${MANIFEST_NAME} を読み込みました`);
    log(`  テンプレート: ${manifest.templateVersion || '不明'}`);
    log(`  エージェント: ${manifest.agent || '不明'}`);
    for (const app of manifest.apps || []) {
      log(`  アプリ: ${app.name} → ${app.path}`);
    }
    log('');
  }

  for (const message of warnings) warn(message);
  for (const message of errors) fail(message);

  if (errors.length === 0) {
    ok('構造に問題はありません');
  } else {
    process.exitCode = 1;
  }
}
