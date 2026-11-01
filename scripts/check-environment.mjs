// Offline readiness checks only. Never prints credential values or calls providers.
import {stat} from 'node:fs/promises';
import {effectiveCallSeconds,modelConfigurationStatus,parseFaceMap} from '../lib/interview.mjs';

const env=process.env;
const present=key=>typeof env[key]==='string'&&Boolean(env[key].trim());
const nodeMajor=Number(process.versions.node.split('.')[0]);
const localEnvExists=await stat(new URL('../.env',import.meta.url)).then(s=>s.isFile(),()=>false);
const llm=modelConfigurationStatus(env);
let maxCallSeconds=null,callLimitError=null;
try {maxCallSeconds=effectiveCallSeconds(45,env);} catch(error){callLimitError=error.code;}
const missingConfiguration=['TAVUS_API_KEY','TAVUS_PAL_ID','LLM_API_KEY','LLM_MODEL'].filter(key=>!present(key));
let faceMapValid=true;
try {parseFaceMap(env);} catch{faceMapValid=false;}
const port=Number(env.PORT||4180),portValid=Number.isInteger(port)&&port>=1&&port<=65535;
const tavusConfigured=present('TAVUS_API_KEY')&&present('TAVUS_PAL_ID')&&!callLimitError&&faceMapValid;
const result={
  mode:'offline_configuration_only',
  node:{version:process.versions.node,supported:nodeMajor>=22},
  local:{envFileExists:localEnvExists,configurationSource:'Node process environment; npm run doctor loads local .env when present',portValid},
  llm:{configured:llm.configured,configurationError:llm.error,liveVerified:false},
  tavus:{configured:tavusConfigured,maxCallSeconds,callLimitError,faceMapValid,liveVerified:false},
  missingConfiguration,
  hosted:{verified:false,notice:'Local .env and Sites runtime Secrets are separate. This offline check does not retrieve or verify Sites Secrets. Hosted runtime additionally requires SESSION_SECRET (32+ characters).'},
  network:{checked:false,notice:'No DNS, API authentication, model generation, or video call was attempted.'},
  notice:'Configured means locally complete syntax, not a successful connection or valid account balance.'
};
console.log(JSON.stringify(result,null,2));
if(nodeMajor<22||!portValid||!llm.configured||!tavusConfigured)process.exitCode=1;
