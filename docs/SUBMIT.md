# 收录申请文案（可直接复制）

> 用途：向 DeepSeek 提交 DSH 插件收录申请时，把下面的中文或英文段落到官方仓库 issue、应用内反馈或社区帖子里。把 `v0.22.9` 换成实际版本即可。

---

## 中文

**标题：** 插件收录申请：霓虹主题引擎（dsh-neon-theme-ad）

**正文：**

你好，我想推荐一个自己开发的 DSH 插件，希望有机会被收录进随 DSH 分发的插件目录。

- **插件名**：`dsh-neon-theme-ad`（显示名：霓虹主题引擎 / Neon theme engine）
- **作者**：Andy Zhu
- **仓库**：https://github.com/zmq6931/dsh-neon-theme-ad
- **插件索引**：https://zmq6931.github.io/dsh-neon-theme-ad/index.json
- **版本**：v0.22.9 ｜ **许可**：MIT

**它做什么**

给 DSH Web 界面提供一整套动态视觉：会呼吸的霓虹窗口边框、发光的输入框光环、十款纯 CSS 绘制的动态背景（五个分类，可手动 / 自动轮换 / 按时间段切换），以及一个带实时预览的免费壁纸库——Wallhaven、Bing 每日一图、Picsum、Mixkit 动态素材，以及按社区评分排序的 Sakugabooru 番剧作画片段；支持多选播放列表（上限 50 条）与本机缓存。

**技术特点**

- 纯 JS + CSS，无构建步骤、无原生依赖，`dsh-profiles` 用 git 源即可直接安装
- Host 侧只做三件事：壁纸代理（白名单域名、仅 GET/HEAD）、媒体缓存、设置文件持久化
- 设置写入 `$DSH_HOME/neon-theme-settings.json`，换端口/重启后保留
- 不收集遥测；除取壁纸和视频外不向外发送数据
- 面板入口同时挂在会话标题旁与 设置 → 通用

**许可与素材**

代码 MIT。壁纸/视频素材不随包分发，只在用户点选时从公开站点取回并缓存在本机；README 中有完整免责声明。

如果需要我补充截图、GIF、功能清单或调整打包方式（例如发布到 npm 以便按 `name@version` 安装），我可以马上配合。

谢谢！

---

## English

**Title:** Plugin submission: Neon theme engine (dsh-neon-theme-ad)

**Body:**

Hi, I would like to propose a DSH plugin I built for inclusion in the plugin catalog shipped with DSH.

- **Package**: `dsh-neon-theme-ad` (display name: Neon theme engine / 霓虹主题引擎)
- **Author**: Andy Zhu
- **Repository**: https://github.com/zmq6931/dsh-neon-theme-ad
- **Plugin index**: https://zmq6931.github.io/dsh-neon-theme-ad/index.json
- **Version**: v0.22.9 ｜ **License**: MIT

**What it does**

A complete animated look for the DSH Web GUI: a breathing neon window frame, a glowing composer ring, ten code-drawn animated backdrops (five categories with manual, rotating or time-of-day switching), and a wallpaper shelf with live previews — Wallhaven, Bing daily, Picsum, Mixkit live clips, and score-ranked Sakugabooru anime cuts, with multi-select playlists (up to 50) and a local cache.

**Technical notes**

- Plain JS + CSS: no build step, no native dependency, installable straight from the git source
- The host does only three things: an allowlisted media proxy (GET/HEAD only), a disk cache, and settings persistence
- Settings live in `$DSH_HOME/neon-theme-settings.json` and survive restarts and port changes
- No telemetry; nothing leaves the machine except the media requests
- The panel is reachable from a session-header button and from Settings → General

**License and media**

Code is MIT. Wallpapers and clips are not redistributed: they are fetched from public sites when the user picks them and cached locally; the README carries a full disclaimer.

Happy to provide screenshots/GIFs, adjust packaging (for example publishing to npm so it can be installed as `name@version`), or make any other changes you need.

Thanks!

---

## 提交渠道

- DSH 官方 GitHub 仓库的 issue / discussions（若有插件收录类模板，优先用模板）
- 应用内反馈入口
- 官方社区 / 论坛中与插件相关的板块

> 说明：当前 DSH 的插件目录由官方维护，第三方没有自助上传入口；`插件 → Discover` 里的索引是用户自行添加的第三方索引，不属于官方目录。
