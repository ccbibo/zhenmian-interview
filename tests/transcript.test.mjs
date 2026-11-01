import test from 'node:test';
import assert from 'node:assert/strict';
import {getConversationTranscript,documentFingerprint} from '../lib/interview.mjs';

// Synthetic fixtures follow the official GET verbose + callback event schema.
// They verify integration contracts, not account access, STT accuracy, or audiovisual quality.
const env={TAVUS_API_KEY:'synthetic-transcript-key'};
const event=transcript=>({conversation_id:'c_fixture',event_type:'application.transcription_ready',properties:{transcript}});
const response=events=>new Response(JSON.stringify({conversation_id:'c_fixture',events}));
const rejects=(fn,code)=>assert.rejects(fn,error=>error.code===code);
test('document fingerprint binds the two original documents while normalizing line endings',async()=>{
  const a=await documentFingerprint('JD\nPython','CV\nRAG');
  assert.equal(a.length,64);assert.equal(a,await documentFingerprint(' JD\r\nPython ','CV\r\nRAG\n'));
  assert.notEqual(a,await documentFingerprint('JD\nPython','CV\nSQL'));
});
test('documented final transcript maps only speaker text and never returns perception or credentials',async()=>{
  let calls=0;
  const data=await getConversationTranscript('c_fixture',env,async(url,opts)=>{
    calls++;assert.equal(url,'https://tavusapi.com/v2/conversations/c_fixture?verbose=true');assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
    return response([{event_type:'application.perception_analysis',properties:{analysis:'private-perception'}},event([
      {role:'system',content:'private-system-instructions'},
      {role:'assistant',content:'請介紹你自己。',timestamp:100.5,inference_id:'private-inference'},
      {role:'user',content:'我做過 RAG 原型。',participant_name:'private-name',duration:1.5},
      {role:'tool',content:'private-tool-payload'}
    ])]);
  });
  assert.equal(calls,1);assert.equal(data.state,'ready');assert.equal(data.liveVerified,false);
  assert.deepEqual(data.history,[{id:'tavus_0002',role:'interviewer',content:'請介紹你自己。'},{id:'tavus_0003',role:'candidate',content:'我做過 RAG 原型。'}]);
  assert.doesNotMatch(JSON.stringify(data),/private-|synthetic-transcript-key/);
});
test('pending and empty transcripts are explicit and never filled with sample answers',async()=>{
  assert.equal((await getConversationTranscript('c_fixture',env,async()=>response(null))).state,'pending');
  const empty=await getConversationTranscript('c_fixture',env,async()=>response([event([])]));assert.equal(empty.state,'empty');assert.deepEqual(empty.history,[]);
});
test('foreign conversation IDs and malformed or inconsistent transcripts are rejected',async()=>{
  for(const data of [
    {conversation_id:'c_other',events:[]},
    {conversation_id:'c_fixture',events:{}},
    {conversation_id:'c_fixture',events:[{...event([]),conversation_id:'c_other'}]},
    {conversation_id:'c_fixture',events:[event(null)]},
    {conversation_id:'c_fixture',events:[event([{role:'candidate',content:'unknown upstream role'}])]},
    {conversation_id:'c_fixture',events:[event([{role:'user',content:null}])]},
    {conversation_id:'c_fixture',events:[event([]),event([{role:'user',content:'conflicting final'}])]}
  ])await rejects(()=>getConversationTranscript('c_fixture',env,async()=>new Response(JSON.stringify(data))),'transcript_invalid_response');
});
test('IDs, absent credentials and cancellation fail without contacting a provider',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw Error();};
  await rejects(()=>getConversationTranscript('../foreign',env,fetcher),'invalid_conversation_id');
  await rejects(()=>getConversationTranscript('c_fixture',{},fetcher),'provider_not_configured');
  const controller=new AbortController();controller.abort();
  await rejects(()=>getConversationTranscript('c_fixture',env,fetcher,{signal:controller.signal}),'cancelled');assert.equal(calls,0);
});
test('provider rejection and network failures are sanitized and not retried',async()=>{
  let calls=0;await rejects(()=>getConversationTranscript('c_fixture',env,async()=>{calls++;throw Error('private-network');}),'transcript_network_error');assert.equal(calls,1);
  calls=0;await rejects(()=>getConversationTranscript('c_fixture',env,async()=>{calls++;return new Response('private-provider',{status:401});}),'transcript_rejected');assert.equal(calls,1);
});
test('oversized response is cancelled before it can be accepted or returned',async()=>{
  let cancelled=false;
  const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(524289));},cancel(){cancelled=true;}});
  await rejects(()=>getConversationTranscript('c_fixture',env,async()=>new Response(body)),'transcript_too_large');assert.equal(cancelled,true);
});
