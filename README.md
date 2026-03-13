# 楽 Raku Player

Spotify / YouTube に対応した音楽ストリーミングデスクトップアプリケーション。  
Next.js + Electron で構築。Melon風のUIデザイン。

## セットアップ

### 1-A. Spotify Developer アカウント設定

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) にアクセス
2. 新しいアプリを作成
3. Redirect URI に `http://127.0.0.1:3000/callback` を追加
4. Client ID をメモ

### 1-B. Google / YouTube 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **YouTube Data API v3** を有効化
3. OAuth 2.0 クライアント ID を作成（種類: ウェブアプリケーション）
4. 承認済みリダイレクト URI に `http://127.0.0.1:3000/callback` を追加
5. API キー も作成
6. Client ID と API キーをメモ

### 2. 環境変数設定

`.env.local` ファイルをプロジェクトルートに作成（`.env.local.example` を参照）:

```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=あなたのSpotify_Client_ID
NEXT_PUBLIC_REDIRECT_URI=http://127.0.0.1:3000/callback

NEXT_PUBLIC_GOOGLE_CLIENT_ID=あなたのGoogle_Client_ID
NEXT_PUBLIC_YOUTUBE_API_KEY=あなたのYouTube_API_Key
```

### 3. インストール & 起動

```bash
npm install
npm run dev
```

## 機能

- 🔐 Spotify / YouTube ログイン (OAuth 2.0 PKCE)
- 🔍 楽曲検索
- 📋 楽曲リスト
- 🎵 プレーヤー（Spotify Connect / YouTube IFrame）
- 📝 歌詞表示
- 📜 再生履歴（Spotify のみ）
- ❤️ お気に入り楽曲

## 技術スタック

- **フロントエンド:** Next.js 14 + TypeScript + Tailwind CSS
- **デスクトップ:** Electron
- **API:** Spotify Web API / YouTube Data API v3
- **状態管理:** Zustand
- **UI言語:** 日本語
- **フォント:** M PLUS 1p / Kosugi Maru / MS PGothic（2000年代クラシック和フォント）
