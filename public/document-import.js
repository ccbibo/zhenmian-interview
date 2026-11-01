'use strict';
// PDF bytes stay in this browser. Only the pinned parser/CMap assets use the CDN.
// No PDF scripting, rendering, attachments or links are executed.
globalThis.DocumentImporter=(()=>{
 const version='6.4.299',base=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/`;
 let library;
 async function loadPdf(){
  try{
   library??=import(base+'legacy/build/pdf.min.mjs').catch(error=>{library=null;throw error});
   const pdf=await library;
   if(pdf.version!==version)throw new Error('version mismatch');
   pdf.GlobalWorkerOptions.workerSrc=base+'legacy/build/pdf.worker.min.mjs';
   return pdf;
  }catch{throw new Error('PDF 解析工具載入失敗，請確認網路，或改用貼上文字。')}
 }
 function checked(text){
  if(text.includes('\u0000'))throw new Error('檔案含有無法辨識的內容，請改用 UTF-8 文字檔或貼上文字。');
  text=text.replace(/\r\n?/g,'\n').trim();
  if(text.length>30000)throw new Error('內容超過 30,000 字，請精簡後再匯入。');
  if(text.length<20)throw new Error('可辨識文字不足 20 字，請改用文字版 PDF 或貼上文字。');
  return text;
 }
 async function read(file,{load=loadPdf,onProgress=()=>{},timeoutMs=30000}={}){
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['pdf','txt','md'].includes(ext))throw new Error('請選擇 PDF、TXT 或 MD；Word 請先另存為 PDF。');
  if(file.size>(ext==='pdf'?10*1024*1024:120000))throw new Error(ext==='pdf'?'PDF 超過 10 MB，請壓縮後再匯入。':'文字檔超過 120 KB，請精簡後再匯入。');
  if(ext!=='pdf'){
   const text=await file.text();
   if(text.startsWith('%PDF-'))throw new Error('這是 PDF 檔，請將副檔名改為 .pdf 後重試。');
   return {text:checked(text),pages:null};
  }
  let task,timer,expired=false;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('PDF 解析逾時，請精簡檔案或改用貼上文字。'));void task?.destroy().catch(()=>{});},timeoutMs)});
  const extract=async()=>{
   const data=new Uint8Array(await file.arrayBuffer());
   if(String.fromCharCode(...data.slice(0,5))!=='%PDF-')throw new Error('這不是有效的 PDF，請重新匯出後再試。');
   const pdf=await load();if(expired)return;
   task=pdf.getDocument({data,isEvalSupported:false,enableXfa:false,disableFontFace:true,useWasm:false,stopAtErrors:true,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',verbosity:0});
   const doc=await task.promise;
   if(!Number.isInteger(doc.numPages)||doc.numPages<1||doc.numPages>20)throw new Error('PDF 最多支援 20 頁，請只保留職缺或履歷頁面。');
   const pages=[];let length=0;
   for(let i=1;i<=doc.numPages;i++){
    if(expired)return;
    onProgress(i,doc.numPages);
    const page=await doc.getPage(i);
    try{
     // Safari ReadableStream lacks Symbol.asyncIterator on some supported releases.
     // Read explicitly instead of PDF.js getTextContent's for-await implementation.
     const reader=page.streamTextContent().getReader();let parts=[],pageLength=0;
     try{
      for(;;){
       const {done,value}=await reader.read();if(done)break;
       for(const item of value.items||[]){
        if(typeof item.str!=='string')continue;
        const part=item.str+(item.hasEOL?'\n':' ');pageLength+=part.length;
        if(length+pageLength>30000)throw new Error('內容超過 30,000 字，請精簡後再匯入。');
        parts.push(part);
       }
      }
     }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
     const text=parts.join('').trim();
     if(!text)throw new Error(`第 ${i} 頁沒有可辨識文字，可能是掃描圖片；目前未提供 OCR，請改用文字版 PDF 或貼上文字。`);
     length+=text.length+2;if(length>30000)throw new Error('內容超過 30,000 字，請精簡後再匯入。');
     pages.push(text);
    }finally{page.cleanup()}
   }
   return {text:checked(pages.join('\n\n')),pages:doc.numPages};
  };
  try{return await Promise.race([extract(),timeout])}
  catch(error){if(error.name==='PasswordException')throw new Error('PDF 有密碼保護，請先解鎖再匯入。');if(['InvalidPDFException','UnknownErrorException','MissingPDFException'].includes(error.name))throw new Error('PDF 已損壞或無法完整解析，請重新匯出或貼上文字。');throw error}
  finally{clearTimeout(timer);if(task)await task.destroy().catch(()=>{})}
 }
 return {read,version};
})();
