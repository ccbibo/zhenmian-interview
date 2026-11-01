import test from 'node:test';
import assert from 'node:assert/strict';
import {createVercelHandler} from '../deployment/vercel/api/index.mjs';
test('unconfirmed fallback host cannot call any provider even if keys were supplied',async()=>{
 let called=0;const handler=createVercelHandler({LLM_API_KEY:'synthetic'},{fetch(){called++;throw Error('must not dispatch')}});
 const status=await handler(new Request('https://trial.example/api/index?__path=/api/status'));
 assert.equal((await status.json()).configured,false);
 assert.equal((await handler(new Request('https://trial.example/api/index?__path=/api/session',{method:'POST',body:'{}'}))).status,503);
 assert.equal(called,0);
});
test('adapter preserves same-origin request body and strips visitor-supplied Sites identity',async()=>{
 let captured;const handler=createVercelHandler({APP_PRIVATE_HOST_CONFIRMED:'true'},{async fetch(req){captured={url:req.url,identity:req.headers.get('oai-authenticated-user-id'),body:await req.text()};return Response.json({ok:true});}});
 await handler(new Request('https://trial.example/api/index?__path=/api/analyze&x=1',{method:'POST',headers:{'oai-authenticated-user-id':'forged','Content-Type':'application/json'},body:'{"jd":"fixture"}'}));
 assert.deepEqual(captured,{url:'https://trial.example/api/analyze?x=1',identity:null,body:'{"jd":"fixture"}'});
});
test('adapter refuses missing or unsafe rewrite paths',async()=>{
 const handler=createVercelHandler({APP_PRIVATE_HOST_CONFIRMED:'true'},{fetch(){throw Error('must not dispatch')}});
 for(const path of ['', '?__path=//external.example','?__path=https://external.example','?__path=/bad%5Cpath'])assert.equal((await handler(new Request('https://trial.example/api/index'+path))).status,404);
});
