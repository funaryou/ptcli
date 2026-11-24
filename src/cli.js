import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './lib/paths.js';
import { runNew } from './commands/new.js';
import { runDoctor } from './commands/doctor.js';
import { runAddAgent } from './commands/add-agent.js';
import { runRestore } from './commands/restore.js';
import { runRestoreDoc } from './commands/restore-doc.js';
import { runAddDoc } from './commands/add-doc.js';

const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));

const HELP = `
ptcli ${pkg.version} — プロジェクトテンプレートCLI

使い方:
  ptcli <command> [options]

コマンド:
  new [dir]              プロジェクトを作成する
  doctor [dir]           構造とmanifestを検証する
  add-agent [dir]        AIエージェント設定を後付けする
  add-doc [dir]          doc/ と demo/ を追加する（既存ファイルは保持）
  restore <url> [dir]    Gitリモートから復元する
  restore-doc [dir]      originからdoc/RESTORE.mdを更新する

共通オプション:
  --template <path>      テンプレートの場所
  --help                 このヘルプを表示
  --version              バージョンを表示

new:
  --name <dir>           プロジェクトディレクトリ名
  --app <name>           アプリ名（既定: main）
  --agent <name>         opencode|claude-code|codex|cursor|continue|windsurf|none
  --remote <url>         GitリモートURL
  --no-git               git init をスキップ
  --yes                  既定値で非対話実行

add-doc:
  --no-demo              doc/ のみ追加
  --agent <name>         AIエージェントのスキルも追加（省略時は追加なし）

add-agent:
  --agent <name>         追加するエージェント
  --from <path>          スキルのコピー元
  --force                既存スキルを上書き（バックアップあり）

restore:
  --agent <name>         復元後にスキルを再適用
  --from <path>          スキルのコピー元
`.trim();

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);

    if (key.startsWith('no-')) {
      flags[key.slice(3)] = false;
      continue;
    }

    if (['yes', 'force', 'help', 'version'].includes(key)) {
      flags[key] = true;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return { positional, flags };
}

export async function main(argv) {
  const [command, ...rest] = argv;
  const { positional, flags } = parseArgs(rest);

  if (!command || command === 'help' || command === '--help' || command === '-h' || flags.help) {
    console.log(HELP);
    return;
  }

  if (command === '--version' || command === '-v' || flags.version) {
    console.log(pkg.version);
    return;
  }

  switch (command) {
    case 'new':
      return runNew(positional, flags);
    case 'doctor':
      return runDoctor(positional, flags);
    case 'add-agent':
      return runAddAgent(positional, flags);
    case 'add-doc':
      return runAddDoc(positional, flags);
    case 'restore-doc':
      return runRestoreDoc(positional);
    case 'restore':
      return runRestore(positional, flags);
    default:
      throw new Error(`不明なコマンド: ${command}\n\n${HELP}`);
  }
}
