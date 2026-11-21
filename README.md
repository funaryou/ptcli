# ptcli

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

## コマンド

```bash
ptcli new            # 対話式でプロジェクトを作成
ptcli doctor [dir]   # 構造とmanifestを検証
ptcli add-agent      # AIエージェント設定を後付け
ptcli restore <url>  # Gitリモートから復元
ptcli restore-doc    # originからdoc/RESTORE.mdを更新
```

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

`new` と `add-agent` は次の順でテンプレートを探します。

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

## 未対応

- `migrate`（既存プロジェクトのv2移行）
- `update-doc`（docテンプレートの同期）
- `backup`（アーカイブ退避）
- npmへの公開（パッケージ名の利用可否、公開先・公開範囲は未確定）
