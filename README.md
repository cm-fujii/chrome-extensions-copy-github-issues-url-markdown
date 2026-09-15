# chrome-extensions-copy-github-issues-url-markdown

GitHub の Issue / Pull Request のタイトルと URL を Markdown リンク形式でクリップボードにコピーする Chrome 拡張機能。

## 機能

以下の画面にコピーボタン（アイコン）を追加する。クリックすると Markdown リンクがクリップボードにコピーされる。

- Issue 詳細ページ（`https://github.com/{owner}/{repo}/issues/{number}`）
- Pull Request 詳細ページ（`https://github.com/{owner}/{repo}/pull/{number}`）
- Issues / Pull Requests 一覧ページの各行
- GitHub Projects のサイドパネル / フルスクリーン表示
  - ブラウザの URL が Projects の URL のままでも、**Issue 本来の URL** をコピーする

## Markdown 形式

拡張機能のオプション画面で 3 種類から選択できる（`chrome.storage.sync` に保存され、即座に反映される）。

| 形式 | 例 |
| --- | --- |
| `[issues title #123](url)` （デフォルト） | `[Fix login bug #123](https://github.com/owner/repo/issues/123)` |
| `[issues title](url)` | `[Fix login bug](https://github.com/owner/repo/issues/123)` |
| `[#123](url)` | `[#123](https://github.com/owner/repo/issues/123)` |

タイトル内の `[` `]` `\` は自動でエスケープされる。

### 種別ラベル（Issue / PR）

リンクテキストだけでは Issue か PR か区別できないため、種別ラベルを含める設定を選択できる（デフォルト: 含めない）。

| 設定 | 例 |
| --- | --- |
| None（デフォルト） | `[Fix login bug #123](url)` |
| Prefix | `[Issue: Fix login bug #123](url)` / `[PR: Fix login bug #45](url)` |
| Suffix | `[Fix login bug #123 (Issue)](url)` / `[Fix login bug #45 (PR)](url)` |

種別は URL（`/issues/` か `/pull/` か）から判定される。

## インストール

1. `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON にする
3. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリのルートディレクトリを選択する

## 既知の制限

- 対応ホストは `github.com` のみ（GitHub Enterprise Server 非対応）
- GitHub Projects の Draft item（Issue 化されていないカード）にはボタンが表示されない
- GitHub 側の DOM 構造変更によりボタンが表示されなくなる可能性がある（セレクタは `content/content.js` 冒頭の `SELECTORS` に集約している）

## 開発メモ

- Manifest V3 + Vanilla JS（ビルド工程なし）
- アイコン PNG の再生成: `cd icons && for s in 16 32 48 128; do magick -background none -size ${s}x${s} icon.svg icon$s.png; done`
