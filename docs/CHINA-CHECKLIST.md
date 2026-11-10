# OpenVireo: mainland China measurement checklist / 中国大陆访问测试清单

Front SC6 (plan `analysis/front-plans/front-i18n-scripts.md` §11 and §14 Q6). Written 2026-11-09 against the site as it is
today (English; Spanish is still hidden). Every site step below (items 1–4) was walked in the local app on 2026-11-09 with
the exact names shown, in a 1024 px window (menu at the top) and the menu path of item 2 also at phone width (375 px). From
the code, not walked: at 1100 px and wider the menu is a left sidebar (`src/observatory.css`), and in a visitor's browser its
sections start closed unless they hold the current page or were left open (`src/components/NavGroup.tsx`; automated browsers
see them all open), so the steps say to open a section first when its buttons are not shown. Not checked: the WeChat warning
wording (item 6) and the browser developer-tools labels in English and Chinese, which are general knowledge of those products.

## For the site owner (English)

**What this is.** A 15–20 minute check that a friend in mainland China can do on a phone or a computer, without installing
anything and with the VPN off. It tells us whether https://openvireo.space opens there, roughly how slowly, and which parts
depend on hosts outside the site.

**How to use it.**
1. Send the testers everything from "给测试者 / For the tester" down (the link to this file, or the text pasted into a chat).
2. Each tester copies the result form at the end, fills it in and sends it back to you as plain text, in whatever chat you
   already use. If they can, ask for two runs: one on home broadband and one on mobile data, ideally one of them during school
   hours on a weekday (mainland time).
3. Paste the answers to the coordinator as they are.

Nothing is collected by the site for this: there is no new analytics, form or upload. The form asks only for a city, a carrier
and a device, not for names or contact details.

**What the outcomes would mean.** These are readings, not promises; nothing is built until you decide.
- **Works** (first screen in under about 10 s, every item "yes"): nothing to change for China; the Chinese translation can go
  ahead as planned.
- **Works, slowly** (first screen in 10–60 s, items open but slowly, or only at some hours): acceptable for the first Chinese
  release (your decision of 2026-11-09). The site is served from Cloudflare edges outside the mainland; that is the expected
  cost. Repeated slow results at school hours would be the evidence for *asking* you about faster options later (Cloudflare's
  China Network, an ICP filing, a mainland host or CDN). Each of those is a new service and cost, needs a mainland entity or
  partner for the ICP part, and needs your approval; none is proposed now.
- **Blocked** (the site does not open at all, on both networks, or the browser shows a connection reset): the domain or the
  Cloudflare addresses are not reachable without a VPN. The same paid options would be the only routes, again only on your
  decision.
- **Only the live camera query fails** (item 4c says "No VizieR mirror …", while item 4b makes an image): expected to be
  possible. The exercise fields use catalog extracts bundled with the site and keep working. A VizieR mirror run by the
  National Astronomical Observatories in Beijing exists, but on 2026-11-09 it did not answer over HTTPS from outside China and
  lacked the NOMAD catalog; it could be considered later (already covered by the 2026-10-29 mirror approval) only if a tester's
  results suggest it is reachable.
- **The page shows but the browser's loading bar keeps turning** (item 1b): most likely the visit-counting script
  (Cloudflare Web Analytics) is slow or blocked. The site still works; only visits from China would go uncounted. (On
  2026-11-09 the live page was seen to load that script after the app's own script, so it cannot hold the page back; a
  pending one does hold the browser's "loaded" signal, which is what keeps the loading bar turning.)

## 给测试者 / For the tester

谢谢你帮忙！这个测试大约需要 15–20 分钟，用手机或电脑都可以，不用安装任何东西。
Thank you for helping! This takes about 15–20 minutes on a phone or a computer, and you don't need to install anything.

**开始之前 / Before you start**

- **请先关闭 VPN、代理或“加速器”类应用。**我们想知道的正是不用这些工具时的情况。
  **First turn off any VPN, proxy or "accelerator" app.** We want to know how the site behaves without them.
- 记下：日期和时间、所在城市、网络类型（家里宽带 / Wi-Fi，还是手机流量 4G/5G）、运营商（中国电信、中国移动、中国联通或中国广电），以及设备和浏览器（例如“iPhone 13 + Safari”“华为手机 + 华为浏览器”“Windows 电脑 + Edge”）。
  Note down: date and time, your city, the network type (home broadband / Wi-Fi, or mobile data 4G/5G), your carrier (China
  Telecom, China Mobile, China Unicom or China Broadnet), and your device and browser (for example "iPhone 13 + Safari",
  "Huawei phone + Huawei Browser", "Windows PC + Edge").
- 如果浏览器有“无痕模式”或“隐私模式”，请用它打开，这样测到的是第一次访问的速度。
  If your browser has a private or incognito mode, use it, so you measure a first visit.
- 网站目前只有英文界面（还没有中文）。下面的按钮名称都按网站上显示的英文写出来了，照着找就行。**请不要用浏览器的“翻译网页”功能**，否则按钮名称会变。
  The site is in English for now (there is no Chinese version yet). The button names below are written exactly as the site
  shows them. **Please don't use the browser's "translate page" feature**, because it changes the button names.
- 准备一个计时工具（另一部手机、电脑上的时钟都行）。只要大概的秒数就行。
  Have a way to time things ready (another phone or a clock is fine; rough seconds are all we need).

**1. 网站能打开吗？/ Does the site open?**

1a. 开始计时，同时打开 **https://openvireo.space** 。等到页面上出现大标题 **“Start with the sky.”**，或者出现一个写着 **“Welcome to OpenVireo”** 的小窗口，就停表，记下秒数。如果出现这个小窗口，点 **“Skip the tour”** 关掉它。
如果 60 秒后页面还是空白或报错，请写下“打不开”，并把屏幕上的错误文字抄下来（或截图，截图前注意不要带上个人信息）。
Start timing as you open **https://openvireo.space**. Stop when the big title **"Start with the sky."** appears, or a
small box titled **"Welcome to OpenVireo"**. Write down the seconds. If that box appears, tap **"Skip the tour"** to close it.
If the page is still blank or shows an error after 60 seconds, write "does not open" and copy the error text (or take a
screenshot; don't include any personal information in it).

1b. 页面出来以后，浏览器顶部（或地址栏）的加载进度条 / 转圈还在继续吗？如果还在，大约过了多少秒才停？
After the page appears, does the browser's loading bar or spinner keep going? If yes, about how many seconds until it stops?

**2. 一个练习能打开、能用吗？/ Does one exercise open and work?**

2a. 打开“恒星光谱分类”练习：
- 手机：点右上角的 **“Tools”**，在 **“ANALYSIS”** 下面点 **“Stellar classification”**（如果 “ANALYSIS” 下面没有按钮，先点一下 “ANALYSIS” 展开）。
- 电脑：在页面左侧的菜单里（窗口较窄时在页面上方）点 **“ANALYSIS”**，再点 **“Stellar classification”**（如果下面没有按钮，先点一下 “ANALYSIS” 展开）。
- 找不到的话，也可以直接打开 **https://openvireo.space/#classification** 。

从点击开始计时，等到出现这一行字：**“Original spectra verified. Your classification remains manual.”**，并且能看到几张光谱曲线图，停表记下秒数。

Open the stellar classification exercise:
- Phone: tap **"Tools"** at the top right, then under **"ANALYSIS"** tap **"Stellar classification"** (if no buttons show under
  "ANALYSIS", tap "ANALYSIS" first to open it).
- Computer: in the menu on the left of the page (at the top when the window is narrow) click **"ANALYSIS"**, then **"Stellar
  classification"** (if no buttons show under it, click "ANALYSIS" first to open it).
- If you can't find it, open **https://openvireo.space/#classification** directly.

Time from your tap until the line **"Original spectra verified. Your classification remains manual."** appears together with
several spectrum graphs.

2b. 往下滑，找到并点 **“Next standard”**。最上面那张图的标题应该从 **“Upper standard · O5 V”** 变成 **“Upper standard · B0 V”**。变了吗？
Scroll down and tap **"Next standard"**. The title of the top graph should change from **"Upper standard · O5 V"** to
**"Upper standard · B0 V"**. Did it change?

**3. 星空图能加载吗？/ Does the sky map load?**

3a. 回到天文台页面：手机点 **“Tools”**，在 **“OPTICAL OBSERVATORY”** 下面点 **“Observatory”**（没有的话先点 “OPTICAL OBSERVATORY” 展开）；电脑在左侧菜单的同一位置点。（也可以重新打开 https://openvireo.space 。）
往下滑，找到写着 **“The dome is closed”** 的深色方框，点 **“Open dome ↗”**，开始计时。等到方框里出现星点图，并且图下方出现类似这样的一行字就停表：**“VIREO’s Finder · 2.5° view, drawn as VIREO draws it from its loaded 7.5° field (1,426 stars and 7 galaxies).”**（数字可能略有不同。）
Go back to the observatory page: on a phone tap **"Tools"**, then under **"OPTICAL OBSERVATORY"** tap **"Observatory"** (if it
isn't shown, tap "OPTICAL OBSERVATORY" first to open it); on a computer click the same place in the menu on the left (or reopen
https://openvireo.space). Scroll down to the dark box that says **"The dome is closed"** and tap **"Open dome ↗"**; start
timing. Stop when a star map appears with a line under it like **"VIREO’s Finder · 2.5° view, drawn as VIREO draws it from its
loaded 7.5° field (1,426 stars and 7 galaxies)."** (the numbers may differ a little).

3b. 在 **“Target”** 下拉框里选 **“M51 · NGC 5194”**，然后点 **“Point telescope ↗”**。点完开始计时，等到那行字里的数字变成类似 **“(927 stars and 2 galaxies)”** 就停表。
In the **"Target"** list choose **"M51 · NGC 5194"**, then tap **"Point telescope ↗"**. Time until the numbers in that line change
to something like **"(927 stars and 2 galaxies)"**.

**4. 相机：先试内置星表，再试在线查询 / The camera: bundled catalog first, then the live query**

4a. 准备（还在天文台页面）：
- 点 **“Enter coordinates”**（如果输入框已经显示就跳过），在 **“Right ascension · hours”** 填 **12.3138**，在 **“Declination · degrees”** 填 **14.797389**，然后点 **“Point to coordinates”**。
- 在 **“Field of view”** 下面点 **“Telescope · 15′”**。
- 点页面最上方的 **“Observatory clock & spectral tracking”** 展开，再点 **“Turn tracking on”**。

Set up (still on the observatory page):
- Tap **"Enter coordinates"** (skip if the boxes already show). Type **12.3138** in **"Right ascension · hours"** and
  **14.797389** in **"Declination · degrees"**, then tap **"Point to coordinates"**.
- Under **"Field of view"** tap **"Telescope · 15′"**.
- Tap **"Observatory clock & spectral tracking"** at the very top of the page to open it, then tap **"Turn tracking on"**.

4b. 内置星表（不需要外网）：往下滑一点，找到 **“CCD camera”** 部分（在大标题 “Start with the sky.” 下面）。确认 **“Catalog source”** 选的是 **“Bundled extracts only (no network)”**。点 **“Start exposure”** 开始计时（默认曝光 10 秒）。状态会先显示 **“Exposing…”**，等到显示 **“Image ready.”** 并出现一张灰色的星空图就停表。
Bundled catalog (no outside network): scroll down a little to the **"CCD camera"** section (below the big title "Start with
the sky."). Check that **"Catalog source"** is set to **"Bundled extracts only (no network)"**. Tap **"Start exposure"** and
start timing (the default exposure is 10 seconds). The status shows **"Exposing…"**; stop when it says **"Image ready."** and a
grey star image appears.

4c. 在线查询（会连到国外的天文星表服务器 VizieR）：在 **“Catalog source”** 里选 **“Ask VizieR live (sends only RA, Dec and search radius; tries the IDIA mirror, then CDS)”**，再点 **“Start exposure”** 开始计时。最多等 2 分钟，然后记下发生了什么：
- 出现 **“Image ready.”** 和星空图：记下秒数；
- 出现一句以 **“No image was made.”** 开头的话（例如 “No VizieR mirror answered in time.” 或 “No VizieR mirror could be reached.”）：请把整句抄下来，并记下秒数；
- 2 分钟后状态还停在 **“Waiting for the catalog…”**，或者一直停在别的状态不动：写“卡住”。

Live query (this contacts VizieR, an astronomy catalog service outside China): under **"Catalog source"** choose **"Ask VizieR
live (sends only RA, Dec and search radius; tries the IDIA mirror, then CDS)"** and tap **"Start exposure"**; start timing. Wait
up to 2 minutes, then note what happened:
- **"Image ready."** and a star image: write the seconds;
- a sentence starting with **"No image was made."** (for example "No VizieR mirror answered in time." or "No VizieR mirror could
  be reached."): copy the whole sentence and write the seconds;
- after 2 minutes the status still says **"Waiting for the catalog…"** or stays on any other status: write "stuck".

**5. 有没有卡住或空白的地方？/ Anything stuck or blank?**

整个过程中，有没有哪里一直空白、一直在转圈、按钮点了没反应，或者弹出错误？简单描述一下在哪一步。
During the whole test, did anything stay blank, keep spinning, ignore your taps, or show an error? Say briefly at which step.

**6.（可选）在微信里打开 / (Optional) Open it inside WeChat**

把 https://openvireo.space 发给“文件传输助手”，在微信里点开。能正常打开吗？还是微信提示“非微信官方网页，请确认是否继续访问”或“如需浏览，请长按网址复制后使用浏览器访问”之类的警告，或者直接打不开？
Send https://openvireo.space to yourself in WeChat (File Transfer) and tap it there. Does it open normally, does WeChat show a
warning (such as "this is not an official WeChat page, continue?", or asking you to copy the link into a browser), or is it
blocked?

### 如果你愿意：电脑浏览器的开发者工具 / If you are comfortable with it: the browser's developer tools

这一部分只适合电脑上的 Chrome 或 Edge，完全可以跳过。浏览器是中文界面时，括号里写了可能的中文名称（没有逐一核对过）。
Only for Chrome or Edge on a computer. Feel free to skip it. For a browser in Chinese, the likely Chinese labels are given in
brackets (not checked one by one).

1. 打开 https://openvireo.space ，按 **F12**（Mac 上按 Option+Command+I），选 **“Network”（网络）** 标签，勾选 **“Disable cache”（停用缓存；Edge 里可能叫“禁用缓存”）**，然后按 **Ctrl+R**（Mac 上 Command+R）刷新。
   Open https://openvireo.space, press **F12** (Option+Command+I on a Mac), choose the **"Network"** tab, tick **"Disable cache"**,
   then reload with **Ctrl+R** (Command+R on a Mac).
2. 等页面加载完，看面板最下面一行的 **“DOMContentLoaded”**、**“Load”（加载）** 和 **“Finish”（完成用时）** 的时间，记下来。
   When the page has loaded, note the **"DOMContentLoaded"**, **"Load"** and **"Finish"** times in the bottom bar of the panel.
3. 有没有标红的请求？记下它们的名字（Name）和状态（Status）。
   Are any requests shown in red? Note their Name and Status.
4. 在过滤框里输入 **cloudflareinsights**：看 **beacon.min.js**（来自 static.cloudflareinsights.com）和 **rum**（来自 cloudflareinsights.com）这两个请求是成功（状态 200 或 204）、失败（红色，例如 “(failed)” / “(失败)”），还是一直 “(pending)” / “(待处理)”。
   Type **cloudflareinsights** in the filter box: is **beacon.min.js** (from static.cloudflareinsights.com) and **rum** (from
   cloudflareinsights.com) successful (status 200 or 204), failed (red, for example "(failed)"), or stuck at "(pending)"?
5. 做第 4c 步（在线查询）时，在过滤框里输入 **vizier**：看发往 **vizier.idia.ac.za** 和 **vizier.cds.unistra.fr** 的请求是成功（200）、失败，还是一直 “(pending)” / “(待处理)”，以及用了多少秒（“Time”（时间）一列）。
   While doing step 4c (the live query), type **vizier** in the filter box: are the requests to **vizier.idia.ac.za** and
   **vizier.cds.unistra.fr** successful (200), failed, or stuck at "(pending)", and how long did they take (the "Time" column)?
6. 做第 3 步（星空图）时，在过滤框里输入 **gsc**：大概有几个请求，最慢的一个用了多少秒？
   While doing step 3 (the sky map), type **gsc** in the filter box: roughly how many requests are there, and how long did the
   slowest one take?

### 结果表 / Result form

请复制下面这段，填好后用平时的聊天软件发回来就可以。
Copy the block below, fill it in and send it back in your usual chat app.

```
OpenVireo 中国测试结果 / China test result
日期和时间 / Date and time:
城市 / City:
网络（宽带或 Wi-Fi / 手机流量）/ Network (broadband or Wi-Fi / mobile data):
运营商 / Carrier:
设备和浏览器 / Device and browser:
VPN 已关闭 / VPN off: 是 / 否 (yes / no)

1a 首页出现（秒，或“打不开”）/ Home page appeared (seconds, or "does not open"):
1b 页面出来后加载条还在转？多少秒停 / Loading bar kept going after the page appeared? seconds until it stopped:
2a 分类练习出现（秒）/ Classification exercise appeared (seconds):
2b 点 Next standard 后标题变成 B0 V / Title changed to B0 V after Next standard: 是 / 否
3a 打开圆顶后星空图出现（秒，或“没出现”）/ Sky map after Open dome (seconds, or "did not appear"):
3b 选 M51 后星空图更新（秒，或“没出现”）/ Sky map updated after M51 (seconds, or "did not appear"):
4b 内置星表：出现 Image ready.（秒，或抄下出现的那句话）/ Bundled catalog: Image ready. (seconds, or copy the sentence shown):
4c 在线查询：结果和秒数（Image ready. / 抄下 No image was made. 那句 / 卡住）/ Live query: result and seconds (Image ready. / the "No image was made." sentence / stuck):
5 卡住或空白的地方 / Anything stuck or blank:
6 微信里打开（可选）/ Opened in WeChat (optional): 正常 / 有警告 / 打不开 (normal / warning / blocked)

开发者工具（可选）/ Developer tools (optional):
  DOMContentLoaded / Load / Finish:
  标红的请求 / Requests in red:
  beacon.min.js: 成功 / 失败 / pending (ok / failed / pending)
  rum: 成功 / 失败 / pending
  vizier.idia.ac.za: 成功 / 失败 / pending，秒数 / seconds:
  vizier.cds.unistra.fr: 成功 / 失败 / pending，秒数 / seconds:
  gsc 请求数和最慢秒数 / gsc requests and slowest seconds:

备注 / Notes:
```
