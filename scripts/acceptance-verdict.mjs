import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const weights={evidence:20,followups:20,realtime:20,presence:15,roundsAndPanel:10,feedback:10,recovery:5};
export function verdict(reviews,sourceDigest){
  const reasons=[];
  if(reviews.length!==10)reasons.push('requires_exactly_10_independent_reviews');
  if(new Set(reviews.map(r=>r.reviewerId)).size!==reviews.length)reasons.push('duplicate_reviewer');
  const totals=reviews.map(r=>{
    if(!r.reviewerId||r.sourceDigest!==sourceDigest){reasons.push('missing_reviewer_or_stale_source');return null;}
    if(!Object.entries(weights).every(([key,max])=>typeof r.scores?.[key]==='number'&&Number.isFinite(r.scores[key])&&r.scores[key]>=0&&r.scores[key]<=max)){
      reasons.push('required_dimensions_unmeasured');return null;
    }
    return Object.keys(weights).reduce((n,key)=>n+r.scores[key],0);
  });
  if(reviews.some(r=>!Array.isArray(r.hardGates)||r.hardGates.length!==8||new Set(r.hardGates.map(g=>g.id)).size!==8||!r.hardGates.every(g=>Number.isInteger(g.id)&&g.id>=1&&g.id<=8&&g.passed===true&&Array.isArray(g.evidence)&&g.evidence.length>0)))reasons.push('hard_gates_failed_or_unverified');
  const average=reviews.length===10&&totals.every(t=>t!==null)?totals.reduce((a,b)=>a+b,0)/10:null;
  if(average!==null&&average<95)reasons.push('average_below_95');
  return {sourceDigest,reviewCount:reviews.length,totals,average,accepted:reasons.length===0&&average!==null&&average>=95,reasons:[...new Set(reasons)]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const directory=resolve(process.argv[2]||'evidence/acceptance-final');
  const freeze=JSON.parse(await readFile(resolve(directory,'source.json'),'utf8'));
  const files=(await readdir(directory)).filter(name=>/^review-\d\d\.json$/.test(name)).sort();
  const reviews=await Promise.all(files.map(name=>readFile(resolve(directory,name),'utf8').then(JSON.parse)));
  const result=verdict(reviews,freeze.sourceDigest);console.log(JSON.stringify(result,null,2));
  if(!result.accepted)process.exitCode=1;
}
