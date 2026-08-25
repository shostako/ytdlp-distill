/**
 * 2言語・約80文言の辞書。ライブラリは使わない。
 * キーは型で縛る: 片方の言語に足し忘れると tsc で落ちる。
 */

export type Language = 'system' | 'en' | 'ja';
export type Locale = 'en' | 'ja';

export const LANGUAGES: Language[] = ['system', 'en', 'ja'];

/** 設定値とOSロケールから表示言語を決める */
export function resolveLocale(language: Language | undefined, systemLocale: string | undefined): Locale {
  if (language === 'ja' || language === 'en') return language;
  return (systemLocale || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

const en = {
  // App
  'app.settings': 'Settings',
  'app.download': 'Download',
  'app.noSaveLocation': 'No save location',
  'app.fetchFailed': 'Failed to fetch video info',
  'banner.updating': 'Updating yt-dlp {from} → {to}',
  'banner.updated': 'yt-dlp updated to {version}',
  'banner.outdated': 'yt-dlp {latest} available (installed: {current})',
  'banner.update': 'Update',
  'banner.updateFailed': 'yt-dlp update failed: {error}',
  'banner.dismiss': 'Dismiss',
  // UrlInput
  'url.placeholder': 'Paste a YouTube URL',
  'url.pasteButton': 'Paste from clipboard',
  // ResolutionPicker
  'res.best': 'Best',
  // DownloadList
  'dl.header': 'Downloads',
  'dl.clearCompleted': 'Clear completed',
  'dl.untitled': 'Untitled',
  'dl.cancel': 'Cancel download',
  'dl.showInFolder': 'Show in folder',
  'dl.eta': 'ETA {eta}',
  'dl.hint403': 'yt-dlp may be outdated — update it from Settings',
  'status.downloading': 'Downloading',
  'status.postprocess': 'Processing',
  'status.complete': 'Complete',
  'status.error': 'Error',
  'status.duplicate': 'Already downloaded',
  'status.cancelled': 'Cancelled',
  'status.pending': 'Pending',
  'status.fetching': 'Fetching...',
  // SettingsPanel
  'settings.title': 'Settings',
  'settings.close': 'Close',
  'settings.downloadLocation': 'Download Location',
  'settings.notSet': 'Not set',
  'settings.browse': 'Browse',
  'settings.defaultResolution': 'Default Resolution',
  'settings.language': 'Language',
  'lang.system': 'System',
  'lang.en': 'English',
  'lang.ja': '日本語',
  'settings.ytdlp': 'yt-dlp',
  'ytdlp.checking': 'Checking...',
  'ytdlp.updatingTo': 'Updating to {version}',
  'ytdlp.updatedTo': 'Updated to {version}',
  'ytdlp.latest': '{version} (latest)',
  'ytdlp.available': '{current} → {latest} available',
  'ytdlp.couldNotCheck': '{version} (could not check for updates)',
  'ytdlp.error': 'Error: {error}',
  'ytdlp.unknownVersion': 'unknown',
  'ytdlp.check': 'Check',
  'ytdlp.update': 'Update',
  'ytdlp.hint': 'Checked and updated automatically at startup. YouTube changes break old versions.',
  // BinaryMissing
  'setup.titleFirst': 'First-Time Setup',
  'setup.titleBusy': 'Setting Up...',
  'setup.titleDone': 'Setup Complete',
  'setup.descFirst': 'This app needs to download a few tools to work. This only takes a minute.',
  'setup.descBusy': 'Downloading required tools. This only happens once.',
  'setup.descDone': 'All tools are ready. Starting the app...',
  'setup.waiting': 'Waiting...',
  'setup.searching': 'Searching...',
  'setup.downloading': 'Downloading {percent}%',
  'setup.downloadingNoPct': 'Downloading...',
  'setup.verifying': 'Verifying SHA256...',
  'setup.extracting': 'Extracting...',
  'setup.ready': 'Verified & Ready',
  'setup.error': 'Error: {error}',
  'setup.unknown': 'Unknown',
  'setup.failed': 'Some downloads failed. Check your internet connection and try again.',
  'setup.settingUp': 'Setting up...',
  'setup.retry': 'Retry',
  'setup.start': 'Set Up Now',
  // Main-process error codes（main は E_xxx を投げ、レンダラがここで訳す）
  'err.E_YTDLP_NOT_FOUND': 'yt-dlp not found',
  'err.E_MAX_CONCURRENT': 'Maximum concurrent downloads ({param}) reached. Wait for one to finish.',
  'err.E_UPDATE_BUSY': 'Cannot update yt-dlp while downloads are running.',
  'err.E_ACCESS_DENIED': 'Access denied: path outside download directory',
  'err.E_OPEN_FOLDER': 'Failed to open folder',
  'err.E_YTDLP_IN_USE': 'yt-dlp.exe is in use. Wait for downloads to finish and try again.',
  'err.E_YTDLP_BROKEN': 'Downloaded yt-dlp does not run. Check antivirus or try again.',
  'err.E_SHA256_MISMATCH': 'SHA256 mismatch for {param}. File deleted.',
  // Context menu (main process)
  'menu.cut': 'Cut',
  'menu.copy': 'Copy',
  'menu.paste': 'Paste',
  'menu.selectAll': 'Select All',
};

export type MsgKey = keyof typeof en;

const ja: Record<MsgKey, string> = {
  'app.settings': '設定',
  'app.download': 'ダウンロード',
  'app.noSaveLocation': '保存先未設定',
  'app.fetchFailed': '動画情報を取得できませんでした',
  'banner.updating': 'yt-dlp を {from} → {to} に更新中',
  'banner.updated': 'yt-dlp を {version} に更新しました',
  'banner.outdated': 'yt-dlp {latest} が利用可能（現在 {current}）',
  'banner.update': '更新',
  'banner.updateFailed': 'yt-dlp の更新に失敗: {error}',
  'banner.dismiss': '閉じる',
  'url.placeholder': 'YouTube の URL を貼り付け',
  'url.pasteButton': 'クリップボードから貼り付け',
  'res.best': '最高',
  'dl.header': '履歴',
  'dl.clearCompleted': '完了分を消去',
  'dl.untitled': '無題',
  'dl.cancel': 'キャンセル',
  'dl.showInFolder': 'フォルダで表示',
  'dl.eta': '残り {eta}',
  'dl.hint403': 'yt-dlp が古い可能性があります。設定から更新してください',
  'status.downloading': 'ダウンロード中',
  'status.postprocess': '処理中',
  'status.complete': '完了',
  'status.error': 'エラー',
  'status.duplicate': 'ダウンロード済み',
  'status.cancelled': 'キャンセル',
  'status.pending': '待機中',
  'status.fetching': '取得中...',
  'settings.title': '設定',
  'settings.close': '閉じる',
  'settings.downloadLocation': '保存先',
  'settings.notSet': '未設定',
  'settings.browse': '参照',
  'settings.defaultResolution': '既定の解像度',
  'settings.language': '言語',
  'lang.system': 'システム設定に従う',
  'lang.en': 'English',
  'lang.ja': '日本語',
  'settings.ytdlp': 'yt-dlp',
  'ytdlp.checking': '確認中...',
  'ytdlp.updatingTo': '{version} に更新中',
  'ytdlp.updatedTo': '{version} に更新しました',
  'ytdlp.latest': '{version}（最新）',
  'ytdlp.available': '{current} → {latest} が利用可能',
  'ytdlp.couldNotCheck': '{version}（更新を確認できません）',
  'ytdlp.error': 'エラー: {error}',
  'ytdlp.unknownVersion': '不明',
  'ytdlp.check': '確認',
  'ytdlp.update': '更新',
  'ytdlp.hint': '起動時に自動で確認・更新します。YouTube の仕様変更で古い版は動かなくなります。',
  'setup.titleFirst': '初回セットアップ',
  'setup.titleBusy': 'セットアップ中...',
  'setup.titleDone': 'セットアップ完了',
  'setup.descFirst': '動作に必要なツールをダウンロードします。1分ほどで終わります。',
  'setup.descBusy': '必要なツールをダウンロード中です。初回のみ行われます。',
  'setup.descDone': '準備が整いました。アプリを起動します...',
  'setup.waiting': '待機中...',
  'setup.searching': '検索中...',
  'setup.downloading': 'ダウンロード中 {percent}%',
  'setup.downloadingNoPct': 'ダウンロード中...',
  'setup.verifying': '検証中 (SHA256)...',
  'setup.extracting': '展開中...',
  'setup.ready': '検証済み・準備完了',
  'setup.error': 'エラー: {error}',
  'setup.unknown': '不明',
  'setup.failed': '一部のダウンロードに失敗しました。ネットワーク接続を確認して再試行してください。',
  'setup.settingUp': 'セットアップ中...',
  'setup.retry': '再試行',
  'setup.start': 'セットアップ開始',
  'err.E_YTDLP_NOT_FOUND': 'yt-dlp が見つかりません',
  'err.E_MAX_CONCURRENT': '同時ダウンロード数の上限（{param}）に達しています。完了を待ってください。',
  'err.E_UPDATE_BUSY': 'ダウンロード中は yt-dlp を更新できません。',
  'err.E_ACCESS_DENIED': 'アクセス拒否: ダウンロードフォルダ外のパスです',
  'err.E_OPEN_FOLDER': 'フォルダを開けませんでした',
  'err.E_YTDLP_IN_USE': 'yt-dlp.exe が使用中です。ダウンロード完了後に再試行してください。',
  'err.E_YTDLP_BROKEN': 'ダウンロードした yt-dlp が起動できません。ウイルス対策ソフトを確認するか再試行してください。',
  'err.E_SHA256_MISMATCH': '{param} の SHA256 が一致しません。ファイルを削除しました。',
  'menu.cut': '切り取り',
  'menu.copy': 'コピー',
  'menu.paste': '貼り付け',
  'menu.selectAll': 'すべて選択',
};

const DICTS: Record<Locale, Record<MsgKey, string>> = { en, ja };

export type MsgParams = Record<string, string | number | null | undefined>;

export function translate(locale: Locale, key: MsgKey, params?: MsgParams): string {
  let text = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(v === null || v === undefined ? '' : String(v));
    }
  }
  return text;
}

/**
 * main プロセスのエラーコード。message は "E_CODE" または "E_CODE:param"（param は空白なし1トークン）。
 * IPC 経由だと Electron が "Error invoking remote method 'x': Error: E_CODE" と包むので、部分一致で拾う。
 */
export type ErrorCode =
  | 'E_YTDLP_NOT_FOUND' | 'E_MAX_CONCURRENT' | 'E_UPDATE_BUSY' | 'E_ACCESS_DENIED'
  | 'E_OPEN_FOLDER' | 'E_YTDLP_IN_USE' | 'E_YTDLP_BROKEN' | 'E_SHA256_MISMATCH';

export function errorCode(code: ErrorCode, param?: string | number): string {
  return param === undefined ? code : `${code}:${param}`;
}

const ERROR_CODE_RE = /\b(E_[A-Z0-9_]+)(?::(\S+))?/;

/** エラー文にコードが含まれていれば訳文、無ければ原文（yt-dlp の stderr 等はそのまま） */
export function translateError(locale: Locale, message: string | undefined | null): string {
  if (!message) return '';
  const m = message.match(ERROR_CODE_RE);
  if (!m) return message;
  const key = `err.${m[1]}` as MsgKey;
  if (!(key in en)) return message;
  return translate(locale, key, { param: m[2] ?? '' });
}
