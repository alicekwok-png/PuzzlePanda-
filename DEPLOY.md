# 部署到 Render（免費方案）

這個遊戲是純前端 Vite 專案，`npm run build` 出一個 `dist/` 靜態資料夾就完事，
不需要任何伺服器程式。Render 的 **Static Site** 在免費方案是免費的，
含免費 HTTPS、自訂網域、以及每月 100GB 流量。

配置已經寫好在 `render.yaml`，你只需要做下面三步。

---

## 第一步：建立第一個 commit

Repo 已經 `git init` 過，189 個檔案也 `git add` 好了。**只差最後 commit** ——
我沒有替你設 git 身份，因為作者名和 email 會永久寫進 commit 記錄，猜錯改不掉。

```bash
cd jigsaw-solitaire
git config user.name "你的名"
git config user.email "你的email"
git commit -m "PuzzlePanda: 50 關拼圖遊戲，含貼紙收藏與三語系統"
```

（用 `git config` 不加 `--global`，設定只套用在這個 repo，不影響你其他專案。）

---

## 第二步：推上 GitHub

在 GitHub 開一個新的 **private** repo（不要勾 "Add a README"），然後：

```bash
git remote add origin https://github.com/你的帳號/puzzlepanda.git
git push -u origin main
```

Repo 約 77MB（主要是 50 張主題相 + 50 張貼紙 + 11 條影片），
GitHub 完全接受，沒有任何單一檔案超過 100MB 上限。

---

## 第三步：在 Render 建立服務

1. 登入 [render.com](https://render.com)（免費註冊，靜態網站不需要信用卡）
2. **New +** → **Blueprint**
3. 連接你的 GitHub 帳戶，選剛才那個 repo
4. Render 會自動讀 `render.yaml`，顯示一個叫 `puzzlepanda` 的 Static Site
5. 按 **Apply** / **Create**

首次 build 大約 2–4 分鐘（npm ci + vite build）。完成後你會拿到一條
`https://puzzlepanda-xxxx.onrender.com` 網址。

**之後每次 `git push` 到 main，Render 會自動重新 build 並部署**，不用再做任何事。

---

## `render.yaml` 已經幫你配好的東西

| 設定 | 作用 |
|---|---|
| `buildCommand: npm ci && npm run build` | `npm ci` 嚴格跟 lockfile，比 `npm install` 快而且可重現 |
| `staticPublishPath: ./dist` | Vite 的輸出目錄 |
| `/assets/*` 永久快取 | 打包檔名帶 hash，內容一改檔名就變，可以 `immutable` |
| `/images/`、`/stickers/`、`/sfx/`、`/intro/` 快取一日 | 這幾個是體積大宗，快取後回訪幾乎不用再下載 |
| SPA rewrite | 任何路徑都回 `index.html`。目前沒有前端路由，但日後要加不用改設定 |
| `X-Content-Type-Options`、`Referrer-Policy` | 基本安全標頭 |

---

## 流量估算：免費額度綽綽有餘

`dist/` 全部加起來 70MB，但**訪客不會一次下載全部**：

| 項目 | 大小 | 何時下載 |
|---|---|---|
| index.html + JS + CSS | 約 270KB（gzip 後更細） | 每次 |
| 開場動畫 | 1.5MB | 每次冷啟動 |
| 主題相 | 每張 300–900KB | 只在進入該關時 |
| 貼紙 | 每張約 190KB | 只在過關時 |
| 章節過渡片 | 每條 2.6–3.9MB | **只在完成整章那一刻** |

一次典型首玩體驗大約 **2–3MB**。以每月 100GB 計，約可支撐 **三萬至五萬次** 訪問。

想再省，最有效是把開場動畫壓細（它在每次冷啟動的關鍵路徑上），
或者改成第二次之後不再播。

---

## ⚠️ 三件部署前要知道的事

### 1. 網頁版看不到廣告，這是正常的

`src/services/ads.js` 用 `Capacitor.isNativePlatform()` 判斷，在瀏覽器一律回 `false`，
所有廣告函式變成 no-op。**AdMob 只有打包成原生 app 才會顯示廣告。**
網頁版只會見到版位的虛線佔位框。詳見 `ADS-FOR-IT.md`。

### 2. `?dev=1` 在公開網址上一樣有效

開發者列（解鎖全部關卡）在正式 build 已經被 Vite tree-shake 移除，
**但如果有人在網址加 `?dev=1`，它會重新出現**。這是方便真機測試而刻意保留的後門，
不是安全機制。

對一個拼圖遊戲來說影響很小（最多是有人跳關）。如果你不想公開版有這個後門，
把 `src/services/devMode.js` 的 `isDevBuild()` 改成只回 `import.meta.env.DEV` 即可：

```js
export function isDevBuild() {
  return import.meta.env.DEV;
}
```

### 3. 這是網頁版，跟上架 App Store / Play 是兩條路

Render 部署的是**網頁版**，方便你、設計部、IT 隨時用瀏覽器試玩與分享。
上架原生 app 仍然要走 Capacitor 那條路（`npm run cap:add:ios` / `cap:add:android`），
需要 Mac + Xcode / Android Studio，見 README 的上架章節。

兩條路共用同一份程式碼，不會互相影響。

---

## 本機先驗證（已經做過，你想自己確認可以照跑）

```bash
npm run build
npx vite preview --port 4173
```

我已經跑過並逐項確認：

| 檢查 | 結果 |
|---|---|
| index.html 正確引用打包後的 JS / CSS | ✅ |
| 標題 | ✅ PuzzlePanda |
| favicon、logo、工具列圖示 | ✅ HTTP 200/206 |
| 音效、開場影片 | ✅ `audio/mpeg`、`video/mp4` |
| 主題相、貼紙、章節過渡片 | ✅ 全部服務得到 |
| **DEV 列在正式 build 已移除** | ✅ |
| Console 錯誤 | ✅ 無 |
