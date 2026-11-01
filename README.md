# 真面一下｜AI 模擬面試

**把下一場面試，先練一次。**

上傳職缺說明與履歷，與 AI 影像面試官即時對話，練習自我介紹與追問；面試後回看逐字稿、AI 整理建議並補充自己的筆記，讓下一次回答更有準備。

[下載完整專案 ZIP](https://github.com/ccbibo/zhenmian-interview/raw/refs/heads/main/zhenmian-interview-source.zip) · [開啟線上產品](https://zhenmian-interview.vercel.app/)

專案只提供一份完整下載包，包含原始碼、測試、部署文件與虛構測試資料。線上產品目前保留登入保護；下載本機執行需設定自己的 API 金鑰。

## 實際畫面

![實際 AI 影像面試畫面](04-own-site-live-interviewer.png)

![JD 與履歷 PDF 匯入](02-pdf-upload-success-live.png)

以上為自家網站實測畫面，PDF 範例與候選人名稱為虛構資料。

## 可以做什麼

- 分別匯入 JD 與履歷，支援 PDF、TXT、Markdown 或直接貼上文字。
- 選擇 HR、技術或綜合面試，一輪一位 AI 影像面試官；目前每場最多兩分鐘。
- 使用麥克風對話，攝像頭可選；沒有攝像頭也能練習。
- 結束後回看逐字稿，同意後由 AI 整理有依據的練習建議；可補充筆記並匯出紀錄。

2026-11-01 已經使用者真人實測，肯定對話體驗、流暢度與面試紀錄流程。筆記僅留在目前頁面，請匯出保存。

## 技術與啟動

前端使用 JavaScript／CSS；Node.js 後端串接 Tavus 即時影音，以及 DeepSeek 文字練習與回饋。PDF.js 在瀏覽器解析文件。金鑰不寫入前端或公開專案。

下載並解壓縮後，安裝 Node.js 22 以上，在解壓後的專案根目錄執行：

```sh
cp .env.example .env
# 私下填入自己的 API 金鑰及角色設定
npm run doctor
npm start
```

開啟 http://127.0.0.1:4180 。詳細設定在下載包的 docs/API_SETUP.md，雲端部署說明在 deployment/vercel/README.md。

```sh
npm test
npm --prefix hosted run build
npm --prefix hosted run validate
npm --prefix hosted test
```

目前為單人短場版本，尚無跨裝置長期同步、多人同時動態人物或公開多使用者配額管理。公開內容不含真實履歷、私人對話、筆記、API 金鑰或通話權杖。展示影片與個人作品頁可在後續使用保留素材製作。
