# トラブルシューティングガイド

拡張機能の動作問題を診断・解決するためのガイドです。

## 🔍 問題診断の手順

### ステップ 1: ブラウザの開発者ツールでログを確認

1. **YouTubeの「後で見る」ページを開く**
   ```
   https://www.youtube.com/playlist?list=WL
   ```

2. **開発者ツールを開く**
   - `F12` キーを押す
   - または右クリック → 「検証」

3. **Consoleタブを選択**

4. **拡張機能のログを確認**
   - 以下のようなログが表示されるはずです：
   ```
   🚀 Popup initialization started
   ⏳ Waiting for YouTube page to load...
   🔍 Check attempt 1/20
   ✅ Found page element with selector: ytd-browse[page-subtype="playlist"]
   ✅ YouTube page loaded successfully
   🎨 Creating bulk delete UI...
   📍 Finding insertion point for UI...
   ✅ Inserting UI After playlist header
   ✅ UI inserted successfully
   ```

5. **エラーメッセージをチェック**
   - ❌ で始まるエラーログがないか確認

### ステップ 2: 拡張機能のポップアップをテスト

1. **拡張機能アイコンをクリック**

2. **開発者ツールでポップアップのログを確認**
   ```
   🚀 Popup initialization started
   ✅ i18n initialized
   ✅ Current tab: https://www.youtube.com/playlist?list=WL
   ✅ Watch Later page check: true
   📊 Loading statistics...
   ✅ Statistics loaded: {totalDeleted: 0, daysSinceInstall: 0}
   📺 Loading YouTube page status...
   ✅ YouTube status loaded: {isEnabled: false, selectedCount: 0, totalVideos: 5}
   ✅ Data loaded
   ✅ Event listeners set up
   ✅ Popup initialization completed
   ```

## 🚨 よくある問題と解決方法

### 問題 1: ポップアップが「読み込み中」のまま

**原因**: Content scriptとの通信エラー

**解決方法**:
1. ページをリロード（F5）
2. 拡張機能を再読み込み：
   - `brave://extensions/` を開く
   - 拡張機能の「🔄」ボタンをクリック
3. Braveを再起動

**診断コマンド**:
```javascript
// Console で実行
chrome.runtime.sendMessage({type: 'GET_STATISTICS'}, console.log);
```

### 問題 2: YouTubeページに「一括削除モード」UIが表示されない

**原因**: Content scriptの注入エラーまたはDOM構造の変更

**解決方法**:
1. **URLを確認**
   - 正確に `https://www.youtube.com/playlist?list=WL` か確認

2. **ページの完全な読み込みを待つ**
   - 10秒ほど待ってからテスト

3. **他の拡張機能を無効化**
   - YouTube関連の拡張機能を一時的に無効化

4. **Shieldsを無効化**（Brave固有）
   - Shieldsアイコンをクリック → 無効化

**診断コマンド**:
```javascript
// Console で実行
console.log('Video elements found:', document.querySelectorAll('ytd-playlist-video-renderer').length);
console.log('UI exists:', !!document.getElementById('bulk-delete-ui'));
```

### 問題 3: チェックボックスが表示されない

**原因**: 動画要素の検出エラー

**解決方法**:
1. **「一括削除モード」をオフ・オンする**
2. **ページをリロード**
3. **動画が実際に存在するか確認**

**診断コマンド**:
```javascript
// Console で実行
console.log('Available selectors for videos:');
['ytd-playlist-video-renderer', 'ytd-playlist-panel-video-renderer', '[id*="video-"]'].forEach(sel => {
  const count = document.querySelectorAll(sel).length;
  console.log(`${sel}: ${count} elements`);
});
```

### 問題 4: 削除が動作しない

**原因**: メニューボタンの検出エラーまたは権限問題

**解決方法**:
1. **YouTubeにログインしているか確認**
2. **「後で見る」に動画があるか確認**
3. **手動で1つの動画を削除できるか確認**

**診断コマンド**:
```javascript
// Console で実行
const video = document.querySelector('ytd-playlist-video-renderer');
if (video) {
  const menuBtn = video.querySelector('button[aria-label*="その他"], button[aria-label*="More"]');
  console.log('Menu button found:', !!menuBtn);
  if (menuBtn) menuBtn.click();
}
```

## 🔧 高度なトラブルシューティング

### Chrome Extension APIのテスト

```javascript
// Console で実行（Background scriptの状態確認）
chrome.runtime.sendMessage({type: 'GET_STATISTICS'}, (response) => {
  console.log('Background response:', response);
});

// Storage の確認
chrome.storage.local.get(null, console.log);
```

### Content Script の手動テスト

```javascript
// Console で実行（YouTube ページで）
// 手動でContent scriptを初期化
if (!window.watchLaterManager) {
  window.watchLaterManager = new WatchLaterBulkDelete();
}
```

### 権限の確認

1. **拡張機能ページを開く**
   ```
   brave://extensions/
   ```

2. **拡張機能の「詳細」をクリック**

3. **権限を確認**
   - 「サイトアクセス」が「youtube.com」で有効になっているか
   - 「ストレージ」権限があるか

## 📞 それでも解決しない場合

### ログファイルの作成

1. **Console の内容をコピー**
2. **以下の情報と一緒に報告**:
   - Brave のバージョン
   - 拡張機能のバージョン
   - 操作システム
   - 発生している具体的な問題
   - エラーメッセージ

### デバッグモードの有効化

Console で以下を実行して詳細ログを有効化：

```javascript
// より詳細なログを出力
console.log('=== DEBUG INFO ===');
console.log('URL:', location.href);
console.log('Page title:', document.title);
console.log('Extension manifest:', chrome.runtime.getManifest());
console.log('DOM ready state:', document.readyState);
console.log('Available YouTube elements:');
['ytd-browse', 'ytd-playlist-header-renderer', 'ytd-playlist-video-renderer'].forEach(sel => {
  console.log(`${sel}:`, document.querySelectorAll(sel).length);
});
```

## 🎯 動作確認チェックリスト

- [ ] Brave Browser で `brave://extensions/` を開ける
- [ ] 拡張機能が「有効」状態になっている
- [ ] YouTubeの「後で見る」ページにアクセスできる
- [ ] ページに動画が表示されている
- [ ] Console にエラーメッセージが表示されていない
- [ ] 拡張機能のポップアップが開く
- [ ] ページ上部に「一括削除モード」のUIが表示される
- [ ] 「一括削除モード」をオンにするとチェックボックスが表示される

---

**注意**: これらの診断コマンドは安全ですが、不明な場合は実行しないでください。