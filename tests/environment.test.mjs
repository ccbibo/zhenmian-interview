import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=new URL('../scripts/check-environment.mjs',import.meta.url);
test('offline doctor distinguishes missing local configuration from unverified hosted secrets',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(script)],{env:{},encoding:'utf8'});
  assert.equal(result.status,1);
  const data=JSON.parse(result.stdout);
  assert.deepEqual(data.missingConfiguration,['TAVUS_API_KEY','TAVUS_PAL_ID','LLM_API_KEY','LLM_MODEL']);
  assert.equal(data.tavus.maxCallSeconds,120);assert.equal(data.network.checked,false);assert.equal(data.hosted.verified,false);
});
test('offline doctor validates a complete synthetic configuration without printing any credential',()=>{
  const env={TAVUS_API_KEY:'private-tavus-fixture',TAVUS_PAL_ID:'pal-fixture',LLM_API_KEY:'private-model-fixture',LLM_MODEL:'fixture',LLM_BASE_URL:'https://api.deepseek.com',TAVUS_MAX_CALL_SECONDS:'120'};
  const result=spawnSync(process.execPath,[fileURLToPath(script)],{env,encoding:'utf8'});
  assert.equal(result.status,0);
  const data=JSON.parse(result.stdout);assert.equal(data.llm.configured,true);assert.equal(data.tavus.configured,true);
  assert.equal(data.llm.liveVerified,false);assert.equal(data.tavus.liveVerified,false);
  assert.doesNotMatch(result.stdout,/private-tavus-fixture|private-model-fixture|pal-fixture/);
});
