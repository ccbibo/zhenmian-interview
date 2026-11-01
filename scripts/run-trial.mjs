// Executes the real application handler without a socket. This is not a live model/avatar call.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('hosted/worker/index.js',root),'utf8');
const app=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
const sourceHash=createHash('sha256').update(code).digest('hex');
const origin='https://opposite-interview-room.foldedpig.chatgpt.site';
const steps=[];
async function call(path,body){const response=await app.fetch(new Request(origin+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{});const data=await response.json();steps.push({path,status:response.status,result:data});return data;}
const status=await call('/api/status');
const trial=await call('/api/trial');
const analysis=await call('/api/analyze',{jd:trial.jd,resume:trial.resume});
await call('/api/question',{jd:trial.jd,resume:trial.resume,history:[],role:{id:'chen',name:'陳以衡',role:'AI技術主管'},round:'2',interviewType:'technical',focusTopics:['self_intro','project','scenario'],consent:true});
const output={run:'trial-v02',method:'real_application_handler_in_memory_no_provider_credentials',sourceHash,source:trial.source,candidate:'wholly_fictitious_not_user',steps,analysisVerified:analysis.method==='lexical_only',liveInterviewCompleted:false,reason:status.llmConfigured?'unknown':'blocked_missing_provider_account_and_api_key',transcript:[],avatarVerified:false,score:null};
await writeFile(new URL('evidence/trial-run-v02.json',root),JSON.stringify(output,null,2));
console.log(JSON.stringify({source:trial.source.title,steps:steps.map(s=>({path:s.path,status:s.status})),liveInterviewCompleted:false,score:null}));
