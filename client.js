/**
 * dsh-neon-theme -- browser half.
 *
 * A Client plugin that paints three things:
 *   1. an animated backdrop drawn entirely in CSS (no image or video assets),
 *   2. a breathing neon frame around the window plus a glowing composer ring,
 *   3. a floating panel (bottom-right) with the skin catalog, categories,
 *      category auto-rotation and a time-of-day scheduler.
 *
 * All state lives in localStorage; every DOM write is undone when the plugin
 * unloads. The backdrop must live behind the AppFrame (which paints its own
 * opaque surface), so it is a body pseudo-element owned by a scoped stylesheet;
 * the frame and panel are a normal `shell.overlay` slot entry.
 */
window.__ModuleLoader__.load({
  id: 'dsh-neon-theme-ad',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-neon-theme'
    const STORAGE_KEY = 'dsh-neon-theme.settings.v1'
    const ATTR = 'data-dsh-neon'
    const ATTR_FRAME = 'data-dsh-neon-frame'
    const ATTR_SCAN = 'data-dsh-neon-scan'

    /* ------------------------------------------------------------------ *
     * Catalog
     * ------------------------------------------------------------------ */

    const CATEGORIES = [
      { id: 'cyber', zh: '赛博霓虹', en: 'Neon cyber' },
      { id: 'space', zh: '星海宇宙', en: 'Deep space' },
      { id: 'anime', zh: '二次元幻想', en: 'Anime dream' },
      { id: 'nature', zh: '自然流光', en: 'Nature flow' },
      { id: 'ember', zh: '熔火余烬', en: 'Ember' },
    ]

    const SKINS = [
      { id: 'cyber', cat: 'cyber', zh: '霓虹赛博', en: 'Neon cyber', a: '#22e6ff', b: '#ff2bd6' },
      { id: 'grid', cat: 'cyber', zh: '数据网格', en: 'Data grid', a: '#7c5cff', b: '#00ffc8' },
      { id: 'star', cat: 'space', zh: '深空星海', en: 'Starfield', a: '#9ec1ff', b: '#d0a6ff' },
      { id: 'nebula', cat: 'space', zh: '星云漩涡', en: 'Nebula', a: '#b06bff', b: '#59e0ff' },
      { id: 'sakura', cat: 'anime', zh: '樱花漫舞', en: 'Sakura', a: '#ff9ec7', b: '#b28bff' },
      { id: 'hanabi', cat: 'anime', zh: '夏夜花火', en: 'Fireworks', a: '#ffd166', b: '#ff5fa2' },
      { id: 'aurora', cat: 'nature', zh: '极光天幕', en: 'Aurora', a: '#3dffb0', b: '#66c8ff' },
      { id: 'dawn', cat: 'nature', zh: '晨曦微光', en: 'Sunrise', a: '#ffb27a', b: '#ffd9a0' },
      { id: 'ember', cat: 'ember', zh: '熔火余烬', en: 'Embers', a: '#ff7a3d', b: '#ffcf6b' },
      { id: 'crypt', cat: 'ember', zh: '熔岩裂隙', en: 'Magma', a: '#ff4d6d', b: '#ffa26b' },
    ]

    const SKIN_BY_ID = new Map(SKINS.map((s) => [s.id, s]))
    const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

    /* ------------------------------------------------------------------ *
     * UI text (also registered with the Client locale service)
     * ------------------------------------------------------------------ */

    const TEXT = {
      zh: {
        title: '霓虹主题引擎',
        subtitle: '动态背景 · 呼吸边框',
        open: '打开霓虹主题面板',
        close: '关闭面板',
        all: '全部',
        categories: '主题分类',
        catCyber: '赛博',
        catSpace: '星海',
        catAnime: '二次元',
        catNature: '自然',
        catEmber: '熔火',
        cardHint: '点一下立即应用',
        autoRotate: '自动轮换',
        autoRotateHint: '按设定间隔，在当前分类里换一款',
        interval: '轮换间隔',
        seconds: '秒',
        schedule: '按时间段',
        scheduleHint: '清晨极光、白天星海、黄昏樱花、夜晚霓虹',
        frame: '霓虹边框',
        frameHint: '整窗一圈呼吸光框 + 输入框发光描边',
        scan: '扫描光',
        scanHint: '一道光自上而下扫过窗口',
        glow: '光晕',
        speed: '呼吸速度',
        backdrop: '主界面不透明度',
        backdropHint: '越低越透、背景越明显；浅色模式建议调高',
        reset: '恢复默认',
        enabled: '霓虹效果',
        nowUse: '当前',
        periodDawn: '清晨',
        periodDay: '白天',
        periodDusk: '黄昏',
        periodNight: '夜晚',
        manualOverride: '手动选择会保留到下一个时段开始',
        scheduleWins: '开启后按时间段优先，自动轮换暂停',
        reducedMotion: '系统开启了「减少动态效果」，背景动画已暂停',
        settingsHint: '动态背景、霓虹边框、输入框发光，五个分类十款皮肤，还能挑壁纸',
        triggerLabel: '霓虹主题',
        wallBright: '壁纸亮度',
        wall: '壁纸',
        wallHint: '来自免费壁纸库，点一下立即换上；也可随时去除',
        wallFeatured: '精选',
        wallPeople: '人物',
        wallCartoon: '卡通',
        wallAnimal: '动物',
        wallAnime: '动漫',
        wallCyber: '赛博',
        wallSpace: '太空',
        wallNature: '风景',
        wallDaily: '每日',
        wallRandom: '随机',
        wallDynamic: '混合',
        wallTabImage: '图片',
        wallTabVideo: '动态视频',
        wallGroupClips: '素材',
        wallGroupAnime: '番剧',
        wallLoop: '循环播放',
        wallCheck: '加入播放列表',
        playlistActive: '播放列表',
        playlistHint: '勾选的视频会依次自动循环',
        playlistClear: '清空列表',
        videoStatusLabel: '动态壁纸',
        videoPlaying: '播放中',
        videoPaused: '已暂停',
        videoLoading: '缓冲中',
        videoError: '加载失败',
        animeSlam: '灌篮高手',
        animeTop: '全网高光',
        animeNaruto: '火影忍者',
        animeBleach: '死神',
        animeJujutsu: '咒术回战',
        animeAoT: '进击的巨人',
        animeChainsaw: '电锯人',
        animeFrieren: '葬送的芙莉莲',
        animeMHA: '我的英雄学院',
        animeDemon: '鬼灭之刃',
        animeDragon: '龙珠',
        animeTennis: '网球王子',
        animeOnePiece: '海贼王',
        animeYuYu: '幽游白书',
        wallVideoAnimals: '动物',
        wallVideoPeople: '人物',
        wallVideoCartoon: '卡通',
        wallVideoCity: '城市',
        wallVideoSpace: '太空',
        wallMore: '加载更多',
        wallClear: '去除壁纸',
        wallLoading: '正在加载壁纸库…',
        wallFallback: '壁纸接口暂时不可用，先显示内置精选',
        wallError: '这个资源没加载成功，换一个试试',
        wallCurrent: '已应用',
        wallVideo: '动态视频',
        wallVideoHint: '鼠标悬停可预览，点击立即设为动态壁纸',
      },
      en: {
        title: 'Neon theme engine',
        subtitle: 'Animated backdrop · breathing frame',
        open: 'Open the neon theme panel',
        close: 'Close panel',
        all: 'All',
        categories: 'Theme categories',
        catCyber: 'Cyber',
        catSpace: 'Space',
        catAnime: 'Anime',
        catNature: 'Nature',
        catEmber: 'Ember',
        cardHint: 'Click to apply',
        autoRotate: 'Auto-rotate',
        autoRotateHint: 'Cycle skins inside the selected category at the set interval',
        interval: 'Interval',
        seconds: 's',
        schedule: 'Time of day',
        scheduleHint: 'Aurora at dawn, stars by day, sakura at dusk, neon at night',
        frame: 'Neon frame',
        frameHint: 'Breathing window frame plus a glowing composer ring',
        scan: 'Scan line',
        scanHint: 'A light bar sweeps down the window',
        glow: 'Glow',
        speed: 'Breathing speed',
        backdrop: 'Surface opacity',
        backdropHint: 'Lower is more transparent; raise it in light mode',
        reset: 'Reset',
        enabled: 'Neon effects',
        nowUse: 'Current',
        periodDawn: 'Dawn',
        periodDay: 'Day',
        periodDusk: 'Dusk',
        periodNight: 'Night',
        manualOverride: 'A manual pick holds until the next period starts',
        scheduleWins: 'Time of day takes precedence; auto-rotate pauses',
        reducedMotion: 'Reduced motion is on, so backdrop animation is paused',
        settingsHint: 'Animated backdrops, neon frame, composer glow, ten skins and a wallpaper picker',
        triggerLabel: 'Neon theme',
        wallBright: 'Wallpaper brightness',
        wall: 'Wallpaper',
        wallHint: 'From free wallpaper libraries — click one to apply it now, remove it any time',
        wallFeatured: 'Featured',
        wallPeople: 'People',
        wallCartoon: 'Cartoon',
        wallAnimal: 'Animals',
        wallAnime: 'Anime',
        wallCyber: 'Cyber',
        wallSpace: 'Space',
        wallNature: 'Nature',
        wallDaily: 'Daily',
        wallRandom: 'Random',
        wallDynamic: 'Mixed',
        wallTabImage: 'Images',
        wallTabVideo: 'Live video',
        wallGroupClips: 'Clips',
        wallGroupAnime: 'Anime',
        wallLoop: 'Loop',
        wallCheck: 'Add to playlist',
        playlistActive: 'Playlist',
        playlistHint: 'Checked clips rotate automatically',
        playlistClear: 'Clear',
        videoStatusLabel: 'Live wallpaper',
        videoPlaying: 'playing',
        videoPaused: 'paused',
        videoLoading: 'buffering',
        videoError: 'failed to load',
        animeSlam: 'Slam Dunk',
        animeTop: 'Top cuts',
        animeNaruto: 'Naruto',
        animeBleach: 'Bleach',
        animeJujutsu: 'Jujutsu Kaisen',
        animeAoT: 'Attack on Titan',
        animeChainsaw: 'Chainsaw Man',
        animeFrieren: 'Frieren',
        animeMHA: 'My Hero Academia',
        animeDemon: 'Demon Slayer',
        animeDragon: 'Dragon Ball',
        animeTennis: 'Prince of Tennis',
        animeOnePiece: 'One Piece',
        animeYuYu: 'Yu Yu Hakusho',
        wallVideoAnimals: 'Animals',
        wallVideoPeople: 'People',
        wallVideoCartoon: 'Cartoon',
        wallVideoCity: 'City',
        wallVideoSpace: 'Space',
        wallMore: 'Load more',
        wallClear: 'Remove wallpaper',
        wallLoading: 'Loading wallpapers…',
        wallFallback: 'The wallpaper service is unavailable, showing built-in picks',
        wallError: 'That media failed to load, try another one',
        wallCurrent: 'applied',
        wallVideo: 'Live video',
        wallVideoHint: 'Hover to preview, click to use it as the live wallpaper',
      },
    }

    const LANG =
      (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) ||
      (typeof navigator !== 'undefined' && navigator.language) ||
      'en'
    const IS_ZH = /^zh/i.test(LANG)
    const baseText = IS_ZH ? TEXT.zh : TEXT.en

    // The rotating border beam is painted with a mask cut-out. Without mask
    // support the conic gradient would fill the window, so the beam is only
    // rendered when the engine can cut the ring out.
    const MASK_OK = (() => {
      try {
        if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
        return CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'xor')
      } catch (error) {
        return false
      }
    })()

    function skinName(skin) {
      return IS_ZH ? skin.zh : skin.en
    }

    function catLabel(cat) {
      const key = 'cat' + cat.id.charAt(0).toUpperCase() + cat.id.slice(1)
      return baseText[key] || cat[IS_ZH ? 'zh' : 'en']
    }

    function makeTranslator(t) {
      return (key) => {
        if (typeof t === 'function') {
          try {
            const value = t(key)
            if (typeof value === 'string' && value !== key) return value
          } catch (error) {
            /* fall through to the bundled dictionary */
          }
        }
        return baseText[key] || key
      }
    }

    // Panel visibility is UI state: shared by the header button, the settings
    // row and the overlay, never persisted (a reload starts with it closed).
    // `anchor` carries the trigger's viewport rect so the panel opens right
    // under the button that asked for it.
    const ui = {
      open: false,
      anchor: null,
      trigger: null,
      listeners: new Set(),
      emit() {
        for (const listener of this.listeners) {
          try {
            listener()
          } catch (error) {
            /* one broken listener must not starve the others */
          }
        }
      },
      show(anchor, trigger) {
        this.open = true
        this.anchor = anchor || null
        this.trigger = trigger || null
        this.emit()
      },
      hide() {
        if (!this.open) return
        this.open = false
        this.anchor = null
        this.emit()
      },
      subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      },
    }

    /* ------------------------------------------------------------------ *
     * Time-of-day schedule
     * ------------------------------------------------------------------ */

    const PERIODS = {
      dawn: { skin: 'aurora', cat: 'nature', key: 'periodDawn' },
      day: { skin: 'star', cat: 'space', key: 'periodDay' },
      dusk: { skin: 'sakura', cat: 'anime', key: 'periodDusk' },
      night: { skin: 'cyber', cat: 'cyber', key: 'periodNight' },
    }

    function periodNow(date) {
      const hour = (date || new Date()).getHours()
      if (hour >= 5 && hour < 9) return 'dawn'
      if (hour >= 9 && hour < 17) return 'day'
      if (hour >= 17 && hour < 21) return 'dusk'
      return 'night'
    }

    /* ------------------------------------------------------------------ *
     * Settings
     * ------------------------------------------------------------------ */

    const DEFAULTS = Object.freeze({
      enabled: true,
      skin: 'cyber',
      category: 'all',
      rotate: false,
      rotateSeconds: 45,
      schedule: false,
      lastPeriod: '',
      frame: true,
      scan: true,
      glow: 62,
      speed: 46,
      backdrop: 46,
      wallBright: 46,
      wallLoop: true,
      playlist: [],
      wall: null,
    })

    const ROTATE_CHOICES = [20, 30, 45, 60, 120, 300]

    function clamp(value, min, max) {
      const n = Number(value)
      if (!Number.isFinite(n)) return min
      return Math.min(max, Math.max(min, n))
    }

    function sanitize(raw) {
      const next = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
      if (!SKIN_BY_ID.has(next.skin)) next.skin = DEFAULTS.skin
      if (next.category !== 'all' && !CAT_BY_ID.has(next.category)) next.category = 'all'
      next.enabled = next.enabled !== false
      next.frame = next.frame !== false
      next.scan = next.scan !== false
      next.rotate = next.rotate === true
      next.schedule = next.schedule === true
      next.glow = clamp(next.glow, 0, 100)
      next.speed = clamp(next.speed, 0, 100)
      next.backdrop = clamp(next.backdrop, 0, 100)
      next.wallBright = clamp(next.wallBright, 0, 100)
      next.wallLoop = next.wallLoop !== false
      next.playlist = Array.isArray(next.playlist)
        ? next.playlist.map(sanitizeWall).filter(Boolean).slice(0, 12)
        : []
      const choice = Number(next.rotateSeconds)
      next.rotateSeconds = ROTATE_CHOICES.includes(choice) ? choice : DEFAULTS.rotateSeconds
      next.lastPeriod = typeof next.lastPeriod === 'string' && PERIODS[next.lastPeriod] ? next.lastPeriod : ''
      next.wall = sanitizeWall(next.wall)
      return next
    }

    function sanitizeWall(raw) {
      if (!raw || typeof raw !== 'object') return null
      const url = typeof raw.url === 'string' ? raw.url : ''
      if (!/^(https?:\/\/|\/)/.test(url)) return null
      return {
        id: typeof raw.id === 'string' ? raw.id.slice(0, 80) : '',
        kind: raw.kind === 'video' ? 'video' : 'image',
        url: url.slice(0, 2000),
        thumb: typeof raw.thumb === 'string' && /^(https?:\/\/|\/)/.test(raw.thumb) ? raw.thumb.slice(0, 2000) : '',
        title: typeof raw.title === 'string' ? raw.title.slice(0, 120) : '',
        source: typeof raw.source === 'string' ? raw.source.slice(0, 32) : '',
      }
    }

    function readSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULTS }
      } catch (error) {
        return { ...DEFAULTS }
      }
    }

    const store = {
      state: readSettings(),
      listeners: new Set(),
      get() {
        return this.state
      },
      set(patch) {
        this.state = sanitize({ ...this.state, ...patch })
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
        } catch (error) {
          /* a blocked storage must not break the theme */
        }
        scheduleRemoteSave()
        for (const listener of this.listeners) {
          try {
            listener()
          } catch (error) {
            /* one broken listener must not starve the others */
          }
        }
      },
      subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      },
    }

    /* ------------------------------------------------------------------ *
     * Stylesheet
     * ------------------------------------------------------------------ */

    const CSS = String.raw`
:root{--fx-accent:#22e6ff;--fx-accent-2:#ff2bd6;--fx-glow:1;--fx-breathe:3.4s;--fx-sweep:8s}

/* ---------- animated backdrop (behind the AppFrame) ---------- */
html[data-dsh-neon] body::before,
html[data-dsh-neon] body::after{
  content:"";position:fixed;inset:-18%;z-index:-1;pointer-events:none;
  background-repeat:no-repeat;background-position:50% 50%;background-size:cover;
  will-change:transform,opacity;
}
html[data-dsh-neon] body::before{
  animation:var(--fx-anim-a,dshneon-drift) var(--fx-dur-a,28s) ease-in-out infinite alternate;
}
html[data-dsh-neon] body::after{
  animation:var(--fx-anim-b,dshneon-twinkle) var(--fx-dur-b,9s) ease-in-out infinite;
  background-repeat:repeat;
}
html[data-dsh-neon] body{
  --dsw-alias-bg-base:color-mix(in srgb,#070a12 var(--fx-surface-d,62%),transparent)!important;
  --dsw-specific-sidebar-fill:color-mix(in srgb,#070a12 var(--fx-side-d,40%),transparent)!important;
}
html[data-dsh-neon] body:not([data-ds-dark-theme]){
  --dsw-alias-bg-base:color-mix(in srgb,#f2f5ff var(--fx-surface-l,78%),transparent)!important;
  --dsw-specific-sidebar-fill:color-mix(in srgb,#f2f5ff var(--fx-side-l,52%),transparent)!important;
}

/* cyber -- drifting cyan/magenta glow over a slow perspective grid */
html[data-dsh-neon="cyber"]{--fx-accent:#22e6ff;--fx-accent-2:#ff2bd6;--fx-anim-a:dshneon-drift;--fx-dur-a:26s;--fx-anim-b:dshneon-scan;--fx-dur-b:5.5s}
html[data-dsh-neon="cyber"] body::before{background:
  radial-gradient(48% 62% at 15% 22%,#22e6ff59,transparent 66%),
  radial-gradient(52% 58% at 86% 80%,#ff2bd647,transparent 64%),
  radial-gradient(90% 90% at 50% 50%,#0a1230 0%,#04060e 74%)}
html[data-dsh-neon="cyber"] body::after{background-image:
  repeating-linear-gradient(0deg,#22e6ff1c 0 1px,transparent 1px 72px),
  repeating-linear-gradient(90deg,#ff2bd614 0 1px,transparent 1px 72px);
  -webkit-mask-image:radial-gradient(72% 72% at 50% 46%,#000 8%,transparent 80%);
  mask-image:radial-gradient(72% 72% at 50% 46%,#000 8%,transparent 80%)}

/* grid -- rotating conic aurora behind a fine violet/green lattice */
html[data-dsh-neon="grid"]{--fx-accent:#7c5cff;--fx-accent-2:#00ffc8;--fx-anim-a:dshneon-spin-slow;--fx-dur-a:70s;--fx-anim-b:dshneon-grid-slide;--fx-dur-b:14s}
html[data-dsh-neon="grid"] body::before{background:
  conic-gradient(from 210deg at 50% 48%,#7c5cff3d,#00ffc82b,#7c5cff3d),
  radial-gradient(90% 90% at 50% 50%,#0b0b1e,#04040c 72%)}
html[data-dsh-neon="grid"] body::after{background-image:
  linear-gradient(#00ffc81f 1px,transparent 1px),
  linear-gradient(90deg,#7c5cff1f 1px,transparent 1px);
  background-size:44px 44px,44px 44px;
  -webkit-mask-image:radial-gradient(70% 70% at 50% 58%,#000,transparent 82%);
  mask-image:radial-gradient(70% 70% at 50% 58%,#000,transparent 82%)}

/* star -- three parallax star layers plus a violet nebula wash */
html[data-dsh-neon="star"]{--fx-accent:#9ec1ff;--fx-accent-2:#d0a6ff;--fx-anim-a:dshneon-drift;--fx-dur-a:40s;--fx-anim-b:dshneon-twinkle;--fx-dur-b:7s}
html[data-dsh-neon="star"] body::before{background:
  radial-gradient(55% 60% at 70% 18%,#6a4cff40,transparent 66%),
  radial-gradient(45% 55% at 18% 76%,#2b7bff38,transparent 64%),
  radial-gradient(circle at 50% 50%,#0a1230,#02030a 74%)}
html[data-dsh-neon="star"] body::after{background-image:
  radial-gradient(1.6px 1.6px at 24px 32px,#ffffffcc 50%,transparent 51%),
  radial-gradient(1.2px 1.2px at 132px 90px,#cfe3ff99 50%,transparent 51%),
  radial-gradient(1.8px 1.8px at 74px 150px,#a9c6ff8c 50%,transparent 51%);
  background-size:260px 260px,340px 340px,480px 480px}

/* nebula -- slow rotating swirl with a blurred core */
html[data-dsh-neon="nebula"]{--fx-accent:#b06bff;--fx-accent-2:#59e0ff;--fx-anim-a:dshneon-spin-slow;--fx-dur-a:90s;--fx-anim-b:dshneon-twinkle;--fx-dur-b:11s}
html[data-dsh-neon="nebula"] body::before{background:
  conic-gradient(from 140deg at 42% 46%,#b06bff42,#59e0ff38,#ff6ad52e,#b06bff42),
  radial-gradient(90% 90% at 50% 50%,#0b0620,#03030a 70%);
  filter:blur(7px)}
html[data-dsh-neon="nebula"] body::after{background-image:
  radial-gradient(1.4px 1.4px at 60px 40px,#ffffffaa 50%,transparent 51%),
  radial-gradient(1px 1px at 200px 180px,#d8c8ffaa 50%,transparent 51%);
  background-size:300px 300px,420px 420px}

/* sakura -- warm rose wash with drifting petals */
html[data-dsh-neon="sakura"]{--fx-accent:#ff9ec7;--fx-accent-2:#b28bff;--fx-anim-a:dshneon-drift;--fx-dur-a:34s;--fx-anim-b:dshneon-petals;--fx-dur-b:22s}
html[data-dsh-neon="sakura"] body::before{background:
  radial-gradient(60% 70% at 20% 18%,#ff9ec74d,transparent 62%),
  radial-gradient(50% 60% at 80% 78%,#b28bff40,transparent 64%),
  linear-gradient(160deg,#2a1430,#120a1c 62%,#07040c)}
html[data-dsh-neon="sakura"] body::after{background-image:
  radial-gradient(3px 5px at 40px 60px,#ffb7d5cc 60%,transparent 61%),
  radial-gradient(2px 4px at 180px 220px,#ffd0e2aa 60%,transparent 61%),
  radial-gradient(2.5px 4px at 320px 120px,#ffc4dd99 60%,transparent 61%);
  background-size:320px 320px,420px 420px,520px 520px}

/* hanabi -- distant fireworks bursts with a slow warm flicker */
html[data-dsh-neon="hanabi"]{--fx-accent:#ffd166;--fx-accent-2:#ff5fa2;--fx-anim-a:dshneon-flicker;--fx-dur-a:9s;--fx-anim-b:dshneon-twinkle;--fx-dur-b:5s}
html[data-dsh-neon="hanabi"] body::before{background:
  radial-gradient(circle at 18% 24%,#ffd16655 0 5%,transparent 38%),
  radial-gradient(circle at 82% 72%,#ff5fa24d 0 4%,transparent 36%),
  radial-gradient(circle at 58% 44%,#ff8a3d33 0 3%,transparent 30%),
  linear-gradient(180deg,#0b0716,#05030a)}
html[data-dsh-neon="hanabi"] body::after{background-image:
  radial-gradient(1.5px 1.5px at 80px 60px,#ffe9b8cc 50%,transparent 51%),
  radial-gradient(1.2px 1.2px at 260px 200px,#ffc9ddbb 50%,transparent 51%);
  background-size:360px 360px,460px 460px}

/* aurora -- skewed green/cyan/violet curtains */
html[data-dsh-neon="aurora"]{--fx-accent:#3dffb0;--fx-accent-2:#66c8ff;--fx-anim-a:dshneon-aurora;--fx-dur-a:24s;--fx-anim-b:dshneon-twinkle;--fx-dur-b:8s}
html[data-dsh-neon="aurora"] body::before{background:
  linear-gradient(114deg,transparent 18%,#3dffb038 30%,#66c8ff33 44%,#b46bff2e 58%,transparent 76%),
  radial-gradient(120% 100% at 50% 0%,#071b22,#04070e 70%);
  filter:blur(9px)}
html[data-dsh-neon="aurora"] body::after{background-image:
  radial-gradient(1.4px 1.4px at 120px 90px,#d6fff2bb 50%,transparent 51%),
  radial-gradient(1px 1px at 30px 260px,#bfe9ff99 50%,transparent 51%);
  background-size:380px 380px,300px 300px}

/* dawn -- warm sunrise gradient with slow bloom */
html[data-dsh-neon="dawn"]{--fx-accent:#ffb27a;--fx-accent-2:#ffd9a0;--fx-anim-a:dshneon-drift;--fx-dur-a:44s;--fx-anim-b:dshneon-flicker;--fx-dur-b:12s}
html[data-dsh-neon="dawn"] body::before{background:
  radial-gradient(80% 70% at 50% 108%,#ffb27a66,transparent 62%),
  radial-gradient(50% 60% at 82% 8%,#ff9ac040,transparent 60%),
  linear-gradient(180deg,#120b16,#1d1018 46%,#0a0710)}
html[data-dsh-neon="dawn"] body::after{background-image:
  radial-gradient(2px 2px at 90px 70px,#ffe3c4aa 50%,transparent 51%),
  radial-gradient(1.4px 1.4px at 240px 180px,#ffd0a899 50%,transparent 51%);
  background-size:420px 420px,340px 340px}

/* ember -- rising sparks over a deep red core */
html[data-dsh-neon="ember"]{--fx-accent:#ff7a3d;--fx-accent-2:#ffcf6b;--fx-anim-a:dshneon-drift;--fx-dur-a:30s;--fx-anim-b:dshneon-rise;--fx-dur-b:16s}
html[data-dsh-neon="ember"] body::before{background:
  radial-gradient(60% 60% at 50% 104%,#ff5a1f59,transparent 64%),
  radial-gradient(40% 50% at 18% 24%,#ff9d3d33,transparent 62%),
  radial-gradient(90% 90% at 50% 50%,#160608,#07040a 72%)}
html[data-dsh-neon="ember"] body::after{background-image:
  radial-gradient(1.6px 1.6px at 60px 200px,#ffb066cc 50%,transparent 51%),
  radial-gradient(1.2px 1.2px at 210px 120px,#ff8a3daa 50%,transparent 51%);
  background-size:300px 300px,460px 460px}

/* crypt -- crimson glow split by diagonal magma cracks */
html[data-dsh-neon="crypt"]{--fx-accent:#ff4d6d;--fx-accent-2:#ffa26b;--fx-anim-a:dshneon-drift;--fx-dur-a:28s;--fx-anim-b:dshneon-cracks;--fx-dur-b:18s}
html[data-dsh-neon="crypt"] body::before{background:
  radial-gradient(55% 65% at 30% 30%,#ff4d6d4a,transparent 64%),
  radial-gradient(50% 60% at 78% 76%,#ffa26b3d,transparent 62%),
  radial-gradient(circle at 50% 50%,#14040a,#050206 74%)}
html[data-dsh-neon="crypt"] body::after{background-image:
  repeating-linear-gradient(48deg,transparent 0 46px,#ff4d6d1f 46px 48px,transparent 48px 120px),
  repeating-linear-gradient(-42deg,transparent 0 90px,#ffa26b17 90px 92px,transparent 92px 210px);
  -webkit-mask-image:radial-gradient(80% 80% at 50% 50%,#000,transparent 88%);
  mask-image:radial-gradient(80% 80% at 50% 50%,#000,transparent 88%)}

/* ---------- photo wallpaper ---------- */
html[data-dsh-neon-wall="on"] body::before{
  background-image:linear-gradient(180deg,rgba(4,6,14,.02),rgba(4,6,14,.08)),var(--fx-wall);
  background-size:cover,cover;
  background-position:50% 50%,50% 50%;
  background-repeat:no-repeat,no-repeat;
  animation:dshneon-wall-pan 90s ease-in-out infinite alternate;
  filter:saturate(1.12) contrast(1.06) brightness(var(--fx-wall-bright,1));
}
html.dshneon-wall-in body::before{
  animation:dshneon-wall-fade .6s ease-out, dshneon-wall-pan 90s ease-in-out infinite alternate;
}
.dshneon-video-layer{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#04060e}
.dshneon-video-layer__video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.97;filter:brightness(var(--fx-wall-bright,1)) saturate(1.1) contrast(1.05)}
.dshneon-video-layer__tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,6,14,.02),rgba(4,6,14,.08))}
@keyframes dshneon-wall-pan{
  0%{transform:scale(1.03) translate3d(-1%,-0.5%,0)}
  100%{transform:scale(1.12) translate3d(1%,0.8%,0)}
}
@keyframes dshneon-wall-fade{from{opacity:.2}to{opacity:1}}

/* ---------- window frame ---------- */
.dshneon-frame{position:fixed;inset:0;pointer-events:none;z-index:6}
.dshneon-frame__ring{
  position:absolute;inset:7px;border-radius:15px;
  border:1.5px solid color-mix(in srgb,var(--fx-accent) 80%,transparent);
  box-shadow:
    0 0 calc(6px + 22px * var(--fx-glow,1)) color-mix(in srgb,var(--fx-accent) 36%,transparent),
    inset 0 0 calc(10px + 30px * var(--fx-glow,1)) color-mix(in srgb,var(--fx-accent) 24%,transparent);
  animation:dshneon-breathe var(--fx-breathe,3.4s) ease-in-out infinite;
}
@property --dshneon-angle{syntax:"<angle>";inherits:false;initial-value:0deg}
.dshneon-frame__beam{
  position:absolute;inset:7px;border-radius:15px;padding:2px;opacity:.95;
  background:conic-gradient(from var(--dshneon-angle),
    transparent 0deg 246deg,
    color-mix(in srgb,var(--fx-accent-2) 85%,transparent) 300deg,
    var(--fx-accent) 332deg,
    transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
  filter:drop-shadow(0 0 7px var(--fx-accent));
  animation:dshneon-spin 7.5s linear infinite;
}
.dshneon-frame__sweep{
  position:absolute;left:7px;right:7px;top:0;height:2px;border-radius:2px;opacity:0;
  background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--fx-accent) 78%,transparent),transparent);
  box-shadow:0 0 14px var(--fx-accent);
  animation:dshneon-sweep var(--fx-sweep) linear infinite;
}
html[data-dsh-neon-scan="off"] .dshneon-frame__sweep{display:none}
.dshneon-frame__corner{
  position:absolute;width:26px;height:26px;opacity:.9;
  border:2px solid var(--fx-accent);
  filter:drop-shadow(0 0 7px var(--fx-accent));
  animation:dshneon-breathe calc(var(--fx-breathe,3.4s) * 1.6) ease-in-out infinite;
}
.dshneon-frame__corner--tl{top:7px;left:7px;border-right:0;border-bottom:0;border-radius:13px 0 0 0}
.dshneon-frame__corner--tr{top:7px;right:7px;border-left:0;border-bottom:0;border-radius:0 13px 0 0}
.dshneon-frame__corner--bl{bottom:7px;left:7px;border-right:0;border-top:0;border-radius:0 0 0 13px}
.dshneon-frame__corner--br{bottom:7px;right:7px;border-left:0;border-top:0;border-radius:0 0 13px 0}

/* ---------- composer ring ---------- */
html[data-dsh-neon-frame="on"] [data-composer-seat]{position:relative}
html[data-dsh-neon-frame="on"] [data-composer-seat]::after{
  content:"";position:absolute;inset:-3px;border-radius:22px;pointer-events:none;z-index:1;
  border:1px solid color-mix(in srgb,var(--fx-accent) 58%,transparent);
  box-shadow:
    0 0 calc(8px + 26px * var(--fx-glow,1)) color-mix(in srgb,var(--fx-accent) 32%,transparent),
    inset 0 0 calc(6px + 18px * var(--fx-glow,1)) color-mix(in srgb,var(--fx-accent) 20%,transparent);
  animation:dshneon-breathe var(--fx-breathe,3.4s) ease-in-out infinite;
}
html[data-dsh-neon-frame="off"] [data-composer-seat]::after{content:none}

/* ---------- header trigger + panel ---------- */
.dshneon-trigger{
  display:inline-flex;align-items:center;gap:6px;flex:none;height:26px;padding:0 10px;margin:0;cursor:pointer;
  border:1px solid var(--dsw-alias-border-l2);border-radius:999px;
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 70%,transparent);
  color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;
  transition:background .16s ease,color .16s ease,border-color .16s ease,box-shadow .16s ease;
}
.dshneon-trigger:hover{
  color:var(--dsw-alias-label-primary);
  border-color:color-mix(in srgb,var(--fx-accent) 40%,var(--dsw-alias-border-l2));
  background:var(--dsw-alias-interactive-bg-hover);
}
.dshneon-trigger[aria-expanded="true"]{
  color:var(--dsw-alias-label-primary);
  border-color:color-mix(in srgb,var(--fx-accent) 55%,var(--dsw-alias-border-l2));
  background:var(--dsw-alias-interactive-bg-active);
  box-shadow:0 0 0 1px color-mix(in srgb,var(--fx-accent) 22%,transparent);
}
.dshneon-trigger__glyph{
  font-size:13px;line-height:1;color:var(--fx-accent);
  filter:drop-shadow(0 0 5px color-mix(in srgb,var(--fx-accent) 70%,transparent));
}
.dshneon-trigger__label{white-space:nowrap}
.dshneon-trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dshneon-pop{position:fixed;z-index:40;display:flex;justify-content:flex-end}
.dshneon-panel{
  pointer-events:auto;box-sizing:border-box;width:min(372px,calc(100vw - 20px));
  max-height:min(660px,calc(100vh - 150px));overflow:auto;padding:0;
  border-radius:18px;border:1px solid var(--dsw-alias-border-l2);
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);
  backdrop-filter:blur(18px) saturate(125%);
  color:var(--dsw-alias-label-primary);
  box-shadow:0 20px 52px rgba(0,0,0,.36),inset 0 0 0 1px color-mix(in srgb,var(--fx-accent) 20%,transparent);
  animation:dshneon-up .2s ease-out;
  scrollbar-width:thin;
}
.dshneon-panel:focus{outline:none}
.dshneon-head{
  position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:9px;
  padding:13px 14px 9px;
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 95%,transparent);
  backdrop-filter:blur(10px);
  border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l2) 70%,transparent);
}
.dshneon-head__dot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--fx-accent);box-shadow:0 0 10px var(--fx-accent)}
.dshneon-head h3{margin:0;font-size:14px;font-weight:600;line-height:1.2;flex:1;min-width:0}
.dshneon-head__sub{display:block;margin-top:3px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.dshneon-body{padding:0 14px}
.dshneon-body{padding:0}
.dshneon-close{
  pointer-events:auto;flex:none;width:28px;height:28px;border-radius:8px;cursor:pointer;
  border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);
  font-size:16px;line-height:1;display:grid;place-items:center;
}
.dshneon-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshneon-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0 10px;padding:0 14px}
.dshneon-chip{
  pointer-events:auto;cursor:pointer;border-radius:999px;padding:5px 11px;font-size:12px;
  border:1px solid var(--dsw-alias-border-l2);background:transparent;
  color:var(--dsw-alias-label-secondary);
}
.dshneon-chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dshneon-chip.is-active{
  color:var(--dsw-alias-label-primary);
  border-color:color-mix(in srgb,var(--fx-accent) 46%,var(--dsw-alias-border-l2));
  background:color-mix(in srgb,var(--fx-accent) 14%,transparent);
  box-shadow:0 0 0 1px color-mix(in srgb,var(--fx-accent) 26%,transparent);
}
.dshneon-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px}
.dshneon-card{
  pointer-events:auto;cursor:pointer;display:flex;flex-direction:column;gap:5px;
  padding:6px;border-radius:12px;text-align:left;font:inherit;color:inherit;
  border:1px solid var(--dsw-alias-border-l2);
  background:color-mix(in srgb,var(--dsw-alias-card-fill) 74%,transparent);
  transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease;
}
.dshneon-card:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--fx-accent) 40%,var(--dsw-alias-border-l2))}
.dshneon-card.is-active{
  border-color:color-mix(in srgb,var(--fx-accent) 48%,var(--dsw-alias-border-l2));
  box-shadow:0 0 0 1px color-mix(in srgb,var(--fx-accent) 30%,transparent),0 0 16px color-mix(in srgb,var(--fx-accent) 26%,transparent);
}
.dshneon-card__art{display:block;height:36px;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.dshneon-card__meta{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;line-height:1.2}
.dshneon-card__badge{font-style:normal;font-size:10px;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.dshneon-card.is-active .dshneon-card__badge{color:var(--dsw-alias-label-primary)}
.dshneon-section{margin-top:12px;padding:10px 14px 0;border-top:1px solid var(--dsw-alias-border-l2)}
.dshneon-section--last{padding-bottom:14px}
.dshneon-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0}
.dshneon-row__text{min-width:0}
.dshneon-row__label{font-size:12.5px;line-height:1.3}
.dshneon-row__hint{display:block;margin-top:2px;font-size:11px;line-height:1.35;color:var(--dsw-alias-label-secondary)}
.dshneon-range-row{display:flex;align-items:center;gap:8px;padding:0 0 2px}
.dshneon-range{
  pointer-events:auto;flex:1;height:24px;margin:0;cursor:pointer;appearance:none;-webkit-appearance:none;
  background:transparent;
}
.dshneon-range::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--dsw-alias-bg-mask-1)}
.dshneon-range::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;
  background:var(--fx-accent);box-shadow:0 0 8px color-mix(in srgb,var(--fx-accent) 55%,transparent);
}
.dshneon-range:disabled{opacity:.45;cursor:default}
.dshneon-range__val{font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);width:34px;text-align:right}
.dshneon-switch{
  pointer-events:auto;flex:none;position:relative;width:40px;height:24px;padding:0;cursor:pointer;
  border-radius:999px;border:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease;
}
.dshneon-switch.is-on{
  border-color:color-mix(in srgb,var(--fx-accent) 60%,transparent);
  background:color-mix(in srgb,var(--fx-accent) 52%,transparent);
  box-shadow:0 0 12px color-mix(in srgb,var(--fx-accent) 34%,transparent);
}
.dshneon-switch__knob{
  position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;
  background:var(--dsw-alias-switch-thumb,#fff);transition:transform .18s ease;
  box-shadow:0 1px 3px rgba(0,0,0,.35);
}
.dshneon-switch.is-on .dshneon-switch__knob{transform:translateX(16px)}
.dshneon-switch:disabled{opacity:.45;cursor:default}
.dshneon-select{
  pointer-events:auto;font:inherit;font-size:12px;padding:4px 6px;border-radius:8px;min-height:24px;
  border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary);cursor:pointer;
}
.dshneon-foot{
  position:sticky;bottom:0;z-index:2;
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 14px 12px;
  border-top:1px solid var(--dsw-alias-border-l2);
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 95%,transparent);
  backdrop-filter:blur(10px);
  font-size:11px;color:var(--dsw-alias-label-secondary);
}
.dshneon-foot__toggle{display:flex;align-items:center;gap:7px;min-width:0;font-size:12px;color:var(--dsw-alias-label-primary)}
.dshneon-foot__actions{display:flex;align-items:center;gap:8px}
.dshneon-foot__ver{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.dshneon-reset{
  pointer-events:auto;cursor:pointer;font:inherit;font-size:11px;padding:4px 10px;border-radius:8px;min-height:24px;
  border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);
}
.dshneon-reset:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}

/* focus ring shared by every panel control */
.dshneon-panel :is(button,select,input):focus-visible{
  outline:2px solid var(--dsw-alias-state-business-primary);
  outline-offset:2px;
}

/* ---------- wallpaper picker ---------- */
.dshneon-wallbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}
.dshneon-walltabs{display:flex;gap:6px;margin:10px 0 0}
.dshneon-wallgroup-label{font-size:11px;line-height:1;color:var(--dsw-alias-label-secondary);margin-right:2px;flex:none}
.dshneon-wallbar--foot{margin:10px 0 2px}
.dshneon-wallmore{flex:1;text-align:center}
.dshneon-walls{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.dshneon-wall{
  pointer-events:auto;position:relative;display:block;padding:0;cursor:pointer;overflow:hidden;
  aspect-ratio:16 / 9;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);
}
.dshneon-wall img{display:block;width:100%;height:100%;object-fit:cover}
.dshneon-wall:hover{border-color:color-mix(in srgb,var(--fx-accent) 45%,var(--dsw-alias-border-l2))}
.dshneon-wall.is-active{
  border-color:color-mix(in srgb,var(--fx-accent) 60%,var(--dsw-alias-border-l2));
  box-shadow:0 0 0 1px color-mix(in srgb,var(--fx-accent) 45%,transparent),0 0 14px color-mix(in srgb,var(--fx-accent) 28%,transparent);
}
.dshneon-wall.is-active:after{
  content:"\2713";position:absolute;right:5px;bottom:3px;font-size:11px;line-height:1;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,.9);
}
.dshneon-wall.is-video{border-color:color-mix(in srgb,var(--fx-accent-2) 38%,var(--dsw-alias-border-l2))}
.dshneon-wall__video{display:block;width:100%;height:100%;object-fit:cover}
.dshneon-wall__badge{
  position:absolute;left:5px;bottom:2px;font-size:10px;line-height:1;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,.9);
}
.dshneon-wall__score{
  position:absolute;right:4px;top:3px;font-size:9.5px;line-height:1;color:#fff;
  padding:2px 4px;border-radius:999px;background:rgba(0,0,0,.55);
  text-shadow:0 1px 2px rgba(0,0,0,.9);
}
.dshneon-wall__check{
  position:absolute;left:4px;top:3px;width:16px;height:16px;border-radius:50%;
  display:grid;place-items:center;font-size:11px;line-height:1;cursor:pointer;
  color:#fff;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.45);
}
.dshneon-wall__check.is-on{
  background:color-mix(in srgb,var(--fx-accent) 78%,#000);
  border-color:color-mix(in srgb,var(--fx-accent) 90%,#fff);
  box-shadow:0 0 8px color-mix(in srgb,var(--fx-accent) 55%,transparent);
}
.dshneon-wallfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}
.dshneon-reset:disabled{opacity:.45;cursor:default}

/* ---------- settings row entry point ---------- */
.dshneon-setting{display:flex;align-items:center;gap:12px;padding:8px 0}
.dshneon-setting__text{flex:1;min-width:0}
.dshneon-setting__title{font-size:13px;color:var(--dsw-alias-label-primary)}
.dshneon-setting__hint{display:block;margin-top:3px;font-size:11.5px;line-height:1.4;color:var(--dsw-alias-label-secondary)}
.dshneon-setting__button{
  flex:none;cursor:pointer;font:inherit;font-size:12px;padding:5px 12px;border-radius:8px;min-height:26px;
  border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-card-fill);
  color:var(--dsw-alias-label-primary);
}
.dshneon-setting__button:hover{background:var(--dsw-alias-card-fill-hover)}
.dshneon-setting__button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}

/* ---------- keyframes ---------- */
@keyframes dshneon-drift{
  0%{transform:translate3d(-2%,-1%,0) scale(1.04)}
  50%{transform:translate3d(2%,2%,0) scale(1.1)}
  100%{transform:translate3d(-1%,1%,0) scale(1.06)}
}
@keyframes dshneon-scan{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(0,72px,0)}}
@keyframes dshneon-grid-slide{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(44px,44px,0)}}
@keyframes dshneon-spin-slow{0%{transform:rotate(0) scale(1.16)}100%{transform:rotate(360deg) scale(1.16)}}
@keyframes dshneon-twinkle{0%,100%{opacity:.42}50%{opacity:1}}
@keyframes dshneon-flicker{0%,100%{opacity:.86}46%{opacity:1}62%{opacity:.9}}
@keyframes dshneon-petals{0%{transform:translate3d(0,-6%,0) rotate(0)}100%{transform:translate3d(-9%,14%,0) rotate(5deg)}}
@keyframes dshneon-rise{0%{transform:translate3d(0,10%,0)}100%{transform:translate3d(0,-10%,0)}}
@keyframes dshneon-cracks{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-40px,22px,0)}}
@keyframes dshneon-aurora{
  0%{transform:translate3d(-5%,0,0) skewY(-5deg) scale(1.2)}
  100%{transform:translate3d(5%,0,0) skewY(4deg) scale(1.26)}
}
@keyframes dshneon-breathe{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes dshneon-spin{to{--dshneon-angle:360deg}}
@keyframes dshneon-sweep{
  0%{transform:translateY(0);opacity:0}
  6%{opacity:.9}
  94%{opacity:.9}
  100%{transform:translateY(calc(100vh - 12px));opacity:0}
}
@keyframes dshneon-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

@media (prefers-reduced-motion: reduce){
  html[data-dsh-neon] body::before,
  html[data-dsh-neon] body::after,
  .dshneon-frame__ring,
  .dshneon-frame__beam,
  .dshneon-frame__sweep,
  .dshneon-frame__corner,
  .dshneon-trigger,
  .dshneon-panel,
  .dshneon-card,
  .dshneon-switch,
  .dshneon-switch__knob,
  [data-composer-seat]::after{animation:none!important;transition:none!important}
}
`

    function installStylesheet() {
      const element = document.createElement('style')
      element.setAttribute('data-dsh-neon-theme', '')
      element.textContent = CSS
      document.head.appendChild(element)
      return element
    }

    /* ------------------------------------------------------------------ *
     * DOM application
     * ------------------------------------------------------------------ */

    function applyToDocument(state) {
      const root = document.documentElement
      if (!root) return
      if (!state.enabled) {
        root.removeAttribute(ATTR)
        root.removeAttribute(ATTR_FRAME)
        root.removeAttribute(ATTR_SCAN)
        root.removeAttribute('data-dsh-neon-wall')
        return
      }
      const skin = SKIN_BY_ID.get(state.skin) || SKIN_BY_ID.get(DEFAULTS.skin)
      root.setAttribute(ATTR, skin.id)
      root.setAttribute(ATTR_FRAME, state.frame ? 'on' : 'off')
      root.setAttribute(ATTR_SCAN, state.scan ? 'on' : 'off')

      const glow = (0.35 + (state.glow / 100) * 1.65).toFixed(2)
      root.style.setProperty('--fx-glow', glow)
      root.style.setProperty('--fx-accent', skin.a)
      root.style.setProperty('--fx-accent-2', skin.b)
      root.style.setProperty('--fx-breathe', (6.4 - (state.speed / 100) * 5.4).toFixed(2) + 's')
      root.style.setProperty('--fx-sweep', (11 - (state.speed / 100) * 7).toFixed(2) + 's')

      const playlist = Array.isArray(state.playlist)
        ? state.playlist.filter((item) => item && item.url)
        : []
      const wall = playlist.length > 0 ? null : state.wall && state.wall.url ? state.wall : null
      // `active` is what decides the surface: a playlist counts as media just
      // like a single wallpaper, otherwise switching to a playlist would put the
      // opaque panels back and the animation would look dark.
      const active = playlist.length > 0 || Boolean(wall)
      const density = active ? 1 + (state.backdrop / 100) * 10 : 30 + (state.backdrop / 100) * 56
      root.style.setProperty('--fx-surface-d', Math.round(density) + '%')
      root.style.setProperty('--fx-surface-l', Math.round(Math.min(97, Math.max(active ? 55 : 90, density + 18))) + '%')
      // On Windows the whole frame is repainted with the sidebar fill token, so
      // its floor is what actually dims a wallpaper; keep it near zero.
      root.style.setProperty('--fx-side-d', Math.round(Math.max(active ? 1 : 40, density * (active ? 0.6 : 1) - (active ? 0 : 12))) + '%')
      root.style.setProperty('--fx-side-l', Math.round(Math.min(95, Math.max(active ? 42 : 78, density + 2))) + '%')
      root.style.setProperty('--fx-wall-bright', (0.9 + (state.wallBright / 100) * 3.9).toFixed(2))

      if (playlist.length > 0) {
        // The playlist owns the backdrop; its videos are drawn by the video layer.
        root.setAttribute('data-dsh-neon-wall', 'video')
        root.style.removeProperty('--fx-wall')
      } else if (wall) {
        if (wall.kind === 'video') {
          root.setAttribute('data-dsh-neon-wall', 'video')
          root.style.removeProperty('--fx-wall')
        } else {
          root.setAttribute('data-dsh-neon-wall', 'on')
          root.style.setProperty('--fx-wall', 'url("' + wall.url.replace(/"/g, '%22') + '")')
        }
      } else {
        root.removeAttribute('data-dsh-neon-wall')
        root.style.removeProperty('--fx-wall')
      }
    }

    function clearDocument() {
      const root = document.documentElement
      if (!root) return
      root.removeAttribute(ATTR)
      root.removeAttribute(ATTR_FRAME)
      root.removeAttribute(ATTR_SCAN)
      root.removeAttribute('data-dsh-neon-wall')
      root.classList.remove('dshneon-wall-in')
      for (const name of [
        '--fx-glow',
        '--fx-breathe',
        '--fx-sweep',
        '--fx-surface-d',
        '--fx-surface-l',
        '--fx-side-d',
        '--fx-side-l',
        '--fx-accent',
        '--fx-accent-2',
        '--fx-wall',
        '--fx-wall-bright',
      ]) {
        root.style.removeProperty(name)
      }
    }

    /* ------------------------------------------------------------------ *
     * Panel components
     * ------------------------------------------------------------------ */

    function Switch(props) {
      const disabled = props.disabled === true
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          disabled: disabled,
          'aria-checked': props.checked ? 'true' : 'false',
          'aria-label': props.label,
          className: 'dshneon-switch' + (props.checked ? ' is-on' : ''),
          onClick: () => {
            if (!disabled) props.onChange(!props.checked)
          },
        },
        h('span', { className: 'dshneon-switch__knob' }),
      )
    }

    function Range(props) {
      return h(
        'div',
        { className: 'dshneon-range-row' },
        h('input', {
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          value: props.value,
          disabled: props.disabled === true,
          'aria-label': props.label,
          className: 'dshneon-range',
          onChange: (event) => props.onChange(Number(event.target.value)),
        }),
        h('span', { className: 'dshneon-range__val' }, props.value + '%'),
      )
    }

    /** Where the panel should hang: just under the trigger, kept on screen. */
    function anchorFor(element) {
      const rect = element.getBoundingClientRect()
      const width = Math.min(372, window.innerWidth - 20)
      const right = Math.max(
        10,
        Math.min(Math.round(window.innerWidth - rect.right), Math.round(window.innerWidth - width - 12)),
      )
      return { top: Math.round(rect.bottom) + 8, right }
    }

    function WallpaperSection(props) {
      const tr = props.tr
      const [state, setState] = React.useState(() => wallStore.state)
      const [hover, setHover] = React.useState('')

      React.useEffect(() => wallStore.subscribe(() => setState(wallStore.state)), [])
      React.useEffect(() => {
        if (!wallStore.state.loaded && !wallStore.state.loading) loadWalls(wallStore.state.source, 1, false)
      }, [])

      const current = props.wall
      const playlist = Array.isArray(props.playlist) ? props.playlist : []
      const selectedIds = new Set(playlist.map((entry) => entry.id))
      const items = state.items
      const lastPage = Math.max(1, state.lastPage || 1)
      const canMore = !state.loading && state.page < lastPage
      const kind = state.kind === 'video' ? 'video' : 'image'
      const imageChips = WALL_SOURCES.filter((source) => source.kind === 'image')
      const clipChips = WALL_SOURCES.filter((source) => source.kind === 'video' && source.group === 'clips')
      const animeChips = WALL_SOURCES.filter((source) => source.kind === 'video' && source.group === 'anime')

      const chip = (source) =>
        h(
          'button',
          {
            key: source.id,
            type: 'button',
            className: 'dshneon-chip' + (state.source === source.id ? ' is-active' : ''),
            'aria-pressed': state.source === source.id ? 'true' : 'false',
            onClick: () => loadWalls(source.id, 1, false),
          },
          tr(source.key),
        )

      return h(
        'div',
        { className: 'dshneon-section' },
        h(
          'div',
          { className: 'dshneon-row' },
          h(
            'div',
            { className: 'dshneon-row__text' },
            h('span', { className: 'dshneon-row__label' }, tr('wall')),
            h(
              'span',
              { className: 'dshneon-row__hint' },
              kind === 'video' ? tr('wallVideoHint') : tr('wallHint'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dshneon-walltabs', role: 'group', 'aria-label': tr('wall') },
          h(
            'button',
            {
              type: 'button',
              className: 'dshneon-chip' + (kind === 'image' ? ' is-active' : ''),
              'aria-pressed': kind === 'image' ? 'true' : 'false',
              onClick: () => loadWalls('featured', 1, false),
            },
            tr('wallTabImage'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dshneon-chip' + (kind === 'video' ? ' is-active' : ''),
              'aria-pressed': kind === 'video' ? 'true' : 'false',
              onClick: () => loadWalls('dynamic', 1, false),
            },
            tr('wallTabVideo'),
          ),
        ),
        kind === 'image'
          ? h('div', { className: 'dshneon-wallbar' }, imageChips.map(chip))
          : h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dshneon-wallbar' },
                h('span', { className: 'dshneon-wallgroup-label' }, tr('wallGroupClips')),
                clipChips.map(chip),
              ),
              h(
                'div',
                { className: 'dshneon-wallbar' },
                h('span', { className: 'dshneon-wallgroup-label' }, tr('wallGroupAnime')),
                animeChips.map(chip),
              ),
            ),
        items.length
          ? h(
              'div',
              { className: 'dshneon-walls' },
              items.map((item) => {
                const isVideo = item.kind === 'video'
                const active = Boolean(current && current.id === item.id)
                return h(
                  'button',
                  {
                    key: item.id,
                    type: 'button',
                    className:
                      'dshneon-wall' + (active ? ' is-active' : '') + (isVideo ? ' is-video' : ''),
                    title: (isVideo ? tr('wallVideo') + ' · ' : '') + (item.title || ''),
                    'aria-label': item.title || tr('wall'),
                    onMouseEnter: () => isVideo && setHover(item.id),
                    onMouseLeave: () => isVideo && setHover(''),
                    onFocus: () => isVideo && setHover(item.id),
                    onBlur: () => isVideo && setHover(''),
                    onClick: () => props.onApply(item),
                  },
                  isVideo && hover === item.id
                    ? h('video', {
                        className: 'dshneon-wall__video',
                        src: proxyWallUrl(item.preview, false),
                        muted: true,
                        loop: true,
                        autoPlay: true,
                        playsInline: true,
                        preload: 'none',
                      })
                    : h('img', {
                        src: proxyWallUrl(item.thumb, item.direct === true),
                        alt: '',
                        loading: 'lazy',
                        draggable: false,
                      }),
                  isVideo
                    ? h('span', { className: 'dshneon-wall__badge', 'aria-hidden': 'true' }, '\u25b6')
                    : null,
                  isVideo
                    ? h(
                        'span',
                        {
                          className: 'dshneon-wall__check' + (selectedIds.has(item.id) ? ' is-on' : ''),
                          role: 'checkbox',
                          'aria-checked': selectedIds.has(item.id) ? 'true' : 'false',
                          'aria-label': tr('wallCheck'),
                          title: tr('wallCheck'),
                          onClick: (event) => {
                            event.stopPropagation()
                            props.onToggle(item)
                          },
                        },
                        selectedIds.has(item.id) ? '\u2713' : '+',
                      )
                    : null,
                  isVideo && Number(item.score) >= 300
                    ? h(
                        'span',
                        { className: 'dshneon-wall__score', 'aria-hidden': 'true' },
                        Number(item.score) >= 1000
                          ? (Number(item.score) / 1000).toFixed(1) + 'k'
                          : String(Math.round(Number(item.score))),
                      )
                    : null,
                )
              }),
            )
          : null,
        state.loading ? h('div', { className: 'dshneon-row__hint' }, tr('wallLoading')) : null,
        playlist.length > 0 || (current && current.kind === 'video')
          ? h(
              'div',
              { className: 'dshneon-row__hint' },
              tr('videoStatusLabel') +
                ' · ' +
                (state.videoStatus === 'playing'
                  ? tr('videoPlaying')
                  : state.videoStatus === 'paused'
                    ? tr('videoPaused')
                    : state.videoStatus === 'error'
                      ? tr('videoError')
                      : tr('videoLoading')),
            )
          : null,
        h(
          'div',
          { className: 'dshneon-wallbar dshneon-wallbar--foot' },
          h(
            'button',
            {
              type: 'button',
              className: 'dshneon-reset dshneon-wallmore',
              disabled: !canMore,
              onClick: () => loadWalls(state.source, state.page + 1, true),
            },
            tr('wallMore'),
          ),
          h('span', { className: 'dshneon-row__hint' }, state.page + ' / ' + lastPage),
        ),
        state.error
          ? h(
              'div',
              { className: 'dshneon-row__hint' },
              state.error === 'load' ? tr('wallError') : tr('wallFallback'),
            )
          : null,
        current
          ? h(
              'div',
              { className: 'dshneon-wallbar' },
              h('span', { className: 'dshneon-row__label' }, tr('wallBright')),
              h(Range, {
                value: props.bright,
                label: tr('wallBright'),
                onChange: props.onBright,
              }),
            )
          : null,
        playlist.length > 0
          ? h(
              'div',
              { className: 'dshneon-wallfoot' },
              h(
                'span',
                { className: 'dshneon-row__hint' },
                tr('playlistActive') + ' · ' + playlist.length + ' · ' + tr('playlistHint'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshneon-reset',
                  onClick: () => props.onClearPlaylist(),
                },
                tr('playlistClear'),
              ),
            )
          : null,
        current && current.kind === 'video'
          ? h(
              'div',
              { className: 'dshneon-row' },
              h(
                'div',
                { className: 'dshneon-row__text' },
                h('span', { className: 'dshneon-row__label' }, tr('wallLoop')),
              ),
              h(Switch, {
                checked: props.loop !== false,
                label: tr('wallLoop'),
                onChange: props.onLoop,
              }),
            )
          : null,
        current
          ? h(
              'div',
              { className: 'dshneon-wallfoot' },
              h(
                'span',
                { className: 'dshneon-row__hint' },
                (current.kind === 'video' ? tr('wallVideo') + ' · ' : '') +
                  (current.title ? current.title + ' · ' : '') +
                  tr('wallCurrent'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshneon-reset',
                  onClick: () => props.onClear(),
                },
                tr('wallClear'),
              ),
            )
          : null,
      )
    }

    function Overlay(props) {
      const tr = makeTranslator(props && props.t)
      const [state, setState] = React.useState(() => store.get())
      const [view, setView] = React.useState(() => ({ open: ui.open, anchor: ui.anchor }))
      const [, tick] = React.useState(0)
      const panelRef = React.useRef(null)

      const closePanel = () => {
        const trigger = ui.trigger
        ui.hide()
        if (trigger && typeof trigger.focus === 'function') trigger.focus()
      }

      React.useEffect(() => {
        const offSettings = store.subscribe(() => setState(store.get()))
        const offUi = ui.subscribe(() => setView({ open: ui.open, anchor: ui.anchor }))
        return () => {
          offSettings()
          offUi()
        }
      }, [])

      React.useEffect(() => {
        if (!view.open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') closePanel()
        }
        const onPointerDown = (event) => {
          const panel = panelRef.current
          if (panel && typeof panel.contains === 'function' && panel.contains(event.target)) return
          const trigger = ui.trigger
          if (trigger && typeof trigger.contains === 'function' && trigger.contains(event.target)) return
          ui.hide()
        }
        // Keep the "current period" line honest while the panel stays open.
        const clock = window.setInterval(() => tick((value) => value + 1), 30 * 1000)
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('pointerdown', onPointerDown, true)
        const frame = window.requestAnimationFrame(() => {
          const panel = panelRef.current
          if (panel && typeof panel.focus === 'function') panel.focus()
        })
        return () => {
          window.clearInterval(clock)
          window.cancelAnimationFrame(frame)
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [view.open])

      const update = (patch) => store.set(patch)
      const pool = state.category === 'all' ? SKINS : SKINS.filter((skin) => skin.cat === state.category)
      const period = PERIODS[periodNow()]
      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const frame =
        state.enabled && state.frame
          ? h(
              'div',
              { className: 'dshneon-frame', 'aria-hidden': 'true', style: { pointerEvents: 'none' } },
              h('div', { className: 'dshneon-frame__ring' }),
              MASK_OK ? h('div', { className: 'dshneon-frame__beam' }) : null,
              h('div', { className: 'dshneon-frame__sweep' }),
              h('i', { className: 'dshneon-frame__corner dshneon-frame__corner--tl' }),
              h('i', { className: 'dshneon-frame__corner dshneon-frame__corner--tr' }),
              h('i', { className: 'dshneon-frame__corner dshneon-frame__corner--bl' }),
              h('i', { className: 'dshneon-frame__corner dshneon-frame__corner--br' }),
            )
          : null

      const available = view.anchor
        ? Math.max(240, window.innerHeight - view.anchor.top - 18)
        : 560

      const panel = view.open
        ? h(
            'div',
            {
              className: 'dshneon-panel',
              role: 'dialog',
              'aria-modal': 'false',
              'aria-label': tr('title'),
              ref: panelRef,
              tabIndex: -1,
              style: { pointerEvents: 'auto', maxHeight: available + 'px' },
            },
            h(
              'div',
              { className: 'dshneon-head' },
              h('span', { className: 'dshneon-head__dot' }),
              h(
                'h3',
                null,
                tr('title'),
                h('span', { className: 'dshneon-head__sub' }, tr('subtitle')),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshneon-close',
                  'aria-label': tr('close'),
                  onClick: closePanel,
                },
                '\u00d7',
              ),
            ),

            h(
              'div',
              { className: 'dshneon-tabs', role: 'group', 'aria-label': tr('title') },
              h(
                'button',
                {
                  type: 'button',
                  'aria-pressed': state.category === 'all' ? 'true' : 'false',
                  className: 'dshneon-chip' + (state.category === 'all' ? ' is-active' : ''),
                  onClick: () => update({ category: 'all' }),
                },
                tr('all'),
              ),
              CATEGORIES.map((cat) =>
                h(
                  'button',
                  {
                    key: cat.id,
                    type: 'button',
                    'aria-pressed': state.category === cat.id ? 'true' : 'false',
                    className: 'dshneon-chip' + (state.category === cat.id ? ' is-active' : ''),
                    onClick: () => update({ category: cat.id }),
                  },
                  catLabel(cat),
                ),
              ),
            ),

            h(
              'div',
              { className: 'dshneon-grid' },
              pool.map((skin) =>
                h(
                  'button',
                  {
                    key: skin.id,
                    type: 'button',
                    className: 'dshneon-card' + (state.skin === skin.id ? ' is-active' : ''),
                    'aria-pressed': state.skin === skin.id ? 'true' : 'false',
                    title: tr('cardHint'),
                    onClick: () => update({ skin: skin.id }),
                  },
                  h('span', {
                    className: 'dshneon-card__art',
                    style: {
                      background:
                        'radial-gradient(120% 120% at 18% 12%, ' +
                        skin.a +
                        '66, transparent 58%), radial-gradient(120% 120% at 84% 88%, ' +
                        skin.b +
                        '55, transparent 62%), #070a12',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07), 0 0 14px ' + skin.a + '33',
                    },
                  }),
                  h(
                    'span',
                    { className: 'dshneon-card__meta' },
                    h('b', null, skinName(skin)),
                    h(
                      'i',
                      { className: 'dshneon-card__badge' },
                      state.skin === skin.id ? tr('nowUse') : catLabel(CAT_BY_ID.get(skin.cat)),
                    ),
                  ),
                ),
              ),
            ),

            h(WallpaperSection, {
              tr,
              wall: state.wall,
              bright: state.wallBright,
              loop: state.wallLoop,
              playlist: state.playlist,
              onBright: (value) => update({ wallBright: value }),
              onLoop: (value) => update({ wallLoop: value }),
              onToggle: togglePlaylist,
              onClearPlaylist: () => store.set({ playlist: [] }),
              onApply: applyWallpaper,
              onClear: () => store.set({ wall: null }),
            }),

            h(
              'div',
              { className: 'dshneon-section' },
              h(
                'div',
                { className: 'dshneon-row' },
                h(
                  'div',
                  { className: 'dshneon-row__text' },
                  h('span', { className: 'dshneon-row__label' }, tr('autoRotate')),
                  h('span', { className: 'dshneon-row__hint' }, tr('autoRotateHint')),
                ),
                h(Switch, {
                  checked: state.rotate,
                  label: tr('autoRotate'),
                  onChange: (value) => update({ rotate: value }),
                }),
              ),
              h(
                'div',
                { className: 'dshneon-row' },
                h('span', { className: 'dshneon-row__label' }, tr('interval')),
                h(
                  'select',
                  {
                    className: 'dshneon-select',
                    value: String(state.rotateSeconds),
                    'aria-label': tr('interval'),
                    onChange: (event) => update({ rotateSeconds: Number(event.target.value) }),
                  },
                  ROTATE_CHOICES.map((seconds) =>
                    h('option', { key: seconds, value: String(seconds) }, seconds + tr('seconds')),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'dshneon-row' },
                h(
                  'div',
                  { className: 'dshneon-row__text' },
                  h('span', { className: 'dshneon-row__label' }, tr('schedule')),
                  h(
                    'span',
                    { className: 'dshneon-row__hint' },
                    `${tr(period.key)} · ${skinName(SKIN_BY_ID.get(period.skin))} \u2014 ${tr('scheduleHint')}`,
                  ),
                ),
                h(Switch, {
                  checked: state.schedule,
                  label: tr('schedule'),
                  onChange: (value) => update({ schedule: value }),
                }),
              ),
              state.schedule
                ? h('div', { className: 'dshneon-row__hint' }, tr('manualOverride'))
                : null,
              state.rotate && state.schedule
                ? h('div', { className: 'dshneon-row__hint' }, tr('scheduleWins'))
                : null,
            ),

            h(
              'div',
              { className: 'dshneon-section dshneon-section--last' },
              h(
                'div',
                { className: 'dshneon-row' },
                h(
                  'div',
                  { className: 'dshneon-row__text' },
                  h('span', { className: 'dshneon-row__label' }, tr('frame')),
                  h('span', { className: 'dshneon-row__hint' }, tr('frameHint')),
                ),
                h(Switch, {
                  checked: state.frame,
                  label: tr('frame'),
                  onChange: (value) => update({ frame: value }),
                }),
              ),
              h(
                'div',
                { className: 'dshneon-row' },
                h(
                  'div',
                  { className: 'dshneon-row__text' },
                  h('span', { className: 'dshneon-row__label' }, tr('scan')),
                  h('span', { className: 'dshneon-row__hint' }, tr('scanHint')),
                ),
                h(Switch, {
                  checked: state.scan,
                  disabled: !state.frame,
                  label: tr('scan'),
                  onChange: (value) => update({ scan: value }),
                }),
              ),
              h('div', { className: 'dshneon-row__label' }, tr('glow')),
              h(Range, {
                value: state.glow,
                disabled: !state.frame,
                label: tr('glow'),
                onChange: (v) => update({ glow: v }),
              }),
              h('div', { className: 'dshneon-row__label' }, tr('speed')),
              h(Range, {
                value: state.speed,
                disabled: !state.frame,
                label: tr('speed'),
                onChange: (v) => update({ speed: v }),
              }),
              h(
                'div',
                { className: 'dshneon-row' },
                h(
                  'div',
                  { className: 'dshneon-row__text' },
                  h('span', { className: 'dshneon-row__label' }, tr('backdrop')),
                  h('span', { className: 'dshneon-row__hint' }, tr('backdropHint')),
                ),
              ),
              h(Range, {
                value: state.backdrop,
                label: tr('backdrop'),
                onChange: (v) => update({ backdrop: v }),
              }),
              reduced ? h('div', { className: 'dshneon-row__hint' }, tr('reducedMotion')) : null,
            ),

            h(
              'div',
              { className: 'dshneon-foot' },
              h(
                'span',
                { className: 'dshneon-foot__toggle' },
                h(Switch, {
                  checked: state.enabled,
                  label: tr('enabled'),
                  onChange: (value) => update({ enabled: value }),
                }),
                h('span', null, tr('enabled')),
              ),
              h(
                'span',
                { className: 'dshneon-foot__actions' },
                h('span', { className: 'dshneon-foot__ver' }, 'v0.11.3'),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshneon-reset',
                    onClick: () => store.set({ ...DEFAULTS }),
                  },
                  tr('reset'),
                ),
              ),
            ),
          )
        : null

      return h(
        React.Fragment,
        null,
        frame,
        view.open && view.anchor
          ? h(
              'div',
              {
                className: 'dshneon-pop',
                style: {
                  top: view.anchor.top + 'px',
                  right: view.anchor.right + 'px',
                  pointerEvents: 'none',
                },
              },
              panel,
            )
          : null,
      )
    }

    function SettingsRow(props) {
      const tr = makeTranslator(props && props.t)
      const openPanel = (event) => {
        ui.show(anchorFor(event.currentTarget), event.currentTarget)
      }
      return h(
        'div',
        { className: 'dshneon-setting' },
        h(
          'div',
          { className: 'dshneon-setting__text' },
          h('div', { className: 'dshneon-setting__title' }, tr('title')),
          h('span', { className: 'dshneon-setting__hint' }, tr('settingsHint')),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'dshneon-setting__button',
            onClick: openPanel,
          },
          tr('open'),
        ),
      )
    }

    /** The tab-row trigger that sits beside the views overflow button. */
    function HeaderButton(props) {
      const tr = makeTranslator(props && props.t)
      const [, force] = React.useState(0)
      React.useEffect(() => ui.subscribe(() => force((value) => value + 1)), [])

      const toggle = (event) => {
        if (ui.open) {
          ui.hide()
          return
        }
        ui.show(anchorFor(event.currentTarget), event.currentTarget)
      }

      return h(
        'button',
        {
          type: 'button',
          className: 'dshneon-trigger',
          'aria-label': tr('open'),
          'aria-haspopup': 'dialog',
          'aria-expanded': ui.open ? 'true' : 'false',
          title: tr('title'),
          onClick: toggle,
        },
        h('span', { className: 'dshneon-trigger__glyph', 'aria-hidden': 'true' }, '\u2726'),
        h('span', { className: 'dshneon-trigger__label' }, tr('triggerLabel')),
      )
    }

    function nextSkinOf(state) {
      const pool = state.category === 'all' ? SKINS : SKINS.filter((skin) => skin.cat === state.category)
      if (pool.length < 2) return state.skin
      const index = pool.findIndex((skin) => skin.id === state.skin)
      return pool[(index + 1) % pool.length].id
    }

    /* ------------------------------------------------------------------ *
     * Wallpaper library
     * ------------------------------------------------------------------ */

    const WALL_API = '/neon-theme/api'
    const WALL_CACHE_PREFIX = 'dsh-neon-theme.walls.'
    const WALL_CACHE_TTL = 30 * 60 * 1000

    const WALL_SOURCES = [
      { id: 'featured', kind: 'image', key: 'wallFeatured' },
      { id: 'people', kind: 'image', key: 'wallPeople' },
      { id: 'cartoon', kind: 'image', key: 'wallCartoon' },
      { id: 'animal', kind: 'image', key: 'wallAnimal' },
      { id: 'anime', kind: 'image', key: 'wallAnime' },
      { id: 'cyber', kind: 'image', key: 'wallCyber' },
      { id: 'space', kind: 'image', key: 'wallSpace' },
      { id: 'nature', kind: 'image', key: 'wallNature' },
      { id: 'bing', kind: 'image', key: 'wallDaily' },
      { id: 'picsum', kind: 'image', key: 'wallRandom' },
      { id: 'dynamic', kind: 'video', group: 'clips', key: 'wallDynamic' },
      { id: 'dynamic:animals', kind: 'video', group: 'clips', key: 'wallVideoAnimals' },
      { id: 'dynamic:people', kind: 'video', group: 'clips', key: 'wallVideoPeople' },
      { id: 'dynamic:cartoon', kind: 'video', group: 'clips', key: 'wallVideoCartoon' },
      { id: 'dynamic:city', kind: 'video', group: 'clips', key: 'wallVideoCity' },
      { id: 'dynamic:space', kind: 'video', group: 'clips', key: 'wallVideoSpace' },
      { id: 'animeclip:top', kind: 'video', group: 'anime', key: 'animeTop' },
      { id: 'animeclip:demon', kind: 'video', group: 'anime', key: 'animeDemon' },
      { id: 'animeclip:naruto', kind: 'video', group: 'anime', key: 'animeNaruto' },
      { id: 'animeclip:onepiece', kind: 'video', group: 'anime', key: 'animeOnePiece' },
      { id: 'animeclip:jujutsu', kind: 'video', group: 'anime', key: 'animeJujutsu' },
      { id: 'animeclip:aot', kind: 'video', group: 'anime', key: 'animeAoT' },
      { id: 'animeclip:bleach', kind: 'video', group: 'anime', key: 'animeBleach' },
      { id: 'animeclip:chainsaw', kind: 'video', group: 'anime', key: 'animeChainsaw' },
      { id: 'animeclip:frieren', kind: 'video', group: 'anime', key: 'animeFrieren' },
      { id: 'animeclip:mha', kind: 'video', group: 'anime', key: 'animeMHA' },
      { id: 'animeclip:slam', kind: 'video', group: 'anime', key: 'animeSlam' },
      { id: 'animeclip:dragon', kind: 'video', group: 'anime', key: 'animeDragon' },
      { id: 'animeclip:tennis', kind: 'video', group: 'anime', key: 'animeTennis' },
      { id: 'animeclip:yuyu', kind: 'video', group: 'anime', key: 'animeYuYu' },
    ]

    // Shown when the wallpaper API cannot be reached, so the picker is never
    // empty. These are plain hotlinks, which the browser can draw directly.
    const FALLBACK_WALLS = [
      { id: 'wh-gw1rqe', thumb: 'https://th.wallhaven.cc/small/gw/gw1rqe.jpg', full: 'https://w.wallhaven.cc/full/gw/wallhaven-gw1rqe.jpg', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-e8vmmr', thumb: 'https://th.wallhaven.cc/small/e8/e8vmmr.jpg', full: 'https://w.wallhaven.cc/full/e8/wallhaven-e8vmmr.jpg', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-qrpygl', thumb: 'https://th.wallhaven.cc/small/qr/qrpygl.jpg', full: 'https://w.wallhaven.cc/full/qr/wallhaven-qrpygl.jpg', w: 4096, h: 2302, source: 'wallhaven', title: '4096×2302', direct: true },
      { id: 'wh-lyg6gl', thumb: 'https://th.wallhaven.cc/small/ly/lyg6gl.jpg', full: 'https://w.wallhaven.cc/full/ly/wallhaven-lyg6gl.png', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-d8vrwm', thumb: 'https://th.wallhaven.cc/small/d8/d8vrwm.jpg', full: 'https://w.wallhaven.cc/full/d8/wallhaven-d8vrwm.jpg', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-7jmgey', thumb: 'https://th.wallhaven.cc/small/7j/7jmgey.jpg', full: 'https://w.wallhaven.cc/full/7j/wallhaven-7jmgey.png', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-216p8y', thumb: 'https://th.wallhaven.cc/small/21/216p8y.jpg', full: 'https://w.wallhaven.cc/full/21/wallhaven-216p8y.jpg', w: 3840, h: 2160, source: 'wallhaven', title: '3840×2160', direct: true },
      { id: 'wh-og7p79', thumb: 'https://th.wallhaven.cc/small/og/og7p79.jpg', full: 'https://w.wallhaven.cc/full/og/wallhaven-og7p79.jpg', w: 3840, h: 3840, source: 'wallhaven', title: '3840×3840', direct: true },
    ]

    const wallStore = {
      state: {
        source: 'featured',
        kind: 'image',
        page: 1,
        seed: 0,
        lastPage: 1,
        items: [],
        loaded: false,
        loading: false,
        error: '',
        videoStatus: '',
      },
      listeners: new Set(),
      patch(patch) {
        this.state = { ...this.state, ...patch }
        for (const listener of this.listeners) {
          try {
            listener()
          } catch (error) {
            /* ignore one broken listener */
          }
        }
      },
      subscribe(listener) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
      },
    }

    function proxyWallUrl(url, direct) {
      if (!url) return ''
      if (direct || url.startsWith('/') || url.startsWith('data:')) return url
      return WALL_API + '/img?src=' + encodeURIComponent(url)
    }

    function readWallCache(key) {
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const value = JSON.parse(raw)
        if (!value || typeof value.at !== 'number' || Date.now() - value.at > WALL_CACHE_TTL) return null
        if (!Array.isArray(value.items) || value.items.length === 0) return null
        return value
      } catch (error) {
        return null
      }
    }

    let wallTicket = 0

    function mergeWallItems(base, extra) {
      const seen = new Set()
      const out = []
      for (const item of [...base, ...extra]) {
        if (!item || !item.id || seen.has(item.id)) continue
        seen.add(item.id)
        out.push(item)
      }
      return out
    }

    async function loadWalls(sourceId, page, append) {
      const entry = WALL_SOURCES.find((candidate) => candidate.id === sourceId) || WALL_SOURCES[0]
      const parts = entry.id.split(':')
      const base = parts[0]
      const cat = parts[1] || ''
      const nextPage = Math.max(1, Number(page) || 1)
      const keep = append === true ? wallStore.state.items : []
      const seed =
        append === true && wallStore.state.seed > 0
          ? wallStore.state.seed
          : Math.floor(Math.random() * 900000) + 1
      const ticket = ++wallTicket
      wallStore.patch({
        source: entry.id,
        kind: entry.kind,
        page: nextPage,
        seed,
        loading: true,
        error: '',
        items: keep,
      })

      const cacheKey = WALL_CACHE_PREFIX + entry.id + '.' + seed + '.' + nextPage
      const cached = readWallCache(cacheKey)
      if (cached) {
        if (ticket !== wallTicket) return
        wallStore.patch({
          items: mergeWallItems(keep, cached.items),
          page: nextPage,
          lastPage: cached.lastPage || nextPage,
          loaded: true,
          loading: false,
          error: '',
        })
        return
      }

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 15000)
        let response
        try {
          const query =
            WALL_API +
            '/list?source=' +
            encodeURIComponent(base) +
            '&page=' +
            nextPage +
            '&seed=' +
            seed +
            (cat
              ? (base === 'animeclip' ? '&series=' : '&cat=') + encodeURIComponent(cat)
              : '')
          response = await fetch(query, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
          })
        } finally {
          clearTimeout(timer)
        }
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const payload = await response.json()
        const items = Array.isArray(payload.items)
          ? payload.items.filter((item) => item && item.thumb && item.full)
          : []
        if (items.length === 0) throw new Error('empty')
        if (ticket !== wallTicket) return
        const lastPage = Number(payload.lastPage) || nextPage
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), items, lastPage }))
        } catch (error) {
          /* a full storage just disables the list cache */
        }
        wallStore.patch({
          items: mergeWallItems(keep, items),
          page: nextPage,
          lastPage,
          loaded: true,
          loading: false,
          error: '',
        })
      } catch (error) {
        if (ticket !== wallTicket) return
        wallStore.patch({
          items: keep.length > 0 ? keep : FALLBACK_WALLS,
          loaded: true,
          loading: false,
          error: 'fallback',
        })
      }
    }

    function preloadImage(url) {
      return new Promise((resolve) => {
        if (typeof Image === 'undefined') {
          resolve(true)
          return
        }
        const probe = new Image()
        probe.onload = () => resolve(true)
        probe.onerror = () => resolve(false)
        probe.src = url
      })
    }

    /** Mean luminance (0-255) of the picture, measured once when applied. */
    async function measureLuminance(url) {
      try {
        if (typeof Image === 'undefined' || typeof document === 'undefined') return null
        const image = new Image()
        image.src = url
        await new Promise((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('image failed'))
        })
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 27
        const context2d = canvas.getContext('2d')
        if (!context2d) return null
        context2d.drawImage(image, 0, 0, 48, 27)
        const data = context2d.getImageData(0, 0, 48, 27).data
        let total = 0
        let count = 0
        for (let index = 0; index < data.length; index += 4) {
          total += 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
          count += 1
        }
        return count > 0 ? total / count : null
      } catch (error) {
        return null
      }
    }

    async function applyWallpaper(item) {
      if (!item || !item.full) return
      const direct = item.direct === true
      const isVideo = item.kind === 'video'
      let url = proxyWallUrl(item.full, direct)
      if (!isVideo) {
        const ok = await preloadImage(url)
        if (!ok && item.full && item.full !== url) {
          // The proxy may be unavailable in a stripped-down profile; try the
          // library URL directly once before giving up.
          if (await preloadImage(item.full)) url = item.full
        } else if (!ok) {
          wallStore.patch({ error: 'load' })
          return
        }
      }
      wallStore.patch({ error: '' })

      // Dark wallpapers were the main "it is still too dim" complaint: measure
      // the picture and lift the brightness towards a comfortable mean.
      let brightness = store.get().wallBright
      if (!isVideo) {
        const mean = await measureLuminance(url)
        if (typeof mean === 'number' && mean > 0) {
          const factor = Math.min(3.6, Math.max(1.2, 205 / mean))
          brightness = Math.round(Math.min(100, Math.max(0, ((factor - 0.9) / 3.9) * 100)))
        }
      }

      store.set({
        wallBright: brightness,
        wall: {
          id: String(item.id || ''),
          kind: isVideo ? 'video' : 'image',
          url,
          thumb: proxyWallUrl(item.thumb, direct),
          title: String(item.title || ''),
          source: String(item.source || ''),
        },
      })
      flashWallpaper()
    }

    function togglePlaylist(item) {
      if (!item || !item.full) return
      const state = store.get()
      const list = Array.isArray(state.playlist) ? [...state.playlist] : []
      const index = list.findIndex((entry) => entry.id === item.id)
      if (index >= 0) {
        list.splice(index, 1)
      } else {
        if (list.length >= 12) {
          wallStore.patch({ error: 'limit' })
          return
        }
        const direct = item.direct === true
        list.push({
          id: String(item.id || ''),
          kind: 'video',
          url: proxyWallUrl(item.full, direct),
          thumb: proxyWallUrl(item.thumb, direct),
          title: String(item.title || ''),
          source: String(item.source || ''),
        })
      }
      playlistIndex = 0
      store.set({ playlist: list })
    }

    function flashWallpaper() {
      const root = document.documentElement
      if (!root) return
      root.classList.remove('dshneon-wall-in')
      // Force a style flush so the fade animation restarts on every apply.
      void root.offsetWidth
      root.classList.add('dshneon-wall-in')
    }

    /* ---- video wallpapers -------------------------------------------------
     * A <video> cannot be painted from CSS, so the one video layer is a real
     * element appended to the body at z-index -1 and removed again when the
     * chosen wallpaper is not a video or the plugin unloads.
     */
    let videoLayer = null
    let playlistIndex = 0
    let warmVideo = null
    let stallTimer = null
    let visibilityHandler = null

    function clearWarmVideo() {
      if (!warmVideo) return
      try {
        warmVideo.removeAttribute('src')
        warmVideo.load()
        warmVideo.remove()
      } catch (error) {
        /* ignore */
      }
      warmVideo = null
    }

    /** Preload the next playlist clip so switching never waits for the network. */
    function warmPlaylist(playlist, index) {
      if (!document.body) return
      if (playlist.length < 2) {
        clearWarmVideo()
        return
      }
      const next = playlist[(index + 1) % playlist.length]
      if (!next || !next.url) {
        clearWarmVideo()
        return
      }
      if (warmVideo && warmVideo.getAttribute('src') === next.url) return
      clearWarmVideo()
      const probe = document.createElement('video')
      probe.preload = 'auto'
      probe.muted = true
      probe.setAttribute('aria-hidden', 'true')
      probe.setAttribute('muted', '')
      probe.style.display = 'none'
      probe.src = next.url
      document.body.appendChild(probe)
      warmVideo = probe
    }

    function activePlaylist(state) {
      if (!state.enabled || !Array.isArray(state.playlist)) return []
      return state.playlist.filter((item) => item && item.url)
    }

    /** If a clip stops making progress, nudge it once (reload + play). */
    function armStall() {
      if (stallTimer) window.clearTimeout(stallTimer)
      stallTimer = window.setTimeout(() => {
        stallTimer = null
        const layer = videoLayer
        if (!layer) return
        const video = layer.querySelector('video')
        if (!video) return
        if (!video.paused && video.readyState >= 3) return
        try {
          video.load()
          const again = video.play()
          if (again && typeof again.catch === 'function') again.catch(() => undefined)
        } catch (error) {
          /* ignore */
        }
      }, 6000)
    }

    function syncVideoLayer(state) {
      const playlist = activePlaylist(state)
      const wall = state.enabled && state.wall && state.wall.kind === 'video' ? state.wall : null
      const wants = playlist.length > 0 || Boolean(wall && wall.url)

      if (!wants) {
        if (videoLayer) {
          videoLayer.remove()
          videoLayer = null
        }
        clearWarmVideo()
        return
      }
      if (!videoLayer && document.body) {
        const layer = document.createElement('div')
        layer.className = 'dshneon-video-layer'
        const video = document.createElement('video')
        video.className = 'dshneon-video-layer__video'
        video.muted = true
        video.playsInline = true
        video.preload = 'auto'
        video.setAttribute('muted', '')
        video.setAttribute('playsinline', '')
        video.setAttribute('aria-hidden', 'true')
        video.addEventListener('playing', () => {
          wallStore.patch({ videoStatus: 'playing' })
          if (stallTimer) {
            window.clearTimeout(stallTimer)
            stallTimer = null
          }
        })
        video.addEventListener('pause', () => wallStore.patch({ videoStatus: 'paused' }))
        video.addEventListener('waiting', () => {
          wallStore.patch({ videoStatus: 'loading' })
          armStall()
        })
        video.addEventListener('stalled', () => {
          wallStore.patch({ videoStatus: 'loading' })
          armStall()
        })
        video.addEventListener('error', () => wallStore.patch({ videoStatus: 'error' }))
        video.addEventListener('ended', () => {
          const now = store.get()
          const list = activePlaylist(now)
          if (list.length > 1) {
            playlistIndex = (playlistIndex + 1) % list.length
            syncVideoLayer(now)
            return
          }
          if (now.wallLoop === false) return
          try {
            video.currentTime = 0
          } catch (error) {
            /* ignore */
          }
          const again = video.play()
          if (again && typeof again.catch === 'function') again.catch(() => undefined)
        })
        const tint = document.createElement('span')
        tint.className = 'dshneon-video-layer__tint'
        layer.append(video, tint)
        document.body.appendChild(layer)
        videoLayer = layer
        if (!visibilityHandler) {
          visibilityHandler = () => {
            if (document.hidden) return
            const current = videoLayer && videoLayer.querySelector('video')
            if (current && current.paused && store.get().enabled) {
              const again = current.play()
              if (again && typeof again.catch === 'function') again.catch(() => undefined)
            }
          }
          document.addEventListener('visibilitychange', visibilityHandler)
        }
      }
      if (!videoLayer) return
      const video = videoLayer.querySelector('video')
      if (!video) return

      const current = playlist.length > 0 ? playlist[playlistIndex % playlist.length] : wall
      if (!current) return

      const inPlaylist = playlist.length > 0
      // A playlist advances by itself, so its clips must not loop individually.
      const loop = !inPlaylist && state.wallLoop !== false
      video.loop = loop
      if (loop) video.setAttribute('loop', '')
      else video.removeAttribute('loop')

      if (video.getAttribute('src') !== current.url) {
        video.setAttribute('poster', current.thumb || '')
        video.src = current.url
        // Paint the thumbnail behind the video so switching clips never shows
        // the dark placeholder while the next file buffers.
        if (videoLayer && current.thumb) {
          videoLayer.style.backgroundImage = 'url("' + current.thumb.replace(/"/g, '%22') + '")'
          videoLayer.style.backgroundSize = 'cover'
          videoLayer.style.backgroundPosition = 'center'
          videoLayer.style.backgroundRepeat = 'no-repeat'
        }
        try {
          video.currentTime = 0
        } catch (error) {
          /* ignore */
        }
      }
      // A chosen video wallpaper keeps playing even under "reduce motion":
      // the user picked it explicitly, and pausing left a dark paused frame.
      const play = video.play()
      if (play && typeof play.catch === 'function') play.catch(() => undefined)
      warmPlaylist(playlist, playlistIndex)
    }

    /* ---- settings file ----------------------------------------------------
     * The GUI origin changes when the desktop app picks a new port, so
     * localStorage alone forgets everything between launches. The host keeps
     * the same file across origins; localStorage stays as the instant cache.
     */
    let remoteSettingsReady = false
    let saveTimer = null

    function scheduleRemoteSave() {
      if (!remoteSettingsReady) return
      if (saveTimer !== null) window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        saveTimer = null
        try {
          fetch(WALL_API + '/settings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(store.get()),
          }).catch(() => undefined)
        } catch (error) {
          /* persistence is best effort */
        }
      }, 600)
    }

    async function loadRemoteSettings() {
      try {
        const response = await fetch(WALL_API + '/settings', { headers: { accept: 'application/json' } })
        if (!response.ok) return null
        const value = await response.json()
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null
      } catch (error) {
        return null
      }
    }

    /* ------------------------------------------------------------------ *
     * Plugin
     * ------------------------------------------------------------------ */

    function apply(ctx) {
      let rotateTimer = null
      let scheduleTimer = null

      const sync = () => {
        applyToDocument(store.get())
        syncVideoLayer(store.get())
      }

      const stopTimers = () => {
        if (rotateTimer !== null) {
          window.clearInterval(rotateTimer)
          rotateTimer = null
        }
        if (scheduleTimer !== null) {
          window.clearInterval(scheduleTimer)
          scheduleTimer = null
        }
      }

      // The persisted `lastPeriod` makes a manual pick survive a reload: the
      // schedule only moves the skin when the clock crosses into a new period.
      const applyPeriod = () => {
        const state = store.get()
        if (!state.enabled || !state.schedule) return
        const period = periodNow()
        if (period === state.lastPeriod) return
        const target = PERIODS[period]
        store.set({ skin: target.skin, lastPeriod: period })
      }

      const startTimers = () => {
        stopTimers()
        const state = store.get()
        if (!state.enabled) return
        if (state.schedule) {
          // Time of day owns the skin; rotation would fight it.
          scheduleTimer = window.setInterval(applyPeriod, 30 * 1000)
          applyPeriod()
          return
        }
        if (state.rotate) {
          rotateTimer = window.setInterval(() => {
            const current = store.get()
            if (!current.enabled || !current.rotate || current.schedule) return
            store.set({ skin: nextSkinOf(current) })
          }, state.rotateSeconds * 1000)
        }
      }

      ctx.effect(() => {
        const styleElement = installStylesheet()
        let disposed = false
        const unsubscribe = store.subscribe(() => {
          sync()
          startTimers()
        })

        sync()
        startTimers()

        // Pull the host-side settings file once; the stored values win over
        // localStorage, which a changing GUI origin may not carry over.
        loadRemoteSettings()
          .then((remote) => {
            if (disposed) return
            remoteSettingsReady = true
            if (remote && Object.keys(remote).length > 0) store.set(remote)
          })
          .catch(() => {
            if (!disposed) remoteSettingsReady = true
          })

        return () => {
          disposed = true
          unsubscribe()
          stopTimers()
          styleElement.remove()
          clearDocument()
          if (saveTimer !== null) {
            window.clearTimeout(saveTimer)
            saveTimer = null
          }
          remoteSettingsReady = false
          if (videoLayer) {
            videoLayer.remove()
            videoLayer = null
          }
          clearWarmVideo()
          if (stallTimer) {
            window.clearTimeout(stallTimer)
            stallTimer = null
          }
          if (visibilityHandler) {
            document.removeEventListener('visibilitychange', visibilityHandler)
            visibilityHandler = null
          }
        }
      })

      ctx.effect(() => {
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            const dispose = ctx.locale.register(NS, { zh: TEXT.zh, en: TEXT.en })
            return () => {
              if (typeof dispose === 'function') dispose()
            }
          }
        } catch (error) {
          /* the panel keeps its bundled dictionary when the locale service refuses */
        }
        return undefined
      })

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'neon-theme',
            order: 900,
            locale: NS,
          },
          Overlay,
        ),
      )

      ctx.slots.inject('conversation.session.header.actions', () =>
        ctx.slots.register(
          {
            name: 'conversation.session.header.actions',
            id: 'neon-theme-trigger',
            order: 10,
            locale: NS,
          },
          HeaderButton,
        ),
      )

      ctx.slots.inject('settings.general.item', () =>
        ctx.slots.register(
          {
            name: 'settings.general.item',
            id: 'neon-theme-settings',
            order: 20,
            locale: NS,
          },
          SettingsRow,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
