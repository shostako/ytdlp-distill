# プロジェクト進捗状況

## 現在の状態
- **最終更新**: 2026-03-29 09:00
- **バージョン**: v1.0.1（GitHub Release済み、インストーラーアップロード済み）
- **Codex評価**: Good（High/Medium全件対応、Low 2件残り）

## 完了済み

### v1.0.0 (2026-03-28)
- [x] Electron Forge + Vite + TypeScript スキャフォールディング
- [x] React 19 + Tailwind CSS 3 + Zustand セットアップ
- [x] バックエンド: yt-dlpプロセス管理、進捗パース、AAC強制フォーマット
- [x] バックエンド: バイナリ検出（PATH、Downloads、AppData）
- [x] バックエンド: 設定永続化（electron-store）
- [x] バックエンド: IPC全チャネル
- [x] フロントエンド: URL入力、動画カード、解像度ピッカー、DLリスト、設定パネル
- [x] フロントエンド: バイナリ不在時のFirst-Timeセットアップ画面
- [x] 右クリックコンテキストメニュー
- [x] Windows Squirrelインストーラー
- [x] GitHub Public リポ + README + LICENSE

### v1.0.1 (2026-03-29)
- [x] SHA256検証（yt-dlp/ffmpeg/deno DL後に公式チェックサム照合）
- [x] DL状態遷移バグ修正（duplicate→complete、cancel→error の上書き防止）
- [x] URL変更時のメタデータ再取得（fetchIdRefで競合防止）
- [x] IPC入力バリデーション（設定キーallowlist + 型/範囲チェック）
- [x] パスアクセス制限（DLフォルダ配下のみ、symlink traversal防止）
- [x] TOCTOU修正（同時DL枠の予約を先行）
- [x] stderrエラー詳細保持
- [x] セットアップフロー分離（検索のみ / 検索+DL）
- [x] 同時DL数制限（maxConcurrentDownloads）
- [x] 共有型定義（src/shared/types.ts）
- [x] GUI: メニューバー非表示、歯車アイコン、DLボタン青、コンパクトウィンドウ
- [x] URL正規表現修正（youtube.com/watch?v= 対応）
- [x] CHANGELOG.md作成
- [x] v1.0.1 Release + インストーラーアップロード

## 未対応（Low優先度）
- [ ] 型定義の重複解消（ytdlp.ts/VideoCard.tsxが独自定義を持ってる → shared/types.tsに統一）
- [ ] ESLint/tsc互換性（TS 4.5設定でsatisfies構文エラー → TypeScript更新が必要）
- [ ] Mac/Linux対応（意図的スキップ。必要になったら）

## 次セッションでの候補
- Low 2件の解消
- TypeScriptバージョン更新（4.5 → 5.x）
- アプリアイコンのカスタマイズ（現在Electronデフォルト）
- アップデート通知機能（yt-dlp/ffmpegの新バージョン検知）
