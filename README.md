## ptcli

プロジェクトテンプレートの作成・復元・保守を行うCLIです。Node.js 18以上で動作し、依存パッケージはありません。

## ローカルで使う

テンプレートは `assets/template/` に同梱しています。npm公開はまだ行っていません。現在は、このディレクトリで次を実行してローカルのコマンドを登録してください。

```bash
npm link
ptcli --help
```

登録せずに使う場合は `node /path/to/ptcli/bin/ptcli.js <command>` で実行できます。

## リポジトリの構成

```text
ptcli/
├── assets/template/
│   ├── doc/       # 配布する文書テンプレート
│   └── skills/    # 配布するエージェント用スキル
├── bin/ptcli.js
├── src/
└── test/
```

CLIとテンプレートは同じリポジトリで管理します。テンプレートの編集先は `assets/template/` です。開発時もパッケージ利用時も同じ原本を使い、隣接する別リポジトリには依存しません。

## コマンド一覧

`[dir]` は省略可能な配置先・対象ディレクトリ、`<url>` は必須のGitリモートURLです。`new` の配置先は省略時に対話で指定し、`restore` はURLから配置先名を決めます。それ以外は省略時にカレントディレクトリを使います。

| コマンド | 用途 | 主なオプション |
|----------|------|----------------|
| `ptcli new [dir]` | プロジェクト全体を新規作成 | `--app <name>`、`--agent <name>`、`--remote <url>`、`--yes`、`--no-git` |
| `ptcli add-doc [dir]` | 既存プロジェクトへ `doc/` と `demo/` を追加 | `--no-demo`、`--agent <name>` |
| `ptcli add-agent [dir]` | AI用スキルと `AGENTS.md` の設定ブロックを追加 | `--agent <name>`、`--from <path>`、`--force` |
| `ptcli doctor [dir]` | manifestとプロジェクト構造を検証 | なし |
| `ptcli restore <url> [dir]` | Gitリモートから復元 | `--agent <name>`、`--from <path>` |
| `ptcli restore-doc [dir]` | `origin` から `doc/RESTORE.md` を更新 | なし |

`new`、`add-doc`、`add-agent`、`restore` では `--template <path>` でテンプレートを指定できます。ヘルプは `ptcli --help`、バージョン確認は `ptcli --version` です。

### よく使う実行例

```bash
# 新規プロジェクト全体を作成（Codex用スキル付き、Git初期化なし）
ptcli new my-app --yes --agent codex --no-git

# 既存プロジェクトへ doc/ と demo/ を追加
ptcli add-doc /path/to/project

# 文書・demo/ とCodex用スキルをまとめて追加
ptcli add-doc /path/to/project --agent codex

# 文書のみ追加
ptcli add-doc /path/to/project --no-demo

# OpenCode用スキルを追加（Codexとの併用も可能）
ptcli add-agent /path/to/project --agent opencode

# プロジェクト構造の検証・復元手順の更新
ptcli doctor /path/to/project
ptcli restore-doc /path/to/project

# Gitリモートから指定先へ復元
ptcli restore git@github.com:you/my-app.git restored-app
```

### AI設定の生成先

AI用スキルの配置は既存の `new`・`add-agent` に備わっている機能です。`add-doc --agent <name>` も同じスキルを配置します。

| `--agent` の値 | スキルの生成先 |
|----------------|----------------|
| `opencode` | `.opencode/skills/` |
| `codex` | `.codex/skills/` |
| `claude-code` | `.claude/skills/` |
| `cursor` | `.cursor/skills/` |
| `continue` | `.continue/skills/` |
| `windsurf` | `.windsurf/skills/` |

`add-agent` と `add-doc --agent` は `AGENTS.md` に設定ブロックも追加します。認証情報や `config.toml` などのツール本体の設定は生成しません。`new` の既定は `opencode`、`add-doc` は `--agent` を指定した場合だけAI設定を追加します。

## 生成される構成

```text
<project>/                  # 唯一のGitリポジトリ
├── .ptcli.json             # manifest
├── demo/                   # 演習・試行用
├── doc/                    # 文書（プレビューサーバーなし）
├── projects/<app>/         # アプリ本体
└── .opencode/skills/       # 選択したエージェント配下にスキルを配置
```

## 使い方

### 作成

```bash
ptcli new my-app
```

対話で次を指定します。

1. プロジェクトディレクトリ名
2. アプリ名（既定: `main`）
3. AIエージェント（既定: `opencode`）
4. GitリモートURL（空でスキップ）

非対話で作成する場合:

```bash
ptcli new my-app --yes --agent codex --no-git
```

### 復元

```bash
ptcli restore git@github.com:you/my-app.git
```

`git clone` → manifest検証 → カレントへ配置、までを実行します。ローカルの `.git` を失った場合の復元を想定しています。

### 復元手順の保存

`new` は `doc/RESTORE.md` を生成します。`--remote` または対話で指定したURLがあれば、復元コマンドとGitのcloneコマンドを記録します。URLがなければ未設定と明記し、空の構成を再作成するコマンドを記録します。

リモートを後から設定・変更した場合は、プロジェクトルートで更新してください。

```bash
ptcli restore-doc
# 別のディレクトリを指定する場合
ptcli restore-doc /path/to/my-app
```

対象には `.ptcli.json` が必要です。対象直下にGit管理情報があれば `origin` のURLを読み取ります。Git管理情報または `origin` がなければ未設定として生成します。

`doc/RESTORE.md` は毎回全体を更新します。手作業の補足は別文書に保存してください。URLに埋め込まれたパスワード、HTTPの認証情報、クエリやフラグメント、改行などは拒否し、既存文書を維持します。

生成した文書をコミット・pushし、リモートURLと手順をPC外にも保存してください。構成の再作成ではソースコードは戻りません。未pushの変更、無視されたファイル、リモート自体の消失は復元対象外です。複数アプリの構成再作成では先頭のアプリだけを生成します。

### 文書と演習用ディレクトリの後付け

既存プロジェクトのルートで実行します。空でないディレクトリにも追加できます。

```bash
ptcli add-doc                          # doc/ と demo/.gitkeep を追加
ptcli add-doc /path/to/project         # 配置先を指定
ptcli add-doc --no-demo                # doc/ のみ追加
ptcli add-doc --agent codex            # .codex/skills/ と AGENTS.md も追加
ptcli add-doc --agent opencode         # .opencode/skills/ と AGENTS.md も追加
```

文書は `new` と同じ除外ルールで配置し、既存ファイルは上書きしません。再実行時は不足しているファイルだけ追加します。`demo/` は演習用の空ディレクトリで、サンプルアプリは生成しません。`--template <path>` と `PTCLI_TEMPLATE` も利用できます。

`--agent` の省略時はAI設定を追加しません。指定時は `add-agent` と同じ処理でスキルと `AGENTS.md` の管理ブロックを追加します。既存スキルは保持します。認証情報や各ツールの設定ファイル（`config.toml` など）は生成しません。両方のAIを使う場合は、もう一方を `ptcli add-agent --agent opencode` などで追加できます。

`projects/`、`.ptcli.json`、`.gitignore`、`doc/RESTORE.md` の生成とGit初期化は行いません。既存の `.ptcli.json` があれば、`--agent` 指定時にエージェント情報を更新します。manifest（構成情報ファイル）のないプロジェクトにも利用できますが、`doctor` はmanifestを必要とするため、このコマンド単独の検証には使えません。

### エージェントの後付け

```bash
ptcli add-agent --agent claude-code
ptcli add-agent --agent codex --force   # 既存スキルを上書き（バックアップあり）
```

既存スキルは内容が同じならスキップし、異なる場合は `--force` がない限り上書きしません。上書き時は `.ptcli/backup/<timestamp>/` に退避します。

### 検証

```bash
ptcli doctor
```

manifest、アプリのパス、スキル、`demo/`、`.git` を検査します。エラーがあれば終了コード1を返します。

## テンプレートの解決順

`new`、`add-agent`、`add-doc` は次の順でテンプレートを探します。

1. `--template <path>`
2. 環境変数 `PTCLI_TEMPLATE`
3. 同梱の `assets/template`

## manifest

```json
{
  "templateVersion": "2.0.0",
  "apps": [{ "name": "main", "path": "projects/main" }],
  "agent": "opencode",
  "agentDir": ".opencode",
  "docPreview": false,
  "createdAt": "2026-11-21T00:00:00.000Z"
}
```

## 開発

```bash
npm test
node bin/ptcli.js --help
```

`npm test` は、npmパッケージを一時ディレクトリに展開した状態での新規作成・AI設定追加も検証します。外部リモートへの接続は不要です。

## 変更する場所と確認方法

| 変更内容 | 編集先 | 確認方法 |
|----------|--------|----------|
| CLIのコマンド・処理 | `src/`、`bin/` | 対応する `test/` のテストと `npm test` で確認します |
| 配布する文書・スキル | `assets/template/doc/`、`assets/template/skills/` | 生成物を確認し、`npm test` でパッケージ単独での動作も確認します |
| 利用手順・対応状況 | この `README.md` | コマンド名、オプション、実装状況をコードと照合します |

`assets/template/` の変更は新しく生成するプロジェクトに反映されます。既存の生成済みプロジェクトへ自動同期はしません。`add-agent --force` はスキルの更新に使えますが、文書全体を同期する `update-doc` は未実装です。

旧 `project-template/` へのコピーや同期は不要です。テンプレートとCLIの変更を同じリポジトリで管理します。

## 未対応

- `migrate`（既存プロジェクトのv2移行）
- `update-doc`（docテンプレートの同期）
- `backup`（アーカイブ退避）
- npmへの公開（パッケージ名の利用可否、公開先・公開範囲は未確定）
