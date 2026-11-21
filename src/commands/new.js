import path from 'node:path';
import process from 'node:process';
import { createPrompter, log, ok, warn } from '../lib/ui.js';
import { copyDir, ensureDir, exists, isEmptyDir, writeFile, writeJson } from '../lib/fsx.js';
import { resolveTemplateRoot } from '../lib/paths.js';
import { AGENTS, MANIFEST_NAME, createManifest, resolveAgent } from '../lib/manifest.js';
import { hasGit, initRepo, push } from '../lib/git.js';
import { writeRestoreDoc } from './restore-doc.js';

const DOC_EXCLUDE = ['.git', '.DS_Store', 'node_modules', 'serve.js', 'serve.sh', 'src', 'README.md'];
const SKILL_EXCLUDE = ['.git', '.DS_Store', 'node_modules'];

const GITIGNORE = [
  'node_modules/',
  '.DS_Store',
  '.env',
  '.env.*',
  'dist/',
  'build/',
  'out/',
  'coverage/',
  '*.log',
  '.ptcli/backup/',
  '',
].join('\n');

export async function runNew(positional, flags) {
  const prompter = createPrompter({ enabled: flags.yes ? false : undefined });

  try {
    const name =
      flags.name ||
      positional[0] ||
      (await prompter.ask('プロジェクトディレクトリ名', 'my-app'));

    const appName = flags.app || (await prompter.ask('アプリ名', 'main'));

    const agentValue =
      flags.agent ||
      (await prompter.select(
        '使用するAIエージェントを選択してください',
        Object.entries(AGENTS).map(([value, agent]) => ({
          value,
          label: agent.dir ? `${agent.label} (${agent.dir})` : agent.label,
        })),
        0,
      ));

    const remote =
      flags.remote ?? (flags.yes ? '' : await prompter.ask('GitリモートURL（空でスキップ）', ''));

    const target = path.resolve(process.cwd(), name);
    if (exists(target) && !isEmptyDir(target)) {
      throw new Error(`${target} は空ではありません`);
    }

    const templateRoot = resolveTemplateRoot(flags.template);
    const agent = resolveAgent(agentValue);

    ensureDir(target);
    ensureDir(path.join(target, 'demo'));
    ensureDir(path.join(target, 'projects', appName));
    writeFile(path.join(target, 'demo', '.gitkeep'), '');
    writeFile(path.join(target, 'projects', appName, '.gitkeep'), '');
    ok(`プロジェクト構造を作成しました: ${path.relative(process.cwd(), target) || '.'}`);

    const docSource = path.join(templateRoot, 'doc');
    if (exists(docSource)) {
      copyDir(docSource, path.join(target, 'doc'), { exclude: DOC_EXCLUDE });
      ok('doc/ を配置しました');
    } else {
      warn('テンプレートに doc/ がないためスキップしました');
    }

    const skillsSource = path.join(templateRoot, 'skills');
    if (exists(skillsSource)) {
      const skillsTarget = agent.dir
        ? path.join(target, agent.dir, 'skills')
        : path.join(target, 'skills');
      copyDir(skillsSource, skillsTarget, { exclude: SKILL_EXCLUDE });
      ok(`スキルを配置しました: ${path.relative(target, skillsTarget)}`);
    } else {
      warn('テンプレートに skills/ がないためスキップしました');
    }

    const manifest = createManifest({ appName, agent: agent.label, agentDir: agent.dir });
    writeJson(path.join(target, MANIFEST_NAME), manifest);
    writeRestoreDoc(target, manifest, remote);
    ok(`${MANIFEST_NAME} を作成しました`);

    writeFile(path.join(target, '.gitignore'), GITIGNORE);

    if (flags.git !== false) {
      if (!hasGit()) {
        warn('git が見つからないため git init をスキップしました');
      } else {
        try {
          initRepo(target, { remote });
          ok('Gitリポジトリを初期化しました');
        } catch (error) {
          warn(`Gitの初期化に失敗しました: ${error.message}`);
        }

        if (remote) {
          try {
            push(target);
            ok(`リモートへpushしました: ${remote}`);
          } catch (error) {
            warn(`pushに失敗しました: ${error.message}`);
          }
        }
      }
    }

    log('');
    log(`プロジェクトを作成しました: ${target}`);
    log('');
    log('次の手順:');
    log(`  cd ${path.relative(process.cwd(), target) || '.'}`);
    log('  ptcli doctor');
  } finally {
    prompter.close();
  }
}
