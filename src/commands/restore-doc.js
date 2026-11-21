import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { exists, writeFile } from '../lib/fsx.js';
import { MANIFEST_NAME, readManifest } from '../lib/manifest.js';
import { ok } from '../lib/ui.js';

function quote(value) {
  if (typeof value !== 'string' || /[\x00-\x1f\x7f`]/.test(value)) {
    throw new Error('復元手順に改行・制御文字・バッククォートは使用できません');
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function writeRestoreDoc(dir, manifest, remote = '') {
  if (remote) {
    quote(remote);
    if (remote.startsWith('-')) throw new Error('リモートURLが不正です');
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(remote)) {
      const url = new URL(remote);
      if (url.password || (/^https?:$/.test(url.protocol) && url.username) || url.search || url.hash) {
        throw new Error('認証情報・クエリ・フラグメントを含むリモートURLは文書に保存できません');
      }
    }
  }

  const recovery = remote
    ? `リモートへpush済みの内容を、新しいディレクトリに復元します。

\`\`\`bash
ptcli restore ${quote(remote)} 'restored-project'
\`\`\`

Gitだけで復元する場合は、代わりに次を実行します。

\`\`\`bash
git clone -- ${quote(remote)} 'restored-project'
\`\`\``
    : 'リモートURLは未設定です。originを設定し、`ptcli restore-doc` を再実行してください。URLが分かるまでcloneによる復元はできません。';

  const content = `## プロジェクトの復元

このファイルはptcliによる自動生成です。\`ptcli restore-doc\` で全体を更新します。手作業の補足は別文書に保存してください。

${recovery}

## 構成だけを作り直す場合

次のコマンドは空の構成を再作成します。失われたソースコード・文書・履歴は戻りません。既存の作業と重ならない場所で実行してください。

\`\`\`bash
ptcli new 'recreated-project' --yes --app ${quote(manifest.apps[0].name || 'main')} --agent ${quote(manifest.agent || 'none')}
\`\`\`

複数アプリがあった場合、追加のアプリは別途再作成してください。

## 復元後の確認

復元先のディレクトリで \`ptcli doctor\` を実行してください。アプリごとの依存関係、環境変数、認証情報は別途設定します。

## 保存と前提

- CLIにはNode.js 18以上、cloneにはGitとリモートへのアクセス権限が必要です。
- npm公開は未確定です。公開前はCLIのソースから \`npm link\` で \`ptcli\` を登録してください。Gitだけの復元手順にはCLIは不要です。
- このファイルをコミット・pushし、リモートURLと復元手順をPC外にも保管してください。
- 未コミット・未pushの変更、無視されたファイル、リモート自体の消失は復元対象外です。
`;
  writeFile(path.join(dir, 'doc', 'RESTORE.md'), content);
}

export function runRestoreDoc(positional) {
  const dir = path.resolve(positional[0] || '.');
  const manifest = readManifest(dir);
  if (!Array.isArray(manifest?.apps) || !manifest.apps[0]) {
    throw new Error(`${MANIFEST_NAME} の apps を確認してください`);
  }

  let remote = '';
  if (exists(path.join(dir, '.git'))) {
    try {
      remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
        cwd: dir, encoding: 'utf8', stdio: 'pipe',
      }).replace(/\r?\n$/, '');
    } catch (error) {
      if (error.status !== 1) throw new Error('originの取得に失敗しました。Gitの設定を確認してください');
    }
  }
  writeRestoreDoc(dir, manifest, remote);
  ok(`復元手順を更新しました: ${path.join(dir, 'doc', 'RESTORE.md')}`);
}
