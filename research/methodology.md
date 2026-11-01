# AI 職缺語料試點與正式抽樣方法

查核日：2026-10-31。試點是 20 筆官方原頁可讀且未見明確過期的 JD，加 2 筆 2023 歷史頁、7 筆排除/待驗證來源。不是已完成 100–200 筆，也不是招募中職缺總量。完整 JD 原文未保存；現有檔案保存職稱、來源、技能與研究者摘要，正式研究需補頁面快照及逐項依據。

## 為什麼不能把 AI 職缺混成一種面試

- AI Application/Agent：測 API、RAG 適用性、工具權限、評估與失敗回復，需追問本人實作與量測證據。
- ML Engineering/Research：測資料切分、統計、模型訓練、實驗及部署；研究職可能要求發表，應和應用工程分開。
- AI Deployment/Integration：測雲端/地端環境、容器、監控、回滾、客戶需求與導入，不應以純演算法考試替代。
- AI Product/Technical PM：測問題定義、需求、優先級、跨團隊交付、產品指標、成本品質取捨；Product Manager、Project Manager、Technical Program Manager 必須另外標籤，不能因中文同稱「專案經理」而合併。
- AI Security、Pre-sales：作擴展子類，不能大量塞進核心工程/PM統計。

這是依試點 JD 所做的產品設計推論，並非各公司實際面試流程或題目的證據。

## 正式 100–200 筆方案

先以台灣工作地點、明確參與 AI 產品/模型/部署為母體，不因公司使用AI或職稱含AI就自動納入。第一批100筆的研究配額為：應用/Agent 35、ML/研究25、部署/整合20、AI產品/專案/TPM20；200筆依同比例擴大。配額是產品涵蓋目的，不能當市場比例。可另留資安/售前擴展集，不拿來補滿核心配額。

每筆需：(1) 官方公司頁或公司控制的公開 ATS；(2) 詳細職責及必要條件可讀；(3) 台灣地點可核實；(4) 官方列表及詳細頁仍一致；(5) 收錄與最後查核時間；(6) 原文證據定位及快照。404、Job not found、空JS殼、403或僅搜尋摘要均留候選池，不算完成。

去重採公司+官方requisition ID，無ID時用canonical URL、正規化職稱與地點比對；去除tracking query、語言鏡像和同一職缺跨平台轉貼。多地點同一requisition為一筆，多requisition近似JD標重複家族，不讓同文重刊提高頻率。變更視為同職缺新版本，保留時間而非新計一筆。

公司最多佔正式樣本10%，至少20家公司；兼顧軟體/平台、半導體製造、金融、醫療/教育與系統整合。依明文年資分新鮮人/0–2、3–5、6+、未知；缺年資不能當0年。職級與語言另分層，避免資深職缺壓過新鮮人。若公開可驗證數量不足，透明報不足，不拿海外頁或泛軟體職缺補足。

## 正式 schema

job_id、company_id、source_kind、canonical_url、requisition_id、title_raw、title_normalized、job_family、subfamily、seniority_raw、min_years、max_years、education_required、location_raw、country、remote_scope、language_required、responsibilities[]、requirements_must[]、requirements_plus[]、skills_normalized[]、business_domain、source_published_at、collected_at、last_verified_at、availability_status、evidence_spans[]、snapshot_hash、duplicate_family_id、extraction_confidence、human_review_status。

每個技能/條件必須連回 evidence_span；『必須』『加分』與研究者推論分開。日期不存在填null，不用爬取日冒充刊登日。

## 分析與面試生成

計算每個職系及年資層的技能提及率，分母明列；公司去重後再報敏感度，避免模板JD支配結果。先做雙人抽查20%並處理分歧；其餘由單人逐筆核對。抽樣母體及配額固定後才做比較。不能從小型便利樣本推算真實市場需求或錄取機率。

履歷匹配輸出『JD要求→履歷證據→證據不足→面試驗證問題』，不把未提及當不具備。上傳JD優先於語料平均；語料提供題型與能力框架，不能替代目標JD。每次面試保存JD版本、履歷版本、題目/追問依據與評分rubric版本。生成的題目標示練習題，除非有可核實公開證據，不稱真實考古題。

## 限制與下一個驗證

目前20筆中Appier9、ASUS5，明顯偏向軟體、醫療及中高年資。不能輸出『百分之多少台灣AI職缺要求某技能』。下一批應優先補AI PM與新鮮人應用職缺、不同規模企業，而非持續從最易讀的Appier補樣本。試點 min_years 欄位未完整擷取者維持null，正式收錄需讀完整必要資格。
