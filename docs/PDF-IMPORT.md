# PDF 匯入

JD 與履歷各自支援 PDF／TXT／MD。PDF 上限 10 MB、20 頁、30,000 字；合計文字 110 KB。PDF.js 6.4.299 與 worker、CMap 固定版本由 jsDelivr 載入；文件 bytes 在瀏覽器解析。確認原文後才依畫面同意流程送至面試服務。

不提供 OCR、Word 或密碼輸入；掃描、加密、損毀、超限與逾時皆顯示錯誤，保留原欄位內容。多欄文件的閱讀順序仍需人工核對。

Safari 修正使用 legacy PDF.js 與 streamTextContent().getReader()，避免依賴 ReadableStream 非同步迭代。實際 Safari 測試已完成兩份虛構單頁英文 PDF：JD 212 字、履歷 236 字，兩份末行標記均完整顯示。中文與多欄文件尚未完成同等實測。

成功截圖：../evidence/screenshots/02-pdf-upload-success-live.png 。測試替身涵蓋大小限制、掃描、加密、逾時及 Safari 串流處理；不冒充所有真實 PDF 皆可解析。
