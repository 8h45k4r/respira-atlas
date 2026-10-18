import { readFileSync, readdirSync } from 'node:fs';
import { decodeObservations } from '../prepare-data/encode.mjs';
const D='public/data';
const idx=JSON.parse(readFileSync(`${D}/indicators/index.json`,'utf8')).indicators;
const get=(id)=>idx.find(i=>i.id===id);
const load=(f)=>JSON.parse(readFileSync(`${D}/${f}`,'utf8'));

function stats(id, geo){
  const ind=get(id); if(!ind) return null;
  const g=ind.geographies[geo]; if(!g) return null;
  const file=load(g.file);
  const rows=decodeObservations(file.data);
  const series=file.periodSeries.find(s=>s.range===file.defaultPeriodSeries);
  const period=series.latestPeriod;
  const cur=rows.filter(r=>r.period===period && r.sex===(file.defaultSex??file.primarySexes[0]));
  const present=cur.filter(r=>r.state==='present');
  const supp=cur.filter(r=>r.state==='suppressed');
  const miss=cur.filter(r=>r.state==='missing');
  const vals=present.map(r=>r.value).sort((a,b)=>a-b);
  const widths=present.filter(r=>r.lowerCi95!=null).map(r=>(r.upperCi95-r.lowerCi95)/r.value*100);
  const sig=cur.reduce((a,r)=>{a[r.significance]=(a[r.significance]||0)+1;return a},{});
  return {name:ind.shortName, unit:ind.unit, period, n:cur.length, present:present.length,
    suppressed:supp.length, missing:miss.length,
    min:vals[0], max:vals.at(-1), ratio:vals.at(-1)/vals[0],
    medianCIwidthPct: widths.length?widths.sort((a,b)=>a-b)[Math.floor(widths.length/2)]:null,
    sig, periods:series.periodCount, seriesLabel:series.label};
}
const picks=[[93721,'ctyua23'],[92196,'ctyua23'],[90366,'ctyua23'],[92443,'ctyua23'],
             [93963,'ctyua23'],[41001,'ctyua23'],[90801,'ctyua23'],[93577,'icb22'],
             [93700,'ctyua23'],[94240,'ctyua23'],[90323,'ctyua23']];
for(const [id,geo] of picks){
  const s=stats(id,geo); if(!s){console.log(id,geo,'N/A');continue;}
  console.log(`${String(id).padStart(6)} ${geo.padEnd(9)} ${s.name.slice(0,40).padEnd(42)} ${s.period.padEnd(10)} n=${s.present}/${s.n} supp=${s.suppressed} miss=${s.missing} ratio=${s.ratio?.toFixed(2)} ciW=${s.medianCIwidthPct?.toFixed(1)}% periods=${s.periods}(${s.seriesLabel})`);
}
