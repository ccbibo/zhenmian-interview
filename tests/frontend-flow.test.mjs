import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {issueRoundContinuation,transcriptFingerprint} from '../lib/interview.mjs';

// Runs frontend logic with minimal DOM stubs. This is not browser, audiovisual or live API QA.
const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function harness(){
  const nodes=new Map();
  const node=()=>({innerHTML:'',textContent:'',value:'30',disabled:false,hidden:false,remove(){this.removed=true},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn},querySelectorAll(){return []},append(child){(this.children??=[]).push(child)},prepend(child){(this.children??=[]).unshift(child)},focus(){}});
  const get=selector=>{if(selector==='#duration'&&!nodes.get('#content')?.innerHTML.includes('id="duration"'))return null;if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)};
  let now=1000000;
  class Clock extends Date {static now(){return now}}
  const context=vm.createContext({document:{querySelector:get,createElement:node,body:{classList:{remove(){},toggle(){}}}},Date:Clock,console,URL,TextEncoder,AbortController,setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},cancelAnimationFrame(){},window:{scrollTo(){}},crypto:{randomUUID:()=> 'fixture-id'}});
  vm.runInContext(script.slice(0,script.indexOf("$('#privacy').onclick"))+script.slice(script.indexOf('function renderRecovery()'),script.indexOf('function returnHome()'))+`;globalThis.ui={state,readFile,renderDocuments,renderReport,renderRecovery,renderSchedule,renderRoles,loadSessionTranscript,generateSessionReport,endSession,updateSessionTimer,syncHomeDuration,formatSchedule,go,startSession,prepareNextRound,nextRoundHtml,clearContinuation,continuationMatches,continuationExpiryMs};render=()=>{};`,context);
  const ui=context.ui;Object.assign(ui.state,{step:5,lastSessionId:'session_test',jd:'Python 與 RAG 的 AI 應用工程師職缺資料。',resume:'測試用虛構候選人履歷，具 Python 原型開發經驗。',consent:true,status:{configured:true,reportConfigured:true,llmConfigured:true,maxCallSeconds:120},transcriptState:'ready'});
  const setApi=fn=>{context.testApi=fn;vm.runInContext('api=(...args)=>testApi(...args)',context)};
  return {ui,get,context,setApi,setClock(value){now=value}};
}
const history=[{id:'T001',role:'interviewer',content:'如何確認 RAG 答案有依據？'},{id:'T002',role:'candidate',content:'我會建立測試案例並檢查引用。'}];
const report={summary:'候選人提到案例與引用檢查。',feedback:[{turnId:'T002',observation:'尚未舉出實際測試案例。',improvement:'補充一個錯誤案例與修正方式。',evidenceIds:['JD001']}],unobserved:['尚未觀察正式部署。']};
test('pending transcript discloses waiting and offers manual query without fabricated answers',async()=>{
  const h=harness();let calls=0;h.setApi(async(path)=>{calls++;assert.equal(path,'/api/session/session_test/transcript');return {state:'pending',history:[],source:'tavus',notice:'逐字稿仍在處理。'}});
  await h.ui.loadSessionTranscript();h.ui.renderReport();assert.equal(calls,1);assert.equal(h.ui.state.liveHistory.length,0);assert.match(h.get('#content').innerHTML,/逐字稿仍在處理/);assert.match(h.get('#content').innerHTML,/id="generate-session-report" disabled/);
});
test('actual transcript roles are displayed and content is escaped',async()=>{
  const h=harness();h.setApi(async()=>({state:'ready',source:'tavus',history:[...history,{id:'T003',role:'candidate',content:'<script>secret()</script>'}]}));
  await h.ui.loadSessionTranscript();h.ui.renderReport();const html=h.get('#content').innerHTML;assert.match(html,/你 · T002/);assert.match(html,/AI 面試官 · T001/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>secret/);
});
test('malformed or failed transcript cannot silently replace known actual turns',async()=>{
  const h=harness();h.ui.state.liveHistory=structuredClone(history);h.setApi(async()=>({state:'ready',history:[history[0],history[0]]}));await h.ui.loadSessionTranscript();assert.match(h.ui.state.transcriptError,/無法辨識的回合/);assert.equal(h.ui.state.liveHistory.length,2);
  h.setApi(async()=>{throw new Error('服務目前離線')});await h.ui.loadSessionTranscript();assert.equal(h.ui.state.transcriptError,'服務目前離線');assert.equal(h.ui.state.report,null);
});
test('feedback requires consent, a configured model, original documents and actual candidate answers',async()=>{
  const h=harness();let calls=0;h.setApi(async()=>{calls++;return report});h.ui.state.liveHistory=structuredClone(history);
  h.ui.state.consent=false;await h.ui.generateSessionReport();h.ui.state.consent=true;h.ui.state.status.reportConfigured=false;await h.ui.generateSessionReport();h.ui.state.status.reportConfigured=true;h.ui.state.transcriptState='pending';await h.ui.generateSessionReport();h.ui.state.transcriptState='ready';h.ui.state.jd='';await h.ui.generateSessionReport();assert.equal(calls,0);
});
test('session report uses immutable original document snapshot, never client transcript history',async()=>{
  const h=harness();h.ui.state.liveHistory=structuredClone(history);h.ui.state.sessionDocuments={sessionId:'session_test',jd:'原本面試使用的 AI 工程職缺，要求 RAG、Python 和驗證。',resume:'原本面試使用的虛構履歷，包含 Python 專案與需求分析。'};let calls=0;
  h.setApi(async(path,options)=>{calls++;assert.equal(path,'/api/session/session_test/report');const body=JSON.parse(options.body);assert.equal(body.jd,h.ui.state.sessionDocuments.jd);assert.equal(body.resume,h.ui.state.sessionDocuments.resume);assert.equal(body.consent,true);assert.equal(body.history,undefined);return report});
  await h.ui.generateSessionReport();assert.equal(calls,1);assert.equal(h.ui.state.report.summary,report.summary);h.ui.renderReport();assert.match(h.get('#content').innerHTML,/我會建立測試案例並檢查引用/);assert.match(h.get('#content').innerHTML,/參考原文：JD001/);
});
test('aborted feedback preserves transcript and does not automatically retry',async()=>{
  const h=harness();h.ui.state.liveHistory=structuredClone(history);let calls=0;h.setApi(async(path,options)=>{calls++;const error=new Error('aborted');error.name='AbortError';throw error});await h.ui.generateSessionReport();assert.equal(calls,1);assert.equal(h.ui.state.liveHistory.length,2);assert.match(h.ui.state.reportError,/已中止等待/);assert.equal(h.ui.state.reportBusy,false);
});
test('successful end queries transcript once; failed end keeps active session recoverable',async()=>{
  const h=harness();h.ui.state.session={sessionId:'session_test'};const paths=[];h.setApi(async path=>{paths.push(path);if(path.endsWith('/transcript'))return {state:'pending',history:[],source:'tavus'};return {state:'ended'}});await h.ui.endSession();assert.equal(h.ui.state.session,null);assert.equal(paths.length,2);assert.equal(paths[0],'/api/session/end');assert.equal(h.ui.state.step,5);
  h.ui.state.session={sessionId:'session_failed'};h.setApi(async()=>{throw new Error('尚未確認')});await h.ui.endSession();assert.equal(h.ui.state.session.sessionId,'session_failed');assert.match(h.ui.state.error,/尚未確認遠端連線已結束/);
});
test('reload can view completed transcript without uploading documents again; feedback still needs matching documents',()=>{
  const h=harness();h.ui.state.step=0;h.ui.state.jd='';h.ui.state.resume='';h.ui.go(5);assert.equal(h.ui.state.step,5);h.ui.renderReport();assert.match(h.get('#content').innerHTML,/補上這場面試使用的同一份 JD 與履歷/);
});
test('manual notes are separate from actual transcripts and text practice feedback remains visible',()=>{
  const h=harness();h.ui.state.transcript='自己的筆記';h.ui.state.practiceReport=report;h.ui.renderReport();assert.match(h.get('#content').innerHTML,/手動筆記與服務逐字稿分開保留/);assert.match(h.get('#content').innerHTML,/文字練習紀錄/);assert.equal(h.ui.state.liveHistory.length,0);
});
test('two-minute cap controls schedule, homepage, countdown and one-shot end request',()=>{
  const h=harness();h.ui.renderSchedule();assert.match(h.get('#content').innerHTML,/value="2 分鐘"/);assert.doesNotMatch(h.get('#content').innerHTML,/id="duration"/);h.ui.syncHomeDuration();assert.equal(h.get('#home-duration-output').textContent,2);assert.equal(h.get('#home-duration').hidden,true);
  h.ui.state.session={durationMinutes:2};h.ui.state.sessionStarted=1000000;vm.runInContext('globalThis.ends=0;endSession=()=>{ends++}',h.context);h.setClock(1119000);h.ui.updateSessionTimer();assert.equal(h.get('#timer').textContent,'剩餘 00:01');h.setClock(1120000);h.ui.updateSessionTimer();h.ui.updateSessionTimer();assert.equal(h.context.ends,1);
});
test('normal timing returns when test cap changes, and unconfigured direct start cannot call API',async()=>{
  const h=harness();h.ui.state.status.maxCallSeconds=2700;h.ui.renderSchedule();assert.match(h.get('#content').innerHTML,/id="duration"/);h.ui.syncHomeDuration();assert.equal(h.get('#home-duration').hidden,false);h.ui.state.status.configured=false;let calls=0;h.setApi(async()=>{calls++});await h.ui.startSession();assert.equal(calls,0);
});
test('role selection shows single-person availability upfront',()=>{
  const h=harness();h.ui.renderRoles();assert.match(h.get('#content').innerHTML,/每場一位 · 多人模式尚未開放/);assert.doesNotMatch(h.get('#content').innerHTML,/可選 1–3 位/);
});

test('unknown creation links the provider dashboard and never offers automatic recreation',()=>{
  const h=harness();h.ui.state.status={requiresProviderCheck:true,state:'creation_unknown'};h.ui.renderRecovery();const html=h.get('#content').children[0].innerHTML;assert.match(html,/maker.tavus.io\/dev\/conversations/);assert.match(html,/不會自動重建/);assert.doesNotMatch(html,/id="check-recovered-session"/);
});
test('manual recovery check reads an existing room and reaches records when it is already ended',async()=>{
  const h=harness();h.ui.state.status={activeSessionId:'session_test',state:'created'};h.ui.renderRecovery();const paths=[];
  h.setApi(async path=>{paths.push(path);if(path==='/api/status')return {configured:true,reportConfigured:true,lastSessionId:'session_test',maxCallSeconds:120};return {state:'ended',sessionId:'session_test'}});
  await h.get('#check-recovered-session').click({target:h.get('#check-recovered-session')});assert.equal(h.ui.state.lastSessionId,'session_test');assert.equal(h.ui.state.step,5);assert.deepEqual(paths,['/api/session/session_test','/api/status']);
});

test('next-round control requires a final candidate transcript and labels round two explicitly',()=>{
  const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.transcriptState='pending';assert.match(h.ui.nextRoundHtml(),/id="prepare-next-round" disabled/);h.ui.state.transcriptState='ready';h.ui.state.liveHistory=structuredClone(history);assert.match(h.ui.nextRoundHtml(),/進入第 2 面準備/);h.ui.state.lastSessionRound='3';const html=h.ui.nextRoundHtml();assert.match(html,/第 3 面已結束/);assert.doesNotMatch(html,/id="prepare-next-round"/);
});
test('preparing round two requests only a server receipt and does not create a conversation',async()=>{
  const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.liveHistory=structuredClone(history);const original={sessionId:'session_test',round:'1',jd:h.ui.state.jd,resume:h.ui.state.resume};h.ui.state.sessionDocuments={...original};h.ui.state.jd='這是離開紀錄後另行修改的新文件，不應拿來續接舊面試。';const paths=[];
  h.setApi(async(path,options)=>{paths.push(path);assert.equal(options.method,'POST');assert.equal(options.body,'{}');return {nextRound:'2',receipt:'synthetic-owner-bound-receipt',expiresAt:new Date(2000000).toISOString()}});
  await h.ui.prepareNextRound();assert.deepEqual(paths,['/api/session/session_test/continuation']);assert.equal(h.ui.state.session,null);assert.equal(h.ui.state.step,1);assert.equal(h.ui.state.round,'2');assert.equal(h.ui.state.roles[0],'chen');assert.equal(h.ui.state.jd,original.jd);assert.equal(h.ui.state.continuation.receipt,'synthetic-owner-bound-receipt');
});
test('starting a continued round submits receipt only and clears it only after successful creation',async()=>{
  const h=harness();h.ui.state.round='2';h.ui.state.continuation={receipt:'fixture-receipt',nextRound:'2',expiresAt:new Date(2000000).toISOString(),jd:h.ui.state.jd,resume:h.ui.state.resume};let creates=0;
  h.setApi(async(path,options)=>{assert.equal(path,'/api/session');creates++;const body=JSON.parse(options.body);assert.equal(body.continuation.receipt,'fixture-receipt');assert.equal(body.continuation.history,undefined);assert.equal(body.history,undefined);return {sessionId:'round_two',conversationUrl:'https://tavus.daily.co/fixture?t=fixture',durationMinutes:2,continuationUsed:true,priorRoundCount:1}});
  await h.ui.startSession();assert.equal(creates,1);assert.equal(h.ui.state.continuation,null);assert.equal(h.ui.state.sessionDocuments.round,'2');assert.equal(h.ui.state.session.durationMinutes,2);
});
test('expired or changed continuation never creates a billable room',async()=>{
  const h=harness();h.ui.state.round='2';h.ui.state.continuation={receipt:'fixture-receipt',nextRound:'2',expiresAt:new Date(2000000).toISOString(),jd:h.ui.state.jd,resume:h.ui.state.resume};let calls=0;h.setApi(async()=>{calls++});h.ui.state.jd+=' changed';await h.ui.startSession();assert.equal(calls,0);h.ui.state.jd=h.ui.state.continuation.jd;h.ui.state.continuation.expiresAt=new Date(900000).toISOString();await h.ui.startSession();assert.equal(calls,0);h.ui.clearContinuation();assert.equal(h.ui.state.continuation,null);
});
test('receipt failure or skipped round leaves the current interview record untouched',async()=>{
  const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.liveHistory=structuredClone(history);h.setApi(async()=>({nextRound:'3',receipt:'fixture',expiresAt:new Date(2000000).toISOString()}));await h.ui.prepareNextRound();assert.equal(h.ui.state.continuation,null);assert.equal(h.ui.state.step,5);assert.match(h.ui.state.continuationError,/輪次不連續/);assert.equal(h.ui.state.liveHistory.length,2);
});
test('round three continuation uses one interviewer and still waits for explicit start',async()=>{
  const h=harness();h.ui.state.lastSessionRound='2';h.ui.state.liveHistory=structuredClone(history);h.setApi(async path=>{assert.equal(path,'/api/session/session_test/continuation');return {nextRound:'3',receipt:'fixture-round-three',expiresAt:new Date(2000000).toISOString()}});await h.ui.prepareNextRound();assert.equal(h.ui.state.round,'3');assert.equal(h.ui.state.roles.length,1);assert.equal(h.ui.state.roles[0],'chou');assert.equal(h.ui.state.session,null);assert.equal(h.ui.state.status.maxCallSeconds,120);
});

test('a stale server that ignores continuation cannot be shown as a successful continued interview',async()=>{
  const h=harness();h.ui.state.round='2';h.ui.state.continuation={receipt:'fixture-receipt',nextRound:'2',expiresAt:new Date(2000000).toISOString(),jd:h.ui.state.jd,resume:h.ui.state.resume};const paths=[];
  h.setApi(async path=>{paths.push(path);if(path==='/api/session')return {sessionId:'stale_session',conversationUrl:'https://tavus.daily.co/fixture?t=fixture',durationMinutes:2};if(path==='/api/status')return {configured:true,activeSessionId:null};return {state:'ended'}});
  await h.ui.startSession();assert.equal(h.ui.state.session,null);assert.match(h.ui.state.error,/無法確認前輪回答已續接/);assert.deepEqual(paths,['/api/session','/api/session/end','/api/status']);assert.equal(h.ui.state.continuation.receipt,'fixture-receipt');
});

test('the real shared issuer numeric epoch expiry survives preparation and stored-receipt checks',async()=>{
  const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.liveHistory=structuredClone(history);
  const transcriptHash=await transcriptFingerprint(history);
  const response=await issueRoundContinuation({owner:'fixture-owner',jd:h.ui.state.jd,resume:h.ui.state.resume,lineage:[{round:'1',sessionId:'session_test',upstreamId:'provider_fixture',transcriptHash,role:{id:'lin',name:'測試面試官',role:'HR'},interviewType:'general',focusTopics:['common']}]},{SESSION_SECRET:'synthetic-session-secret-over-32-characters'},{now:1000000});
  assert.equal(typeof response.expiresAt,'number');h.setApi(async()=>response);await h.ui.prepareNextRound();assert.equal(h.ui.state.step,1);assert.equal(h.ui.state.continuation.expiresAt,response.expiresAt);assert.equal(h.ui.continuationMatches(),true);
  h.setClock(response.expiresAt);assert.equal(h.ui.continuationMatches(),false);
});
test('numeric and ISO expiries are normalized, while expired and invalid values are rejected before preparation',async()=>{
  for(const value of [2000000,new Date(2000000).toISOString()]){
    const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.liveHistory=structuredClone(history);h.setApi(async()=>({nextRound:'2',receipt:'fixture',expiresAt:value}));await h.ui.prepareNextRound();assert.equal(h.ui.state.continuation.expiresAt,2000000);assert.equal(h.ui.continuationMatches(),true);
  }
  for(const value of [NaN,Infinity,-1,0,{},null,[],true,'invalid','2000000',1e20,900000,1000000]){
    const h=harness();h.ui.state.lastSessionRound='1';h.ui.state.liveHistory=structuredClone(history);h.setApi(async()=>({nextRound:'2',receipt:'fixture',expiresAt:value}));await h.ui.prepareNextRound();assert.equal(h.ui.state.continuation,null);assert.equal(h.ui.state.step,5);assert.match(h.ui.state.continuationError,/有效時間/);
  }
});


test('PDF upload updates only its target, clears old analysis and renders escaped confirmation',async()=>{
 const h=harness();h.ui.state.step=0;h.ui.state.analysis={old:true};const previous=h.ui.state.jd;
 h.context.DocumentImporter={read:async()=>({text:'測試履歷：具備 Python、RAG 與 API 專案實作經驗。',pages:2})};
 const input={files:[{name:'<cv>.pdf'}],value:'selected'};await h.ui.readFile({target:input},'resume');
 assert.equal(h.ui.state.jd,previous);assert.match(h.ui.state.resume,/測試履歷/);assert.equal(h.ui.state.analysis,null);assert.equal(input.value,'');assert.equal(h.ui.state.documentBusy,false);
 h.ui.renderDocuments();assert.match(h.get('#content').innerHTML,/&lt;cv&gt;.pdf/);assert.match(h.get('#content').innerHTML,/application\/pdf/);
});
test('failed PDF import keeps existing content, and in-flight parsing blocks navigation',async()=>{
 const h=harness();h.ui.state.step=0;const original=h.ui.state.resume;let reject;
 h.context.DocumentImporter={read:()=>new Promise((_,r)=>{reject=r})};
 const pending=h.ui.readFile({target:{files:[{name:'scan.pdf'}],value:'selected'}},'resume');
 h.ui.go(1);assert.equal(h.ui.state.step,0);assert.equal(h.ui.state.documentBusy,true);
 reject(Error('掃描圖片無法解析'));await pending;assert.equal(h.ui.state.resume,original);assert.equal(h.ui.state.documentBusy,false);assert.match(h.ui.state.importStatus.resume,/掃描圖片/);
});
