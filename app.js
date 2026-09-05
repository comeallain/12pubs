/* ============================ storage ============================ */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('12pubs:'+k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('12pubs:'+k, JSON.stringify(v)); }catch(e){} }
};
const moved   = LS.get('moved', {});     // "2012|Delaneys" -> [lat,lng]
let   edits   = LS.get('edits', {});     // year -> {district, pubs:[[name,lat,lng,verified]]}
let   route   = LS.get('route', []);     // [{name,lat,lng,open,close,custom}]
let   ticks   = LS.get('ticks', {});
let   startT  = LS.get('startT','15:30');
let   closeT  = LS.get('closeT','23:30');

/* ============================ helpers ============================ */
/* Baseline data ships in data.js. Anything you change in the editor is stored
   as an override, so the original is never lost and a fresh browser sees the
   shipped version. */
function years(){
  const map = new Map();
  ARCHIVE.forEach(y => map.set(y.year, y));
  Object.entries(edits).forEach(([yr,v]) => {
    if(v === null) map.delete(+yr);
    else map.set(+yr, {year:+yr, district:v.district, pubs:v.pubs});
  });
  return [...map.values()].sort((a,b)=>a.year-b.year);
}
const YEAR_HUE = {2011:198,2012:14,2013:262,2014:40,2015:330,2017:150,2018:24,2019:210,2021:100,2022:284,2023:52,2024:172,2025:0};
const yearColour = y => `hsl(${YEAR_HUE[y]??0} 62% 58%)`;
const norm = s => s.toLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]/g,'');

/* Clash detection runs at two levels, because Dublin reuses pub names.
   exact  — same name including any "(Ringsend)" style disambiguator. Blocks.
   loose  — same base name, different place. Warns only. Cleary's of Inchicore
            and Cleary's of Amiens Street are not the same pub. */
const base = s => norm(s.split('—')[0].split('(')[0]);
function clash(name){
  const e = norm(name), b = base(name);
  let loose = null;
  for(const y of years()) for(const p of y.pubs){
    if(norm(p[0]) === e) return {level:'exact', year:y.year, name:p[0]};
    if(base(p[0]) === b) loose = {level:'loose', year:y.year, name:p[0]};
  }
  return loose;
}
const usedYear = n => { const c = clash(n); return c && c.level==='exact' ? c.year : null; };

function haversine(a,b,c,d){
  const R=6371, r=Math.PI/180;
  const dLat=(c-a)*r, dLon=(d-b)*r;
  const x=Math.sin(dLat/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
// Straight line x 1.2 for the way Dublin streets actually run.
const DETOUR = 1.2;
const walkMins = (p,q,kmh) => Math.max(1, Math.round(haversine(p.lat,p.lng,q.lat,q.lng)*DETOUR/kmh*60));
const hm = m => String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.round(m%60)).padStart(2,'0');
const toMin = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
const decToMin = d => Math.round(d*60);

/* ============================ map ============================ */
const map = L.map('map',{zoomControl:true, preferCanvas:false}).setView([53.3560,-6.2560], 13);
// OSM tiles, darkened in CSS (.darkmap) — no API key needed.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap contributors', maxZoom:19, className:'darkmap'
}).addTo(map);

const note = L.DomUtil.create('div','mapnote');
note.innerHTML = '<b>Amber, dashed</b> — location is my guess. Drag it right and it saves.';
map.getContainer().appendChild(note);

const archiveLayer = L.layerGroup().addTo(map);
const routeLayer   = L.layerGroup().addTo(map);
const shown = new Set(ARCHIVE.map(y=>y.year));
const CENTRE = {lat:53.3470, lng:-6.2590};   // O'Connell Bridge
const isCityCentre = p => haversine(CENTRE.lat, CENTRE.lng, p.lat, p.lng) <= 1.2;

function pinIcon(colour, unverified, label){
  const size = label ? 22 : 13;
  return L.divIcon({
    className:'', iconSize:[size,size], iconAnchor:[size/2,size/2],
    html:`<div class="pin ${unverified?'unv':''} ${label?'num':''}" style="width:${size}px;height:${size}px;background:${colour}">${label||''}</div>`
  });
}

function key(year,name){ return year+'|'+name; }
function coordsOf(year, p){
  const m = moved[key(year,p[0])];
  return m ? {lat:m[0], lng:m[1]} : {lat:p[1], lng:p[2]};
}

function drawArchive(){
  archiveLayer.clearLayers();
  years().forEach(y=>{
    if(!shown.has(y.year)) return;
    const col = yearColour(y.year);
    const pts = y.pubs.map(p=>coordsOf(y.year,p));
    L.polyline(pts.map(c=>[c.lat,c.lng]),{color:col,weight:2,opacity:.5}).addTo(archiveLayer);
    y.pubs.forEach((p,i)=>{
      const c = coordsOf(y.year,p);
      const unv = !p[3] && !moved[key(y.year,p[0])];
      const mk = L.marker([c.lat,c.lng],{
        icon:pinIcon(unv?'var(--amber)':col, unv), draggable:unv, title:p[0]
      }).addTo(archiveLayer);
      mk.bindPopup(
        `<b>${p[0]}</b><br>${y.year} &middot; stop ${i+1} &middot; ${y.district}` +
        (unv ? '<br><em>Guessed location — drag the pin to fix it</em>' : '')
      );
      if(unv) mk.on('dragend', e=>{
        const ll = e.target.getLatLng();
        moved[key(y.year,p[0])] = [ll.lat, ll.lng];
        LS.set('moved', moved); drawArchive(); buildLedger();
      });
    });
  });
}

function buildLedger(){
  const el = document.getElementById('ledger'); el.innerHTML='';
  let amber=0, total=0;
  years().forEach(y=>{
    const unv = y.pubs.filter(p=>!p[3] && !moved[key(y.year,p[0])]).length;
    amber+=unv; total+=y.pubs.length;
    const b=document.createElement('button');
    b.className='yr'; b.dataset.off = shown.has(y.year)?'0':'1';
    b.innerHTML = `<span class="swatch" style="background:${yearColour(y.year)}"></span>`+
      `<span class="y">${y.year}</span><span class="d">${y.district}</span>`+
      `<span class="n">${unv?unv+' amber':'✓'}</span>`;
    b.onclick = ()=>{ shown.has(y.year)?shown.delete(y.year):shown.add(y.year); drawArchive(); buildLedger(); };
    el.appendChild(b);
  });
  document.getElementById('tally').textContent =
    `${total} pubs · ${total-amber} pinned · ${amber} to confirm`;
  document.getElementById('yearsNote').textContent =
    `${shown.size} of ${years().length} on the map`;
}

document.getElementById('allOn').onclick = ()=>{ years().forEach(y=>shown.add(y.year)); drawArchive(); buildLedger(); };
document.getElementById('allOff').onclick= ()=>{ shown.clear(); drawArchive(); buildLedger(); };
document.getElementById('amberOnly').onclick = ()=>{
  shown.clear();
  years().forEach(y=>{ if(y.pubs.some(p=>!p[3] && !moved[key(y.year,p[0])])) shown.add(y.year); });
  drawArchive(); buildLedger();
};

/* ============================ planner ============================ */
const picker=document.getElementById('picker'), q=document.getElementById('q');

function candidateList(){
  const side=document.getElementById('side').value;
  const term=norm(q.value);
  return CANDIDATES
    .filter(c=>!side||c[5]===side)
    .filter(c=>!term||norm(c[0]).includes(term)||norm(c[6]).includes(term))
    .slice(0,60);
}
function drawPicker(){
  picker.innerHTML='';
  const inRoute=new Set(route.map(r=>norm(r.name)));
  candidateList().forEach(c=>{
    const cl=clash(c[0]), hard=cl&&cl.level==='exact';
    const b=document.createElement('button');
    b.className='pick'+(hard?' used':'')+(inRoute.has(norm(c[0]))?' picked':'');
    b.innerHTML=`<span>${c[0]}</span><span class="area">${hard?'done '+cl.year:c[6]}</span>`;
    b.onclick=()=>{
      if(hard && !confirm(`${c[0]} was on the ${cl.year} crawl. Add it anyway?`)) return;
      route.push({name:c[0],lat:c[1],lng:c[2],open:c[3],close:c[4]});
      save(); render();
    };
    picker.appendChild(b);
  });
  if(!picker.children.length) picker.innerHTML='<div style="padding:10px;font-size:13px;color:var(--cream-dim)">Nothing matches. Click the map to drop a stop instead.</div>';
}
q.oninput=drawPicker;
document.getElementById('side').onchange=drawPicker;

map.on('click', e=>{
  if(document.getElementById('p-plan').classList.contains('on')===false) return;
  const n=prompt('Name of this pub');
  if(!n) return;
  const cl=clash(n);
  if(cl && cl.level==='exact' && !confirm(`${n} was on the ${cl.year} crawl. Add it anyway?`)) return;
  if(cl && cl.level==='loose' && !confirm(`A pub called ${cl.name} was done in ${cl.year}. If this is a different house, carry on.`)) return;
  route.push({name:n,lat:e.latlng.lat,lng:e.latlng.lng,open:-1,close:-1,custom:true});
  save(); render();
});

function computeSlots(){
  const kmh=parseFloat(document.getElementById('pace').value);
  const start=toMin(document.getElementById('startT').value);
  let t=start; const out=[];
  route.forEach((p,i)=>{
    const len = i<6 ? 30 : 45;
    const walk = i===0 ? 0 : walkMins(route[i-1],p,kmh);
    const arrive = t+walk;
    const leave  = t+len;
    out.push({...p, i, len, walk, arrive, leave, inPub: len-walk});
    t = leave;
  });
  return {slots:out, finish:t, start};
}

function render(){
  drawPicker();
  const {slots,finish}=computeSlots();
  const closeM=toMin(document.getElementById('closeT').value);

  // map
  routeLayer.clearLayers();
  if(slots.length){
    L.polyline(slots.map(s=>[s.lat,s.lng]),{color:'var(--gilt)',weight:3,opacity:.9,dashArray:'1 6',lineCap:'round'}).addTo(routeLayer);
    slots.forEach(s=>{
      L.marker([s.lat,s.lng],{icon:pinIcon('#C89B3C',false,String(s.i+1))})
        .bindPopup(`<b>${s.name}</b><br>Slot ${s.i+1} · arrive ${hm(s.arrive)} · ${s.inPub} min in the pub`)
        .addTo(routeLayer);
    });
  }

  // table
  const tb=document.getElementById('slots');
  if(!slots.length){ tb.innerHTML='<p class="note" style="margin-top:14px">No stops yet.</p>'; document.getElementById('verdict').innerHTML=''; return; }
  let html='<table><thead><tr><th>Leave</th><th>Pub</th><th style="text-align:right">Walk</th><th style="text-align:right">Pub</th><th></th></tr></thead><tbody>';
  slots.forEach((s,idx)=>{
    let flags='';
    if(idx===slots.length-1 && slots.length>1 && !isCityCentre(s)){
      const km = haversine(CENTRE.lat,CENTRE.lng,s.lat,s.lng).toFixed(1);
      flags += `<span class="bad">Last stop is ${km}km from the centre — finish closer in</span>`;
    }
    if(s.inPub < 12) flags += `<span class="bad">Only ${s.inPub} min inside — too tight</span>`;
    else if(s.inPub < 18) flags += `<span class="warn">${s.inPub} min inside — order on arrival</span>`;
    if(s.open===-1 && !s.custom) flags += `<span class="bad">Closed Wednesdays</span>`;
    else if(s.open>0 && s.arrive < decToMin(s.open)) flags += `<span class="warn">Opens ${hm(decToMin(s.open))} — you're ${decToMin(s.open)-s.arrive} min early</span>`;
    if(s.close>0 && s.leave > decToMin(s.close)) flags += `<span class="bad">Shuts ${hm(decToMin(s.close))} before you leave</span>`;
    const cl=clash(s.name);
    if(cl && cl.level==='exact') flags += `<span class="bad">Already drunk — ${cl.year}</span>`;
    else if(cl) flags += `<span class="warn">Name clash with ${cl.name}, ${cl.year} — check it's a different house</span>`;
    html += `<tr class="${s.len===30?'slot30':''}"><td class="t">${hm(s.leave-s.len)}</td>`+
      `<td><span class="pubname">${s.name}</span><span class="sub">slot ${s.i+1} · ${s.len} min</span>${flags}</td>`+
      `<td class="m">${s.walk||'—'}</td><td class="m">${s.inPub}</td>`+
      `<td><button class="x" data-i="${s.i}" title="Remove">✕</button></td></tr>`;
  });
  html+='</tbody></table>';
  tb.innerHTML=html;
  tb.querySelectorAll('.x').forEach(b=>b.onclick=()=>{ route.splice(+b.dataset.i,1); save(); render(); });

  // verdict
  const over = finish - closeM;
  const totalWalk = slots.reduce((a,s)=>a+s.walk,0);
  const avg = Math.round(slots.reduce((a,s)=>a+s.inPub,0)/slots.length);
  const v=document.getElementById('verdict');
  v.className = 'verdict' + (over>0 ? ' fail':'');
  v.innerHTML = `<strong>${hm(finish)}</strong>`+
    (over>0 ? `${over} min past last orders. Cut a stop or start earlier.`
            : `${-over} min to spare. ${slots.length} of 12 stops.`)+
    `<div class="sub" style="margin-top:6px">${totalWalk} min walking · ${avg} min average in the pub</div>`;
}

function save(){
  LS.set('route',route);
  LS.set('startT',document.getElementById('startT').value);
  LS.set('closeT',document.getElementById('closeT').value);
}
document.getElementById('startT').onchange=()=>{save();render();};
document.getElementById('closeT').onchange=()=>{save();render();};
document.getElementById('pace').onchange=render;
document.getElementById('clearRoute').onclick=()=>{ if(confirm('Clear the whole route?')){ route=[]; save(); render(); } };
document.getElementById('toNight').onclick=()=>{ tab('night'); };

/* ============================ night ============================ */
function renderNight(){
  const {slots}=computeSlots();
  const el=document.getElementById('ticks');
  const ck=document.getElementById('clock');
  if(!slots.length){ el.innerHTML='<p class="note">Build a route first.</p>'; return; }

  const now=new Date(); const nowM=now.getHours()*60+now.getMinutes();
  let current=slots.findIndex(s=>nowM>=s.leave-s.len && nowM<s.leave);
  const doneCount=slots.filter(s=>ticks[s.name]).length;
  const should=slots.filter(s=>nowM>=s.leave).length;
  const drift=doneCount-should;
  ck.className='clock'+(drift>0?' ahead':drift<0?' behind':'');
  ck.innerHTML=`<div class="big">${doneCount} / ${slots.length}</div>`+
    `<div class="st">${current>=0?'Slot '+(current+1)+' — '+slots[current].name+' until '+hm(slots[current].leave)
      : nowM<slots[0].leave-slots[0].len ? 'Starts '+hm(slots[0].leave-slots[0].len) : 'Route finished'}`+
    (drift!==0?` · ${Math.abs(drift)} ${drift>0?'ahead':'behind'}`:'')+`</div>`;

  el.innerHTML='';
  slots.forEach((s,i)=>{
    const b=document.createElement('button');
    b.className='tick'+(ticks[s.name]?' done':'')+(i===current?' now':'');
    b.innerHTML=`<span class="box">${ticks[s.name]?'✓':''}</span>`+
      `<span><span class="pubname">${s.name}</span><span class="sub">`+
      `${hm(s.leave-s.len)}–${hm(s.leave)} · ${s.inPub} min inside</span></span>`;
    b.onclick=()=>{ ticks[s.name]=!ticks[s.name]; LS.set('ticks',ticks); renderNight(); };
    el.appendChild(b);
  });
}
document.getElementById('resetTicks').onclick=()=>{ if(confirm('Untick every pub?')){ ticks={}; LS.set('ticks',ticks); renderNight(); } };
setInterval(()=>{ if(document.getElementById('p-night').classList.contains('on')) renderNight(); }, 30000);

/* ============================ tabs ============================ */
function tab(name){
  ['archive','plan','night'].forEach(n=>{
    document.getElementById('p-'+n).classList.toggle('on', n===name);
    document.getElementById('t-'+n).setAttribute('aria-current', String(n===name));
  });
  archiveLayer.remove(); routeLayer.remove();
  if(name==='archive'){ archiveLayer.addTo(map); note.style.display=''; }
  else { routeLayer.addTo(map); note.style.display='none'; }
  if(name==='plan') render();
  if(name==='night') renderNight();
  setTimeout(()=>map.invalidateSize(),60);
}
document.getElementById('t-archive').onclick=()=>tab('archive');
document.getElementById('t-plan').onclick   =()=>tab('plan');
document.getElementById('t-night').onclick  =()=>tab('night');

/* ============================ archive editor ============================ */
const editSel=document.getElementById('editYear'), editorEl=document.getElementById('editor');

function fillYearSelect(){
  const cur=editSel.value;
  editSel.innerHTML='<option value="">Choose a year…</option>'+
    years().map(y=>`<option value="${y.year}">${y.year} — ${y.district}</option>`).join('');
  editSel.value=cur;
}
function yearData(yr){
  const y=years().find(y=>y.year===+yr);
  return y ? JSON.parse(JSON.stringify(y)) : null;
}
function saveYear(y){
  edits[y.year]={district:y.district, pubs:y.pubs};
  LS.set('edits',edits);
  shown.add(y.year);
  drawArchive(); buildLedger(); fillYearSelect(); drawEditor(); drawPicker();
}
function drawEditor(){
  const yr=editSel.value;
  if(!yr){ editorEl.innerHTML=''; return; }
  const y=yearData(yr); if(!y){ editorEl.innerHTML=''; return; }
  let h=`<div class="field"><label for="edDist">District</label>
    <input type="text" id="edDist" value="${y.district.replace(/"/g,'&quot;')}"></div>
    <table><tbody>`;
  y.pubs.forEach((p,i)=>{
    const unv=!p[3] && !moved[key(y.year,p[0])];
    h+=`<tr><td class="t">${i+1}</td>
      <td><input type="text" data-ed="${i}" value="${p[0].replace(/"/g,'&quot;')}" style="width:100%">
      ${unv?'<span class="warn">location unconfirmed</span>':''}</td>
      <td style="width:64px;white-space:nowrap">
        <button class="x" data-up="${i}" ${i===0?'disabled':''} title="Move up">↑</button>
        <button class="x" data-dn="${i}" ${i===y.pubs.length-1?'disabled':''} title="Move down">↓</button>
        <button class="x" data-rm="${i}" title="Remove">✕</button>
      </td></tr>`;
  });
  h+=`</tbody></table>
    <div class="ledger-actions">
      <button class="mini" id="edAdd">Add a pub</button>
      <button class="mini" id="edDel" style="color:var(--oxblood)">Delete this year</button>
    </div>
    <p class="note" style="margin-top:8px">${y.pubs.length} pubs. New pubs land in the middle of the map — drag the amber pin to place them.</p>`;
  editorEl.innerHTML=h;

  document.getElementById('edDist').onchange=e=>{ y.district=e.target.value; saveYear(y); };
  editorEl.querySelectorAll('[data-ed]').forEach(inp=>inp.onchange=()=>{
    y.pubs[+inp.dataset.ed][0]=inp.value; saveYear(y);
  });
  editorEl.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.up; [y.pubs[i-1],y.pubs[i]]=[y.pubs[i],y.pubs[i-1]]; saveYear(y);
  });
  editorEl.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.dn; [y.pubs[i+1],y.pubs[i]]=[y.pubs[i],y.pubs[i+1]]; saveYear(y);
  });
  editorEl.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.rm;
    if(confirm(`Remove ${y.pubs[i][0]} from ${y.year}?`)){ y.pubs.splice(i,1); saveYear(y); }
  });
  document.getElementById('edAdd').onclick=()=>{
    const n=prompt('Pub name'); if(!n) return;
    const c=CANDIDATES.find(c=>norm(c[0])===norm(n));
    y.pubs.push(c ? [c[0],c[1],c[2],true] : [n, 53.3470, -6.2590, false]);
    saveYear(y);
    if(!c) alert('Added. It will show as an amber pin near the centre — drag it into place.');
  };
  document.getElementById('edDel').onclick=()=>{
    if(confirm(`Delete the whole ${y.year} crawl from your copy?`)){
      edits[y.year]=null; LS.set('edits',edits); shown.delete(y.year);
      editSel.value=''; drawArchive(); buildLedger(); fillYearSelect(); drawEditor();
    }
  };
}
editSel.onchange=drawEditor;
document.getElementById('newYear').onclick=()=>{
  const yr=prompt('Which year?', String(new Date().getFullYear()));
  if(!yr||isNaN(+yr)) return;
  if(years().some(y=>y.year===+yr)){ alert(yr+' already exists. Pick it from the dropdown to edit it.'); return; }
  const d=prompt('District, e.g. "Ballybough"','')||'Untitled';
  const y={year:+yr, district:d, pubs:[]};
  // Seed from the planner if there's a route sitting there.
  if(route.length && confirm(`Start from the ${route.length}-stop route in the planner?`))
    y.pubs = route.map(r=>[r.name, r.lat, r.lng, !r.custom]);
  saveYear(y); editSel.value=String(yr); drawEditor();
};
document.getElementById('resetEdits').onclick=()=>{
  if(confirm('Throw away every change you have made and go back to the shipped list?')){
    edits={}; LS.set('edits',edits); editSel.value='';
    drawArchive(); buildLedger(); fillYearSelect(); drawEditor(); drawPicker();
  }
};

/* ============================ folds ============================ */
/* Collapsing a section frees vertical space for the map on phones,
   so re-measure Leaflet after each toggle. State sticks per device. */
document.querySelectorAll('details.fold').forEach(d=>{
  const saved = LS.get('fold:'+d.id, null);
  if(saved !== null) d.open = saved;
  d.addEventListener('toggle', ()=>{
    LS.set('fold:'+d.id, d.open);
    setTimeout(()=>map.invalidateSize(), 60);
  });
});

/* ============================ boot ============================ */
document.getElementById('startT').value=startT;
document.getElementById('closeT').value=closeT;
drawArchive(); buildLedger(); drawPicker(); fillYearSelect();
