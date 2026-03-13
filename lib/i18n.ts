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
  "provider.spotifyPremium": {
    ja: "Spotify プレミアム",
    en: "Spotify Premium",
    ko: "Spotify 프리미엄",
  },
  "provider.spotifyFree": {
    ja: "Spotify フリー",
    en: "Spotify Free",
    ko: "Spotify 프리",
  },
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
    ja: "データの取得に失敗しました。YouTube APIキーやネットワークを確認してください。",
    en: "Failed to fetch data. Check YouTube API key or network.",
    ko: "데이터를 가져오지 못했습니다. YouTube API 키 또는 네트워크를 확인하세요.",
  },
  "home.spotifyFetchError": {
    ja: "データの取得に失敗しました。ネットワークを確認してください。",
    en: "Failed to fetch data. Check your network.",
    ko: "데이터를 가져오지 못했습니다. 네트워크를 확인하세요.",
  },
  "home.unexpectedError": {
    ja: "予期しないエラーが発生しました。",
    en: "An unexpected error occurred.",
    ko: "예기치 않은 오류가 발생했습니다.",
  },
  "home.retry": { ja: "再試行", en: "Retry", ko: "재시도" },
  "home.songs": { ja: "曲", en: "songs", ko: "곡" },

  // Search
  "search.title": { ja: "楽曲検索", en: "Search", ko: "검색" },
  "search.placeholder": {
    ja: "曲名、アーティスト名を入力...",
    en: "Search songs, artists...",
    ko: "곡명, 아티스트명 입력...",
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
    ja: "曲名やアーティスト名で検索",
    en: "Search by song or artist name",
    ko: "곡명이나 아티스트명으로 검색",
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
    ja: "Spotify Web APIでは歌詞データを直接取得できません。\n以下のリンクから歌詞を検索できます。",
    en: "Lyrics are not directly available via Spotify Web API.\nYou can search for lyrics using the links below.",
    ko: "Spotify Web API에서는 가사 데이터를 직접 가져올 수 없습니다.\n아래 링크에서 가사를 검색할 수 있습니다.",
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

  // Track list
  "trackList.no": { ja: "No", en: "No", ko: "No" },
  "trackList.title": { ja: "曲名", en: "Title", ko: "곡명" },
  "trackList.time": { ja: "時間", en: "Time", ko: "시간" },
  "trackList.artist": { ja: "アーティスト", en: "Artist", ko: "아티스트" },
  "trackList.album": { ja: "アルバム", en: "Album", ko: "앨범" },
  "trackList.actions": { ja: "操作", en: "Actions", ko: "관리" },
  "trackList.unknown": { ja: "不明な曲", en: "Unknown", ko: "알 수 없는 곡" },

  // Login
  "login.description": {
    ja: "お好みのサービスでログインして\n音楽をお楽しみください",
    en: "Log in with your preferred service\nand enjoy the music",
    ko: "원하는 서비스로 로그인하여\n음악을 즐기세요",
  },
  "login.spotify": {
    ja: "Spotifyでログイン",
    en: "Login with Spotify",
    ko: "Spotify로 로그인",
  },
  "login.or": { ja: "または", en: "or", ko: "또는" },
  "login.youtube": {
    ja: "YouTubeでログイン",
    en: "Login with YouTube",
    ko: "YouTube로 로그인",
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
