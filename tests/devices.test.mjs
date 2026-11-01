import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real browser handler with synthetic media devices; no camera or network access.
const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function enableDevices('),source.indexOf('\nfunction startMeter'));
function harness(getUserMedia){
  const nodes=new Map();
  const context=vm.createContext({navigator:{mediaDevices:{getUserMedia}},state:{step:3},$:(key)=>{if(!nodes.has(key))nodes.set(key,{});return nodes.get(key)},stopDevices(){},render(){},announce(){}});
  vm.runInContext(handler,context);return context;
}
const stream=video=>({getVideoTracks:()=>video?[{}]:[]});
test('microphone-only preparation never requests a camera',async()=>{
  const calls=[];const c=harness(async constraints=>{calls.push(JSON.parse(JSON.stringify(constraints)));return stream(false)});
  await c.enableDevices();assert.deepEqual(calls,[{video:false,audio:true}]);assert.match(c.state.micState,/已啟用/);
});
test('absent camera falls back once to microphone while preserving the interview preparation',async()=>{
  const calls=[];const c=harness(async constraints=>{calls.push(JSON.parse(JSON.stringify(constraints)));if(constraints.video)throw Object.assign(new Error(),{name:'NotFoundError'});return stream(false)});
  await c.enableDevices(true);assert.deepEqual(calls,[{video:true,audio:true},{video:false,audio:true}]);assert.match(c.state.cameraState,/未找到鏡頭/);assert.match(c.state.micState,/已啟用/);assert.equal(c.state.error,'');
});
test('permission denial does not trigger automatic retries',async()=>{
  let calls=0;const c=harness(async()=>{calls++;throw Object.assign(new Error(),{name:'NotAllowedError'})});
  await c.enableDevices(true);assert.equal(calls,1);assert.match(c.state.error,/權限未允許/);assert.equal(c.state.stream,undefined);
});
test('no microphone produces a useful error after a bounded camera fallback',async()=>{
  let calls=0;const c=harness(async()=>{calls++;throw Object.assign(new Error(),{name:'NotFoundError'})});
  await c.enableDevices(true);assert.equal(calls,2);assert.match(c.state.error,/麥克風/);assert.match(c.state.error,/文字練習/);
});

test('camera off stops and removes only video tracks while preserving microphone',()=>{
 let videoStopped=0,audioStopped=0;const video={stop(){videoStopped++}},audio={stop(){audioStopped++}};
 const state={stream:{getVideoTracks:()=>[video],getAudioTracks:()=>[audio],removeTrack(t){assert.equal(t,video)}}};
 const context=vm.createContext({state,render(){}});
 vm.runInContext(source.slice(source.indexOf('function disableCamera('),source.indexOf('\nfunction startMeter')),context);
 context.disableCamera();assert.equal(videoStopped,1);assert.equal(audioStopped,0);assert.match(state.cameraState,/已關閉/);assert.equal(state.stream.getAudioTracks()[0],audio);
});
