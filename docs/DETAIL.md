# Neon theme engine

A complete animated skin for the DSH Web GUI: a breathing neon window frame, a glowing composer ring, ten code-drawn animated backdrops, and a wallpaper shelf with live previews.

![preview](preview.svg)

## Highlights

**Ten skins across five categories**
Cyber, starfield, sakura, aurora, deep sea and more. Every backdrop is drawn with CSS gradients and animations — no images ship with the package, so it stays sharp at any resolution.

**Three ways to switch**
Pick one by hand, rotate within a category on a timer, or follow the time of day (morning / day / dusk / night each have recommendations).

**Wallpaper shelf**
- Images: Wallhaven (featured, people, cartoon, animals, anime, cyber, space, nature, Slam Dunk art), Bing daily, Picsum
- Live clips: twelve Mixkit categories (animals, people, cartoon, sport, water, fire, tech, travel, food, city, space, mixed)
- Anime: twenty-four series from Sakugabooru, ordered by community score
- 40 items per page (12 for clips) with endless "load more"; tick several clips to build an auto-rotating **playlist** (up to 50)

**Fine control**
Wallpaper brightness (shown as a multiplier), surface opacity, scan-line toggle, frame pulse speed, composer-glow toggle, and a calm mode that stops every animation for troubleshooting.

## Usage

- **✦ Neon theme** button beside the session title, or
- **Settings → General → Neon theme engine → Open panel**

Three tabs: skins, images, live video.

## Data and network

- Skin, wallpaper and playlist live in the host file `$DSH_HOME/neon-theme-settings.json`, so they survive restarts and port changes
- Media is fetched and cached under `$DSH_HOME/neon-theme-cache` (80 files or 1.2 GB, oldest pruned)
- The proxy is limited to an allowlist (wallhaven / bing / picsum / unsplash / mixkit / sakugabooru) and only accepts GET/HEAD
- No telemetry; nothing leaves the machine except the media requests

## Compatibility

Requires a DSH build with the Web server (Desktop or `dsh web`) because the media proxy and settings persistence run on the Host. It conflicts with other theme plugins that rewrite the same backdrop layers (for example `dsh-anime-theme`) — enable only one.

## License

Code is MIT. Wallpapers and clips belong to their respective sites and authors; the plugin only caches them locally for personal use and never redistributes them.

Author: Andy Zhu · [GitHub](https://github.com/zmq6931/dsh-neon-theme-ad)
