import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const build=spawnSync('npm',['run','build'],{cwd:fileURLToPath(new URL('hosted/',root)),stdio:'inherit'});
if(build.status!==0)throw new Error('Worker build failed; Vercel package not refreshed.');
await copyFile(new URL('hosted/dist/server/index.js',root),new URL('deployment/vercel/worker.mjs',root));
const files=['api/index.mjs','worker.mjs','package.json','vercel.json','README.md','public/robots.txt'];
for(const name of files){const source=await readFile(new URL('deployment/vercel/'+name,root),'utf8');if(/sk-[a-f0-9]{32}\b/u.test(source))throw new Error('Credential-like source blocked packaging.');}
await writeFile(new URL('deployment/vercel/BUILD.json',root),JSON.stringify({mode:'private_trial_only',source:'hosted/dist/server/index.js',apiDisabledUntilPrivateHostConfirmed:true,files},null,2)+'\n');
console.log('Prepared Vercel source package without credentials; not deployed.');
