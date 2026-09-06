# 交我导 · 上海交通大学导航（桌面版）

> **当前版本：v2.5.1**（2026-09-06）｜ 完整更新日志见 [CHANGELOG.md](CHANGELOG.md)
> v1.0.0 为最初版（基础导航）；v2.0.0 加入搜索增强、数据在线更新、免责声明、设置面板、右键菜单；
> v2.1.0 加入收藏夹、自定义链接、使用统计与常用排序、日程倒计时；
> v2.2.0 加入二维码分享与收藏侧边栏；v2.3.0 修复二维码弹窗等缺陷、优化性能并增强分享体验；v2.4.0 二维码保存支持自选位置；v2.4.1 二维码图片附带链接文字；v2.4.2 二维码默认文件名按标题生成；v2.4.3 二维码图片含名称与链接；v2.4.4 重构缓存更新机制；v2.5.0 修复更新卡死/无效嵌套/排序/清空遗漏等稳定性问题；v2.5.1 修复启动器溢出、提示遮挡、收藏语言失配，主网格搜索全面支持拼音/英文名。

上海交通大学常用网站 / 公众号 / 社团导航的桌面应用，UI 仿照网页版导航站
[交我导 sjtu-links.pages.dev](https://sjtu-links.pages.dev/) 的风格制作：
SJTU 红金配色、搜索框、类型页签、分类筛选、卡片式直达链接、深色模式、
中英文切换，以及一只可以拖拽互动的小宠物「导导」。

数据来自网页版（`JIAOWODAO_DATA` / `JIAOWODAO_CLUB_DATA`），已内置在本地，
离线可用。网页版的「AI 助手」依赖在线后端，桌面版未包含。

## 搜索增强（桌面版独有）

- **热门直达预选栏**：搜索框下方常驻 10 个高频入口（选课、成绩、jAccount、
  图书馆、VPN、交大邮箱、校园地图、后勤服务、就业、招生），点击即搜。
- **输入联想下拉**：边输入边出建议，支持键盘 ↑↓ 选择、Enter 确认、Esc 关闭；
  命中关键词高亮，并带类型徽章（网站/公众号/社团）与分类。
- **拼音 / 首字母 / 英文缩写搜索**：数据内置拼音字段（由 `tools/enrich_data.py`
  生成），例如 `tushuguan`、`tsg` → 图书馆，`jwc` → 教务处，`xk` → 选课，
  `sjtu` → 上海交通大学官网，`seiee` → 电子信息与电气工程学院。
- **搜索历史**：自动记录最近 10 条（本地存储），空输入框时展示，可一键清空。
- **网址直达**：输入形如 `jaccount.sjtu.edu.cn` 的域名时，下拉直接提供
  「在浏览器中打开」。
- **快捷键**：`Ctrl+K` 或 `/` 快速聚焦搜索框。
- **右键卡片菜单**：复制标题 / 复制链接 / 复制名称 / **生成二维码**（手机扫码直达，可下载 PNG）
- **收藏侧边栏**：右侧可折叠面板，星标收藏集中管理，点击直达、悬停删除
- **设置面板**（页头「设置」按钮）：
  - 字体大小：小 / 标准 / 大 / 特大 四档（整体缩放，立即生效）
  - 桌面宠物：显示 / 隐藏「导导」
  - 常用排序：按打开次数从高到低排列卡片（自动统计）
  - 自定义链接：添加个人常用网站，并入导航与搜索
  - 日程与倒计时：管理假期/考试周等日程（内置公共假期，可恢复默认）
  - 清空本地数据：一键清除搜索历史、数据更新缓存与更新日志（确认后自动重载）
  - 更新日志：查看每次在线数据更新的日期、版本与条数变化（自动/手动），可清空
- **收藏夹**：卡片星标收藏，页面顶部「我的收藏」条快速取用
- **日程倒计时**：顶部横幅显示距下个假期/考试周的天数，点击可管理日程

## 数据在线更新（随网站同步）

应用会自动与网页版 `sjtu-links.pages.dev` 保持数据同步：

- **启动时自动检查**：静默拉取网站的两份数据文件，对比 `updatedAt` 版本号；
  发现新版立即应用并提示「已自动更新数据至 xxx」；无更新或离线时不打扰。
- **页头「更新数据」按钮**：手动检查，结果有提示（已是最新 / 更新成功 / 网络失败）。
- **浏览器端拼音再生成**：网站数据没有拼音字段，应用内置 580 字「字符→拼音」
  映射表（`data/pinyin-map.js`，由 `tools/enrich_data.py` 生成），更新时在本地
  补齐 `py`/`pyi`，拼音搜索对新数据同样生效。
- **localStorage 持久化**：网页视图无法写磁盘，更新后的数据缓存到本地存储
  （`jiaowodao_remote_v1`），下次启动优先使用缓存，离线也能用最新数据。
- 所有运行方式（exe / Python / Edge）行为一致，无需重新打包。

## 免责声明

进入软件时弹出醒目的免责声明（非官方性质、数据来源与时效、站外链接与账号安全、
隐私说明、使用风险）：深色遮罩 + 金顶边卡片 + 入场动画，头部带警示图标与
「重要提示」标签，首条「非官方」以红色警示条高亮，需点击「同意并继续」方可使用。
弹窗头部自带**「中文 / EN」语言切换**，默认中文（与应用整体语言互不影响）。
可勾选「下次启动不再显示」（本地存储）；页头「更新数据」旁有常驻「免责声明」
按钮，页脚亦有入口，随时可重开；「退出应用」按钮会关闭程序。

## 数据持久化

应用使用 WebView2 持久化存储（`private_mode=False`），以下数据保存在本机
`%APPDATA%\pywebview` 目录，不会上传：

- 搜索历史、主题模式、免责声明勾选
- 在线更新的数据缓存（`jiaowodao_remote_v1`）

## 页面缓存处理

WebView2 可能缓存旧版页面导致界面不更新。启动器（`launcher.py`）会在
`app.html` 修改时间变化时自动清除 WebView2 的 HTTP 缓存（**保留
localStorage**），保证每次应用更新后界面即时生效；Edge 免安装版
（`launcher-edge.vbs`）则以 URL 版本参数实现同样的效果。

## 三种运行方式（按依赖从多到少）

| 方式 | 文件 | 依赖 | 说明 |
| --- | --- | --- | --- |
| ① 单文件 exe | `Jiaowodao.exe` | 无（推荐） | PyInstaller 打包（内含 Python 运行时），双击即用，可在任意 Windows 10/11 上运行 |
| ② Python 启动器 | `launcher.py` | Python + pywebview | pywebview（WebView2 内核）原生窗口，失败自动回退 Edge 应用模式 |
| ③ Edge 应用模式 | `launcher-edge.vbs` | 仅 Microsoft Edge | 无需 Python，任何 Windows 10/11 自带 Edge 即可 |

> 应用本体 `app.html` 是纯 HTML/CSS/JS，任何环境（浏览器、Edge、WebView2）都能直接打开，
> Python 只是其中一种窗口外壳。

## 在没有 Python 的电脑上使用

**方案 A（最简单）：复制整个 `sjtu-link` 文件夹**，到目标电脑后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install-edge.ps1
```

会在桌面生成「交我导（免安装）」快捷方式（Edge 应用模式，无浏览器边框），
无需安装任何东西。也可以直接把 `launcher-edge.vbs` 拷走双击运行。

**方案 B（更接近独立软件）：** 带上 `Jiaowodao.exe`（单文件，内含 Python 运行时，
无需目标机器装 Python），双击 exe 或运行 `install.ps1`（会自动优先使用 exe
创建快捷方式）。

## 安装（创建桌面快捷方式）

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1          # 优先 exe，其次 pythonw
powershell -ExecutionPolicy Bypass -File .\install-edge.ps1     # Edge 应用模式，免 Python
```

已在当前机器上执行过，桌面现有：
- `交我导.lnk`（指向单文件 exe `Jiaowodao.exe`，无需 Python）
- `交我导（免安装）.lnk`（Edge 应用模式，同样无需 Python）

## 目录结构

```
sjtu-link/
├── app.html                 # 应用主体（样式/逻辑内联，仿网页版）
├── search-plus.js / .css    # 搜索增强（预选栏/联想/历史/URL直达/快捷键）
├── data-update.js           # 数据在线更新（自动检查/拼音再生成/缓存/超时保护）
├── disclaimer.js            # 免责声明弹窗（首次进入/页脚重开/退出应用）
├── contextmenu.js           # 右键卡片菜单（复制标题/链接/名称，生成二维码）
├── settings.js / .css       # 设置面板（字体/宠物/排序/自定义链接/日程/清数据/日志/关于）
├── favorites.js             # 个人化模块（收藏夹/收藏侧栏/自定义链接/使用统计/常用排序）
├── countdown.js             # 日程倒计时横幅（内置公共假期，可增删日程）
├── qrcode.js                # 内置二维码生成库（MIT，Kazuhiko Arase）
├── qrcode-share.js          # 二维码弹窗（扫码直达/复制链接/保存 PNG）
├── Jiaowodao.exe            # 单文件免依赖可执行程序（内含 Python 运行时）
├── CHANGELOG.md             # 版本更新日志（v1.0 功能说明 / v2.0 更新说明）
├── launcher.py              # Python 启动器（pywebview，回退 Edge 应用模式）
├── launcher-edge.vbs        # 免 Python 启动器（Edge 应用模式，GBK 编码）
├── install.ps1              # 创建桌面快捷方式（优先 exe）
├── install-edge.ps1         # 创建免 Python 快捷方式
├── icon.ico / icon.png      # 应用图标
├── data/
│   ├── jiaowodao-data.js    # 网站与公众号数据（153 条，含拼音字段）
│   ├── jiaowodao-clubs.js   # 社团数据（150 条，含拼音字段）
│   └── pinyin-map.js        # 字符→拼音映射表（580 字，在线更新用）
├── tools/
│   ├── enrich_data.py       # 数据拼音字段生成（pip install pypinyin）
│   ├── sync_assets.py       # app.html 资源引用版本号（?v=）同步
│   ├── make_icon.py         # 图标生成脚本（pip install pillow）
│   ├── _extract.js          # 数据提取辅助（enrich_data.py 内部使用）
│   ├── e2e-header-clicks.py # 页头三盒子点击 E2E（pywebview 环境）
│   ├── test_search_core.js  # 搜索核心单元测试
│   ├── test_search_realdata.js  # 真实数据搜索验证
│   ├── test_update.js       # 在线更新逻辑测试（含真实网络 E2E）
│   ├── test_disclaimer.js   # 免责声明核心逻辑测试
│   ├── test_favorites.js    # 收藏/统计/自定义链接逻辑测试
│   ├── test_settings.js     # 设置面板核心逻辑测试
│   ├── test_countdown.js    # 倒计时核心逻辑测试
│   ├── test_qrcode.js       # 二维码生成测试（输出 PNG 供解码验证）
│   ├── test_qr_decode.py    # OpenCV 二维码解码验证（pip install opencv-python）
│   └── test_cache_invalidate.py  # 启动器缓存失效机制测试
└── README.md
```

## 更新数据

**日常使用无需手动操作**：应用启动时自动检查并应用网页版最新数据。

离线维护（重新生成拼音字段 / 更新内置数据）时：

```powershell
pip install pypinyin
python tools\enrich_data.py        # 为数据补充 py / pyi 拼音字段 + 生成 pinyin-map.js
node tools\test_search_core.js     # 搜索核心单元测试
node tools\test_search_realdata.js # 真实数据搜索验证
node tools\test_update.js          # 在线更新逻辑测试（含真实网络 E2E）
```

刷新应用即可（exe 版无需重新打包，数据与页面均为运行时读取）。

## 重新打包 exe

```powershell
pip install pyinstaller
python -m PyInstaller --noconsole --onefile --name Jiaowodao launcher.py
copy .\dist\Jiaowodao.exe .\Jiaowodao.exe   # 放到 app.html 旁边即可
```

## 说明

- 非官方项目；所有链接均为直达官网，点击后由系统默认浏览器打开。
- 微信公众号仅展示已核对的搜索名称，微信内搜索时请再核对认证主体。
- 页脚「网站原作者邮箱」`adm@sj-tu.com` 为网页原站（交我导）作者的邮箱，与本桌面版无关。
- 桌面版由上海交通大学 2026 级本科生个人开发（AI 辅助制作），仅供个人学习与生活便利使用，
  非商业用途；如内容涉及侵权，请联系 `g1507285154@163.com`。
