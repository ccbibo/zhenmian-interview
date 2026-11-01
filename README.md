# 真面一下｜AI 模擬面試

把下一場面試，好好聊一次。

上傳 JD 和履歷，選擇面試內容，與 AI 影像面試官對話；結束後回看逐字稿、取得有依據的 AI 建議，並寫下自己的筆記。

**2026-11-01 使用者真人實測通過**：使用者肯定對話體驗、流暢度，以及面試紀錄、AI 整理與筆記流程。本紀錄為使用者體驗驗收，沒有虛構十人評分或延遲量測。

[開啟產品](https://zhenmian-interview.vercel.app/)（目前保留私人部署登入保護；GitHub 原始碼公開不等於公開 API 使用權限。）

## 使用流程

1. 分別上傳 JD、履歷 PDF，或貼入文字。
2. 選擇 HR／技術／綜合面試、輪次與面試官設定。
3. 檢查麥克風；攝像頭可關，沒有攝像頭也能語音面試。
4. 手動開始即時面試；目前單場上限 2 分鐘，不會自動重開。
5. 結束後取得逐字稿；同意後由 AI 整理練習建議。
6. 補充自己的筆記、匯出紀錄，或準備下一輪。

## 產品畫面

以下為自家網站的實測截圖，文件範例為虛構資料；沒有公開使用者真實履歷與對話。

![面試室實際連線](evidence/screenshots/04-own-site-live-interviewer.png)

![PDF 匯入成功](evidence/screenshots/02-pdf-upload-success-live.png)

其餘素材與後續展示規劃見 [作品集素材](docs/PORTFOLIO-ASSETS.md)。目前有實測截圖，尚未製作展示影片。

## 技術與資料界線

- Node.js 22+；前端原生 JavaScript／CSS，Node 後端無第三方執行套件。
- Tavus 提供即時人物與語音；DeepSeek 用於文字練習和有據回饋，兩條路徑分開。
- PDF.js 固定版本在瀏覽器解析 PDF，支援 PDF／TXT／MD；不含 Word、OCR 與密碼輸入。匯入後請核對文字順序。
- API 金鑰只保存在伺服器秘密設定；範例設定不含真實值。
- 逐字稿來自實際服務，不把手寫筆記當作語音辨識結果。AI 建議附原回答與文件依據，不生成錄取率或人格判斷。
- 筆記僅留在目前頁面，請匯出保存；目前沒有跨裝置長期同步。

## 本機執行與測試

```sh
cp .env.example .env
# 在本機私下填入自己的 API 設定
npm run doctor
npm start
```

本機網址為 http://127.0.0.1:4180 。不要將 .env 提交至 Git。

```sh
npm test
npm --prefix hosted run build
npm --prefix hosted run validate
npm --prefix hosted test
```

部署方式見 [Vercel 設定](deployment/vercel/README.md)、[API 設定](docs/API_SETUP.md)與 [架構](docs/ARCHITECTURE.md)。

## 已知範圍

目前為單人短場版本：一輪一位動態人物，四個角色名稱代表提問設定，尚未各自映射不同人物；第二、三輪支援前輪資料續接。多人同時動態人物、長場、跨節點防重與持久資料儲存仍需擴充。

使用者已確認本次對話流暢度；尚未宣稱量測達成特定 P50／P95、所有瀏覽器與實體攝像頭相容性，或完成十名獨立評審平均 95 分驗收。完整標準見 [驗收規範](docs/ACCEPTANCE.md)。

## 公開內容

本儲存庫包含程式、測試、公開職缺摘要、虛構測試履歷與經檢查的產品截圖；不包含金鑰、原始個人履歷、私人面試逐字稿、個人求職介紹稿、匯出筆記、通話權杖、舊 ZIP 或執行紀錄。
