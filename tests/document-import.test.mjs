import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/document-import.js',import.meta.url),'utf8');
const context=vm.createContext({setTimeout,clearTimeout,Uint8Array});
vm.runInContext(source,context);
const importer=context.DocumentImporter;
const file=(name,body='%PDF-1.7 fixture',size=body.length)=>({name,size,text:async()=>body,arrayBuffer:async()=>new TextEncoder().encode(body).buffer});
function engine(pages){
 let destroyed=0,cleaned=0,options;
 return {load:async()=>({getDocument(input){options=input;return {promise:Promise.resolve({numPages:pages.length,getPage:async n=>({getTextContent:async()=>{throw new Error('Safari async iterator unavailable')},streamTextContent(){let done=false;return {getReader:()=>({async read(){if(done)return {done:true};done=true;return {done:false,value:{items:pages[n-1]}}},async cancel(){},releaseLock(){}})}},cleanup(){cleaned++}})}),destroy:async()=>{destroyed++}}}}),get stats(){return {destroyed,cleaned,options}}};
}
test('Safari without async stream iteration extracts all pages and Chinese with getReader, then destroys parser',async()=>{
 const e=engine([[{str:'AI 工程師，負責 RAG 與 Agent 系統開發。',hasEOL:true},{str:'Python / SQL'}],[{str:'履歷專案：建立測試案例及引用核對流程。'}]]),progress=[];
 const result=await importer.read(file('履歷.PDF'),{load:e.load,onProgress:(...args)=>progress.push(args)});
 assert.match(result.text,/AI 工程師.*\nPython \/ SQL\n\n履歷專案/s);assert.equal(result.pages,2);
 assert.deepEqual(progress,[[1,2],[2,2]]);assert.equal(e.stats.destroyed,1);assert.equal(e.stats.cleaned,2);
 assert.equal(e.stats.options.isEvalSupported,false);assert.equal(e.stats.options.enableXfa,false);assert.equal(e.stats.options.url,undefined);
});
test('rejects a scanned page instead of silently using partial text',async()=>{
 const e=engine([[{str:'第一頁含有足夠長的真實履歷文字，第二頁只有圖片。'}],[]]);
 await assert.rejects(importer.read(file('scan.pdf'),{load:e.load}),/第 2 頁.*OCR/);assert.equal(e.stats.destroyed,1);
});
test('blocks oversized, fake and unsupported files before parser loads',async()=>{
 let loads=0;const load=async()=>{loads++;throw Error()};
 await assert.rejects(importer.read(file('large.pdf','',11*1024*1024),{load}),/10 MB/);
 await assert.rejects(importer.read(file('fake.pdf','this is not a PDF'),{load}),/不是有效/);
 await assert.rejects(importer.read(file('cv.docx'),{load}),/Word/);assert.equal(loads,0);
});
test('rejects encrypted, corrupt and excessive-page PDFs and cleans up',async()=>{
 for(const name of ['PasswordException','InvalidPDFException']){
  let destroyed=0;const load=async()=>({getDocument:()=>({promise:Promise.reject(Object.assign(Error('bad'),{name})),destroy:async()=>{destroyed++}})});
  await assert.rejects(importer.read(file('bad.pdf'),{load}),name==='PasswordException'?/密碼保護/:/無法完整解析/);assert.equal(destroyed,1);
 }
 const e=engine(Array(21).fill([]));await assert.rejects(importer.read(file('long.pdf'),{load:e.load}),/20 頁/);assert.equal(e.stats.destroyed,1);
});
test('rejects overlong text, binary disguised as text and preserves TXT/MD path',async()=>{
 await assert.rejects(importer.read(file('cv.txt','a'.repeat(30001))),/30,000/);
 await assert.rejects(importer.read(file('cv.txt','\u0000'+'a'.repeat(30))),/無法辨識/);
 await assert.rejects(importer.read(file('cv.txt','%PDF-1.7')),/副檔名/);
 const result=await importer.read(file('cv.md','虛構履歷：具備 Python、SQL 與 RAG 原型開發經驗。'));assert.equal(result.pages,null);assert.match(result.text,/虛構履歷/);
});
test('timeout destroys the pending PDF task without a retry',async()=>{
 let destroyed=0,calls=0;const load=async()=>({getDocument:()=>{calls++;return {promise:new Promise(()=>{}),destroy:async()=>{destroyed++}}}});
 await assert.rejects(importer.read(file('slow.pdf'),{load,timeoutMs:5}),/逾時/);assert.equal(calls,1);assert.ok(destroyed>=1);
});
