export type Language = "ja" | "en" | "ko";

export const translations = {
  // Sidebar
  "nav.home": { ja: "ホーム", en: "Home", ko: "홈" },
  "nav.search": { ja: "検索", en: "Search", ko: "검색" },
  "nav.liked": { ja: "お気に入り", en: "Liked Songs", ko: "좋아요" },
  "nav.history": { ja: "再生履歴", en: "History", ko: "재생기록" },
  "nav.lyrics": { ja: "歌詞", en: "Lyrics", ko: "가사" },
  "nav.settings": { ja: "設定", en: "Settings", ko: "설정" },
  "nav.menu": { ja: "メニュー", en: "MENU", ko: "메뉴" },
  "nav.logout": { ja: "ログアウト", en: "Logout", ko: "로그아웃" },

  // Provider labels
  "user.default": { ja: "ユーザー", en: "User", ko: "사용자" },

  // Player
  "player.noTrack": {
    ja: "再生中の曲なし",
    en: "No track playing",
    ko: "재생 중인 곡 없음",
  },
  "player.skipFailed": {
    ja: "の再生に失敗しました",
    en: "playback failed",
    ko: "재생에 실패했습니다",
  },
  "player.skipMessage": {
    ja: "をスキップしました — 音声を取得できません",
    en: "skipped — could not get audio",
    ko: "건너뜀 — 오디오를 가져올 수 없음",
  },
  "player.ytdlpUnavailable": {
    ja: "yt-dlp が利用できません。インストールしてください。",
    en: "yt-dlp is not available. Please install it.",
    ko: "yt-dlp를 사용할 수 없습니다. 설치해 주세요.",
  },
  "player.premiumOnly": {
    ja: "Music Premium 限定の曲です",
    en: "Music Premium members only",
    ko: "Music Premium 전용 곡입니다",
  },
  "player.cookieLock": {
    ja: "ブラウザを閉じてから再試行するか、Settings で cookies.txt を使ってください",
    en: "Close your browser and retry, or use cookies.txt (see Settings)",
    ko: "브라우저를 닫고 다시 시도하거나 cookies.txt를 사용하세요 (설정 참조)",
  },
  "player.free": {
    ja: "Free",
    en: "Free",
    ko: "Free",
  },
  "player.premium": {
    ja: "Premium",
    en: "Premium",
    ko: "Premium",
  },

  // Home
  "home.title": { ja: "ホーム", en: "Home", ko: "홈" },
  "home.subtitle": {
    ja: "あなたにおすすめの音楽",
    en: "Music recommended for you",
    ko: "당신을 위한 추천 음악",
  },
  "home.trending": {
    ja: "人気の音楽 Top 50（日本）",
    en: "Trending Music Top 50 (Japan)",
    ko: "인기 음악 Top 50 (일본)",
  },
  "home.yourPlaylists": {
    ja: "あなたのプレイリスト",
    en: "Your Playlists",
    ko: "내 플레이리스트",
  },
  "home.newReleases": {
    ja: "新着リリース",
    en: "New Releases",
    ko: "최신 발매",
  },
  "home.featuredPlaylists": {
    ja: "注目のプレイリスト",
    en: "Featured Playlists",
    ko: "주목 플레이리스트",
  },
  "home.recentlyPlayed": {
    ja: "最近再生した曲",
    en: "Recently Played",
    ko: "최근 재생한 곡",
  },
  "home.noPlaylistTracks": {
    ja: "プレイリストにトラックがありません",
    en: "No tracks in playlist",
    ko: "플레이리스트에 트랙이 없습니다",
  },
  "home.fetchError": {
    ja: "データの取得に失敗しました。ネットワーク接続を確認してください。",
    en: "Failed to fetch data. Check your network connection.",
    ko: "데이터를 가져오지 못했습니다. 네트워크 연결을 확인하세요.",
  },

  "home.unexpectedError": {
    ja: "予期しないエラーが発生しました。",
    en: "An unexpected error occurred.",
    ko: "예기치 않은 오류가 발생했습니다.",
  },
  "home.retry": { ja: "再試行", en: "Retry", ko: "재시도" },
  "home.songs": { ja: "曲", en: "songs", ko: "곡" },
  "home.quickPicks": {
    ja: "クイックピック",
    en: "Quick Picks",
    ko: "빠른 선곡",
  },
  "home.listenAgain": {
    ja: "もう一度聴く",
    en: "Listen Again",
    ko: "다시 듣기",
  },
  "home.subscriptions": {
    ja: "登録チャンネル",
    en: "Your Subscriptions",
    ko: "구독 채널",
  },
  "home.viewAll": {
    ja: "すべて表示",
    en: "View all",
    ko: "모두 보기",
  },

  // Search
  "search.title": { ja: "検索", en: "Search", ko: "검색" },
  "search.placeholder": {
    ja: "曲、動画、ポッドキャスト、アーティストを検索...",
    en: "Search songs, videos, podcasts, artists...",
    ko: "곡, 동영상, 팟캐스트, 아티스트 검색...",
  },
  "search.button": { ja: "検索", en: "Search", ko: "검색" },
  "search.noResults": {
    ja: "検索結果がありません",
    en: "No results found",
    ko: "검색 결과가 없습니다",
  },
  "search.tryOther": {
    ja: "別のキーワードをお試しください",
    en: "Try a different keyword",
    ko: "다른 키워드를 시도해 보세요",
  },
  "search.prompt": {
    ja: "曲、動画、ポッドキャスト、アーティストを検索",
    en: "Search songs, videos, podcasts, artists",
    ko: "곡, 동영상, 팟캐스트, 아티스트 검색",
  },
  "search.playingUrl": {
    ja: "YouTubeリンクから再生中...",
    en: "Playing from YouTube link...",
    ko: "YouTube 링크에서 재생 중...",
  },
  "search.urlFailed": {
    ja: "このYouTubeリンクを再生できませんでした。URLを確認してください。",
    en: "Could not play this YouTube link. Please check the URL.",
    ko: "이 YouTube 링크를 재생할 수 없습니다. URL을 확인해 주세요.",
  },
  "search.urlHint": {
    ja: "YouTubeのリンクを貼り付けて直接再生もできます",
    en: "You can also paste a YouTube link to play directly",
    ko: "YouTube 링크를 붙여넣어 바로 재생할 수도 있습니다",
  },
  "search.filterAll": { ja: "すべて", en: "All", ko: "전체" },
  "search.filterSongs": { ja: "曲", en: "Songs", ko: "곡" },
  "search.filterVideos": { ja: "動画", en: "Videos", ko: "동영상" },
  "search.filterAlbums": { ja: "アルバム", en: "Albums", ko: "앨범" },
  "search.filterArtists": { ja: "アーティスト", en: "Artists", ko: "아티스트" },
  "search.filterPlaylists": {
    ja: "プレイリスト",
    en: "Playlists",
    ko: "재생목록",
  },

  // Liked Songs
  "liked.title": { ja: "お気に入り", en: "Liked Songs", ko: "좋아요" },
  "liked.empty": {
    ja: "お気に入りの曲がありません",
    en: "No liked songs",
    ko: "좋아요한 곡이 없습니다",
  },
  "liked.emptyHint": {
    ja: "曲の♥をタップしてお気に入りに追加",
    en: "Tap ♥ on a song to add to liked",
    ko: "곡의 ♥를 눌러 좋아요에 추가",
  },
  "liked.loadMore": { ja: "もっと読み込む", en: "Load More", ko: "더 보기" },
  "liked.loading": { ja: "読み込み中...", en: "Loading...", ko: "로딩 중..." },

  // History
  "history.title": { ja: "再生履歴", en: "History", ko: "재생기록" },
  "history.subtitle": {
    ja: "最近再生した曲（最大50曲）",
    en: "Recently played songs (up to 50)",
    ko: "최근 재생한 곡 (최대 50곡)",
  },
  "history.empty": {
    ja: "再生履歴がありません",
    en: "No play history",
    ko: "재생기록이 없습니다",
  },
  "history.emptyYt": {
    ja: "まだ再生履歴がありません",
    en: "No play history yet",
    ko: "아직 재생기록이 없습니다",
  },
  "history.emptyHint": {
    ja: "曲を再生すると履歴に記録されます",
    en: "Songs will appear here after you play them",
    ko: "곡을 재생하면 기록됩니다",
  },

  // Lyrics
  "lyrics.title": { ja: "歌詞", en: "Lyrics", ko: "가사" },
  "lyrics.divider": { ja: "♪ 歌詞 ♪", en: "♪ Lyrics ♪", ko: "♪ 가사 ♪" },
  "lyrics.unavailable": {
    ja: "歌詞データを直接取得できません。\n以下のリンクから歌詞を検索できます。",
    en: "Lyrics are not directly available.\nYou can search for lyrics using the links below.",
    ko: "가사 데이터를 직접 가져올 수 없습니다.\n아래 링크에서 가사를 검색할 수 있습니다.",
  },
  "lyrics.searchGoogle": {
    ja: "Googleで歌詞を検索",
    en: "Search lyrics on Google",
    ko: "Google에서 가사 검색",
  },
  "lyrics.searchUtanet": {
    ja: "歌ネットで検索",
    en: "Search on Uta-Net",
    ko: "우타넷에서 검색",
  },
  "lyrics.noTrack": {
    ja: "再生中の曲がありません",
    en: "No track playing",
    ko: "재생 중인 곡이 없습니다",
  },
  "lyrics.noTrackHint": {
    ja: "曲を再生すると歌詞が表示されます",
    en: "Lyrics will show when a song is playing",
    ko: "곡을 재생하면 가사가 표시됩니다",
  },
  "lyrics.searchSuffix": { ja: "歌詞", en: "lyrics", ko: "가사" },

  // Artist
  "artist.back": { ja: "戻る", en: "Back", ko: "뒤로" },
  "artist.noArtist": {
    ja: "アーティストが選択されていません",
    en: "No artist selected",
    ko: "아티스트가 선택되지 않았습니다",
  },
  "artist.popularSongs": { ja: "人気の曲", en: "Popular Songs", ko: "인기곡" },
  "artist.noVideos": {
    ja: "動画が見つかりませんでした",
    en: "No videos found",
    ko: "동영상을 찾을 수 없습니다",
  },

  // Playlist
  "playlist.back": { ja: "戻る", en: "Back", ko: "뒤로" },
  "playlist.noPlaylist": {
    ja: "プレイリストが選択されていません",
    en: "No playlist selected",
    ko: "플레이리스트가 선택되지 않았습니다",
  },
  "playlist.songs": { ja: "曲一覧", en: "Songs", ko: "곡 목록" },
  "playlist.trackCount": { ja: "曲", en: "tracks", ko: "곡" },
  "playlist.empty": {
    ja: "プレイリストにトラックがありません",
    en: "No tracks in this playlist",
    ko: "플레이리스트에 트랙이 없습니다",
  },

  // Track list
  "trackList.no": { ja: "No", en: "No", ko: "No" },
  "trackList.title": { ja: "曲名", en: "Title", ko: "곡명" },
  "trackList.time": { ja: "時間", en: "Time", ko: "시간" },
  "trackList.artist": { ja: "アーティスト", en: "Artist", ko: "아티스트" },
  "trackList.album": { ja: "アルバム", en: "Album", ko: "앨범" },
  "trackList.playlist": {
    ja: "プレイリスト",
    en: "Playlist",
    ko: "플레이리스트",
  },
  "trackList.actions": { ja: "操作", en: "Actions", ko: "관리" },
  "trackList.unknown": { ja: "不明な曲", en: "Unknown", ko: "알 수 없는 곡" },

  // Login
  "login.description": {
    ja: "お好みのサービスでログインして\n音楽をお楽しみください",
    en: "Log in with your preferred service\nand enjoy the music",
    ko: "원하는 서비스로 로그인하여\n음악을 즐기세요",
  },
  "login.youtube": {
    ja: "YouTubeでログイン",
    en: "Login with YouTube",
    ko: "YouTube로 로그인",
  },
  "login.loggingIn": {
    ja: "ログイン中...",
    en: "Logging in...",
    ko: "로그인 중...",
  },

  // Settings
  "settings.title": { ja: "設定", en: "Settings", ko: "설정" },
  "settings.language": {
    ja: "言語 / Language",
    en: "Language",
    ko: "언어 / Language",
  },
  "settings.compactMode": {
    ja: "コンパクトモード",
    en: "Compact Mode",
    ko: "컴팩트 모드",
  },
  "settings.compactDesc": {
    ja: "プレーヤーと再生リストのみ表示",
    en: "Show only player and track list",
    ko: "플레이어와 재생목록만 표시",
  },
  "settings.appearance": { ja: "外観", en: "Appearance", ko: "외관" },
  "settings.cookieBrowser": {
    ja: "YouTube Premium 連携",
    en: "YouTube Premium",
    ko: "YouTube Premium 연동",
  },
  "settings.cookieBrowserDesc": {
    ja: "Music Premium アカウントでログイン中のブラウザを選択すると、Premium限定曲を再生できます。ブラウザを閉じた状態で使用してください。",
    en: "Select the browser where you're logged into Music Premium. The browser must be closed for this to work on Windows.",
    ko: "Music Premium에 로그인된 브라우저를 선택하세요. Windows에서는 브라우저를 닫은 상태에서 사용해야 합니다.",
  },
  "settings.browserNone": {
    ja: "なし（Free）",
    en: "None (Free)",
    ko: "없음 (Free)",
  },
  "settings.cookiesFileRecommended": {
    ja: "方法1: cookies.txt を使う（推奨）",
    en: "Method 1: Use cookies.txt (Recommended)",
    ko: "방법 1: cookies.txt 사용 (권장)",
  },
  "settings.cookiesFileHowTo": {
    ja: "① Chromeで music.youtube.com にログイン → ② 拡張機能「Get cookies.txt LOCALLY」でcookiesをエクスポート → ③ 下記フォルダに cookies.txt を配置 → ④ アプリを再起動",
    en: '① Log in to music.youtube.com in Chrome → ② Export cookies with "Get cookies.txt LOCALLY" extension → ③ Place cookies.txt in the folder below → ④ Restart app',
    ko: '① Chrome에서 music.youtube.com 로그인 → ② "Get cookies.txt LOCALLY" 확장으로 쿠키 내보내기 → ③ 아래 폴더에 cookies.txt 배치 → ④ 앱 재시작',
  },
  "settings.cookiesFileLabel": {
    ja: "または cookies.txt を使う（ブラウザを開いたままでもOK）",
    en: "Or use cookies.txt (works with browser open)",
    ko: "또는 cookies.txt 사용 (브라우저가 열려 있어도 가능)",
  },
  "settings.cookiesFileFound": {
    ja: "✓ cookies.txt 検出済み — Premium モードで使用中",
    en: "✓ cookies.txt found — using Premium mode",
    ko: "✓ cookies.txt 감지됨 — Premium 모드 사용 중",
  },
  "settings.cookiesFileNotFound": {
    ja: "cookies.txt が見つかりません。以下のフォルダに配置してください：",
    en: "cookies.txt not found. Place it in:",
    ko: "cookies.txt를 찾을 수 없습니다. 다음 폴더에 배치하세요:",
  },
  "settings.browserMethod": {
    ja: "方法2: ブラウザから直接読み取る",
    en: "Method 2: Read from browser directly",
    ko: "방법 2: 브라우저에서 직접 읽기",
  },
  "settings.browserMethodDesc": {
    ja: "Windowsでは Chrome/Edge を完全に閉じてから使用してください。Firefox は閉じなくてもOKです。",
    en: "On Windows, fully close Chrome/Edge before use. Firefox works without closing.",
    ko: "Windows에서는 Chrome/Edge를 완전히 닫은 후 사용하세요. Firefox는 닫지 않아도 됩니다.",
  },

  // Compact mode
  "compact.currentPlaylist": {
    ja: "現在の再生リスト",
    en: "Now Playing",
    ko: "현재재생목록",
  },
  "compact.queue": { ja: "キュー", en: "Queue", ko: "대기열" },
  "compact.search": { ja: "検索", en: "Search", ko: "검색" },
  "compact.searchPlaceholder": {
    ja: "曲名を検索...",
    en: "Search songs...",
    ko: "곡 검색...",
  },
  "compact.added": { ja: "追加しました", en: "Added", ko: "추가됨" },
  "compact.removed": { ja: "削除しました", en: "Removed", ko: "삭제됨" },
  "compact.noResults": {
    ja: "結果がありません",
    en: "No results",
    ko: "결과 없음",
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] ?? translations[key]?.["en"] ?? key;
}
