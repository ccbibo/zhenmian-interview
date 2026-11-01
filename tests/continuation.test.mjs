import test from 'node:test';
import assert from 'node:assert/strict';
import {documentFingerprint,transcriptFingerprint,issueRoundContinuation,verifyAndLoadRoundContinuation} from '../lib/interview.mjs';

// Offline cryptographic + provider-contract fixtures only; never creates a live conversation.
const env={SESSION_SECRET:'synthetic-continuation-secret-32-characters',TAVUS_API_KEY:'synthetic-tavus'};
const documents={jd:'AI Engineer Python RAG project validation',resume:'Candidate built a RAG prototype and an evaluation dataset.'};
const history=[{id:'tavus_0001',role:'interviewer',content:'你如何驗證？'},{id:'tavus_0002',role:'candidate',content:'我以人工標註測試集驗證檢索。'}];
const ref=async(round='1',text=history)=>({round,sessionId:'local_'+round,upstreamId:'c_'+round,transcriptHash:await transcriptFingerprint(text),role:{id:'lin',name:'林以安',role:'面試官'},interviewType:'technical',focusTopics:['project']});
const provider=(text=history)=>async url=>new Response(JSON.stringify({conversation_id:new URL(url).pathname.split('/').at(-1),events:[{event_type:'application.transcription_ready',properties:{transcript:text.map(turn=>({role:turn.role==='candidate'?'user':'assistant',content:turn.content}))}}]}));
const load=(receipt,overrides={},fetcher=provider(),options={})=>verifyAndLoadRoundContinuation({owner:'owner_a',...documents,round:'2',receipt,...overrides},env,fetcher,{now:2000,...options});
const rejectCode=(fn,code)=>assert.rejects(fn,error=>error.code===code);
test('continuation re-reads actual provider history and binds document, owner and next round',async()=>{
  const issued=await issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref()]},env,{now:1000});
  assert.equal(issued.nextRound,'2');assert.doesNotMatch(JSON.stringify(issued),/人工標註|c_1|owner_a/);
  const result=await load(issued.receipt);assert.equal(result.priorRounds[0].history[1].content,history[1].content);assert.equal(result.lineage[0].upstreamId,'c_1');
  const hashIssued=await issueRoundContinuation({owner:'owner_a',documentHash:await documentFingerprint(documents.jd,documents.resume),lineage:[await ref()]},env,{now:1000});assert.equal((await load(hashIssued.receipt)).priorRounds.length,1);
});
test('altered documents, skipped round, wrong owner, expired and tampered receipts fail before provider calls',async()=>{
  const issued=await issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref()],expiresAt:3000},env,{now:1000});let calls=0;
  const never=async()=>{calls++;throw Error('must not contact provider');};
  await rejectCode(()=>load(issued.receipt,{resume:'different resume'},never),'continuation_documents_changed');
  await rejectCode(()=>load(issued.receipt,{round:'3'},never),'continuation_round_mismatch');
  await rejectCode(()=>load(issued.receipt,{owner:'owner_b'},never),'continuation_owner_mismatch');
  await rejectCode(()=>load(issued.receipt,{},never,{now:3000}),'continuation_expired');
  await rejectCode(()=>load((issued.receipt[0]==='A'?'B':'A')+issued.receipt.slice(1),{},never),'invalid_continuation');assert.equal(calls,0);
});
test('a session claim sealed for another purpose cannot act as a continuation receipt',async()=>{
  const payload={purpose:'opposite_room_session',owner:'owner_a'};
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET)),'AES-GCM',false,['encrypt']);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(payload))));
  const receipt=btoa(String.fromCharCode(...iv,...encrypted)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  await rejectCode(()=>load(receipt),'invalid_continuation');
});
test('provider transcript changes and pending transcripts cannot seed a new round',async()=>{
  const issued=await issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref()]},env,{now:1000});
  await rejectCode(()=>load(issued.receipt,{},provider([{id:'tavus_0001',role:'candidate',content:'altered answer'}])),'continuation_transcript_changed');
  await rejectCode(()=>load(issued.receipt,{},async()=>new Response(JSON.stringify({conversation_id:'c_1',events:[]}))),'continuation_not_ready');
});
test('lineage requires consecutive completed rounds and cannot silently truncate excess context',async()=>{
  await rejectCode(async()=>issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref('2'),await ref('1')]},env),'invalid_continuation');
  await rejectCode(async()=>issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref('1'),{...await ref('2'),upstreamId:'c_1'}]},env),'invalid_continuation');
  const longHistory=Array.from({length:3},(_,index)=>({id:`tavus_${String(index+1).padStart(4,'0')}`,role:'candidate',content:'中'.repeat(7000)}));
  const issued=await issueRoundContinuation({owner:'owner_a',...documents,lineage:[await ref('1',longHistory)]},env,{now:1000});
  await rejectCode(()=>load(issued.receipt,{},provider(longHistory)),'continuation_too_large');
});
