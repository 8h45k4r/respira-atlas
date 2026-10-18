import { readFileSync } from 'node:fs';
import { decodeObservations } from '../prepare-data/encode.mjs';
const D='public/data';
const idx=JSON.parse(readFileSync(`${D}/indicators/index.json`,'utf8')).indicators;
const get=(id)=>idx.find(i=>i.id===id);
const load=(f)=>JSON.parse(readFileSync(`${D}/${f}`,'utf8'));

function seriesOf(id,geo){
  const ind=get(id); const g=ind.geographies[geo]; const f=load(g.file);
  return {ind,f,rows:decodeObservations(f.data)};
}
// 1. Shared periods between child poverty and year-6 obesity
for (const [a,b] of [[93700,90323],[94240,93721],[92443,93963]]) {
  const A=seriesOf(a,'ctyua23'), B=seriesOf(b,'ctyua23');
  const pa=new Set(A.f.periods), pb=new Set(B.f.periods);
  const shared=[...pa].filter(p=>pb.has(p));
  console.log(`${a} x ${b}: shared periods = ${shared.length ? shared.slice(-4).join(', ') : 'NONE'}`);
  if (shared.length) {
    const p=shared.at(-1);
    const am=new Map(A.rows.filter(r=>r.period===p&&r.state==='present').map(r=>[r.areaCode,r.value]));
    const bm=A && new Map(B.rows.filter(r=>r.period===p&&r.state==='present').map(r=>[r.areaCode,r.value]));
    const both=[...am.keys()].filter(k=>bm.has(k));
    console.log(`   latest shared ${p}: ${both.length} areas have both values`);
  }
}
// 2. Genuine zero in smoking prevalence?
const S=seriesOf(92443,'ctyua23');
const latest=S.f.periodSeries.find(s=>s.range===S.f.defaultPeriodSeries).latestPeriod;
const cur=S.rows.filter(r=>r.period===latest && r.sex===(S.f.defaultSex??S.f.primarySexes[0]));
const zeros=cur.filter(r=>r.state==='present'&&r.value===0);
console.log(`\n92443 ${latest}: ${zeros.length} genuine zero value(s)`, zeros.slice(0,3).map(z=>z.areaCode));
// 3. Child mortality suppression detail
const C=seriesOf(90801,'ctyua23');
const cl=C.f.periodSeries.find(s=>s.range===C.f.defaultPeriodSeries).latestPeriod;
const cc=C.rows.filter(r=>r.period===cl);
const sup=cc.filter(r=>r.state==='suppressed');
console.log(`\n90801 ${cl}: suppressed=${sup.length}, note="${sup[0]?.note ?? 'none'}"`);
const pres=cc.filter(r=>r.state==='present'&&r.lowerCi95!=null);
const overlapEngland = pres.filter(r=>r.significance==='similar').length;
console.log(`   significance breakdown:`, cc.reduce((a,r)=>{a[r.significance]=(a[r.significance]||0)+1;return a},{}));
