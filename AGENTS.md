# PicTool — Agent 操作手冊

## 工作完成規範

每次完成任何修改後，**必須主動執行以下步驟，不得等待使用者提醒**：

```powershell
pwsh -Command "
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Set-Location 'C:\Code play first\pictool'
  git add -A
  'feat: 說明' | Out-File -FilePath __commit_msg.txt -Encoding utf8
  git commit -F __commit_msg.txt
  Remove-Item __commit_msg.txt
  git push origin master
"
```

commit 格式：`feat` / `fix` / `refactor` / `docs` / `chore` + 冒號 + 中文說明。

---

## Shell 規範

**所有指令用 `pwsh -Command "..."` 執行**，不要用 cmd。

```powershell
# ✅ 正確
pwsh -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Set-Location 'C:\Code play first\pictool'; git status"

# ❌ 錯誤
cmd /c "git status"
```

全局已設 `core.pager=cat`，git 指令不需加 `--no-pager`。

---

## 搜尋與定位工具

**讀檔前先用 rg 搜尋，避免讀整個檔案浪費 token。**

```powershell
# 搜尋關鍵字在哪個檔案、哪一行
pwsh -Command "rg '關鍵字' 'C:\Code play first\pictool\js' --line-number"

# 搜尋特定方法定義
pwsh -Command "rg 'compressToTarget' 'C:\Code play first\pictool\js' -n"

# 只看某檔案的某幾行（定位到之後再讀片段）
# 用 read_file 搭配 offset + length 參數
```

定位到行號後，用 `read_file` 的 `offset` / `length` 只讀需要的段落，**不要整檔讀入**。

---

## 檔案結構（快速參考）

```
index.html              ← 所有 UI 元素定義（id 查這裡）
css/style.css           ← upload zone / toggle / tab 等自訂樣式
js/app.js               ← 主控制器，所有功能流程從這裡追
js/analytics.js         ← trackEvent() 匯出，不需修改
js/modules/
  fileHandler.js        ← 圖片集合 CRUD（不碰 DOM）
  imageProcessor.js     ← Canvas 繪圖 / 縮放 / ICO 編碼
  compressor.js         ← 壓縮二分搜尋邏輯
  backgroundRemover.js  ← AI 去背 CDN 動態載入
  uiManager.js          ← 所有 DOM 操作集中在此
```

---

## 常見任務操作步驟

### 修改現有邏輯

1. `rg '方法名或關鍵字' js --line-number` 找到檔案與行號
2. `read_file` 用 offset/length 只讀那段
3. `edit_block` 修改
4. commit & push

### 新增輸出格式

1. `index.html` — 在 `settingsPanel` 格式區塊新增 radio input + label
2. `js/modules/imageProcessor.js` → `canvasToBlob()` → `mimeMap` 加新格式
3. `js/app.js` → `processAllImages()` → format 判斷加新分支
4. `js/modules/uiManager.js` → `generateDownloadButtons()` → `formatColors` / `formatEmojis` 加對應項
5. commit & push

### 修改壓縮參數

目標檔案：`js/modules/compressor.js` → `compressToTarget()`

```
迭代次數：for (let i = 0; i < 14; i++)   ← 改這個數字
提早終止閾值：< 0.03                      ← 改這個百分比
品質範圍下限：let low = 0.05             ← 改這個值
品質範圍上限：let high = 0.92            ← 改這個值
```

### 修改 AI 去背模型

目標檔案：`js/modules/backgroundRemover.js` → `removeBackground()` → `model: 'isnet'`

可用值：`'isnet'` / `'medium'` / `'small'` / `'large'`

### 新增 UI 元素並讓 JS 能操作它

1. `index.html` 加上有唯一 `id` 的元素
2. `js/modules/uiManager.js` → constructor → `this.el` 物件加對應快取
3. 在 `js/app.js` 透過 `this.ui.el.新元素id` 使用

### 修改上傳區說明文字

目標檔案：`js/modules/uiManager.js` → `switchMode()` → `if (isConvert)` 分支內的字串

---

## 寫程式前先問（ponytail 原則）

1. 這功能需要存在嗎？不需要就跳過
2. 瀏覽器原生 API / Canvas API 能做？直接用
3. 專案已有的模組能解決？直接用
4. 能一行？就一行
5. 才寫最少能動的程式碼

不加沒被要求的抽象層。不主動加 error handling、loading state、或「以防萬一」的邏輯。刪除優於新增。

---

## 注意事項

- 純前端，**無 bundler、無 npm**，不要安裝套件或用 require()
- 所有模組用 ESM `import/export`，`<script type="module">` 載入
- WebP 在 Safari 可能回傳 null，`imageProcessor.js` 的 `canvasToBlob()` 已有 fallback，不要移除
- 壓縮模式只處理**第一張圖**（`fileHandler.getFirstImage()`），這是設計行為
- 移除圖片時必須 `URL.revokeObjectURL()`，`fileHandler.removeImage()` 已處理，自己加邏輯時要記得
