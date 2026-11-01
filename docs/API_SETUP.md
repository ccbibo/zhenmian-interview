# API 與環境設定

目前自家 Vercel 網站已完成 Tavus 短場連線、逐字稿與 AI 回饋流程；2026-11-01 使用者親自測試並確認對話體驗。以下為部署者設定，不包含實際秘密值。

伺服器端必填：LLM_API_KEY、LLM_BASE_URL、LLM_MODEL、TAVUS_API_KEY、TAVUS_PAL_ID、SESSION_SECRET、TAVUS_MAX_CALL_SECONDS。Vercel 轉接層另需 APP_PRIVATE_HOST_CONFIRMED=true；只有實際啟用 All Deployments 登入保護後才可設定，此旗標不是身份驗證。

預設 DeepSeek 官方 API：LLM_BASE_URL=https://api.deepseek.com；LLM_MODEL=deepseek-flash。依帳戶實際可用模型設定。DeepSeek 負責文字練習與回饋；Tavus PAL 的即時模型由 PAL 設定決定，不代表即時模型已改接 DeepSeek。

TAVUS_MAX_CALL_SECONDS=120；不開錄影、不自動重開。額度以供應商帳戶為準，不保證免費。TAVUS_FACE_ID、TAVUS_FACE_MAP 為選用，必須使用合法授權的人物設定。

npm run doctor 僅檢查本機設定，不連網或回顯秘密。雲端 Secrets 不會同步到本機 .env；不要把真實值寫入前端、文件、測試或 Git。

候選人瀏覽器負責取得麥克風與攝像頭。鏡頭可關；沒有鏡頭時可回退麥克風。沒有麥克風時可用文字練習。換電腦請開啟 HTTPS 產品網址並通過私人部署登入；文件與筆記目前不跨裝置同步。

官方文件：
- https://api-docs.deepseek.com/guides/json_mode/
- https://docs.tavus.io/api-reference/conversations/create-conversation

單人試驗架構尚無跨節點持久防重鎖與長期儲存，不應直接開放匿名多使用者消耗共用 API 額度。
