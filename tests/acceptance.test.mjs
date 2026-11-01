import test from 'node:test';
import assert from 'node:assert/strict';
import {verdict} from '../scripts/acceptance-verdict.mjs';
const synthetic=()=>Array.from({length:10},(_,i)=>({reviewerId:`fixture-${i}`,sourceDigest:'fixture-version',scores:{evidence:20,followups:20,realtime:20,presence:15,roundsAndPanel:10,feedback:10,recovery:5},hardGates:Array.from({length:8},(_,j)=>({id:j+1,passed:true,evidence:['synthetic-only']}))}));
test('missing real-time measurement cannot be normalized into a passing score',()=>{const r=synthetic();r[0].scores.realtime=null;const v=verdict(r,'fixture-version');assert.equal(v.accepted,false);assert.equal(v.average,null);assert.equal(v.totals[0],null)});
test('high numeric scores cannot override failed or unverified hard gates',()=>{const r=synthetic();r[3].hardGates[1].passed=false;assert.equal(verdict(r,'fixture-version').accepted,false);r[3].hardGates[1].passed=null;assert.equal(verdict(r,'fixture-version').accepted,false)});
test('stale versions and duplicate reviewers cannot supply ten independent votes',()=>{const r=synthetic();r[1].reviewerId=r[0].reviewerId;assert.equal(verdict(r,'fixture-version').accepted,false);assert.equal(verdict(synthetic(),'different-version').average,null);assert.equal(verdict(r.slice(0,9),'fixture-version').accepted,false)});
