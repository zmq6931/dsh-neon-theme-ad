/**
 * Host half of dsh-neon-theme.
 *
 * Two jobs, both loopback-only:
 *
 *  1. `/neon-theme/api/*` proxies the free wallpaper libraries that the page
 *     cannot read itself (Wallhaven and Bing send no CORS headers).
 *     - `/list?source=...&page=N` normalizes images (Wallhaven, Bing, Picsum)
 *       and videos (Mixkit) into one item shape.
 *     - `/media?src=<encoded>` proxies and caches one image or video from an
 *       allowlisted host under `$DSH_HOME/neon-theme-cache`.
 *  2. `/neon-theme/api/settings` (exact, GET + POST) persists the theme
 *     settings to `$DSH_HOME/neon-theme-settings.json`. The GUI origin changes
 *     between launches (the port is chosen at boot), so localStorage alone
 *     would forget the chosen skin and wallpaper.
 */
import { createHash } from 'node:crypto'
import { promises as fs, createReadStream, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'

const API_PREFIX = '/neon-theme/api'
const HOME_DIR = process.env.DSH_HOME || join(homedir(), '.dsh')
const CACHE_DIR = join(HOME_DIR, 'neon-theme-cache')
const SETTINGS_FILE = join(HOME_DIR, 'neon-theme-settings.json')
const CACHE_LIMIT = 80
const MAX_CACHE_BYTES = 1.2 * 1024 * 1024 * 1024
const MAX_MEDIA_BYTES = 64 * 1024 * 1024
const MAX_CLIP_BYTES = 24 * 1024 * 1024
const MAX_AUDIO_BYTES = 40 * 1024 * 1024
const IA_TIMEOUT_MS = 2500
const MAX_SETTINGS_BYTES = 64 * 1024
const LIST_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 20000

const ALLOWED_HOSTS = new Set([
  'wallhaven.cc',
  'w.wallhaven.cc',
  'th.wallhaven.cc',
  'www.bing.com',
  'bing.com',
  'picsum.photos',
  'fastly.picsum.photos',
  'images.unsplash.com',
  'assets.mixkit.co',
  'www.sakugabooru.com',
  'sakugabooru.com',
  'archive.org',
])

function isBilibiliHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return /(^|\.)(bilibili\.com|bilivideo\.com|bilivideo\.cn|hdslb\.com)$/.test(host)
}

function isAllowedHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  // archive.org serves downloads from rotating `dn######.us.archive.org` hosts.
  return ALLOWED_HOSTS.has(host) || host.endsWith('.archive.org') || isBilibiliHost(host)
}

const MIXKIT_DEFAULT = ['nature', 'abstract', 'city', 'sci-fi', 'particles', 'space']
const MIXKIT_ALLOWED = new Set([
  ...MIXKIT_DEFAULT,
  'animals',
  'people',
  'cartoon',
  'sport',
  'water',
  'fire',
  'technology',
  'travel',
  'food',
  'summer',
  'beach',
  'pool',
  'vacation',
])

// Animation clips from Sakugabooru (fan-archived TV/movie animation), keyed by
// a short id. Several tags are merged per series so long shows contribute all
// of their arcs; `order:score` puts the community's favourite cuts first.
const ANIME_SERIES = {
  top: { label: '全网高光', tags: [] },
  demon: {
    label: '鬼灭之刃',
    tags: [
      'kimetsu_no_yaiba',
      'kimetsu_no_yaiba_mugen_train',
      'kimetsu_no_yaiba_yuukaku-hen',
      'kimetsu_no_yaiba_katanakaji_no_sato-hen',
      'kimetsu_no_yaiba_hashira_geiko-hen',
    ],
  },
  slam: {
    label: '灌篮高手',
    // TV series only: `slam_dunk_series` also tags the new movie, so the movie
    // tag is excluded to keep this the 1993 TV anime.
    tags: ['slam_dunk_series+-the_first_slam_dunk'],
  },
  slam_movie: {
    label: '灌篮剧场版',
    tags: [
      'the_first_slam_dunk',
      'slam_dunk_movie_1',
      'slam_dunk_movie_2:_zenkoku_seiha_da!_-_sakuragi_hanamichi',
    ],
  },
  dragon: {
    label: '龙珠',
    // Z / Super / the movies and GT carry the Super Saiyan set pieces; merging
    // them keeps the score-ranked top full of transformation and fight cuts.
    tags: [
      'dragon_ball',
      'dragon_ball_z',
      'dragon_ball_super',
      'dragon_ball_super:_broly',
      'dragon_ball_z:_battle_of_gods',
      'dragon_ball_z:_resurrection_f',
      'dragon_ball_episode_of_bardock',
      'dragon_ball_gt',
    ],
  },
  tennis: { label: '网球王子', tags: ['prince_of_tennis'] },
  onepiece: { label: '海贼王', tags: ['one_piece'] },
  yuyu: { label: '幽游白书', tags: ['yu_yu_hakusho'] },
  naruto: { label: '火影忍者', tags: ['naruto'] },
  bleach: { label: '死神', tags: ['bleach'] },
  jujutsu: { label: '咒术回战', tags: ['jujutsu_kaisen'] },
  aot: { label: '进击的巨人', tags: ['shingeki_no_kyojin'] },
  chainsaw: { label: '电锯人', tags: ['chainsaw_man'] },
  frieren: { label: '葬送的芙莉莲', tags: ['sousou_no_frieren'] },
  mha: { label: '我的英雄学院', tags: ['boku_no_hero_academia'] },
  haikyuu: { label: '排球少年', tags: ['haikyuu!!'] },
  kuroko: { label: '黑子的篮球', tags: ['kuroko_no_basket'] },
  bluelock: { label: '蓝色监狱', tags: ['blue_lock'] },
  opm: { label: '一拳超人', tags: ['one-punch_man'] },
  fmab: { label: '钢之炼金术师', tags: ['fullmetal_alchemist_brotherhood'] },
  vinland: { label: '冰海战记', tags: ['vinland_saga'] },
  eva: { label: '新世纪福音战士', tags: ['neon_genesis_evangelion'] },
  violet: { label: '紫罗兰永恒花园', tags: ['violet_evergarden'] },
  gintama: { label: '银魂', tags: ['gintama'] },
  slayers: {
    label: '秀逗魔导士',
    tags: ['slayers', 'slayers_try', 'slayers_next', 'slayers_revolution', 'slayers_evolution-r'],
  },
  // Cute slice-of-life / girls' club shows.
  bocchi: { label: '孤独摇滚', tags: ['bocchi_the_rock!'] },
  kon: { label: '轻音少女', tags: ['k-on!'] },
  nichijou: { label: '日常', tags: ['nichijou'] },
  maidragon: { label: '小林家的龙女仆', tags: ['kobayashi-san_chi_no_maid_dragon'] },
  hibike: { label: '吹响！上低音号', tags: ['hibike!_euphonium'] },
  luckystar: { label: '幸运星', tags: ['lucky_star'] },
  hidamari: { label: '向阳素描', tags: ['hidamari_sketch'] },
  tamako: { label: '玉子市场', tags: ['tamako_market'] },
  kyoukai: { label: '境界的彼方', tags: ['kyoukai_no_kanata'] },
  lycoris: { label: '莉可丽丝', tags: ['lycoris_recoil'] },
  yurucamp: { label: '摇曳露营', tags: ['yuru_camp'] },
  comicgirls: { label: '漫画女孩', tags: ['comic_girls'] },
  // Mature / stylish female-led action.
  gits: { label: '攻壳机动队', tags: ['ghost_in_the_shell'] },
  blacklagoon: { label: '黑礁', tags: ['black_lagoon'] },
  edgerunners: { label: '赛博朋克：边缘行者', tags: ['cyberpunk:_edgerunners'] },
  killlakill: { label: '斩服少女', tags: ['kill_la_kill'] },
  akame: { label: '斩·赤红之瞳', tags: ['akame_ga_kill!'] },
  fgo: { label: 'Fate/Grand Order', tags: ['fate/grand_order'] },
  fatestay: { label: 'Fate/stay night', tags: ['fate/stay_night'] },
  azurlane: { label: '碧蓝航线', tags: ['azur_lane'] },
  bluearchive: { label: '蔚蓝档案', tags: ['blue_archive'] },
  kancolle: { label: '舰队Collection', tags: ['kantai_collection'] },
}

const listCache = new Map()
const mixkitCache = new Map()
let cacheDirReady = null
let writesSincePrune = 0

function ensureCacheDir() {
  cacheDirReady ??= fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => undefined)
  return cacheDirReady
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function extFor(contentType) {
  if (contentType.includes('png')) return '.png'
  if (contentType.includes('webp')) return '.webp'
  if (contentType.includes('gif')) return '.gif'
  if (contentType.includes('avif')) return '.avif'
  if (contentType.includes('mp4')) return '.mp4'
  if (contentType.includes('webm')) return '.webm'
  return '.jpg'
}

const PROXY_FILE = join(HOME_DIR, 'neon-theme-proxy.txt')
let proxyCache = { at: 0, value: '' }

function proxyUrl() {
  if (Date.now() - proxyCache.at < 15000) return proxyCache.value
  let value = ''
  try {
    value = readFileSync(PROXY_FILE, 'utf8').trim()
  } catch (error) {
    value = ''
  }
  if (!value) {
    try {
      const saved = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
      value = typeof saved.proxy === 'string' ? saved.proxy.trim() : ''
    } catch (error) {
      value = ''
    }
  }
  proxyCache = { at: Date.now(), value }
  return value
}

function proxyRequest(target, init) {
  return new Promise((resolve, reject) => {
    const proxy = new URL(proxyUrl())
    const isHttps = target.protocol === 'https:'
    const port = target.port || (isHttps ? 443 : 80)
    const method = (init && init.method) || 'GET'
    const headers = { ...((init && init.headers) || {}), host: target.hostname }
    const body = init && init.body ? Buffer.from(init.body) : null
    if (body) headers['content-length'] = String(Buffer.byteLength(body))

    const connect = http.request({
      host: proxy.hostname,
      port: Number(proxy.port) || 80,
      method: 'CONNECT',
      path: target.hostname + ':' + port,
      headers: { host: target.hostname + ':' + port },
      timeout: FETCH_TIMEOUT_MS,
    })
    connect.on('error', reject)
    connect.on('timeout', () => {
      connect.destroy(new Error('proxy connect timeout'))
    })
    connect.on('connect', (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy()
        reject(new Error('proxy refused ' + response.statusCode))
        return
      }
      const stream = isHttps ? tls.connect({ socket, servername: target.hostname }) : socket
      const done = (error) => {
        try {
          stream.destroy()
        } catch (destroyError) {
          /* ignore */
        }
        reject(error)
      }
      stream.on('error', done)
      const send = () => {
        const lib = isHttps ? https : http
        // Hand the already-tunnelled socket to a one-shot agent; passing it as
        // `createConnection` on the request itself never flushes the request.
        const agent = new lib.Agent({ keepAlive: false, maxSockets: 1 })
        agent.createConnection = (options, callback) => {
          callback(null, stream)
          return stream
        }
        const request = lib.request(
          {
            host: target.hostname,
            port,
            path: target.pathname + target.search,
            method,
            headers,
            agent,
          },
          (response) => {
            response.on('end', () => agent.destroy())
            resolve(response)
          },
        )
        request.on('error', done)
        request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new Error('proxy request timeout')))
        if (body) request.write(body)
        request.end()
      }
      if (isHttps) stream.once('secureConnect', send)
      else send()
    })
    connect.end()
  })
}

async function proxyFetch(rawUrl, init) {
  let current = new URL(rawUrl)
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await proxyRequest(current, init)
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume()
      current = new URL(response.headers.location, current)
      continue
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(response.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) headers.set(key, value.join(', '))
      else headers.set(key, String(value))
    }
    return new Response(Readable.toWeb(response), { status: response.statusCode, headers })
  }
  throw new Error('too many redirects')
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController()
  const timeout = (init && init.timeoutMs) || FETCH_TIMEOUT_MS
  if (proxyUrl()) {
    return await proxyFetch(url, init)
  }
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      ...(init || {}),
      headers: {
        accept: 'application/json,image/*,video/*;q=0.9,*/*;q=0.8',
        'user-agent': 'dsh-neon-theme/0.3 (+local wallpaper picker)',
        ...((init && init.headers) || {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ *
 * Image libraries
 * ------------------------------------------------------------------ */

function wallhavenItem(row, kind) {
  return {
    id: 'wh-' + row.id,
    kind: 'image',
    thumb: row.thumbs?.small || row.thumbs?.original || row.path,
    full: row.path,
    w: row.dimension_x,
    h: row.dimension_y,
    source: 'wallhaven',
    title: row.resolution || '',
    page: row.url || '',
    tag: kind,
  }
}

async function wallhavenPage(params, kind) {
  const response = await fetchWithTimeout('https://wallhaven.cc/api/v1/search?' + params.toString())
  if (!response.ok) throw new Error('wallhaven ' + response.status)
  const payload = await response.json()
  const rows = Array.isArray(payload.data) ? payload.data : []
  return {
    lastPage: Number(payload.meta?.last_page) || 1,
    items: rows.map((row) => wallhavenItem(row, kind)),
  }
}

function wallhavenSource(kind, categories, query) {
  return async (page, params) => {
    const seed = Number(params.get('seed') || 0)
    const search = new URLSearchParams({
      categories,
      purity: '100',
      atleast: '2560x1440',
      page: String(page),
    })
    if (seed > 0) {
      // A per-visit seed shuffles the catalog instead of always returning the
      // same toplist; page 2 continues the same shuffled order.
      search.set('sorting', 'random')
      search.set('seed', String(seed))
    } else if (query) {
      // `toplist` returns nothing when combined with a search query.
      search.set('sorting', 'relevance')
    } else {
      search.set('sorting', 'toplist')
    }
    if (query) search.set('q', query)
    return wallhavenPage(search, kind)
  }
}

const wallhavenCatalogCache = new Map()

/**
 * A Wallhaven category that merges several related searches into one paged
 * catalog, so a narrow query like "bikini" is not limited to its own pages.
 */
function wallhavenMergedSource(kind, categories, queries, atleast) {
  return async (page) => {
    let catalog = wallhavenCatalogCache.get(kind)
    if (!catalog || Date.now() - catalog.at > LIST_TTL_MS) {
      const perQuery = []
      // Sequential and gently paced: Wallhaven answers a burst of searches with
      // 429s, and one swallowed error used to blank the whole category.
      for (const query of queries) {
        const collected = []
        for (let current = 1; current <= 3; current += 1) {
          const search = new URLSearchParams({
            categories,
            purity: '100',
            atleast,
            page: String(current),
            sorting: 'relevance',
            q: query,
          })
          let result = null
          for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
            try {
              result = await wallhavenPage(search, kind)
            } catch (error) {
              await new Promise((resolve) => setTimeout(resolve, 900))
            }
          }
          if (!result) break
          collected.push(...result.items)
          if (result.items.length < 24) break
          await new Promise((resolve) => setTimeout(resolve, 150))
        }
        perQuery.push(collected)
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
      const seen = new Set()
      const merged = []
      for (const item of perQuery.flat()) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        merged.push(item)
      }
      catalog = { at: Date.now(), items: merged }
      // Never cache an empty catalog: a rate-limited run would hide the whole
      // category for the cache lifetime.
      if (merged.length > 0) wallhavenCatalogCache.set(kind, catalog)
    }
    const pageSize = 24
    const start = (page - 1) * pageSize
    return {
      lastPage: Math.max(1, Math.ceil(catalog.items.length / pageSize)),
      items: catalog.items.slice(start, start + pageSize),
    }
  }
}

async function bingList() {
  const response = await fetchWithTimeout('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN')
  if (!response.ok) throw new Error('bing ' + response.status)
  const payload = await response.json()
  const rows = Array.isArray(payload.images) ? payload.images : []
  return {
    lastPage: 1,
    items: rows.map((row) => {
      const base = 'https://www.bing.com' + String(row.urlbase || '')
      return {
        id: 'bing-' + (row.startdate || row.urlbase),
        kind: 'image',
        thumb: base + '_400x240.jpg',
        full: base + '_UHD.jpg',
        w: 3840,
        h: 2160,
        source: 'bing',
        title: row.copyright || '',
        page: row.copyrightlink || '',
        tag: 'daily',
      }
    }),
  }
}

async function picsumList(page) {
  const response = await fetchWithTimeout('https://picsum.photos/v2/list?page=' + page + '&limit=18')
  if (!response.ok) throw new Error('picsum ' + response.status)
  const rows = await response.json()
  return {
    lastPage: 20,
    items: (Array.isArray(rows) ? rows : []).map((row) => ({
      id: 'pic-' + row.id,
      kind: 'image',
      thumb: 'https://picsum.photos/id/' + row.id + '/480/270',
      full: 'https://picsum.photos/id/' + row.id + '/2560/1440',
      w: 2560,
      h: 1440,
      source: 'picsum',
      title: row.author || '',
      page: row.url || '',
      tag: 'random',
    })),
  }
}

/* ------------------------------------------------------------------ *
 * Video library (Mixkit, free license, no API key)
 * ------------------------------------------------------------------ */

async function mixkitCatalog(categories) {
  const key = categories.join(',')
  const hit = mixkitCache.get(key)
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.items

  const buckets = await Promise.all(
    categories.map(async (category) => {
      try {
        const response = await fetchWithTimeout('https://mixkit.co/free-stock-video/' + category + '/')
        if (!response.ok) return []
        const html = await response.text()
        const ids = new Set()
        for (const match of html.matchAll(/assets\.mixkit\.co\/videos\/(\d+)\//g)) ids.add(match[1])
        return [...ids].map((id) => ({ id, category }))
      } catch (error) {
        return []
      }
    }),
  )

  // Interleave the categories so the first page shows a mix of looks.
  const merged = []
  const seen = new Set()
  const longest = Math.max(0, ...buckets.map((bucket) => bucket.length))
  for (let index = 0; index < longest; index += 1) {
    for (const bucket of buckets) {
      const entry = bucket[index]
      if (!entry || seen.has(entry.id)) continue
      seen.add(entry.id)
      merged.push(entry)
    }
  }

  const items = merged.map((entry) => ({
    id: 'mk-' + entry.id,
    kind: 'video',
    thumb: 'https://assets.mixkit.co/videos/' + entry.id + '/' + entry.id + '-thumb-360-0.jpg',
    preview: 'https://assets.mixkit.co/videos/' + entry.id + '/' + entry.id + '-360.mp4',
    full: 'https://assets.mixkit.co/videos/' + entry.id + '/' + entry.id + '-720.mp4',
    w: 1280,
    h: 720,
    audio: false,
    source: 'mixkit',
    title: entry.category,
    page: 'https://mixkit.co/free-stock-video/' + entry.category + '/',
    tag: entry.category,
  }))
  mixkitCache.set(key, { at: Date.now(), items })
  return items
}

function seededShuffle(items, seed) {
  const out = [...items]
  let state = seed >>> 0 || 1
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const hold = out[index]
    out[index] = out[swap]
    out[swap] = hold
  }
  return out
}

async function mixkitList(page, params) {
  const requested = String(params.get('cat') || '')
  const categories = MIXKIT_ALLOWED.has(requested) ? [requested] : MIXKIT_DEFAULT
  const catalog = await mixkitCatalog(categories)
  const seed = Number(params.get('seed') || 0)
  const items = seed > 0 ? seededShuffle(catalog, seed) : catalog
  const pageSize = 12
  const start = (page - 1) * pageSize
  return {
    lastPage: Math.max(1, Math.ceil(items.length / pageSize)),
    items: items.slice(start, start + pageSize),
  }
}

/* ------------------------------------------------------------------ *
 * Anime clips (Sakugabooru, free fan archive, no API key)
 * ------------------------------------------------------------------ */

const animeCatalogCache = new Map()
const iaTrailerCache = new Map()
let iaUnavailableUntil = 0

// English titles used to look up official trailers (with audio) on Internet
// Archive; the Sakugabooru archive itself is silent.
const ANIME_QUERY = {
  demon: 'Demon Slayer',
  slam: 'Slam Dunk',
  slam_movie: 'Slam Dunk',
  dragon: 'Dragon Ball',
  tennis: 'Prince of Tennis',
  onepiece: 'One Piece',
  yuyu: 'Yu Yu Hakusho',
  naruto: 'Naruto',
  bleach: 'Bleach',
  jujutsu: 'Jujutsu Kaisen',
  aot: 'Attack on Titan',
  chainsaw: 'Chainsaw Man',
  frieren: 'Frieren',
  mha: 'My Hero Academia',
  haikyuu: 'Haikyu',
  kuroko: 'Kuroko no Basket',
  bluelock: 'Blue Lock',
  opm: 'One Punch Man',
  fmab: 'Fullmetal Alchemist',
  vinland: 'Vinland Saga',
  eva: 'Evangelion',
  violet: 'Violet Evergarden',
  gintama: 'Gintama',
}

async function iaTrailers(seriesKey, label) {
  const query = ANIME_QUERY[seriesKey]
  if (!query) return []
  const hit = iaTrailerCache.get(seriesKey)
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.items
  if (Date.now() < iaUnavailableUntil) return []

  const collect = async (searchQuery, limit) => {
    if (Date.now() < iaUnavailableUntil) return []
    const found = []
    try {
      const searchUrl =
        'https://archive.org/advancedsearch.php?q=' +
        encodeURIComponent(searchQuery) +
        '&fl%5B%5D=identifier&rows=8&page=1&output=json&sort%5B%5D=downloads+desc'
      const response = await fetchWithTimeout(searchUrl, { timeoutMs: IA_TIMEOUT_MS })
      const docs = response.ok ? (await response.json())?.response?.docs || [] : []
      for (const doc of docs) {
        if (found.length >= limit) break
        try {
          const metaResponse = await fetchWithTimeout('https://archive.org/metadata/' + doc.identifier, {
            timeoutMs: IA_TIMEOUT_MS,
          })
          if (!metaResponse.ok) continue
          const meta = await metaResponse.json()
          // Prefer the sharpest derivative the item offers: the 512kb/360p
          // transcodes look blurry on a 1440p desktop, while the source or
          // 720p/1080p files are still small enough to stream.
          const candidates = (meta.files || []).filter((entry) => {
            if (!/\.(mp4|webm)$/i.test(entry.name)) return false
            const size = Number(entry.size)
            return size > 1024 * 1024 && size < MAX_AUDIO_BYTES
          })
          const rank = (entry) => {
            const width = Number(entry.width) || 0
            const size = Number(entry.size) || 0
            let score = width * 20 + size / 1e6
            if (/512kb|256kb|360p|240p|144p/i.test(entry.name)) score -= 20000
            if (/1080|720/i.test(entry.name)) score += 5000
            return score
          }
          candidates.sort((left, right) => rank(right) - rank(left))
          const file = candidates[0]
          if (!file) continue
          const url = 'https://archive.org/download/' + doc.identifier + '/' + encodeURIComponent(file.name)
          found.push({
            id: 'ia-' + doc.identifier,
            kind: 'video',
            thumb: 'https://archive.org/services/img/' + doc.identifier,
            preview: url,
            full: url,
            w: Number(file.width) || 1280,
            h: Number(file.height) || 720,
            audio: true,
            source: 'archive',
            title: label + ' · 有声片段',
            page: 'https://archive.org/details/' + doc.identifier,
            tag: label,
          })
        } catch (error) {
          /* try the next item */
        }
      }
    } catch (error) {
      // archive.org is optional and is blocked on some networks; stop asking
      // for a while so the silent catalog still loads instantly.
      iaUnavailableUntil = Date.now() + 10 * 60 * 1000
    }
    return found
  }

  // Official trailers first; if a title has none, accept any short clip the
  // archive holds for it (still with its original audio track).
  let items = await collect(
    `title:(${query}) AND mediatype:movies AND (title:(trailer) OR title:(teaser) OR title:(pv) OR title:(预告))`,
    3,
  )
  if (items.length === 0) {
    items = await collect(`title:(${query}) AND mediatype:movies`, 2)
  }
  iaTrailerCache.set(seriesKey, { at: Date.now(), items })
  return items
}

async function animeCatalog(entry) {
  const key = entry.label
  const hit = animeCatalogCache.get(key)
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.items

  const tagSets = entry.tags.length > 0 ? entry.tags : ['']
  const rows = await Promise.all(
    tagSets.map(async (tag) => {
      const tags = (tag ? tag + '+' : '') + 'rating:safe+order:score'
      try {
        const response = await fetchWithTimeout(
          'https://www.sakugabooru.com/post.json?tags=' + tags + '&limit=100&page=1',
        )
        if (!response.ok) return []
        const body = await response.json()
        return Array.isArray(body) ? body : []
      } catch (error) {
        return []
      }
    }),
  )

  const seen = new Set()
  const merged = []
  for (const row of rows.flat()) {
    if (!row || seen.has(row.id)) continue
    if (!(row.file_ext === 'mp4' || row.file_ext === 'webm')) continue
    if (!row.file_url || !row.preview_url) continue
    // A wallpaper clip has to buffer instantly; the archive also holds 100 MB+
    // source captures, which stutter no matter how they are served.
    if (Number(row.file_size) > MAX_CLIP_BYTES) continue
    seen.add(row.id)
    merged.push(row)
  }
  merged.sort((left, right) => (Number(right.score) || 0) - (Number(left.score) || 0))
  // Never cache an empty catalog: one transient upstream failure would
  // otherwise hide the whole series for the cache lifetime.
  if (merged.length > 0) animeCatalogCache.set(key, { at: Date.now(), items: merged })
  return merged
}

async function animeClipList(page, params) {
  const requested = String(params.get('series') || '')
  const seriesKey = ANIME_SERIES[requested] ? requested : 'demon'
  const entry = ANIME_SERIES[seriesKey]
  const catalog = await animeCatalog(entry)
  const pageSize = 40
  const offset = (page - 1) * pageSize
  const items = catalog.slice(offset, offset + pageSize).map((row) => ({
    id: 'sg-' + row.id,
    kind: 'video',
    thumb: row.preview_url,
    preview: row.file_url,
    full: row.file_url,
    w: row.width,
    h: row.height,
    score: Number(row.score) || 0,
    source: 'sakugabooru',
    title: entry.label + ' · ' + (Number(row.score) || 0) + ' 分',
    page: 'https://www.sakugabooru.com/post/show/' + row.id,
    tag: entry.label,
  }))
  return { lastPage: Math.max(1, Math.ceil(catalog.length / pageSize)), items }
}

/* ------------------------------------------------------------------ *
 * Listing route
 * ------------------------------------------------------------------ */

const SOURCES = {
  featured: wallhavenSource('featured', '111'),
  people: wallhavenSource('people', '100'),
  cartoon: wallhavenSource('cartoon', '111', 'cartoon'),
  animal: wallhavenSource('animal', '111', 'animal'),
  slamdunk: wallhavenSource('slamdunk', '111', 'slam dunk'),
  sakuragi: wallhavenSource('sakuragi', '111', 'sakuragi'),
  swimsuit: wallhavenSource('swimsuit', '111', 'swimsuit'),
  beach: wallhavenSource('beach', '111', 'beach'),
  bikini: wallhavenMergedSource('bikini', '111', ['bikini', 'bikini girl', 'swimsuit', 'beach girl', 'pool', 'beach'], '1920x1080'),
  cosplay: wallhavenSource('cosplay', '111', 'cosplay'),
  glamour: wallhavenSource('glamour', '111', 'sexy'),
  anime: wallhavenSource('anime', '010'),
  cyber: wallhavenSource('cyber', '111', 'cyberpunk'),
  space: wallhavenSource('space', '111', 'space'),
  nature: wallhavenSource('nature', '111', 'nature'),
  bing: bingList,
  picsum: picsumList,
  dynamic: mixkitList,
  animeclip: animeClipList,
}

const EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
])

/**
 * Tiny same-origin wrapper for an embedded player. YouTube's player rejects
 * pages that send no Referer (error 153); a page served from here always sets
 * a referrer policy, so the nested player sees a real embedder identity even if
 * the main GUI document suppresses referrers.
 */
function embedPage(params) {
  let target
  try {
    target = new URL(String(params.get('src') || ''))
  } catch (error) {
    return new Response('bad src', { status: 400 })
  }
  if (!EMBED_HOSTS.has(target.hostname.toLowerCase())) {
    return new Response('host not allowed', { status: 403 })
  }
  const html =
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="referrer" content="strict-origin-when-cross-origin">' +
    '<style>html,body{margin:0;height:100%;background:#04060e;overflow:hidden}' +
    'iframe{border:0;width:100%;height:100%;display:block}</style></head><body>' +
    '<iframe src="' +
    target.toString().replace(/"/g, '&quot;') +
    '" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
    '</body></html>'
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'cache-control': 'no-store',
    },
  })
}

let biliCookieCache = { at: 0, value: '' }

async function biliCookie() {
  if (Date.now() - biliCookieCache.at < 60 * 60 * 1000 && biliCookieCache.value) return biliCookieCache.value
  try {
    const response = await fetchWithTimeout('https://www.bilibili.com/', {
      headers: { referer: 'https://www.bilibili.com' },
    })
    const raw = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    const pairs = raw.map((line) => String(line).split(';')[0]).filter(Boolean)
    biliCookieCache = { at: Date.now(), value: pairs.join('; ') }
  } catch (error) {
    biliCookieCache = { at: Date.now(), value: '' }
  }
  return biliCookieCache.value
}

/**
 * Turn a Bilibili share link into a direct mp4 the media proxy can stream.
 * Bilibili only serves its CDN with a bilibili Referer, which the proxy adds.
 */
async function resolveBilibili(params) {
  const raw = String(params.get('url') || '').trim()
  if (!raw) return jsonResponse({ error: 'missing url' }, 400)
  let source = raw
  let bvid = (raw.match(/BV[0-9A-Za-z]{10}/) || [])[0]
  if (!bvid && /b23\.tv|bilibili\.com/i.test(raw)) {
    try {
      const response = await fetchWithTimeout(raw, {
        headers: { referer: 'https://www.bilibili.com' },
        redirect: 'follow',
      })
      bvid = (String(response.url).match(/BV[0-9A-Za-z]{10}/) || [])[0]
      source = response.url
    } catch (error) {
      /* fall through */
    }
  }
  if (!bvid) return jsonResponse({ error: 'no bv id in link' }, 400)

  const cookie = await biliCookie()
  const headers = { referer: 'https://www.bilibili.com', ...(cookie ? { cookie } : {}) }
  let view
  try {
    const response = await fetchWithTimeout('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, { headers })
    view = await response.json()
  } catch (error) {
    return jsonResponse({ error: 'bilibili unreachable' }, 502)
  }
  if (!view || view.code !== 0 || !view.data) {
    return jsonResponse({ error: 'bilibili ' + (view && view.code) }, 502)
  }
  const cid = view.data.cid
  let play
  try {
    const response = await fetchWithTimeout(
      'https://api.bilibili.com/x/player/playurl?bvid=' + bvid + '&cid=' + cid + '&qn=64&fnval=1&fourk=0',
      { headers },
    )
    play = await response.json()
  } catch (error) {
    return jsonResponse({ error: 'playurl unreachable' }, 502)
  }
  const stream = play && play.data && play.data.durl && play.data.durl[0]
  if (!stream || !stream.url) return jsonResponse({ error: 'no mp4 stream (login required?)' }, 502)
  return jsonResponse({
    bvid,
    title: view.data.title,
    duration: view.data.duration,
    quality: play.data.quality,
    size: stream.size,
    src: '/neon-theme/api/media?src=' + encodeURIComponent(stream.url),
  })
}

async function listResponse(params) {
  const source = String(params.get('source') || 'featured')
  const loader = SOURCES[source]
  if (!loader) return jsonResponse({ error: 'unknown source' }, 400)
  const page = Math.max(1, Math.min(60, Number(params.get('page')) || 1))
  const detail =
    source === 'dynamic'
      ? String(params.get('cat') || '')
      : source === 'animeclip'
        ? String(params.get('series') || '')
        : ''
  const seed = Number(params.get('seed') || 0)
  const key = source + (detail ? ':' + detail : '') + ':' + seed + ':' + page
  const hit = listCache.get(key)
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return jsonResponse(hit.value)

  const value = await loader(page, params)
  const payload = { source, page, lastPage: value.lastPage, items: value.items }
  listCache.set(key, { at: Date.now(), value: payload })
  if (listCache.size > 60) {
    const oldest = [...listCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
    if (oldest) listCache.delete(oldest[0])
  }
  return jsonResponse(payload)
}

/* ------------------------------------------------------------------ *
 * Media proxy + cache
 * ------------------------------------------------------------------ */

function cacheKey(url) {
  return createHash('sha1').update(url).digest('hex')
}

async function findCachedFile(key) {
  for (const ext of ['.jpg', '.png', '.webp', '.gif', '.avif', '.mp4', '.webm']) {
    const file = join(CACHE_DIR, key + ext)
    try {
      const stat = await fs.stat(file)
      if (stat.isFile() && stat.size > 0) return { path: file, ext, size: stat.size }
    } catch (error) {
      /* try the next extension */
    }
  }
  return null
}

/**
 * Serve a cached file as a stream. Reading the whole file per request made the
 * 30 MB clips hitch on every seek, so ranges are streamed straight off disk.
 */
function streamFileResponse(filePath, size, contentType, rangeHeader) {
  const base = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
  }
  let start = 0
  let end = size - 1
  let status = 200
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim())
    if (match) {
      if (match[1] === '' && match[2] !== '') {
        start = Math.max(0, size - Number(match[2]))
      } else if (match[1] !== '') {
        start = Number(match[1])
        if (match[2] !== '') end = Math.min(Number(match[2]), size - 1)
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
        return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + size } })
      }
      status = 206
    }
  }
  const length = end - start + 1
  const headers = { ...base, 'content-length': String(length) }
  if (status === 206) headers['content-range'] = 'bytes ' + start + '-' + end + '/' + size
  const stream = createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream), { status, headers })
}

function mediaTypeFor(ext) {
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.mp4') return 'video/mp4'
  if (ext === '.webm') return 'video/webm'
  return 'image/jpeg'
}

async function pruneCache() {
  writesSincePrune += 1
  if (writesSincePrune < 20) return
  writesSincePrune = 0
  try {
    const names = await fs.readdir(CACHE_DIR)
    const stats = await Promise.all(
      names.map(async (name) => ({ name, stat: await fs.stat(join(CACHE_DIR, name)).catch(() => null) })),
    )
    const entries = stats.filter((entry) => entry.stat).sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs)
    let total = entries.reduce((sum, entry) => sum + entry.stat.size, 0)
    let count = entries.length
    const doomed = []
    for (const entry of entries) {
      if (count <= CACHE_LIMIT && total <= MAX_CACHE_BYTES) break
      doomed.push(entry)
      count -= 1
      total -= entry.stat.size
    }
    await Promise.all(doomed.map((entry) => fs.unlink(join(CACHE_DIR, entry.name)).catch(() => undefined)))
  } catch (error) {
    /* pruning is best effort */
  }
}

/**
 * Serve a cached buffer with byte-range support. `<video>` relies on 206
 * responses for smooth playback and looping; answering a Range request with a
 * plain 200 body is what made clips freeze half-way through.
 */
function mediaBufferResponse(buffer, contentType, rangeHeader) {
  const total = buffer.length
  const baseHeaders = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
  }
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim())
    if (match) {
      let start = match[1] === '' ? null : Number(match[1])
      let end = match[2] === '' ? null : Number(match[2])
      if (start === null && end === null) {
        start = 0
        end = total - 1
      } else if (start === null) {
        start = Math.max(0, total - end)
        end = total - 1
      } else if (end === null || end >= total) {
        end = total - 1
      }
      if (start > end || start >= total) {
        return new Response(null, {
          status: 416,
          headers: { 'content-range': 'bytes */' + total, 'accept-ranges': 'bytes' },
        })
      }
      const slice = buffer.subarray(start, end + 1)
      return new Response(slice, {
        status: 206,
        headers: {
          ...baseHeaders,
          'content-length': String(slice.length),
          'content-range': 'bytes ' + start + '-' + end + '/' + total,
        },
      })
    }
  }
  return new Response(buffer, {
    headers: { ...baseHeaders, 'content-length': String(total) },
  })
}

/**
 * Whether a media file carries an audio track. The range is small (the moov
 * atom sits at the front), and results are cached per URL, so a selection can
 * be labelled "有声 / 无声" without downloading the clip.
 */
const audioProbeCache = new Map()

async function audioTrackResponse(params) {
  const raw = params.get('src')
  if (!raw) return jsonResponse({ error: 'missing src' }, 400)
  let target
  try {
    target = new URL(raw)
  } catch (error) {
    return jsonResponse({ error: 'bad src' }, 400)
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return jsonResponse({ error: 'bad protocol' }, 400)
  }
  if (!isAllowedHost(target.hostname)) {
    return jsonResponse({ error: 'host not allowed' }, 403)
  }
  const key = target.toString()
  if (audioProbeCache.has(key)) return jsonResponse({ audio: audioProbeCache.get(key) })

  let audio = false
  try {
    const response = await fetchWithTimeout(key, { headers: { range: 'bytes=0-524287' } })
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const head = buffer.toString('latin1')
      audio = head.includes('soun') || head.includes('mp4a') || head.includes('Opus')
    }
  } catch (error) {
    /* unknown -> treat as silent */
  }
  audioProbeCache.set(key, audio)
  return jsonResponse({ audio })
}

const warming = new Set()

/** Pull a whole file into the disk cache in the background. */
async function warmMediaCache(target, key) {
  const id = key
  if (warming.has(id)) return
  warming.add(id)
  try {
    const response = await fetchWithTimeout(target.toString())
    if (!response.ok) return
    const type = response.headers.get('content-type') || ''
    if (!type.startsWith('video/') && !type.startsWith('image/')) return
    const declared = Number(response.headers.get('content-length') || 0)
    if (declared > MAX_MEDIA_BYTES) return
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_MEDIA_BYTES) return
    await ensureCacheDir()
    await fs.writeFile(join(CACHE_DIR, key + extFor(type)), buffer).catch(() => undefined)
    void pruneCache()
  } catch (error) {
    /* warming is best effort */
  } finally {
    warming.delete(id)
  }
}

async function mediaResponse(params, request) {
  const raw = params.get('src')
  if (!raw) return jsonResponse({ error: 'missing src' }, 400)
  let target
  try {
    target = new URL(raw)
  } catch (error) {
    return jsonResponse({ error: 'bad src' }, 400)
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return jsonResponse({ error: 'bad protocol' }, 400)
  }
  if (!isAllowedHost(target.hostname)) {
    return jsonResponse({ error: 'host not allowed' }, 403)
  }

  const range = request && request.headers ? request.headers.get('range') : null
  const key = cacheKey(target.toString())
  const cachedFile = await findCachedFile(key)
  if (cachedFile) {
    return streamFileResponse(cachedFile.path, cachedFile.size, mediaTypeFor(cachedFile.ext), range)
  }

  // Not cached yet: relay a range request straight through so playback starts
  // on the first bytes instead of waiting for the whole file to download, and
  // fill the disk cache in the background so later ranges come from disk.
  if (range) {
    try {
      const relayed = await fetchWithTimeout(target.toString(), { headers: { range } })
      const relayType = relayed.headers.get('content-type') || ''
      const relayRange = relayed.headers.get('content-range')
      if (relayed.status === 206 && relayed.body && relayRange && (relayType.startsWith('video/') || relayType.startsWith('image/'))) {
        void warmMediaCache(target, key)
        return new Response(relayed.body, {
          status: 206,
          headers: {
            'content-type': relayType,
            'content-range': relayRange,
            'accept-ranges': 'bytes',
            'cache-control': 'no-store',
          },
        })
      }
      if (relayed.body) {
        try {
          await relayed.body.cancel()
        } catch (error) {
          /* ignore */
        }
      }
    } catch (error) {
      /* fall back to the buffered path */
    }
  }

  const upstream = await fetchWithTimeout(
    target.toString(),
    isBilibiliHost(target.hostname) ? { headers: { referer: 'https://www.bilibili.com' } } : undefined,
  )
  if (!upstream.ok) return jsonResponse({ error: 'upstream ' + upstream.status }, 502)
  let finalHost = target.hostname.toLowerCase()
  try {
    finalHost = new URL(upstream.url).hostname.toLowerCase()
  } catch (error) {
    /* keep the requested host */
  }
  if (!isAllowedHost(finalHost)) return jsonResponse({ error: 'redirect not allowed' }, 502)

  const contentType = upstream.headers.get('content-type') || ''
  if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
    return jsonResponse({ error: 'not an image or video' }, 415)
  }
  const declared = Number(upstream.headers.get('content-length') || 0)
  if (declared > MAX_MEDIA_BYTES) return jsonResponse({ error: 'media too large' }, 413)

  const buffer = Buffer.from(await upstream.arrayBuffer())
  if (buffer.length > MAX_MEDIA_BYTES) return jsonResponse({ error: 'media too large' }, 413)

  const ext = extFor(contentType)
  await ensureCacheDir()
  await fs.writeFile(join(CACHE_DIR, key + ext), buffer).catch(() => undefined)
  void pruneCache()

  return mediaBufferResponse(buffer, contentType, range)
}

/* ------------------------------------------------------------------ *
 * Settings persistence (the GUI origin changes between launches)
 * ------------------------------------------------------------------ */

async function readSettingsFile() {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8')
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch (error) {
    return null
  }
}

async function writeSettingsFile(value) {
  await fs.mkdir(HOME_DIR, { recursive: true }).catch(() => undefined)
  const temp = SETTINGS_FILE + '.tmp'
  await fs.writeFile(temp, JSON.stringify(value), 'utf8')
  await fs.rename(temp, SETTINGS_FILE)
}

async function settingsHandler(request, response) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const value = await readSettingsFile()
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    response.end(JSON.stringify(value || {}))
    return
  }

  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'GET, HEAD, POST' })
    response.end()
    return
  }

  const chunks = []
  let total = 0
  try {
    for await (const chunk of request) {
      total += chunk.length
      if (total > MAX_SETTINGS_BYTES) {
        response.writeHead(413)
        response.end()
        request.destroy()
        return
      }
      chunks.push(chunk)
    }
    const text = Buffer.concat(chunks).toString('utf8')
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad settings')
    await writeSettingsFile(value)
    response.writeHead(204)
    response.end()
  } catch (error) {
    response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ error: 'invalid settings' }))
  }
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

async function handleRequest(request) {
  let url
  try {
    url = new URL(request.url)
  } catch (error) {
    return jsonResponse({ error: 'bad request' }, 400)
  }
  const path = url.pathname
  if (!path.startsWith(API_PREFIX)) return jsonResponse({ error: 'not found' }, 404)
  const rest = path.slice(API_PREFIX.length)
  try {
    if (rest === '/embed') return embedPage(url.searchParams)
    if (rest === '/resolve') return await resolveBilibili(url.searchParams)
    if (rest === '/list') return await listResponse(url.searchParams)
    if (rest === '/audio') return await audioTrackResponse(url.searchParams)
    if (rest === '/media' || rest === '/img') return await mediaResponse(url.searchParams, request)
    return jsonResponse({ error: 'not found' }, 404)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'upstream failure' }, 502)
  }
}

export const inject = ['webServer']

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: API_PREFIX + '/settings', handler: settingsHandler }),
    'neon-theme: settings file',
  )
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, resource: handleRequest }),
    'neon-theme: wallpaper proxy routes',
  )
}
