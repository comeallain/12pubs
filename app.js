/* 12 Pubs Of Winter. The route lives in the database and comes out one door a day.
   This file holds no pub data. */
'use strict';
const SB = 'https://afijpjkgkknhsmtriqzq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaWpwamtna2tuaHNtdHJpcXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDMyMDYsImV4cCI6MjExMDc3OTIwNn0.uWTbmFrr2A8TtvfgxKCp0H2ssHXHttnpirDv_iia2oY';
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const PREVIEW = window.PREVIEW || null;   // the private preview swaps in a fake database and a time machine

/* ---------------- small helpers ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d){ try{ const v = localStorage.getItem('12p:'+k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('12p:'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('12p:'+k); }catch(e){} }
};
const now = () => PREVIEW ? PREVIEW.now() : Date.now();
const pad = n => String(n).padStart(2, '0');
const hm = m => pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m % 60));
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => dayKey(new Date(now()));
const nowMin = () => { const d = new Date(now()); return d.getHours() * 60 + d.getMinutes(); };
const atMs = iso => new Date(iso).getTime();            // ISO without a zone = Dublin local time
const shortDay = iso => new Date(iso).toLocaleDateString('en-IE', {weekday: 'short', day: 'numeric'});
const longDay = iso => new Date(iso).toLocaleDateString('en-IE', {weekday: 'long', day: 'numeric', month: 'long'});
function km(a, b){
  const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}
const walkMins = (a, b) => Math.max(1, Math.round(km(a, b) * 1.2 / 4.5 * 60));
const mapsLink = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', ' + p.area + ', Dublin') + (p.maps_id ? '&query_place_id=' + p.maps_id : '');
const dirLink = p => 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + encodeURIComponent(p.name + ', ' + p.area + ', Dublin') + (p.maps_id ? '&destination_place_id=' + p.maps_id : '');
const svSrc = p => p.sv ? `https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1s${encodeURIComponent(p.sv.pano)}!2m2!1d${p.sv.lat}!2d${p.sv.lng}!3f${p.sv.h}!4f${p.sv.p || 0}!5f0.8` : null;
const photoUrl = path => /^(https?:|blob:|data:)/.test(path) ? path : SB + '/storage/v1/object/public/checkins/' + path;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200); }
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

async function rpc(name, args){
  if(PREVIEW) return PREVIEW.rpc(name, args || {});
  const r = await fetch(SB + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify(args || {})
  });
  const body = await r.json().catch(() => null);
  if(!r.ok){ const e = new Error((body && body.message) || ('HTTP ' + r.status)); e.server = true; throw e; }
  return body;
}
async function upload(path, blob){
  if(PREVIEW) return PREVIEW.upload(path, blob);
  const r = await fetch(SB + '/storage/v1/object/checkins/' + path, {
    method: 'POST',
    headers: {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': '31536000'},
    body: await blob.arrayBuffer()
  });
  if(!r.ok){ const e = new Error('Photo upload failed (' + r.status + ')'); e.server = true; throw e; }
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

/* ---------------- the doors ---------------- */
// Twelve Dublin door colours. A door keeps its colour whatever pub ends up behind it.
const DOOR = ['#B3262E', '#1F5B3A', '#1D4E89', '#E0A526', '#5E2B4F', '#1E6E6A', '#C4571B', '#2B2B30', '#3E7CB1', '#6B1F25', '#5E6B2E', '#7E5A8C'];
const doorColour = slot => DOOR[(slot - 1) % 12];
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
function leafSVG(slot, pre){
  const gid = 'plate' + (pre || '') + slot;
  const c = doorColour(slot), hi = shade(c, .18), lo = shade(c, -.35);
  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${lo}" opacity=".55"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" rx="1" fill="${c}" stroke="${hi}" stroke-width="1.2"/>`;
  return `<svg viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="160" fill="${c}"/><rect x="0" y="0" width="100" height="160" fill="none" stroke="${lo}" stroke-width="4"/>
${panel(10, 10, 36, 34)}${panel(54, 10, 36, 34)}${panel(10, 52, 36, 46)}${panel(54, 52, 36, 46)}${panel(10, 112, 36, 38)}${panel(54, 112, 36, 38)}
<rect x="35" y="101.5" width="30" height="7" rx="1.5" fill="#B88A2B" stroke="#6E5214"/><rect x="38" y="104" width="24" height="2" fill="#4A3608"/>
<circle cx="50" cy="31" r="7" fill="none" stroke="#D9AE4A" stroke-width="2.4"/><circle cx="50" cy="23.5" r="2.4" fill="#D9AE4A"/>
<rect x="34" y="66" width="32" height="22" rx="2" fill="url(#${gid})" stroke="#6E5214"/><text x="50" y="83" text-anchor="middle" font-family="Alfa Slab One, Georgia, serif" font-size="17" fill="#2A1D06">${slot}</text>
<circle cx="86" cy="86" r="3.2" fill="#D9AE4A" stroke="#6E5214"/>
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DA8A"/><stop offset="1" stop-color="#C9962F"/></linearGradient></defs></svg>`;
}
function fanSVG(lit, id){
  let bars = '';
  for(let i = 1; i < 8; i++){ const a = Math.PI * i / 8, x = 60 - Math.cos(a) * 60, y = 60 - Math.sin(a) * 60; bars += `<line x1="60" y1="60" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
  return `<svg viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="f${id}" cx=".5" cy="1" r="1"><stop offset="0" stop-color="${lit ? '#FFF1C4' : '#26324D'}"/><stop offset="1" stop-color="${lit ? '#E8A84A' : '#121A2C'}"/></radialGradient></defs>
<path d="M0 60 A60 60 0 0 1 120 60 Z" fill="url(#f${id})"/><g stroke="${lit ? '#6B4A1A' : '#3A4560'}" stroke-width="2.2">${bars}<path d="M34 60 A26 26 0 0 1 86 60" fill="none"/><path d="M14 60 A46 46 0 0 1 106 60" fill="none"/></g></svg>`;
}

/* ---------------- state ---------------- */
let email = store.get('email', null);
let pin = store.get('pin', null);
let S = PREVIEW ? null : store.get('state', null);
let admin = null;
let tab = 'doors';
let pending = {};
let seen = new Set(store.get('seen', []));

const drops = () => (S && S.drops) || [...Array(12)].map((_, i) => { const d = new Date(2026, 10, 21 + i, 12, 0); return dayKey(d) + 'T12:00:00'; });
const revealed = () => !S ? [] : S.locked ? (S.revealed || []) : (S.route || []).map(r => ({slot: r.slot, pub: r.pub}));
function plan(){
  if(!S || !S.route) return [];
  let t = toMin((S.crawl && S.crawl.start) || '15:30');
  return S.route.map((r, i) => {
    const len = i < 6 ? 30 : 45;
    const walk = i ? walkMins(S.route[i - 1].pub, r.pub) : 0;
    const s = {slot: r.slot, pub: r.pub, swapped_from: r.swapped_from, opens_at: r.opens_at, start: t, end: t + len, walk, inPub: len - walk};
    t += len;
    return s;
  });
}
const myCheckins = () => (S && S.checkins || []).filter(c => c.mine);
const myAt = slot => myCheckins().find(c => c.slot === slot);
function dayInfo(){
  const date = (S && S.crawl && S.crawl.date) || '2026-12-02';
  const days = Math.round((new Date(date + 'T12:00:00') - new Date(todayKey() + 'T12:00:00')) / 864e5);
  return {date, days, isDay: days === 0};
}
const isPractice = () => !!pin && S && (S.preview || dayInfo().days > 0);
function nextDrop(){
  const D = drops(), t = now();
  for(let i = 0; i < D.length; i++) if(atMs(D[i]) > t) return {slot: i + 1, at: D[i]};
  return null;
}
function untilText(iso){
  const ms = atMs(iso) - now(); if(ms <= 0) return 'now';
  const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return h >= 24 ? `${longDay(iso).split(' ')[0]} at 12:00` : h ? `in ${h}h ${pad(m)}m` : `in ${m} min`;
}

/* ---------------- sign-in ---------------- */
function wallHTML(opts){
  const R = new Map(revealed().map(r => [r.slot, r.pub]));
  const D = drops(), today = todayKey();
  let h = '<div class="doors">';
  for(let slot = 1; slot <= 12; slot++){
    const pub = opts.names ? R.get(slot) : null, open = R.has(slot) || (!opts.names && atMs(D[slot - 1]) <= now());
    const isToday = open && D[slot - 1] && D[slot - 1].slice(0, 10) === today && dayInfo().days > 0;
    const swing = opts.animate && open && !seen.has(slot);
    const checked = !!myAt(slot);
    const label = open ? (pub ? esc(pub.name) : 'Open') : esc(shortDay(D[slot - 1]));
    const inside = pub && pub.photo_url ? `<img src="${esc(pub.photo_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    h += `<button type="button" class="door${open ? ' is-open' : ''}${isToday ? ' is-today' : ''}${swing ? ' swing' : ''}${checked ? ' is-checked' : ''}" ${open && opts.names ? `data-pub-slot="${slot}"` : 'disabled'} aria-label="${open ? (pub ? 'Door ' + slot + ': ' + esc(pub.name) : 'Door ' + slot + ', open') : 'Door ' + slot + ', opens ' + esc(longDay(D[slot - 1]))}">
      <span class="surround"><span class="fan">${fanSVG(open, (opts.id || 'w') + slot)}</span><span class="frame"><span class="inside">${inside}</span><span class="leaf">${leafSVG(slot, opts.id || 'w')}</span></span></span>
      <span class="step">${label}</span></button>`;
  }
  return h + '</div>';
}
function showGate(){
  $('app').hidden = true; $('gate').hidden = false;
  const n = nextDrop(), {days} = dayInfo();
  const openCount = drops().filter(d => atMs(d) <= now()).length;
  // The hero is one big Georgian door: today's, with its number on the plate.
  const slot = Math.min(12, Math.max(1, openCount || 1));
  const caption = days < 0 ? 'Closed for the year'
    : openCount === 12 ? 'Every door is open'
    : openCount ? `Door ${openCount} is open`
    : `First door: ${n ? esc(shortDay(n.at)) : 'soon'} at 12:00`;
  $('bigDoor').innerHTML = `<span class="surround"><span class="fan">${fanSVG(openCount > 0, 'hero')}</span><span class="frame"><span class="leaf">${leafSVG(slot, 'hero')}</span>${days >= 0 ? '<span class="wreath"></span>' : ''}</span></span><span class="step">${caption}</span>`;
  $('gateCount').innerHTML = days < 0 ? 'Done for another year. See you in 2027.'
    : openCount ? `<b>${plural(openCount, 'door is', 'doors are')} already open.</b> One pub a day until the night itself. Sign in to see what's behind them.`
    : `The first door opens ${n ? esc(longDay(n.at)) : 'soon'} at 12:00. One pub a day until the night.`;
  $('gName').value = store.get('name', '');
}
/* Identity is a random token this phone makes up and keeps; the name is
   just what the crew sees. Nothing to type but the name, ever. */
function myKey(){
  if(email) return email;   // legacy email keys from November keep working
  const t = (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));
  return t;
}
$('gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const nm = $('gName').value.trim();
  const msg = $('gateMsg');
  if(!nm){ msg.textContent = 'Go on, we need something to call you.'; return; }
  $('gateBtn').disabled = true; $('gateBtn').textContent = 'Checking the list…'; msg.textContent = '';
  let key = myKey();
  try{
    let r = await rpc('join_crawl_v2', {p_key: key, p_name: nm});
    if(!r.ok && r.reason === 'bad_key' && email){
      // This phone remembers a key that's been cleared off the list: start fresh.
      email = null; store.del('email'); store.del('state');
      key = myKey();
      r = await rpc('join_crawl_v2', {p_key: key, p_name: nm});
    }
    if(!r.ok){ msg.textContent = r.reason === 'axed' ? 'You\'ve been axed. 🪓 Take it up with Kevin.' : 'Couldn\'t get you in. Try again.'; return; }
    email = key; store.set('email', email); store.set('name', nm);
    await refresh(true);
    showApp();
  }catch(err){
    msg.textContent = 'Couldn\'t get through. Check your signal and try again.';
  }finally{
    $('gateBtn').disabled = false; $('gateBtn').textContent = 'Let me in';
  }
});

/* ---------------- app ---------------- */
function showApp(){ $('gate').hidden = true; $('app').hidden = false; render(); }
let lastKey = '';
function viewKey(){
  // What's on screen depends on the data, the tab, and which door or pub is current right now.
  const P = S && !S.locked ? plan() : [], m = nowMin();
  const cur = S && S.locked ? (nextDrop() || {}).slot : P.findIndex(x => m >= x.start && m < x.end);
  return tab + '|' + cur + '|' + todayKey() + '|' + JSON.stringify(S) + '|' + JSON.stringify(admin) + '|' + JSON.stringify(pending);
}
async function refresh(quiet){
  if(!email) return;
  try{
    const next = await rpc('crawl_state_v3', {p_email: email, p_pin: pin || null});
    S = next;
    if(!PREVIEW) store.set('state', S);
    if(pin){ try{ admin = await rpc('admin_state', {p_pin: pin}); }catch(e){ if(e.server){ admin = null; pin = null; store.del('pin'); } } }
    if(!quiet){ if(viewKey() !== lastKey) render(); else renderTop(); }
    flushQueue();
  }catch(e){
    if(e.server && /not_on_list|axed/.test(e.message)){ store.del('state'); S = null; email = null; store.del('email'); showGate(); $('gateMsg').textContent = 'You\'ve been axed. 🪓 Take it up with Kevin.'; return; }
    if(!quiet) renderTop();
  }
}
function render(){
  if(!S){ showGate(); return; }
  if(!$('gate').hidden){ $('gate').hidden = true; $('app').hidden = false; }
  renderTop();
  ({doors: renderDoors, map: renderMap, me: renderMe, admin: renderAdmin})[tab]();
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  $('adminTab').hidden = !pin;
  $('doorsLabel').textContent = S.locked ? 'Doors' : 'Route';
  lastKey = viewKey();
}
function ring(n, of){
  const R = 19, C = 2 * Math.PI * R, frac = Math.min(1, n / of);
  return `<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle cx="23" cy="23" r="${R}" fill="none" stroke="#E0B54A" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg><span>${n}/${of}</span>`;
}
function renderTop(){
  const {days, isDay} = dayInfo();
  let st = '';
  if(S.locked){
    const n = nextDrop(), open = revealed().length;
    $('ring').innerHTML = ring(open, 12); $('ring').setAttribute('aria-label', open + ' of 12 doors open');
    st = n ? (n.slot === 12 && isDay ? `Door 12 opens <b>${untilText(n.at)}</b>. The full route goes live with it.` : `Door ${n.slot} opens <b>${untilText(n.at)}</b>`) : 'All 12 doors are open.';
  }else{
    const P = plan(), done = new Set(myCheckins().map(c => c.slot)).size + Object.keys(pending).length;
    $('ring').innerHTML = ring(done, 12); $('ring').setAttribute('aria-label', 'You have checked in at ' + done + ' of 12');
    if(days > 0) st = `Admin preview. <b>${plural(days, 'day', 'days')}</b> to go.`;
    else if(isDay){
      const m = nowMin(), cur = P.find(s => m >= s.start && m < s.end);
      if(cur) st = `Now: <b>${esc(cur.pub.name)}</b> until ${hm(cur.end)}`;
      else if(P[0] && m < P[0].start) st = `Starts <b>${hm(P[0].start)}</b> at ${esc(P[0].pub.name)}`;
      else st = `That's the 12. <b>${esc(S.after ? S.after.name : 'Home')}</b> next.`;
    }else st = 'Done for another year. See you in 2027.';
  }
  $('topStatus').innerHTML = st;
}

/* Pictures: a free photo where we have one, otherwise Street View of the front.
   The Street View on the page is a still frame that can't trap your thumb; tap it to look around full screen. */
const photoBad = new Set();
function mediaHTML(p){
  const sv = svSrc(p), ph = p.photo_url && !photoBad.has(p.id);
  if(!ph && !sv) return '';
  let h = '<div class="media">';
  if(ph) h += `<img class="photo" src="${esc(p.photo_url)}" alt="${esc(p.name)}" loading="lazy" onerror="app.photoFail('${esc(p.id)}')">`;
  else h += `<iframe src="${sv}" title="Street view of ${esc(p.name)}" tabindex="-1" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  if(sv) h += `<button class="media-tap" type="button" data-look="${esc(p.id)}" aria-label="Look around ${esc(p.name)} in Street View"><span>👀 Look around</span></button>`;
  if(ph && p.photo_credit) h += `<a class="credit" href="${esc(p.photo_page || p.photo_url)}" target="_blank" rel="noopener">${esc(p.photo_credit)}</a>`;
  return h + '</div>';
}
function pubBody(p, kicker){
  const chips = [];
  if(p.food) chips.push('<span class="chip food">🍲 Food stop</span>');
  return `${mediaHTML(p)}<div class="feature-body">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h2>${esc(p.name)}</h2>
    <p class="addr">${esc(p.area)}${p.opens ? `. Open ${esc(p.opens)} to ${esc(p.closes)}` : ''}.</p>${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    ${p.history ? `<p class="story">${esc(p.history)}</p>` : ''}
    <div class="actions"><a class="btn ghost" href="${dirLink(p)}" target="_blank" rel="noopener">Directions</a></div></div>`;
}

/* doors tab: the advent calendar before the night, the route on it */
function renderDoors(){
  if(!S.locked){ renderRoute(); return; }
  const R = revealed(), D = drops(), latest = R[R.length - 1], n = nextDrop();
  let h = `<div class="wall">${wallHTML({names: true, animate: true, id: 'a'})}<p class="wall-foot">${n ? `Door ${n.slot} opens ${n.slot === 12 ? 'on the day' : esc(longDay(n.at))} at 12:00.` : 'Every door is open.'} Tap an open door for the pub.</p></div>`;
  if(latest){
    const when = D[latest.slot - 1], fresh = when && when.slice(0, 10) === todayKey();
    h += `<article class="feature" style="--fc:${doorColour(latest.slot)}">${pubBody(latest.pub, `Door ${latest.slot}, ${fresh ? 'opened today' : 'opened ' + esc(longDay(when))}`)}</article>`;
  }else{
    h += `<div class="panel"><h2>Nothing open yet</h2><p>Door 1 opens ${n ? esc(longDay(n.at)) : 'soon'} at 12:00. Same time every day after that until the night.</p></div>`;
  }
  const people = (S.people || []).length;
  h += `<p class="axe-line">${plural(people, 'person', 'people')} signed up. Can't make it? You know what happens. 🪓</p>`;
  $('v-doors').innerHTML = h;
  // Remember which doors this phone has seen swing open, so the animation plays once.
  R.forEach(r => seen.add(r.slot)); store.set('seen', [...seen]);
}
function renderRoute(){
  const P = plan(), {days, isDay} = dayInfo(), m = nowMin();
  const cur = isDay ? P.findIndex(s => m >= s.start && m < s.end) : (days < 0 ? 99 : -1);
  let h = '';
  const swapped = P.filter(s => s.swapped_from);
  if(swapped.length) h += `<div class="banner swap">🔁 <div>${swapped.map(s => `<b>${esc(s.swapped_from)}</b> is out. <b>${esc(s.pub.name)}</b> is in at ${hm(s.start)}.`).join('<br>')}</div></div>`;
  if(S.preview) h += `<div class="banner">🔑 <div><b>Admin preview.</b> Everyone else still sees the doors. Clear your practice check-ins in Admin before the night.</div></div>`;
  h += '<div class="route">';
  P.forEach((s, i) => { h += stopHTML(s, i, cur); });
  const last = P[P.length - 1];
  if(last) h += `<p class="leg">🕚 ${hm(last.end)}: that's the 12.</p>`;
  h += '</div>';
  const extras = [];
  if(S.after) extras.push(`<button type="button" class="xrow" data-pub-id="${esc(S.after.id)}"><span class="xi">🎸</span><span><b>${esc(S.after.name)}</b><span>After party, ${esc(S.after.area)}</span></span></button>`);
  (S.subs || []).forEach(p => extras.push(`<button type="button" class="xrow" data-pub-id="${esc(p.id)}"><span class="xi">🔁</span><span><b>${esc(p.name)}</b><span>Sub, ${esc(p.area)}</span></span></button>`));
  if(extras.length) h += `<h2 class="section-h">After party and subs</h2><div class="xlist">${extras.join('')}</div>`;
  $('v-doors').innerHTML = h;
}
const opensMs = s => s.opens_at ? atMs(s.opens_at + ':00') : 0;
function checkinBtn(s, late){
  if(isPractice()) return `<button class="btn brass" type="button" data-checkin="${s.slot}">📸 Practice check-in</button>`;
  if(now() < opensMs(s)) return `<button class="btn brass" type="button" disabled>Check-in opens ${esc(s.opens_at.slice(11))}</button>`;
  return `<button class="btn ${late ? 'ghost' : 'brass'}" type="button" data-checkin="${s.slot}">📸 ${late ? 'Check in late' : 'Check in'}</button>`;
}
function stopHTML(s, i, cur){
  const p = s.pub, mine = myAt(s.slot), queued = pending[s.slot], done = !!mine || queued;
  const isNow = i === cur, past = cur > i;
  let body = '';
  if(isNow){
    const chips = ['<span class="chip now">Now</span>'];
    if(p.food) chips.push('<span class="chip food">🍲 Food</span>');
    if(s.swapped_from) chips.push(`<span class="chip sub">Sub for ${esc(s.swapped_from)}</span>`);
    body = `<div class="chips">${chips.join('')}</div>${mediaHTML(p)}`;
  }
  let status = '';
  if(mine) status = `<p class="did">✓ Checked in ${new Date(mine.at).toTimeString().slice(0, 5)} <button type="button" data-undo="${s.slot}">Undo</button></p>`;
  else if(queued) status = '<p class="did">Saved on your phone. Sends when you get signal.</p>';
  const showBtn = !done && (isNow || isPractice() || (past && cur !== 99));
  const actions = isNow ? `<div class="actions">${done ? '' : checkinBtn(s)}<a class="btn ghost" href="${dirLink(p)}" target="_blank" rel="noopener">Directions</a></div>`
    : showBtn && isPractice() ? `<div class="actions">${checkinBtn(s)}</div>`
    : showBtn ? `<button class="late" type="button" data-checkin="${s.slot}">📸 Missed it? Check in late</button>` : '';
  return `<article class="stop${isNow ? ' now' : ''}${done ? ' done' : ''}${past ? ' past' : ''}" id="slot-${s.slot}">
    <span class="mini-door" style="--dc:${doorColour(s.slot)}"><i></i><b>${s.slot}</b></span>
    <div class="stop-main"><button type="button" class="stop-head" data-pub-slot="${s.slot}"><span class="time">${hm(s.start)}</span><span class="name">${esc(p.name)}</span>${i ? `<span class="walk">${s.walk} min walk</span>` : ''}</button>
      ${body}${status}${actions}</div></article>`;
}

/* sheets: lock the page behind them so iPhone scrolling stays inside the sheet */
let locks = 0, lockY = 0;
function lockPage(){
  if(locks++ > 0) return;
  lockY = window.scrollY;
  Object.assign(document.body.style, {position: 'fixed', top: -lockY + 'px', left: '0', right: '0'});
}
function unlockPage(){
  if(locks === 0 || --locks > 0) return;
  Object.assign(document.body.style, {position: '', top: '', left: '', right: ''});
  window.scrollTo(0, lockY);
}
let sheetPub = null;
function openPub(p, kicker){
  if(!sheetPub) lockPage();
  sheetPub = {p, kicker};
  $('psBody').innerHTML = pubBody(p, kicker);
  $('pubSheet').hidden = false;
  $('pubSheet').querySelector('.sheet').scrollTop = 0;
}
function closePub(){ if(!sheetPub) return; $('pubSheet').hidden = true; $('psBody').innerHTML = ''; sheetPub = null; unlockPage(); }
$('psClose').onclick = closePub;
$('pubSheet').addEventListener('click', e => { if(e.target === $('pubSheet')) closePub(); });
let looking = false;
function openLook(p){
  const src = svSrc(p); if(!src) return;
  $('svName').textContent = p.name;
  $('svFrame').src = src;
  $('svView').hidden = false;
  if(!looking){ looking = true; lockPage(); }
}
function closeLook(){ if(!looking) return; looking = false; $('svView').hidden = true; $('svFrame').src = 'about:blank'; unlockPage(); }
$('svDone').onclick = closeLook;

/* map */
let map = null, mapLayer = null, meMarker = null, watchId = null;
function sizeMap(){
  // The map gets exactly the space between whatever sits above it and the tab bar.
  const el = $('map'); if(el.offsetParent === null) return;
  const tabs = document.querySelector('.tabs');
  const h = window.innerHeight - el.getBoundingClientRect().top - (tabs ? tabs.offsetHeight : 64);
  el.style.height = Math.max(280, h) + 'px';
  if(map) map.invalidateSize();
}
function renderMap(){
  const R = revealed();
  $('mapNote').textContent = S.locked ? `The map fills in as the doors open. ${R.length} of 12 so far.` : '';
  $('mapNote').hidden = !S.locked;
  if(!window.L){ $('map').innerHTML = '<p class="empty" style="margin:16px">The map needs signal to load.</p>'; return; }
  if(!map){
    map = L.map('map', {zoomControl: false});
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {attribution: '&copy; Esri &copy; OpenStreetMap', maxNativeZoom: 16, maxZoom: 18}).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom: 16, maxZoom: 18, pane: 'shadowPane'}).addTo(map);
    mapLayer = L.layerGroup().addTo(map);
    window.addEventListener('resize', sizeMap);
  }
  sizeMap();
  mapLayer.clearLayers();
  const P = S.locked ? R.map(r => ({slot: r.slot, pub: r.pub})) : plan();
  const m = nowMin(), cur = !S.locked && dayInfo().isDay ? P.findIndex(s => m >= s.start && m < s.end) : -1;
  if(P.length > 1) L.polyline(P.map(s => [s.pub.lat, s.pub.lng]), {color: '#E0B54A', weight: 4, opacity: .9, dashArray: '1 8', lineCap: 'round'}).addTo(mapLayer);
  if(!S.locked){
    (S.subs || []).forEach(p => L.marker([p.lat, p.lng], {icon: L.divIcon({className: '', iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="pin sub"></div>'})}).bindPopup('<b>' + esc(p.name) + '</b><br>Sub').addTo(mapLayer));
    if(S.after) L.marker([S.after.lat, S.after.lng], {icon: L.divIcon({className: '', iconSize: [28, 34], iconAnchor: [14, 17], html: '<div class="pin after">🎸</div>'})}).bindPopup('<b>' + esc(S.after.name) + '</b><br>After party').addTo(mapLayer);
  }
  P.forEach((s, i) => {
    const cls = i === cur ? 'now' : (myAt(s.slot) ? 'done' : '');
    L.marker([s.pub.lat, s.pub.lng], {zIndexOffset: i === cur ? 1000 : i, icon: L.divIcon({className: '', iconSize: [28, 34], iconAnchor: [14, 17], html: `<div class="pin ${cls}" style="--dc:${doorColour(s.slot)}">${s.slot}</div>`})})
      .bindPopup(`<b>${esc(s.pub.name)}</b><br>${s.start ? hm(s.start) + ' to ' + hm(s.end) : 'Pub ' + s.slot}`).addTo(mapLayer);
  });
  setTimeout(() => {
    map.invalidateSize();
    const key = P.length + (S.locked ? 'l' : 'o');
    if(renderMap.fitted !== key){ if(P.length) map.fitBounds(P.map(s => [s.pub.lat, s.pub.lng]), {padding: [40, 40], maxZoom: 16}); else map.setView([53.3575, -6.2560], 14); renderMap.fitted = key; }
  }, 60);
}
$('locate').addEventListener('click', () => {
  if(!navigator.geolocation){ toast('Your phone won\'t share its location.'); return; }
  if(watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if(!meMarker) meMarker = L.marker(ll, {icon: L.divIcon({className: '', iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="me-dot"></div>'})}).addTo(map);
    else meMarker.setLatLng(ll);
    if(!$('locate').dataset.done){ map.setView(ll, 16); $('locate').dataset.done = 1; $('locate').textContent = 'Following you'; }
  }, () => toast('Couldn\'t get your location. Check location is allowed for this site.'), {enableHighAccuracy: true, maximumAge: 15000});
});

/* you */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if(tab === 'me') renderMe(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function renderMe(){
  const me = S.me || {};
  let h = `<div class="panel"><h2>${esc(me.name || 'No name yet')}</h2>${me.email && me.email.includes('@') ? `<p style="color:var(--dim)">${esc(me.email)}</p>` : ''}
    <div class="field"><label for="meName">Your name</label><input id="meName" value="${esc(me.name || '')}" maxlength="40"></div>
    <div class="row"><button class="btn small" id="meSave" type="button">Save name</button><button class="btn small ghost" id="meOut" type="button">Sign out</button></div></div>`;
  if(!standalone()){
    h += `<div class="panel"><h2>Put it on your home screen</h2>${installEvt ? '<p>One tap and it opens full screen, like an app.</p><button class="btn brass" id="install" type="button">Install the app</button>'
      : isIOS ? '<p>In Safari, tap Share <b>⬆︎</b>, then <b>Add to Home Screen</b>. It opens full screen, like an app.</p>'
      : '<p>Open your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>'}</div>`;
  }
  h += `<div class="panel"><h2>Running the night?</h2><p>The admin PIN unlocks the guest list, pub photos and swaps.</p>
    <div class="field"><label for="pinIn">Admin PIN</label><input id="pinIn" type="password" autocomplete="off" autocapitalize="off"></div>
    <button class="btn small" id="pinGo" type="button">${pin ? 'Unlocked ✓' : 'Unlock'}</button> <span class="fine" id="pinMsg"></span></div>`;
  $('v-me').innerHTML = h;
  $('meSave').onclick = async () => { try{ const nm = $('meName').value.trim(); if(!nm) return; await rpc('join_crawl_v2', {p_key: email, p_name: nm}); store.set('name', nm); toast('Name saved.'); refresh(); }catch(e){ toast('Couldn\'t save. Try again with signal.'); } };
  $('meOut').onclick = () => { store.del('email'); store.del('state'); store.del('pin'); email = null; S = null; pin = null; admin = null; showGate(); };
  if($('install')) $('install').onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderMe(); };
  $('pinGo').onclick = async () => {
    const v = $('pinIn').value.trim(); if(!v) return;
    try{ admin = await rpc('admin_state', {p_pin: v}); pin = v; store.set('pin', v); await refresh(true); toast('Admin unlocked.'); go('admin'); }
    catch(e){ $('pinMsg').textContent = e.server ? 'Wrong PIN. Too many wrong tries locks it for an hour.' : 'No signal.'; }
  };
}

/* admin */
let archMap = null, archYear = null, confirmClear = false, confirmRemove = null, editGuest = null, confirmDelete = null, confirmWipe = false;
function renderAdmin(){
  if(!pin){ go('me'); return; }
  if(!admin){ $('v-admin').innerHTML = '<div class="empty" style="margin-top:16px">Loading…</div>'; refresh(); return; }
  const P = plan(), used = new Set(P.map(s => s.pub.name)), subsAll = admin.subs_all || [];
  const live = admin.guests.filter(g => !g.blocked).length;
  let h = `<div class="panel"><h2>Guest list (${live})</h2><p>People add themselves with just a name — the phone remembers them. Axe someone and that phone can't get back in until you bring them back.</p>
    <button class="btn small" id="aInvite" type="button">Copy the link message</button>
    <div class="glist">${admin.guests.map(g => {
      if(editGuest === g.email) return `<div class="gitem"><input class="gedit" id="geditIn" value="${esc(g.name || '')}" maxlength="40" aria-label="New name"><span class="row"><button class="btn small brass" data-gsave="${esc(g.email)}" type="button">Save</button><button class="btn small ghost" data-gcancel type="button">Cancel</button></span></div>`;
      return `<div class="gitem${g.blocked ? ' axed' : ''}"><span>${esc(g.name || 'No name')} <small>${g.email.includes('@') ? esc(g.email) + ', ' : ''}${g.checkins} in</small></span><span class="row">${g.blocked
        ? `<button class="btn small ghost" data-unaxe="${esc(g.email)}" type="button">Bring back</button>${confirmDelete === g.email ? `<button class="btn small danger" data-del="${esc(g.email)}" type="button">Gone for good?</button>` : `<button class="btn small ghost" data-delask="${esc(g.email)}" type="button">Strike off</button>`}`
        : `<button class="btn small ghost" data-gedit="${esc(g.email)}" type="button" aria-label="Rename ${esc(g.name || g.email)}">✏️</button>${confirmRemove === g.email ? `<button class="btn small danger" data-rm="${esc(g.email)}" type="button">Axe ${esc(g.name || 'them')}?</button>` : `<button class="btn small ghost" data-rmask="${esc(g.email)}" type="button" aria-label="Axe ${esc(g.name || g.email)}">🪓</button>`}`}</span></div>`;
    }).join('')}</div>
    ${admin.guests.length ? (confirmWipe ? `<div class="confirm"><p>This clears the whole list and every check-in — you included. Everyone just puts their name in again.</p><div class="row"><button class="btn small danger" id="wipeYes" type="button">Clear the list</button><button class="btn small ghost" id="wipeNo" type="button">Keep it</button></div></div>` : `<button class="btn small danger" id="wipeAsk" type="button" style="margin-top:10px">Clear the whole list</button>`) : ''}</div>`;
  h += `<div class="panel"><h2>Pub photos</h2><p>Use your own photos from past crawls. Every pub shows Street View either way.</p><div class="photos">${(admin.pubs || []).map(p => `<div class="prow"><span class="th" style="${p.photo_url ? `background-image:url('${esc(p.photo_url)}')` : ''}">${p.photo_url ? '' : 'None'}</span><span><b>${esc(p.name)}</b><small>${p.photo_url ? esc(p.photo_credit || 'Your photo') : 'Street View only'}</small></span><span class="row">${p.photo_url ? `<button class="btn small ghost" data-unphoto="${esc(p.id)}" type="button">Remove</button>` : ''}<label class="btn small">Upload<input type="file" accept="image/*" data-photo="${esc(p.id)}"></label></span></div>`).join('')}</div></div>`;
  if(P.length) h += `<div class="panel"><h2>Swap a pub</h2><p>Everyone's app picks up the change within 20 seconds.</p>${P.map(s => {
      const orig = s.swapped_from || s.pub.name;
      const opts = [`<option value="">${esc(orig)}${s.swapped_from ? ' (put back)' : ''}</option>`].concat(subsAll.map(sb => {
        const isHere = s.pub.id === sb.id, inUse = used.has(sb.name) && !isHere, early = toMin(sb.opens) > s.start;
        return `<option value="${esc(sb.id)}" ${isHere ? 'selected' : ''} ${inUse || early ? 'disabled' : ''}>${esc(sb.name)}${inUse ? ' (in use)' : early ? ' (opens ' + esc(sb.opens) + ')' : ''}</option>`;
      }));
      return `<div class="swaprow"><span class="n">${s.slot}</span><select data-swap="${s.slot}" aria-label="Pub ${s.slot}">${opts.join('')}</select></div>`;
    }).join('')}</div>`;
  const nc = admin.checkins_total ?? (S.checkins || []).length;
  h += `<div class="panel"><h2>Check-ins</h2><p>${plural(nc, 'check-in', 'check-ins')} so far. Clear the practice ones before the night.</p>${confirmClear ? '<div class="confirm"><p>This deletes every check-in for everyone. There is no undo.</p><div class="row"><button class="btn small danger" id="clearYes" type="button">Clear them all</button><button class="btn small ghost" id="clearNo" type="button">Keep them</button></div></div>' : '<button class="btn small danger" id="clearAsk" type="button">Clear all check-ins</button>'}</div>`;
  if(admin.archive.length) h += `<div class="panel"><h2>The MasterList</h2><p>Only you see this.</p><div class="years">${admin.archive.map(y => `<button type="button" data-year="${y.year}" aria-pressed="${archYear === y.year}">${y.year}</button>`).join('')}</div><div id="archMap"></div><div class="arch-list" id="archList"></div></div>`;
  h += `<div style="padding:0 16px"><button class="btn small ghost" id="lock" type="button">Lock admin on this phone</button></div>`;
  $('v-admin').innerHTML = h;

  $('aInvite').onclick = () => copy(`12 Pubs Of Winter. Wednesday 2 December, 15:30.\nA new pub drops every day at 12:00 until the night: ${SITE}\nPut in your name to see it. Can't make it? 🪓`);
  document.querySelectorAll('[data-gedit]').forEach(b => b.onclick = () => { editGuest = b.dataset.gedit; renderAdmin(); const i = $('geditIn'); if(i){ i.focus(); i.select(); } });
  document.querySelectorAll('[data-gcancel]').forEach(b => b.onclick = () => { editGuest = null; renderAdmin(); });
  document.querySelectorAll('[data-gsave]').forEach(b => b.onclick = async () => { try{ await rpc('admin_guest_rename', {p_pin: pin, p_email: b.dataset.gsave, p_name: $('geditIn').value.trim()}); editGuest = null; toast('Name changed.'); await refresh(); }catch(e){ toast('Couldn\'t rename. Try again with signal.'); } });
  document.querySelectorAll('[data-delask]').forEach(b => b.onclick = () => { confirmDelete = b.dataset.delask; renderAdmin(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { try{ await rpc('admin_guest_delete', {p_pin: pin, p_email: b.dataset.del}); confirmDelete = null; toast('Struck off the list.'); await refresh(); }catch(e){ toast('Couldn\'t do it. Try again with signal.'); } });
  if($('wipeAsk')) $('wipeAsk').onclick = () => { confirmWipe = true; renderAdmin(); };
  if($('wipeNo')) $('wipeNo').onclick = () => { confirmWipe = false; renderAdmin(); };
  if($('wipeYes')) $('wipeYes').onclick = async () => {
    try{
      await rpc('admin_clear_guests', {p_pin: pin});
      confirmWipe = false; admin = null;
      // You're off the list too now: back to the door, PIN stays on this phone.
      store.del('state'); S = null; email = null; store.del('email'); showGate();
      $('gateMsg').textContent = 'List cleared. Put your name in to get back on it.';
    }catch(e){ toast('Couldn\'t clear it.'); }
  };
  document.querySelectorAll('[data-rmask]').forEach(b => b.onclick = () => { confirmRemove = b.dataset.rmask; renderAdmin(); });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { try{ await rpc('admin_guest', {p_pin: pin, p_email: b.dataset.rm, p_name: null, p_remove: true}); confirmRemove = null; toast('Axed. 🪓'); await refresh(); }catch(e){ toast('Couldn\'t axe them. Try again with signal.'); } });
  document.querySelectorAll('[data-unaxe]').forEach(b => b.onclick = async () => { try{ await rpc('admin_guest', {p_pin: pin, p_email: b.dataset.unaxe, p_name: null, p_remove: false}); toast('Brought back.'); await refresh(); }catch(e){ toast('Couldn\'t bring them back.'); } });
  document.querySelectorAll('[data-photo]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; if(!f) return;
    toast('Uploading…');
    try{ const blob = await compress(f, 1600); const path = 'pubs/' + inp.dataset.photo + '-' + uuid() + '.jpg'; await upload(path, blob); await rpc('admin_pub_photo', {p_pin: pin, p_pub_id: inp.dataset.photo, p_path: path}); toast('Photo added.'); await refresh(); }
    catch(e){ toast('Upload failed. Try again with signal.'); }
  });
  document.querySelectorAll('[data-unphoto]').forEach(b => b.onclick = async () => { try{ await rpc('admin_pub_photo', {p_pin: pin, p_pub_id: b.dataset.unphoto, p_path: null}); toast('Photo removed.'); await refresh(); }catch(e){ toast('Couldn\'t remove it.'); } });
  document.querySelectorAll('[data-swap]').forEach(sel => sel.onchange = async () => {
    try{ await rpc('admin_swap', {p_pin: pin, p_slot: +sel.dataset.swap, p_pub_id: sel.value || null}); toast(sel.value ? 'Swapped. Everyone\'s app updates shortly.' : 'Put back.'); await refresh(); }
    catch(e){ toast(e.server ? 'Couldn\'t swap: ' + e.message : 'No signal.'); render(); }
  });
  if($('clearAsk')) $('clearAsk').onclick = () => { confirmClear = true; renderAdmin(); };
  if($('clearNo')) $('clearNo').onclick = () => { confirmClear = false; renderAdmin(); };
  if($('clearYes')) $('clearYes').onclick = async () => { try{ await rpc('admin_clear_checkins', {p_pin: pin}); confirmClear = false; toast('All check-ins cleared.'); await refresh(); }catch(e){ toast('Couldn\'t clear them.'); } };
  document.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { archYear = archYear === +b.dataset.year ? null : +b.dataset.year; renderAdmin(); });
  $('lock').onclick = async () => { pin = null; admin = null; store.del('pin'); await refresh(true); go('doors'); };
  if(admin.archive.length) drawArchive();
}
const YEAR_HUE = {2011:198,2012:14,2013:262,2014:40,2015:330,2017:150,2018:24,2019:210,2021:100,2022:284,2023:52,2024:172,2025:0};
function drawArchive(){
  if(!window.L || !$('archMap')) return;
  archMap = L.map('archMap', {zoomControl: false, attributionControl: false});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom: 16, maxZoom: 18}).addTo(archMap);
  const years = admin.archive.filter(y => archYear === null || y.year === archYear), pts = [];
  years.forEach(y => {
    const col = `hsl(${YEAR_HUE[y.year] ?? (y.year * 37) % 360} 62% 58%)`;
    L.polyline(y.pubs.map(p => [p.lat, p.lng]), {color: col, weight: 2, opacity: .6}).addTo(archMap);
    y.pubs.forEach((p, i) => { pts.push([p.lat, p.lng]); L.marker([p.lat, p.lng], {icon: L.divIcon({className: '', iconSize: [12, 12], iconAnchor: [6, 6], html: `<div class="pin yr" style="background:${col}"></div>`})}).bindPopup(`<b>${esc(p.name)}</b><br>${y.year}, stop ${i + 1}`).addTo(archMap); });
  });
  if(pts.length) archMap.fitBounds(pts, {padding: [16, 16]});
  const total = admin.archive.reduce((a, y) => a + y.pubs.length, 0);
  $('archList').innerHTML = archYear === null ? `${admin.archive.length} crawls, ${total} pubs. Tap a year to see its route.`
    : (y => `<b>${y.year}, ${esc(y.district)}</b><ol>${y.pubs.map(p => '<li>' + esc(p.name) + '</li>').join('')}</ol>`)(admin.archive.find(y => y.year === archYear));
}
async function copy(text){
  try{ await navigator.clipboard.writeText(text); toast('Copied. Paste it into the group.'); }
  catch(e){ window.prompt('Copy this:', text); }
}

/* ---------------- check-in ---------------- */
let sheetSlot = null, sheetBlob = null, sheetPos = null;
function openSheet(slot){
  const s = plan().find(x => x.slot === slot); if(!s) return;
  if($('sheet').hidden) lockPage();
  sheetSlot = slot; sheetBlob = null; sheetPos = null;
  $('sheetSlot').textContent = `Pub ${slot} of 12, ${hm(s.start)}`;
  $('sheetTitle').textContent = s.pub.name;
  $('photoPrev').hidden = true; $('photoHint').hidden = false; $('photo').value = '';
  $('sheetGo').disabled = true; $('sheetMsg').textContent = '';
  $('sheet').hidden = false;
  const loc = $('loc');
  if(!navigator.geolocation){ loc.innerHTML = '📍 Your phone won\'t share location. The photo will do.'; return; }
  loc.innerHTML = '📍 Checking where you are…';
  navigator.geolocation.getCurrentPosition(pos => {
    if(sheetSlot !== slot) return;
    sheetPos = pos.coords;
    const d = Math.round(km({lat: pos.coords.latitude, lng: pos.coords.longitude}, s.pub) * 1000);
    const ok = d <= 120 + Math.min(pos.coords.accuracy || 0, 80);
    loc.innerHTML = ok ? `<span class="ok">📍 You're at the pub (${d}m)</span>` : `<span class="meh">📍 You look ${d > 999 ? (d / 1000).toFixed(1) + 'km' : d + 'm'} away. You can still check in.</span>`;
  }, () => { if(sheetSlot === slot) loc.innerHTML = '<span class="meh">📍 Couldn\'t get your location. The photo still counts.</span>'; },
  {enableHighAccuracy: true, timeout: 15000, maximumAge: 30000});
}
function closeSheet(){ if($('sheet').hidden) return; $('sheet').hidden = true; sheetSlot = null; unlockPage(); }
$('sheetCancel').onclick = closeSheet;
$('sheet').addEventListener('click', e => { if(e.target === $('sheet')) closeSheet(); });
$('photo').addEventListener('change', async () => {
  const f = $('photo').files[0]; if(!f) return;
  $('sheetMsg').textContent = 'Shrinking the photo…';
  try{
    sheetBlob = await compress(f);
    $('photoPrev').src = URL.createObjectURL(sheetBlob); $('photoPrev').hidden = false; $('photoHint').hidden = true;
    $('sheetGo').disabled = false; $('sheetMsg').textContent = '';
  }catch(e){ $('sheetMsg').textContent = 'That photo didn\'t work. Try another.'; }
});
async function compress(file, max = 1280){
  let img;
  try{ img = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
  catch(e){ img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, 'image/jpeg', .76));
}
$('sheetGo').addEventListener('click', async () => {
  if(!sheetBlob || sheetSlot === null) return;
  const job = {slot: sheetSlot, blob: sheetBlob, lat: sheetPos ? sheetPos.latitude : null, lng: sheetPos ? sheetPos.longitude : null, acc: sheetPos ? sheetPos.accuracy : null};
  $('sheetGo').disabled = true; $('sheetMsg').textContent = 'Sending…';
  try{
    await sendCheckin(job);
    closeSheet(); toast(isPractice() ? 'Practice check-in saved.' : 'Checked in. 🍺'); await refresh();
  }catch(e){
    if(e.server){ const m = /too_early:(\S+)/.exec(e.message); $('sheetMsg').textContent = m ? 'Not yet. Check-in for this pub opens at ' + m[1] + '.' : 'That didn\'t go through: ' + e.message; $('sheetGo').disabled = false; return; }
    await queuePut(job); pending[job.slot] = true; closeSheet(); toast('No signal. Saved on your phone. It sends when you\'re back online.'); render();
  }
});
async function sendCheckin(job){
  const path = '2026/' + uuid() + '.jpg';
  await upload(path, job.blob);
  return rpc('check_in_v2', {p_email: email, p_slot: job.slot, p_photo: path, p_lat: job.lat, p_lng: job.lng, p_acc: job.acc, p_pin: isPractice() ? pin : null});
}

/* offline queue: IndexedDB holds the photo until there's signal */
function idb(){ return new Promise((res, rej) => { const r = indexedDB.open('12pubs', 1); r.onupgradeneeded = () => r.result.createObjectStore('queue', {keyPath: 'slot'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function queuePut(job){ try{ const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('queue', 'readwrite'); t.objectStore('queue').put(job); t.oncomplete = res; t.onerror = () => rej(t.error); }); }catch(e){} }
async function queueAll(){ try{ const db = await idb(); return await new Promise((res, rej) => { const r = db.transaction('queue').objectStore('queue').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }catch(e){ return []; } }
async function queueDel(slot){ try{ const db = await idb(); await new Promise(res => { const t = db.transaction('queue', 'readwrite'); t.objectStore('queue').delete(slot); t.oncomplete = res; }); }catch(e){} }
let flushing = false;
async function flushQueue(){
  if(flushing || !email || PREVIEW) return; flushing = true;
  try{
    const jobs = await queueAll();
    jobs.forEach(j => { pending[j.slot] = true; });
    for(const j of jobs){
      try{ await sendCheckin(j); await queueDel(j.slot); delete pending[j.slot]; toast('Sent your saved check-in. 🍺'); }
      catch(e){ if(e.server){ await queueDel(j.slot); delete pending[j.slot]; } break; }
    }
    if(jobs.length){ S = await rpc('crawl_state_v3', {p_email: email, p_pin: pin || null}).catch(() => S); store.set('state', S); render(); }
  }finally{ flushing = false; }
}
window.addEventListener('online', () => { flushQueue(); refresh(); });

/* ---------------- events ---------------- */
function go(t){
  tab = t;
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== t; });
  window.scrollTo(0, 0);
  render();
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
$('ring').addEventListener('click', () => go('doors'));
const allPubs = () => [...revealed().map(r => r.pub), ...(S && S.subs || []), S && S.after].filter(Boolean);
function findPub(slot){ const r = revealed().find(x => x.slot === slot); return r && r.pub; }
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-checkin]'); if(c){ openSheet(+c.dataset.checkin); return; }
  const ps = e.target.closest('[data-pub-slot]'); if(ps){ const slot = +ps.dataset.pubSlot, p = findPub(slot), d = drops()[slot - 1]; if(p) openPub(p, S.locked ? `Door ${slot}, opened ${esc(longDay(d))}` : `Pub ${slot} of 12`); return; }
  const pi = e.target.closest('[data-pub-id]'); if(pi){ const p = allPubs().find(x => x.id === pi.dataset.pubId); if(p) openPub(p, S.after && p.id === S.after.id ? 'After party' : 'On the subs bench'); return; }
  const lk = e.target.closest('[data-look]'); if(lk){ const p = allPubs().find(x => x.id === lk.dataset.look); if(p) openLook(p); return; }
  const u = e.target.closest('[data-undo]'); if(u){ try{ await rpc('undo_check_in', {p_email: email, p_slot: +u.dataset.undo}); toast('Check-in removed.'); refresh(); }catch(err){ toast('Couldn\'t undo. Try again with signal.'); } }
});
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ if(looking) closeLook(); else if(!$('pubSheet').hidden) closePub(); else if(!$('sheet').hidden) closeSheet(); } });
setInterval(() => { if(email && document.visibilityState === 'visible' && navigator.onLine) refresh(); else if(S) renderTop(); }, 20000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && email) refresh(); });
window.app = {refresh, render, go, get S(){ return S; },
  photoFail(id){ if(photoBad.has(id)) return; photoBad.add(id); if(sheetPub && sheetPub.p.id === id) $('psBody').innerHTML = pubBody(sheetPub.p, sheetPub.kicker); else render(); }};

/* ---------------- boot ---------------- */
if('serviceWorker' in navigator && !PREVIEW) navigator.serviceWorker.register('sw.js').catch(() => {});
if(email && S){ showApp(); refresh(); }
else if(email){ refresh(true).then(() => S ? showApp() : showGate()); }
else showGate();
