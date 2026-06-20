/* ===== Baromètre Hit Lokal — app ===== */
const PALETTE = ['#ff5d73','#8a6bff','#2fe3c4','#ffce4f','#39a0ff','#ff9f6b','#c084fc','#5fd97a','#f871b0'];
const GRID = 'rgba(255,255,255,.07)';
const TICK = '#9aa6c4';
Chart.defaults.color = TICK;
Chart.defaults.font.family = "'Inter',sans-serif";
Chart.defaults.borderColor = GRID;

const fmt = n => n==null ? '—' : new Intl.NumberFormat('fr-FR').format(n);
const fmtShort = n => {
  if(n==null) return '—';
  if(n>=1e9) return (n/1e9).toFixed(n>=1e10?0:1).replace('.',',')+' Md';
  if(n>=1e6) return (n/1e6).toFixed(n>=1e7?0:1).replace('.',',')+' M';
  if(n>=1e3) return Math.round(n/1e3)+' k';
  return String(n);
};

let DASH=null, CLIPS=[];

/* ---------- ENVOI E-MAIL (Web3Forms → hitlokal@gmail.com) ---------- */
const WEB3FORMS_KEY='0162156a-464e-4346-a63a-deb1fd25a0d8';
function sendMail(fields){
  return fetch('https://api.web3forms.com/submit',{
    method:'POST',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({access_key:WEB3FORMS_KEY,...fields})
  }).then(r=>r.json());
}
/* ajoute le contact dans Brevo via le script serveur sécurisé (clé API cachée côté serveur) */
function addToBrevo(fields){
  return fetch('/subscribe.php',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(fields)}).catch(()=>{});
}

Promise.all([
  fetch('data/dashboard.json').then(r=>r.json()),
  fetch('data/clips.json').then(r=>r.json())
]).then(([dash,clips])=>{
  DASH=dash; CLIPS=clips;
  renderHero();
  renderTrends();
  buildYearTabs();
  initCompare();
  renderFemmes();
  initAuth();
  initAnalytics();
  initSearch();
}).catch(e=>{
  console.error(e);
  document.getElementById('heroKpis').innerHTML='<p style="color:var(--coral)">Erreur de chargement des données. Lancez le site via un serveur local (voir README).</p>';
});

/* ---------- HERO KPIs ---------- */
function renderHero(){
  const last = DASH.years['2025'];
  const totalClips = DASH.summary.reduce((a,s)=>a+(s.clips||0),0);
  const growth = ((DASH.years['2025'].total_views/DASH.years['2024'].total_views-1)*100).toFixed(0);
  const kpis=[
    {v:fmtShort(last.total_views), l:'vues cumulées en 2025', s:'+'+growth+'% vs 2024'},
    {v:fmt(last.total_clips), l:'clips recensés en 2025'},
    {v:fmt(totalClips), l:'clips suivis depuis 2021'},
    {v:'5', l:'éditions annuelles', s:'2021 → 2025'},
  ];
  document.getElementById('heroKpis').innerHTML = kpis.map(k=>`
    <div class="kpi"><div class="v">${k.v}</div><div class="l">${k.l}</div>
    ${k.s?`<div class="s">${k.s}</div>`:''}</div>`).join('');
}

/* ---------- TREND CHARTS ---------- */
function renderTrends(){
  const yrs = DASH.summary.map(s=>s.year);
  new Chart(document.getElementById('trendViews'),{
    type:'bar',
    data:{labels:yrs,datasets:[{
      label:'Vues cumulées',
      data:DASH.summary.map(s=>s.views),
      backgroundColor:ctx=>{const c=ctx.chart.ctx,g=c.createLinearGradient(0,0,0,260);
        g.addColorStop(0,'#ff5d73');g.addColorStop(1,'#8a6bff');return g;},
      borderRadius:8,maxBarThickness:64}]},
    options:chartOpts('Vues YouTube cumulées par édition',{
      y:{ticks:{callback:v=>fmtShort(v)}},
      tooltip:v=>fmt(v.raw)+' vues'})
  });
  new Chart(document.getElementById('trendClips'),{
    type:'line',
    data:{labels:yrs,datasets:[{
      label:'Clips recensés',data:DASH.summary.map(s=>s.clips),
      borderColor:'#2fe3c4',backgroundColor:'rgba(47,227,196,.12)',
      fill:true,tension:.35,pointBackgroundColor:'#2fe3c4',pointRadius:5,borderWidth:3}]},
    options:chartOpts('Nombre de clips recensés',{tooltip:v=>fmt(v.raw)+' clips'})
  });
}

function chartOpts(title,{y={},tooltip=null}={}){
  return {
    responsive:true,maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      title:{display:!!title,text:title,color:'#eef2ff',font:{family:'Sora',size:14,weight:'700'},padding:{bottom:14},align:'start'},
      tooltip:{backgroundColor:'#1b2440',borderColor:GRID,borderWidth:1,padding:12,
        callbacks:tooltip?{label:tooltip}:{}}
    },
    scales:{
      x:{grid:{display:false},ticks:{color:TICK}},
      y:{grid:{color:GRID},ticks:{color:TICK},...y}
    }
  };
}

/* ---------- YEAR EXPLORER ---------- */
const charts={};
const FREE_YEAR='2021';
function yearUnlocked(y){ return y===FREE_YEAR || rank()>=2; }   // 2021 libre, le reste = abonnés payants
function buildYearTabs(){
  const years=Object.keys(DASH.years).sort();
  const tabs=document.getElementById('yearTabs');
  tabs.innerHTML=years.map(y=>{
    const locked=!yearUnlocked(y);
    return `<button class="year-tab${locked?' locked':''}" data-y="${y}">${y}${locked?' <span class="yt-lock">🔒</span>':''}</button>`;
  }).join('');
  tabs.querySelectorAll('.year-tab').forEach(b=>b.onclick=()=>selectYear(b.dataset.y));
  selectYear(FREE_YEAR);
}
function renderLockedYear(panel,y){
  panel.innerHTML=`<div class="year-lock">
    <div class="lock-ic">🔒</div>
    <h3>Édition ${y} réservée aux abonnés</h3>
    <p>L'exploration détaillée des éditions 2022 à 2025 — styles, rythme de sortie, distribution des vues et top des clips — est incluse dans les forfaits payants. L'édition <b>2021</b> reste en accès libre.</p>
    <div class="lock-cta">
      <button class="btn btn-primary" data-join="pro">Débloquer · Passer Pro</button>
      <button class="btn btn-ghost" id="yearLockLogin">J'ai déjà un compte</button>
    </div></div>`;
  const lg=byId('yearLockLogin'); if(lg) lg.onclick=()=>openAuth('login');
  panel.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>join(b.dataset.join));
}

function selectYear(y){
  document.querySelectorAll('.year-tab').forEach(b=>b.classList.toggle('active',b.dataset.y===y));
  Object.values(charts).forEach(c=>c.destroy()); for(const k in charts)delete charts[k];
  const d=DASH.years[y];
  const panel=document.getElementById('yearPanel');
  if(!yearUnlocked(y)){ renderLockedYear(panel,y); return; }
  if(d.report_only){ renderReportYear(panel,d); return; }

  const overMillion = d.buckets.filter(b=>/M$/.test(b.label)).reduce((a,b)=>a+b.count,0);
  const hasMonths = Array.isArray(d.months) && d.months.length;
  const dlBanner = d.download ? `<div class="note-banner" style="margin-bottom:18px">🎁 Édition fondatrice : <b>téléchargez gratuitement le rapport ${y} en PDF</b>. <a href="#telecharger" style="color:var(--gold);font-weight:600">Recevoir le PDF →</a></div>` : '';
  const monthsCard = hasMonths ? `<div class="card chart-card full"><div class="chart-title">Rythme de sortie & vues par mois</div><div class="chart-sub">Nombre de clips et vues générées chaque mois</div><div style="height:320px"><canvas id="cMonths"></canvas></div></div>` : '';
  panel.innerHTML=`
    ${dlBanner}
    <div class="yp-kpis">
      ${kpiCard(fmtShort(d.total_views),'vues cumulées')}
      ${kpiCard(fmt(d.total_clips),'clips recensés')}
      ${kpiCard(fmt(overMillion),'clips > 1 M de vues')}
      ${kpiCard(d.styles[0].style.split(',')[0],'style n°1',fmt(d.styles[0].count)+' clips')}
    </div>
    <div class="yp-charts">
      <div class="card chart-card"><div class="chart-title">Vues par style musical</div><div class="chart-sub">Total des vues cumulées par genre</div><div style="height:300px"><canvas id="cStyleViews"></canvas></div></div>
      <div class="card chart-card"><div class="chart-title">Répartition des clips par style</div><div class="chart-sub">${fmt(d.total_clips)} clips au total</div><div style="height:300px"><canvas id="cStyleCount"></canvas></div></div>
      ${monthsCard}
      <div class="card chart-card"><div class="chart-title">Distribution des clips par paliers de vues</div><div class="chart-sub">De quelques milliers à plus de 10 millions</div><div style="height:320px"><canvas id="cBuckets"></canvas></div></div>
      <div class="card chart-card">${secondaryBlock(d)}</div>
      <div class="card chart-card full">
        <div class="chart-title">Top 20 des clips ${y}</div>
        <div class="chart-sub">Classés par vues YouTube cumulées au 31/12</div>
        <div class="top-list">${d.top.map((t,i)=>topRow(t,i)).join('')}</div>
      </div>
    </div>`;

  const st=d.styles;
  charts.sv=new Chart(byId('cStyleViews'),{type:'bar',
    data:{labels:st.map(s=>shortStyle(s.style)),datasets:[{data:st.map(s=>s.views),
      backgroundColor:PALETTE,borderRadius:6}]},
    options:{...chartOpts('',{tooltip:v=>fmt(v.raw)+' vues'}),indexAxis:'y',
      scales:{x:{grid:{color:GRID},ticks:{callback:v=>fmtShort(v)}},y:{grid:{display:false}}}}});

  charts.sc=new Chart(byId('cStyleCount'),{type:'doughnut',
    data:{labels:st.map(s=>shortStyle(s.style)),datasets:[{data:st.map(s=>s.count),
      backgroundColor:PALETTE,borderColor:'#0f1525',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      plugins:{legend:{position:'right',labels:{boxWidth:12,padding:10,font:{size:11}}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)} clips`}}}}});

  if(hasMonths) charts.mo=new Chart(byId('cMonths'),{
    data:{labels:d.months.map(m=>m.month),datasets:[
      {type:'bar',label:'Clips',data:d.months.map(m=>m.count),backgroundColor:'#8a6bff',borderRadius:6,yAxisID:'y',order:2},
      {type:'line',label:'Vues',data:d.months.map(m=>m.views),borderColor:'#ffce4f',backgroundColor:'rgba(255,206,79,.1)',tension:.35,borderWidth:3,pointRadius:3,yAxisID:'y1',order:1,fill:true}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,labels:{boxWidth:12,padding:14}},
        tooltip:{callbacks:{label:c=>c.dataset.label==='Vues'?` Vues: ${fmt(c.raw)}`:` Clips: ${c.raw}`}}},
      scales:{x:{grid:{display:false}},
        y:{position:'left',grid:{color:GRID},title:{display:true,text:'Clips'}},
        y1:{position:'right',grid:{display:false},ticks:{callback:v=>fmtShort(v)},title:{display:true,text:'Vues'}}}}});

  charts.bk=new Chart(byId('cBuckets'),{type:'bar',
    data:{labels:d.buckets.map(b=>b.label),datasets:[{data:d.buckets.map(b=>b.count),
      backgroundColor:ctx=>{const c=ctx.chart.ctx,g=c.createLinearGradient(0,0,0,300);
        g.addColorStop(0,'#2fe3c4');g.addColorStop(1,'#39a0ff');return g;},borderRadius:5}]},
    options:{...chartOpts('',{tooltip:v=>v.raw+' clips'}),
      scales:{x:{grid:{display:false},ticks:{maxRotation:60,minRotation:45,font:{size:10}}},y:{grid:{color:GRID}}}}});

  // secondary chart (origins / languages / sex if available)
  renderSecondary(d);
}

function secondaryBlock(d){
  if(d.origins&&d.origins.length) return `<div class="chart-title">Origine des artistes</div><div class="chart-sub">Répartition des clips par territoire</div><div style="height:300px"><canvas id="cSecond"></canvas></div>`;
  return `<div class="chart-title">Synthèse de l'édition</div><div class="chart-sub">Indicateurs clés</div><div style="height:300px;display:grid;place-items:center;color:var(--faint);text-align:center;padding:20px">Données détaillées par origine et genre disponibles dans le dataset complet. <br><br><a href="#offre" class="btn btn-ghost">Voir l'offre data →</a></div>`;
}
function renderSecondary(d){
  if(!(d.origins&&d.origins.length)) return;
  charts.se=new Chart(byId('cSecond'),{type:'doughnut',
    data:{labels:d.origins.map(o=>o.name),datasets:[{data:d.origins.map(o=>o.count),
      backgroundColor:PALETTE,borderColor:'#0f1525',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
      plugins:{legend:{position:'right',labels:{boxWidth:12,padding:10,font:{size:11}}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)} clips`}}}}});
}

function renderReportYear(panel,d){
  panel.innerHTML=`
    <div class="note-banner">ℹ️ ${d.note} <a href="#telecharger" style="color:var(--gold);font-weight:600">Télécharger le rapport 2021 en PDF (gratuit) →</a></div>
    <div class="yp-kpis">
      ${kpiCard(fmt(d.total_clips),'clips recensés')}
      ${kpiCard(fmt(d.over_million),'clips > 1 M de vues',d.over_million_pct+'% de la base')}
      ${kpiCard(d.styles[0].pct+'%','part du Rap','style dominant')}
      ${kpiCard('1ère','édition du baromètre','Janvier 2022')}
    </div>
    <div class="yp-charts">
      <div class="card chart-card"><div class="chart-title">Répartition par style musical</div><div class="chart-sub">Part de chaque genre (en %)</div><div style="height:300px"><canvas id="cStyleViews"></canvas></div></div>
      <div class="card chart-card"><div class="chart-title">Origine des artistes</div><div class="chart-sub">Échantillon de 300 clips (en %)</div><div style="height:300px"><canvas id="cSecond"></canvas></div></div>
    </div>`;
  charts.sv=new Chart(byId('cStyleViews'),{type:'bar',
    data:{labels:d.styles.map(s=>shortStyle(s.style)),datasets:[{data:d.styles.map(s=>s.pct),
      backgroundColor:PALETTE,borderRadius:6}]},
    options:{...chartOpts('',{tooltip:v=>v.raw+' %'}),indexAxis:'y',
      scales:{x:{grid:{color:GRID},ticks:{callback:v=>v+'%'}},y:{grid:{display:false}}}}});
  charts.se=new Chart(byId('cSecond'),{type:'doughnut',
    data:{labels:d.origins.map(o=>o.name),datasets:[{data:d.origins.map(o=>o.pct),
      backgroundColor:PALETTE,borderColor:'#0f1525',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
      plugins:{legend:{position:'right',labels:{boxWidth:12,padding:10,font:{size:11}}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}%`}}}}});
}

function topRow(t,i){
  const isTop = i<3;
  return `<div class="top-row">
    <div class="top-rank ${isTop?'gold':''}">${i+1}</div>
    <div class="top-main"><b>${esc(t.artist||'—')} — ${esc(t.title||'')}</b>
      <span>${shortStyle(t.style)}${t.origin?' · '+t.origin:''}${t.snep==='OUI'?' · <span class="badge-snep">SNEP</span>':''}</span></div>
    <div class="top-views">${fmtShort(t.views)}</div>
  </div>`;
}

function kpiCard(v,l,s){return `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div>${s?`<div class="s">${s}</div>`:''}</div>`;}
const byId=id=>document.getElementById(id);
function shortStyle(s){if(!s)return '—';return s.replace('Rap, Hip-Hop et RnB','Rap/Hip-Hop').replace('Soca et Bouyon','Soca/Bouyon');}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- COMPARATEUR D'ÉDITIONS ---------- */
const BUCKET_DEFS=[['- de 50 k',0,5e4],['50–100 k',5e4,1e5],['100–200 k',1e5,2e5],['200–300 k',2e5,3e5],
  ['300–500 k',3e5,5e5],['500 k–1 M',5e5,1e6],['1–2 M',1e6,2e6],['2–3 M',2e6,3e6],
  ['3–5 M',3e6,5e6],['5–10 M',5e6,1e7],['+ de 10 M',1e7,1e16]];
function bucketLabel(v){v=v||0;for(const d of BUCKET_DEFS){if(v>=d[1]&&v<d[2])return d[0];}return BUCKET_DEFS[BUCKET_DEFS.length-1][0];}
function canonTerr(s){
  if(!s)return null; const n=String(s).toLowerCase();
  if(n.includes('guadeloupe')||n.includes('971'))return 'Guadeloupe (971)';
  if(n.includes('martinique')||n.includes('972'))return 'Martinique (972)';
  if(n.includes('guyane')||n.includes('973'))return 'Guyane (973)';
  if(n.includes('union')||n.includes('974'))return 'Réunion (974)';
  if(n.includes('mayotte')||n.includes('976'))return 'Mayotte (976)';
  return null;
}
const CMP_DIMS={
  styles:{label:'Styles musicaux',get:c=>c.style?shortStyle(c.style):null,top:7},
  origins:{label:'Origines',get:c=>canonTerr(c.origin),order:['Guadeloupe (971)','Martinique (972)','Réunion (974)','Guyane (973)','Mayotte (976)']},
  genre:{label:'Genre',get:c=>({femme:'Femmes',mixte:'Mixte',homme:'Hommes'}[genderCat(c.sex)]||null),order:['Femmes','Mixte','Hommes']},
  buckets:{label:'Paliers de vues',get:c=>bucketLabel(c.views),order:BUCKET_DEFS.map(d=>d[0])}
};
const GENRE_COLOR={Femmes:'#ff5d73',Mixte:'#c084fc',Hommes:'#39a0ff'};
let cmpState={dim:'styles',measure:'clips'},cmpChart=null;

function initCompare(){
  const wire=(id,key)=>byId(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{
    byId(id).querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); cmpState[key]=b.dataset.v; renderCompare();
  });
  wire('cmpDim','dim'); wire('cmpMeasure','measure');
  renderCompare();
}

function renderCompare(){
  const years=Object.keys(DASH.years).sort();
  const def=CMP_DIMS[cmpState.dim], measure=cmpState.measure;
  const per={}, tagged={}, totals={};
  years.forEach(y=>{per[y]={};tagged[y]=0;});
  CLIPS.forEach(c=>{
    const y=String(c.year); if(!per[y])return;
    const cat=def.get(c); if(cat==null||cat==='')return;
    if(!per[y][cat]) per[y][cat]={clips:0,views:0};
    per[y][cat].clips++; per[y][cat].views+=(c.views||0);
    tagged[y]++; totals[cat]=(totals[cat]||0)+1;
  });
  let cats = def.order ? def.order.filter(c=>totals[c]) :
             Object.keys(totals).sort((a,b)=>totals[b]-totals[a]);
  let groupRest=null;
  if(def.top && cats.length>def.top){ groupRest=cats.slice(def.top); cats=cats.slice(0,def.top); }
  const val=(y,cat)=>{const o=per[y][cat];
    if(measure==='views') return o?o.views:0;
    if(measure==='pct') return tagged[y]?(o?o.clips:0)/tagged[y]*100:0;
    return o?o.clips:0;};
  const palette=c=>def===CMP_DIMS.genre?GENRE_COLOR[c]:null;
  const datasets=cats.map((cat,i)=>({label:cat,
    data:years.map(y=>val(y,cat)),
    backgroundColor:palette(cat)||PALETTE[i%PALETTE.length],borderRadius:4,stack:'s'}));
  if(groupRest){
    datasets.push({label:'Autres',stack:'s',borderRadius:4,backgroundColor:'#5b6688',
      data:years.map(y=>groupRest.reduce((a,cat)=>a+(measure==='views'?(per[y][cat]?.views||0):
        measure==='pct'?(tagged[y]?(per[y][cat]?.clips||0)/tagged[y]*100:0):(per[y][cat]?.clips||0)),0))});
  }
  const measLabel={clips:'nombre de clips',views:'vues cumulées',pct:'part en %'}[measure];
  byId('cmpTitle').textContent=`${def.label} · ${measLabel} par édition`;
  const partial=(cmpState.dim==='genre'||cmpState.dim==='origins');
  byId('cmpSub').textContent=partial&&measure!=='pct'
    ? 'Donnée renseignée partiellement avant 2024 — privilégiez « Part en % » pour comparer.'
    : 'Cliquez la légende pour isoler une catégorie.';

  if(cmpChart) cmpChart.destroy();
  cmpChart=new Chart(byId('cCompare'),{type:'bar',data:{labels:years,datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:12,font:{size:11}}},
        tooltip:{callbacks:{label:c=>{const v=c.raw;
          if(measure==='views')return ` ${c.dataset.label}: ${fmt(Math.round(v))} vues`;
          if(measure==='pct')return ` ${c.dataset.label}: ${v.toFixed(1)} %`;
          return ` ${c.dataset.label}: ${fmt(v)} clips`;}}}},
      scales:{x:{stacked:true,grid:{display:false}},
        y:{stacked:true,grid:{color:GRID},ticks:{callback:measure==='views'?(v=>fmtShort(v)):(measure==='pct'?(v=>v+'%'):undefined)},
          title:{display:true,text:measLabel}}}}});

  // lecture dynamique : plus gros mouvement entre 1ère et dernière édition documentée
  const docYears=years.filter(y=>tagged[y]>0);
  if(docYears.length>=2 && cats.length){
    const y0=docYears[0],y1=docYears[docYears.length-1];
    const share=(y,cat)=>tagged[y]?(per[y][cat]?.clips||0)/tagged[y]*100:0;
    let best=null;
    cats.forEach(cat=>{const d=share(y1,cat)-share(y0,cat);if(!best||Math.abs(d)>Math.abs(best.d))best={cat,d,a:share(y0,cat),b:share(y1,cat)};});
    if(best) byId('cmpNote').innerHTML=`📈 <b>Lecture :</b> la part de <b>${esc(best.cat)}</b> passe de <b>${best.a.toFixed(0)}%</b> (${y0}) à <b>${best.b.toFixed(0)}%</b> (${y1}) des clips ${best.d>=0?'— en progression':'— en recul'}.`;
  } else byId('cmpNote').textContent='';
}

/* ---------- ANALYSES AVANCÉES (Business) ---------- */
const AN_DIMS={
  styles:{label:'style',plural:'styles',get:c=>c.style?shortStyle(c.style):null,top:9},
  origins:{label:'origine',plural:'origines',get:c=>canonTerr(c.origin),order:['Guadeloupe (971)','Martinique (972)','Réunion (974)','Guyane (973)','Mayotte (976)']},
  genre:{label:'genre',plural:'genres',get:c=>({femme:'Femmes',mixte:'Mixte',homme:'Hommes'}[genderCat(c.sex)]||null),order:['Femmes','Mixte','Hommes']}
};
const AN_METRICS={avg:'moyenne de vues',median:'médiane des vues',total:'total des vues',count:'nombre de clips'};
let anState={dim:'styles',metric:'avg',year:'all'},anChart=null;
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2);};
function aggMetric(arr,metric){
  if(!arr.length)return 0;
  if(metric==='count')return arr.length;
  if(metric==='total')return arr.reduce((a,b)=>a+b,0);
  if(metric==='median')return median(arr);
  return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); // avg
}
function fmtMetric(v,metric){return metric==='count'?fmt(v):fmtShort(v);}

function initAnalytics(){
  const wire=(id,key)=>byId(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{
    byId(id).querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');anState[key]=b.dataset.v;renderAnalytics();});
  wire('anDim','dim');wire('anMetric','metric');wire('anYear','year');
  byId('lockLogin').onclick=()=>openAuth('login');
  renderAnalytics();
}

function renderAnalytics(){
  const locked = rank()<3;            // Business requis
  byId('analysesLock').hidden = !locked;
  byId('analysesContent').classList.toggle('an-blurred',locked);
  const years=Object.keys(DASH.years).sort();
  const def=AN_DIMS[anState.dim], metric=anState.metric;
  // map cat -> year -> [views]
  const map={}, totalsCount={};
  CLIPS.forEach(c=>{
    const y=String(c.year); if(!years.includes(y))return;
    const cat=def.get(c); if(cat==null||cat==='')return;
    (map[cat]=map[cat]||{}); (map[cat][y]=map[cat][y]||[]).push(c.views||0);
    totalsCount[cat]=(totalsCount[cat]||0)+1;
  });
  let cats = def.order ? def.order.filter(c=>totalsCount[c]) :
             Object.keys(totalsCount).sort((a,b)=>totalsCount[b]-totalsCount[a]);
  if(def.top && cats.length>def.top) cats=cats.slice(0,def.top);
  const yr=anState.year;                         // 'all' ou une année
  const allViews=cat=>years.flatMap(y=>map[cat]?.[y]||[]);
  const selViews=cat=>yr==='all'?allViews(cat):(map[cat]?.[yr]||[]);
  const scope = yr==='all'?'toutes éditions':'édition '+yr;
  // KPIs (selon l'année sélectionnée)
  const everything=CLIPS.filter(c=>yr==='all'?years.includes(String(c.year)):String(c.year)===yr).map(c=>c.views||0);
  byId('anKpis').innerHTML=[
    kpiCard(everything.length?fmtShort(aggMetric(everything,'avg')):'—','vues / clip (moyenne)',scope),
    kpiCard(everything.length?fmtShort(median(everything)):'—','vues / clip (médiane)',scope),
    kpiCard((()=>{const MIN=5;const b=cats.map(c=>({c,n:selViews(c).length,v:aggMetric(selViews(c),'avg')})).filter(x=>x.n>=MIN).sort((a,b)=>b.v-a.v)[0];return b?esc(b.c):'—';})(),`${def.label} le + performant`,scope+' · ≥ 5 clips'),
    kpiCard(fmt(everything.length),'clips analysés',scope)
  ].join('');

  // BAR CHART : mesure par catégorie (année sélectionnée)
  const rows=cats.map(c=>({cat:c,val:aggMetric(selViews(c),metric)})).sort((a,b)=>b.val-a.val);
  byId('anChartTitle').textContent=`${cap(AN_METRICS[metric])} par ${def.label}`;
  byId('anChartSub').textContent = yr==='all'?'Toutes éditions confondues (2021–2025)':'Édition '+yr;
  if(anChart)anChart.destroy();
  anChart=new Chart(byId('anChart'),{type:'bar',
    data:{labels:rows.map(r=>r.cat),datasets:[{data:rows.map(r=>r.val),
      backgroundColor:ctx=>{const cx=ctx.chart.ctx,g=cx.createLinearGradient(0,0,600,0);
        g.addColorStop(0,'#8a6bff');g.addColorStop(1,'#2fe3c4');return g;},borderRadius:6}]},
    options:{...chartOpts('',{tooltip:v=>fmtMetric(v.raw,metric)+(metric==='count'?' clips':' vues')}),indexAxis:'y',
      scales:{x:{grid:{color:GRID},ticks:{callback:v=>fmtMetric(v,metric)}},y:{grid:{display:false}}}}});

  // TABLEAU CROISÉ (heatmap) : cat × année + Toutes
  byId('anTableTitle').textContent=`Tableau croisé · ${AN_METRICS[metric]} par année`;
  const cols=[...years,'Toutes'];
  const cellVal=(cat,col)=>col==='Toutes'?aggMetric(allViews(cat),metric):aggMetric(map[cat]?.[col]||[],metric);
  let max=0; cats.forEach(c=>cols.forEach(col=>{if(col!=='Toutes')max=Math.max(max,cellVal(c,col));}));
  const head=`<thead><tr><th>${cap(def.label)}</th>${cols.map(c=>`<th class="num${String(c)===yr?' colsel':''}">${c}</th>`).join('')}</tr></thead>`;
  const body=cats.map(cat=>{
    const tds=cols.map(col=>{const v=cellVal(cat,col),n=map[cat]?.[col]?.length||0;
      const intensity=col==='Toutes'?0:(max?Math.min(1,v/max):0);
      const bg=col==='Toutes'?'background:rgba(255,206,79,.10)':`background:rgba(47,227,196,${(intensity*0.55).toFixed(3)})`;
      const empty=(col!=='Toutes'&&n===0);
      return `<td class="num heat${String(col)===yr?' colsel':''}" style="${bg}">${empty?'<span class="nd">n/d</span>':fmtMetric(v,metric)}</td>`;}).join('');
    return `<tr><th class="rowh">${esc(cat)}</th>${tds}</tr>`;
  }).join('');
  byId('anTable').innerHTML=head+`<tbody>${body}</tbody>`;
  const partial=(anState.dim==='genre'||anState.dim==='origins');
  byId('anFoot').textContent=partial?'Note : genre & origine renseignés partiellement avant 2024 — les valeurs reposent sur les clips documentés.':'';
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

/* ---------- FEMMES ---------- */
function genderCat(sex){
  if(!sex) return null;
  const s=String(sex).trim().toUpperCase();
  if(!s) return null;
  const f=s.includes('F'), h=s.includes('H');
  if(f&&h) return 'mixte';
  if(f) return 'femme';
  if(h) return 'homme';
  return null;
}
function normArtist(a){
  if(!a) return '—';
  let s=String(a).replace(/\s+(?:feat\.?|ft\.?|featuring|fea\.?)\b.*$/i,'');
  return s.replace(/[\s,&]+$/,'').trim()||'—';
}
const FEM_COLORS={femme:'#ff5d73',mixte:'#c084fc',homme:'#39a0ff'};

function renderFemmes(){
  const years=Object.keys(DASH.years).sort();          // 2021 → 2025
  const per={}; years.forEach(y=>per[y]={femme:0,mixte:0,homme:0,tagged:0,total:0});
  const viewsBy={femme:0,mixte:0,homme:0};
  const artists={};
  CLIPS.forEach(c=>{
    const y=String(c.year); if(!per[y]) per[y]={femme:0,mixte:0,homme:0,tagged:0,total:0};
    per[y].total++;
    const g=genderCat(c.sex); if(!g) return;
    per[y][g]++; per[y].tagged++;
    if(['2024','2025'].includes(y)) viewsBy[g]+=(c.views||0);
    // Classement nominatif : femmes confirmées en lead (solo F + duos FF) uniquement
    if(g==='femme'){
      const k=normArtist(c.artist);
      if(!k||k==='—') return;
      if(!artists[k]) artists[k]={views:0,clips:0};
      artists[k].views+=(c.views||0); artists[k].clips++;
    }
  });

  const documented=years.filter(y=>per[y].tagged>0);
  const undoc=years.filter(y=>per[y].tagged===0);
  // aggregate KPIs over documented years
  let aFem=0,aMix=0,aTag=0; documented.forEach(y=>{aFem+=per[y].femme;aMix+=per[y].mixte;aTag+=per[y].tagged;});
  const presence=aTag?Math.round((aFem+aMix)/aTag*100):0;
  const femViewsTot=viewsBy.femme+viewsBy.mixte;
  const nFemArtists=Object.keys(artists).length;
  const topArtists=Object.entries(artists).sort((a,b)=>b[1].views-a[1].views).slice(0,10);
  const topClip=CLIPS.filter(c=>genderCat(c.sex)==='femme')
                     .sort((a,b)=>(b.views||0)-(a.views||0))[0];

  byId('femNote').innerHTML=`ℹ️ Indicateurs calculés sur les éditions documentées en genre (${documented.join(', ')}). `+
    (undoc.length?`Les éditions ${undoc.join(', ')} ne disposent pas encore de cette donnée (« n/d »).`:'');

  byId('femKpis').innerHTML=[
    kpiCard(presence+'%','de présence féminine','clips portés ou co-portés par des femmes'),
    kpiCard(fmtShort(femViewsTot),'vues générées','femmes & collaborations (2024–2025)'),
    kpiCard(fmt(nFemArtists),'artistes femmes','en lead, identifiées en base'),
    kpiCard(topClip?esc(normArtist(topClip.artist)):'—','clip féminin n°1',topClip?fmtShort(topClip.views)+' vues':'')
  ].join('');

  // per-year stacked bar (all years; undocumented = empty + n/d tick)
  charts.femY=new Chart(byId('cFemYears'),{type:'bar',
    data:{labels:years.map(y=>per[y].tagged?y:y+' (n/d)'),datasets:[
      {label:'Femmes',data:years.map(y=>per[y].femme),backgroundColor:FEM_COLORS.femme,borderRadius:4,stack:'g'},
      {label:'Mixte',data:years.map(y=>per[y].mixte),backgroundColor:FEM_COLORS.mixte,borderRadius:4,stack:'g'},
      {label:'Hommes',data:years.map(y=>per[y].homme),backgroundColor:FEM_COLORS.homme,borderRadius:4,stack:'g'}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,labels:{boxWidth:12,padding:14}},
        tooltip:{callbacks:{label:c=>{const t=per[years[c.dataIndex]].tagged;return ` ${c.dataset.label}: ${c.raw} clips${t?' ('+Math.round(c.raw/t*100)+'%)':''}`;}}}},
      scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:GRID},title:{display:true,text:'Clips taggés'}}}}});

  charts.femV=new Chart(byId('cFemViews'),{type:'doughnut',
    data:{labels:['Femmes','Mixte','Hommes'],datasets:[{data:[viewsBy.femme,viewsBy.mixte,viewsBy.homme],
      backgroundColor:[FEM_COLORS.femme,FEM_COLORS.mixte,FEM_COLORS.homme],borderColor:'#0f1525',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      plugins:{legend:{position:'right',labels:{boxWidth:12,padding:12}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)} vues`}}}}});

  byId('femTop').innerHTML=topArtists.map(([name,d],i)=>`<div class="top-row">
    <div class="top-rank ${i<3?'gold':''}">${i+1}</div>
    <div class="top-main"><b>${esc(name)}</b><span>${d.clips} clip(s) avec présence féminine</span></div>
    <div class="top-views">${fmtShort(d.views)}</div>
  </div>`).join('');
}

/* ---------- SEARCH ---------- */
let shown=0; const PAGE=25; let filtered=[];
function initSearch(){
  const years=[...new Set(CLIPS.map(c=>c.year))].sort();
  const styles=[...new Set(CLIPS.map(c=>c.style).filter(Boolean))].sort();
  const origins=[...new Set(CLIPS.map(c=>c.origin).filter(Boolean))].sort();
  fill('fYear',years); fill('fStyle',styles); fill('fOrigin',origins);
  ['q','fYear','fStyle','fOrigin','fSort'].forEach(id=>{
    const el=byId(id); el.addEventListener(id==='q'?'input':'change',runSearch);
  });
  byId('moreBtn').onclick=()=>{shown+=PAGE;paint();};
  runSearch();
}
function fill(id,arr){byId(id).insertAdjacentHTML('beforeend',arr.map(v=>`<option value="${v}">${shortStyle(String(v))}</option>`).join(''));}

function runSearch(){
  const q=byId('q').value.trim().toLowerCase();
  const y=byId('fYear').value, st=byId('fStyle').value, og=byId('fOrigin').value, sort=byId('fSort').value;
  filtered=CLIPS.filter(c=>{
    if(y && String(c.year)!==y) return false;
    if(st && c.style!==st) return false;
    if(og && c.origin!==og) return false;
    if(q){const h=((c.artist||'')+' '+(c.title||'')).toLowerCase();if(!h.includes(q))return false;}
    return true;
  });
  filtered.sort((a,b)=>{
    if(sort==='views') return (b.views||0)-(a.views||0);
    if(sort==='date') return (b.date||'').localeCompare(a.date||'');
    return (a.artist||'').localeCompare(b.artist||'','fr');
  });
  shown=PAGE; paint();
}
function paint(){
  const body=byId('resultsBody');
  const totalViews=filtered.reduce((a,c)=>a+(c.views||0),0);
  const r=rank();
  const gate = r>=1 ? `<span class="gate-ok">● ${TIER_NAME[curTier()]||'Membre'} — données complètes</span>`
    : `<span class="gate-lock">🔒 <a href="#" id="gateReg">Inscrivez-vous gratuitement</a> pour voir les vues exactes</span>`;
  byId('searchMeta').innerHTML=`<b>${fmt(filtered.length)}</b> clip(s) · ${fmt(totalViews)} vues cumulées &nbsp;·&nbsp; ${gate}`;
  const gr=byId('gateReg'); if(gr) gr.onclick=e=>{e.preventDefault();openAuth('register');};
  body.innerHTML=filtered.slice(0,shown).map(rowHtml).join('') ||
    `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--faint)">Aucun résultat. Essayez un autre artiste ou style.</td></tr>`;
  byId('moreBtn').hidden = shown>=filtered.length;
}
function rowHtml(c){
  const r=rank();
  const vCell = r>=1 ? `<b>${fmt(c.views)}</b>`
    : `<span class="lock-cell" data-gate="decouverte"><b>${fmtShort(c.views)}</b> 🔒</span>`;
  const certCell = c.snep==='OUI'?'<span class="badge-snep">SNEP</span>':'—';
  return `<tr>
    <td><span class="chip">${c.year}</span></td>
    <td><b>${esc(c.artist||'—')}</b></td>
    <td>${esc(c.title||'—')}</td>
    <td class="num">${vCell}</td>
    <td>${shortStyle(c.style)}</td>
    <td>${c.origin?esc(c.origin):'—'}</td>
    <td>${certCell}</td>
  </tr>`;
}

/* ---------- MEMBRES / AUTH (preview, simulé côté navigateur) ---------- */
const TIER_RANK={visiteur:0,decouverte:1,pro:2,business:3};
const TIER_NAME={decouverte:'Découverte',pro:'Pro',business:'Business'};
let pendingTier=null;
function getMember(){try{return JSON.parse(localStorage.getItem('hl_member')||'null')}catch(_){return null}}
function curTier(){const m=getMember();return m?m.tier:'visiteur';}
function rank(){return TIER_RANK[curTier()]||0;}
function refreshGated(){if(filtered)paint();if(typeof renderAnalytics==='function')renderAnalytics();if(DASH&&document.getElementById('yearTabs'))buildYearTabs();}
function saveMember(m){localStorage.setItem('hl_member',JSON.stringify(m));updateAuthUI();refreshGated();}
function logoutMember(){localStorage.removeItem('hl_member');updateAuthUI();refreshGated();toast('Vous êtes déconnecté.');}
function recordLead(extra){try{const L=JSON.parse(localStorage.getItem('hl_leads')||'[]');L.push({...extra,ts:new Date().toISOString()});localStorage.setItem('hl_leads',JSON.stringify(L));}catch(_){}}

function updateAuthUI(){
  const m=getMember(), nm=byId('navMember'), btn=byId('navAuth');
  if(!btn) return;
  if(m){ nm.innerHTML=`<span class="member-pill">● ${esc(m.email)} · <b>${TIER_NAME[m.tier]||m.tier}</b></span>`;
    btn.textContent='Déconnexion'; btn.dataset.act='logout'; }
  else { nm.innerHTML=''; btn.textContent='Connexion'; btn.dataset.act='open'; }
}

function openAuth(mode){ byId('authModal').hidden=false; setAuthMode(mode||'register'); }
function closeAuth(){ byId('authModal').hidden=true; byId('authNote').textContent=''; }
function setAuthMode(mode){
  document.querySelectorAll('.mtab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  const reg=mode==='register';
  document.querySelectorAll('.reg-only').forEach(e=>e.style.display=reg?'':'none');
  byId('authTitle').textContent=reg?'Créez votre compte gratuit':'Connexion à votre espace';
  byId('authSub').textContent=reg?'Accédez aux vues exactes et à toute la base 2021–2025.':'Heureux de vous revoir.';
  byId('authSubmit').textContent=reg?'Créer mon compte gratuit':'Se connecter';
  byId('authForm').dataset.mode=mode;
}

function upgradeTier(tier){
  const m=getMember()||{email:'invité',tier:'decouverte'};
  saveMember({...m,tier});
  recordLead({email:m.email,plan:'Membre '+TIER_NAME[tier],source:'adhesion-'+tier});
  toast(`Aperçu ${TIER_NAME[tier]} activé (démo) — données débloquées.`);
  document.getElementById('recherche').scrollIntoView({behavior:'smooth'});
}
function join(tier){
  const m=getMember();
  if(tier==='decouverte'){ openAuth('register'); return; }
  if(!m){ pendingTier=tier; openAuth('register'); } else { upgradeTier(tier); }
}

function initAuth(){
  updateAuthUI();
  const btn=byId('navAuth');
  btn.onclick=()=>{ if(btn.dataset.act==='logout') logoutMember(); else openAuth('register'); };
  byId('authClose').onclick=closeAuth;
  byId('authModal').addEventListener('click',e=>{ if(e.target.id==='authModal') closeAuth(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAuth(); });
  document.querySelectorAll('.mtab').forEach(t=>t.onclick=()=>setAuthMode(t.dataset.mode));
  document.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>join(b.dataset.join));
  byId('authForm').addEventListener('submit',e=>{
    e.preventDefault();
    const f=e.target, note=byId('authNote');
    const data=Object.fromEntries(new FormData(f).entries());
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((data.email||'').trim())||!data.password){
      note.className='form-note err';note.textContent='E-mail et mot de passe requis.';return;}
    const tier = pendingTier || 'decouverte';
    saveMember({email:data.email.trim(),name:data.name||'',tier});
    recordLead({email:data.email.trim(),name:data.name||'',profile:data.profile||'',
      plan:tier==='decouverte'?'Membre Découverte (gratuit)':'Membre '+TIER_NAME[tier],source:'inscription'});
    if((f.dataset.mode||'register')==='register'){
      sendMail({subject:'Nouvelle inscription — Baromètre Hit Lokal',from_name:'Baromètre Hit Lokal',
        type:'Inscription',name:data.name||'(non renseigné)',email:data.email.trim(),
        profil:data.profile||'',formule:tier==='decouverte'?'Découverte (gratuit)':'Membre '+TIER_NAME[tier]}).catch(()=>{});
      addToBrevo({email:data.email.trim(),name:data.name||'',profile:data.profile||'',source:'inscription'});
    }
    closeAuth();
    if(pendingTier){const t=pendingTier;pendingTier=null;toast(`Bienvenue ! Aperçu ${TIER_NAME[t]} activé (démo).`);}
    else toast('Bienvenue ! Vos données sont débloquées.');
    document.getElementById('recherche').scrollIntoView({behavior:'smooth'});
  });
  // clic sur cellule verrouillée
  byId('resultsBody').addEventListener('click',e=>{
    const cell=e.target.closest('.lock-cell'); if(!cell)return;
    if(cell.dataset.gate==='decouverte') openAuth('register');
    else document.getElementById('adhesion').scrollIntoView({behavior:'smooth'});
  });
}

function toast(msg){
  const t=byId('toast'); if(!t)return;
  t.textContent=msg; t.hidden=false; t.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.hidden=true,300);},3200);
}

/* ---------- NAV + FORM ---------- */
document.getElementById('burger').onclick=()=>document.querySelector('.nav-links').classList.toggle('open');
document.querySelectorAll('.nav-links a').forEach(a=>a.onclick=()=>document.querySelector('.nav-links').classList.remove('open'));
document.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{
  const sel=byId('planSelect'); if(sel) sel.value=b.dataset.plan;
}));

/* ---------- LEAD MAGNET : téléchargement PDF 2021 ---------- */
const DL_2021_URL='https://tr.ee/ZfEKC8fwpl';
const dlForm=document.getElementById('dlForm');
if(dlForm){
  dlForm.addEventListener('submit',e=>{
    e.preventDefault();
    const note=byId('dlNote');
    const data=Object.fromEntries(new FormData(dlForm).entries());
    const email=(data.email||'').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      note.className='form-note err';note.textContent='Merci d\'indiquer un e-mail valide.';return;
    }
    try{
      const leads=JSON.parse(localStorage.getItem('hl_leads')||'[]');
      leads.push({email,profile:data.profile,optin:!!data.optin,source:'telechargement-2021',plan:'PDF 2021 gratuit',ts:new Date().toISOString()});
      localStorage.setItem('hl_leads',JSON.stringify(leads));
    }catch(_){}
    sendMail({subject:'Téléchargement PDF 2021 — Baromètre Hit Lokal',from_name:'Lead PDF 2021',
      type:'Téléchargement PDF 2021',email:email,profil:data.profile||'',optin:data.optin?'oui':'non'}).catch(()=>{});
    note.className='form-note ok';
    note.textContent='Merci ! Votre téléchargement va démarrer dans un nouvel onglet.';
    window.open(DL_2021_URL,'_blank','noopener');
    dlForm.reset();
  });
}

document.getElementById('leadForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.target, note=byId('formNote');
  const data=Object.fromEntries(new FormData(f).entries());
  if(!data.name||!data.email){note.className='form-note err';note.textContent='Merci de remplir les champs obligatoires.';return;}
  // Persist locally + open prefilled e-mail (no backend required for the static site)
  try{
    const leads=JSON.parse(localStorage.getItem('hl_leads')||'[]');
    leads.push({...data,ts:new Date().toISOString()});
    localStorage.setItem('hl_leads',JSON.stringify(leads));
  }catch(_){}
  note.className='form-note';note.textContent='Envoi en cours…';
  sendMail({subject:'Demande Baromètre Hit Lokal — '+(data.plan||''),from_name:data.name||'Contact site',
    type:'Demande / Contact',name:data.name,email:data.email,organisation:data.org||'',
    profil:data.profile||'',offre:data.plan||'',message:data.message||''})
    .then(r=>{ if(!r||!r.success) throw new Error('fail');
      addToBrevo({email:data.email,name:data.name||'',organisation:data.org||'',profile:data.profile||'',offre:data.plan||'',source:'contact'});
      note.className='form-note ok';
      note.textContent='Merci ! Votre demande a bien été envoyée — nous revenons vers vous sous 48h.';
      f.reset();
    })
    .catch(()=>{ note.className='form-note err';
      note.textContent='Échec de l\'envoi. Réessayez, ou écrivez-nous directement à hitlokal@gmail.com.'; });
});
