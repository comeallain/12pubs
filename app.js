/* 12 Pubs Of Winter. Everything private lives in the database and is only
   handed to emails on the guest list. This file holds no route data. */
'use strict';
const SB = 'https://afijpjkgkknhsmtriqzq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaWpwamtna2tuaHNtdHJpcXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDMyMDYsImV4cCI6MjExMDc3OTIwNn0.uWTbmFrr2A8TtvfgxKCp0H2ssHXHttnpirDv_iia2oY';
const SITE = location.origin + location.pathname.replace(/index\.html$/, '');

/* ---------------- small helpers ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d){ try{ const v = localStorage.getItem('12p:'+k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('12p:'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('12p:'+k); }catch(e){} }
};
const pad = n => String(n).padStart(2, '0');
const hm = m => pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m % 60));
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const closeMin = t => { const m = toMin(t); return m < 6 * 60 ? m + 24 * 60 : m; };
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
function km(a, b){
  const r = Math.PI / 180, x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}
const walkMins = (a, b) => Math.max(1, Math.round(km(a, b) * 1.2 / 4.5 * 60));
const mapsLink = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', ' + p.area + ', Dublin') + (p.maps_id ? '&query_place_id=' + p.maps_id : '');
const photoUrl = path => SB + '/storage/v1/object/public/checkins/' + path;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200); }

async function rpc(name, args){
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
  const r = await fetch(SB + '/storage/v1/object/checkins/' + path, {
    method: 'POST',
    headers: {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': '31536000'},
    body: await blob.arrayBuffer()
  });
  if(!r.ok){ const e = new Error('Photo upload failed (' + r.status + ')'); e.server = true; throw e; }
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

/* ---------------- shopfront illustrations ---------------- */
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
function hash(s){ let h = 0; for(const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function shopfront(p, id){
  const paint = p.paint || '#1F4D3A', dark = shade(paint, -.45), light = shade(paint, .12), h = hash(p.name);
  const name = (p.name || '').toUpperCase();
  const fs = Math.min(30, 300 / (0.62 * Math.max(name.length, 6)));
  const doorX = h % 3 === 0 ? 300 : 182, door2 = doorX === 182;
  const winA = door2 ? [52, 168] : [52, 236], winB = door2 ? [232, 348] : [244, 288];
  const panes = 2 + (h % 2);
  const g = 'g' + id;
  const win = ([x1, x2]) => {
    let bars = ''; for(let i = 1; i < panes; i++){ const x = x1 + (x2 - x1) * i / panes; bars += `<line x1="${x}" y1="92" x2="${x}" y2="168" stroke="${dark}" stroke-width="3"/>`; }
    return `<rect x="${x1}" y="90" width="${x2 - x1}" height="80" fill="url(#${g}w)" stroke="${dark}" stroke-width="4"/>${bars}<line x1="${x1}" y1="116" x2="${x2}" y2="116" stroke="${dark}" stroke-width="3"/><rect x="${x1 - 4}" y="170" width="${x2 - x1 + 8}" height="16" fill="${dark}"/>`;
  };
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.name)} shopfront">
<defs>
<linearGradient id="${g}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1420"/><stop offset="1" stop-color="#1B1A22"/></linearGradient>
<radialGradient id="${g}w" cx=".5" cy=".6" r=".8"><stop offset="0" stop-color="#FFE3A3"/><stop offset=".55" stop-color="#E9A74A"/><stop offset="1" stop-color="#5A3410"/></radialGradient>
<radialGradient id="${g}l" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#FFD27A" stop-opacity=".5"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient>
<linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${paint}"/></linearGradient>
</defs>
<rect width="400" height="200" fill="url(#${g}s)"/>
<g fill="#F3EAD7" opacity=".5">${[...Array(14)].map((_, i) => `<circle cx="${(h >> i) % 400}" cy="${(i * 37 + h) % 26 + 2}" r="${i % 3 ? .7 : 1.1}"/>`).join('')}</g>
<rect x="10" y="22" width="380" height="164" fill="#2A2420"/>
<rect x="20" y="30" width="360" height="156" fill="url(#${g}f)"/>
<rect x="14" y="26" width="372" height="8" fill="${dark}"/>
<rect x="30" y="40" width="340" height="40" rx="2" fill="${dark}" stroke="#D4A646" stroke-width="2"/>
<rect x="34" y="44" width="332" height="32" fill="none" stroke="#D4A646" stroke-opacity=".35"/>
<text x="200" y="${60 + fs * .36}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="${fs.toFixed(1)}" letter-spacing="1.5" fill="#F1CF7A">${esc(name)}</text>
<rect x="24" y="80" width="18" height="106" fill="${light}"/><rect x="358" y="80" width="18" height="106" fill="${light}"/>
${win(winA)}${win(winB)}
<rect x="${doorX}" y="90" width="44" height="96" fill="#120E0B" stroke="${dark}" stroke-width="4"/>
<path d="M${doorX + 4} 104 a18 14 0 0 1 36 0z" fill="url(#${g}w)" opacity=".85"/>
<rect x="${doorX + 8}" y="112" width="12" height="30" fill="none" stroke="${shade(paint, -.2)}" stroke-width="2"/><rect x="${doorX + 24}" y="112" width="12" height="30" fill="none" stroke="${shade(paint, -.2)}" stroke-width="2"/>
<circle cx="${doorX + 36}" cy="150" r="2" fill="#D4A646"/>
<g class="lampglow"><circle cx="40" cy="36" r="5" fill="#FFD27A"/><circle cx="360" cy="36" r="5" fill="#FFD27A"/></g>
<rect x="0" y="186" width="400" height="14" fill="#141210"/>
<ellipse cx="200" cy="188" rx="190" ry="14" fill="url(#${g}l)"/>
</svg>`;
}

/* ---------------- state ---------------- */
let email = store.get('email', null);
let pin = store.get('pin', null);
let S = store.get('state', null);     // last good crawl_state
let admin = null;                     // admin_state when unlocked
let tab = 'route';
let openStory = new Set();
let pending = {};                      // slot -> true while queued offline

function plan(){
  if(!S || !S.route) return [];
  const start = toMin((S.crawl && S.crawl.start) || '15:30');
  let t = start;
  return S.route.map((r, i) => {
    const len = i < 6 ? 30 : 45;
    const walk = i ? walkMins(S.route[i - 1].pub, r.pub) : 0;
    const s = {slot: r.slot, pub: r.pub, swapped_from: r.swapped_from, start: t, end: t + len, walk, inPub: len - walk};
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
const prettyDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-IE', {weekday: 'long', day: 'numeric', month: 'long'});

/* ---------------- gate ---------------- */
function showGate(){
  $('app').hidden = true; $('gate').hidden = false;
  $('gateArt').innerHTML = shopfront({name: '12 Pubs Of Winter', paint: '#1F4D3A'}, 'gate');
  const days = Math.round((new Date('2026-12-02T12:00:00') - new Date(todayKey() + 'T12:00:00')) / 864e5);
  $('gateCount').innerHTML = days > 0 ? `<b>${days}</b> ${days === 1 ? 'day' : 'days'} to go. 15:30 start.` : days === 0 ? '<b>Today.</b> 15:30 start.' : 'Done for another year.';
  if(email) $('gEmail').value = email;
}
$('gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const em = $('gEmail').value.trim().toLowerCase(), nm = $('gName').value.trim();
  const msg = $('gateMsg');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ msg.textContent = 'That doesn\'t look like an email address.'; return; }
  $('gateBtn').disabled = true; $('gateBtn').textContent = 'Checking the list…'; msg.textContent = '';
  try{
    const r = await rpc('join_crawl', {p_email: em, p_name: nm || null});
    if(!r.ok){ msg.textContent = 'That email isn\'t on the guest list. Ask Kevin to add you, or try the email he has for you.'; return; }
    email = r.email; store.set('email', email);
    await refresh(true);
    showApp();
  }catch(err){
    msg.textContent = 'Couldn\'t reach the list. Check your signal and try again.';
  }finally{
    $('gateBtn').disabled = false; $('gateBtn').textContent = 'Get in';
  }
});

/* ---------------- app ---------------- */
function showApp(){
  $('gate').hidden = true; $('app').hidden = false;
  $('adminTab').hidden = !pin;
  render();
}
async function refresh(quiet){
  if(!email) return;
  try{
    S = await rpc('crawl_state', {p_email: email});
    store.set('state', S);
    if(pin){ try{ admin = await rpc('admin_state', {p_pin: pin}); }catch(e){ if(e.server){ admin = null; pin = null; store.del('pin'); } } }
    if(!quiet) render();
    flushQueue();
  }catch(e){
    if(e.server && /not_on_list/.test(e.message)){ store.del('state'); S = null; email = null; store.del('email'); showGate(); $('gateMsg').textContent = 'You\'ve been taken off the list. 🪓'; return; }
    if(!quiet){ render(); }
  }
}
function render(){
  if(!S){ showGate(); return; }
  renderTop();
  if(tab === 'route') renderRoute();
  if(tab === 'board') renderBoard();
  if(tab === 'map') renderMap();
  if(tab === 'me') renderMe();
  if(tab === 'admin') renderAdmin();
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  $('adminTab').hidden = !pin;
}
function renderTop(){
  const P = plan(), {date, days, isDay} = dayInfo(), n = new Set(myCheckins().map(c => c.slot)).size + Object.keys(pending).length;
  $('topDate').textContent = prettyDate(date);
  const R = 22, C = 2 * Math.PI * R, frac = Math.min(1, n / 12);
  $('ring').innerHTML = `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/><circle cx="26" cy="26" r="${R}" fill="none" stroke="#D4A646" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg><span>${n}/12</span>`;
  let st = '';
  if(days > 0) st = `<b>${days} ${days === 1 ? 'day' : 'days'}</b> to go. ${P[0] ? hm(P[0].start) + ' at ' + esc(P[0].pub.name) : ''}`;
  else if(isDay){
    const m = nowMin(), cur = P.find(s => m >= s.start && m < s.end);
    if(cur) st = `Now: <b>${esc(cur.pub.name)}</b> until ${hm(cur.end)}`;
    else if(P[0] && m < P[0].start) st = `Starts <b>${hm(P[0].start)}</b> at ${esc(P[0].pub.name)}`;
    else st = `That's the 12. <b>${esc(S.after ? S.after.name : '')}</b> next.`;
  }else st = 'Done for another year. See you in 2027.';
  $('topStatus').innerHTML = st;
}

/* route */
function card(s, idx, P, now){
  const p = s.pub, mine = myAt(s.slot), queued = pending[s.slot];
  const done = !!mine || queued, isNow = idx === now, past = now > idx;
  const open = openStory.has(s.slot);
  const chips = [];
  if(isNow) chips.push('<span class="chip now">Now</span>');
  if(p.food) chips.push('<span class="chip food">🍲 Food stop</span>');
  if(s.swapped_from) chips.push(`<span class="chip sub">Sub for ${esc(s.swapped_from)}</span>`);
  if(s.inPub < 18) chips.push('<span class="chip warn">Order on arrival</span>');
  chips.push(`<span class="chip">${s.walk ? s.walk + ' min walk · ' : ''}${s.inPub} min inside</span>`);
  let mineHtml = '';
  if(mine){
    mineHtml = `<div class="mine">${mine.photo ? `<img src="${photoUrl(mine.photo)}" alt="Your check-in photo" loading="lazy">` : ''}<div>Checked in ${new Date(mine.at).toTimeString().slice(0, 5)}<br><span class="${mine.located ? 'ok' : 'meh'}">${mine.located ? '📍 At the pub' : '📍 Location not confirmed'}</span></div><button type="button" data-undo="${s.slot}">Undo</button></div>`;
  }else if(queued){
    mineHtml = '<div class="mine"><div>Saved on your phone. It sends when you get signal.</div></div>';
  }
  return `<article class="card${isNow ? ' now' : ''}${done ? ' done' : ''}${past && !done ? ' past' : ''}" id="slot-${s.slot}">
    <div class="art">${shopfront(p, 's' + s.slot)}<span class="num">${s.slot}</span><span class="when">${hm(s.start)}</span>${done ? '<span class="stamp">Checked in</span>' : ''}</div>
    <div class="card-body">
      <h3>${esc(p.name)}</h3>
      <p class="aka">${p.aka ? 'Also called ' + esc(p.aka) + ' · ' : ''}${esc(p.area)}</p>
      <div class="chips">${chips.join('')}</div>
      ${p.history ? `<p class="story${open ? '' : ' clamp'}">${esc(p.history)}</p><button class="more" type="button" data-story="${s.slot}">${open ? 'Less' : 'The story'}</button>` : ''}
      ${mineHtml}
      <div class="actions">
        ${done ? '' : `<button class="btn primary" type="button" data-checkin="${s.slot}">📸 Check in</button>`}
        <a class="btn ghost" href="${mapsLink(p)}" target="_blank" rel="noopener">Directions</a>
      </div>
    </div>
  </article>`;
}
function renderRoute(){
  const P = plan(), {days, isDay} = dayInfo(), m = nowMin();
  const now = isDay ? P.findIndex(s => m >= s.start && m < s.end) : (days < 0 ? 99 : -1);
  const swapped = P.filter(s => s.swapped_from);
  let h = '';
  if(swapped.length) h += `<div class="banner swap">🔁 <div>${swapped.map(s => `<b>${esc(s.swapped_from)}</b> is out. <b>${esc(s.pub.name)}</b> is in at ${hm(s.start)}.`).join('<br>')}</div></div>`;
  if(days > 0) h += `<div class="banner">🍺 <div>Practice check-ins are fine before the night. Kevin clears them before 2 December.</div></div>`;
  P.forEach((s, i) => {
    if(i) h += `<div class="leg">🚶 ${s.walk} min to ${esc(s.pub.name)}</div>`;
    h += card(s, i, P, now);
  });
  const last = P[P.length - 1];
  if(last) h += `<div class="leg">🕚 ${hm(last.end)} Leave ${esc(last.pub.name)}. That's the 12.</div>`;
  if(S.after){
    const a = S.after;
    h += `<article class="card after"><div class="art">${shopfront(a, 'after')}<span class="num">🎸</span><span class="when">After</span></div><div class="card-body"><p class="eyebrow">After party</p><h3>${esc(a.name)}</h3><p class="aka">${esc(a.area)} · open until ${esc(a.closes)}</p>${a.history ? `<p class="story">${esc(a.history)}</p>` : ''}<div class="actions"><a class="btn ghost" href="${mapsLink(a)}" target="_blank" rel="noopener">Directions</a></div></div></article>`;
  }
  if(S.subs && S.subs.length){
    h += '<h2 class="section-h">The subs bench</h2><div class="subs">' + S.subs.map((p, i) => `<div class="sub-card"><div class="mini">${shopfront(p, 'sub' + i)}</div><div><b>${esc(p.name)}</b><span>${esc(p.area)} · ${esc(p.opens)} to ${esc(p.closes)}</span><p class="story" style="margin-top:4px;font-size:13px">${esc(p.history || '')}</p></div></div>`).join('') + '</div><p class="fine">Used if a pub is shut, full or has barred us. Kevin swaps them in and everyone\'s app updates.</p>';
  }
  $('v-route').innerHTML = h;
}

/* board */
function renderBoard(){
  const cs = S.checkins || [], people = S.people || [];
  const by = {};
  people.forEach(p => { by[p.who] = {who: p.who, me: p.me, slots: new Set(), last: null}; });
  cs.forEach(c => { const b = by[c.who] || (by[c.who] = {who: c.who, me: c.mine, slots: new Set(), last: null}); b.slots.add(c.slot); if(!b.last || c.at > b.last.at) b.last = c; });
  const rows = Object.values(by).sort((a, b) => b.slots.size - a.slots.size || ((b.last && b.last.at) || '').localeCompare((a.last && a.last.at) || '') * -1 || a.who.localeCompare(b.who));
  let h = '<h2 class="section-h" style="margin-top:0">The board</h2><div class="leader">';
  rows.forEach((r, i) => {
    const n = r.slots.size;
    h += `<div class="lrow${r.me ? ' me' : ''}"><span class="pos">${n ? i + 1 : '–'}</span><span class="who">${esc(r.who)}${r.me ? ' (you)' : ''}<span class="at">${r.last ? 'Last seen: ' + esc(r.last.pub) + ' at ' + new Date(r.last.at).toTimeString().slice(0, 5) : 'Not started'}</span></span><span class="n">${n}</span><span class="bar"><i style="width:${n / 12 * 100}%"></i></span></div>`;
  });
  h += '</div><h2 class="section-h">The evidence</h2>';
  if(!cs.length) h += '<div class="empty">No check-ins yet. First photo gets the bragging rights.</div>';
  else h += '<div class="feed">' + cs.map(c => `<figure class="shot" style="margin:0">${c.photo ? `<img src="${photoUrl(c.photo)}" alt="${esc(c.who)} at ${esc(c.pub)}" loading="lazy">` : '<div class="noimg">🍺</div>'}<p><b>${esc(c.who)}</b>${esc(c.pub)} · ${new Date(c.at).toTimeString().slice(0, 5)}<br><span class="${c.located ? 'ok' : 'meh'}">${c.located ? '📍 at the pub' : '📍 not confirmed'}</span></p></figure>`).join('') + '</div>';
  $('v-board').innerHTML = h;
}

/* map */
let map = null, mapLayer = null, meMarker = null, watchId = null;
function renderMap(){
  if(!window.L){ $('map').innerHTML = '<p class="empty" style="margin:16px">The map needs signal to load.</p>'; return; }
  if(!map){
    map = L.map('map', {zoomControl: false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; OpenStreetMap', maxZoom: 19, className: 'darkmap'}).addTo(map);
    mapLayer = L.layerGroup().addTo(map);
  }
  mapLayer.clearLayers();
  const P = plan(), {isDay} = dayInfo(), m = nowMin();
  const now = isDay ? P.findIndex(s => m >= s.start && m < s.end) : -1;
  L.polyline(P.map(s => [s.pub.lat, s.pub.lng]), {color: '#D4A646', weight: 4, opacity: .9, dashArray: '1 8', lineCap: 'round'}).addTo(mapLayer);
  (S.subs || []).forEach(p => L.marker([p.lat, p.lng], {icon: L.divIcon({className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<div class="pin sub"></div>'})}).bindPopup('<b>' + esc(p.name) + '</b><br>Sub').addTo(mapLayer));
  P.forEach((s, i) => {
    const cls = i === now ? 'now' : (myAt(s.slot) ? 'done' : '');
    L.marker([s.pub.lat, s.pub.lng], {zIndexOffset: i === now ? 1000 : i, icon: L.divIcon({className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: `<div class="pin ${cls}">${s.slot}</div>`})})
      .bindPopup(`<b>${esc(s.pub.name)}</b><br>${hm(s.start)} to ${hm(s.end)}`).addTo(mapLayer);
  });
  setTimeout(() => { map.invalidateSize(); if(!renderMap.fitted){ map.fitBounds(P.map(s => [s.pub.lat, s.pub.lng]), {padding: [30, 30]}); renderMap.fitted = true; } }, 60);
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

/* me */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if(tab === 'me') renderMe(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function renderMe(){
  const me = S.me || {};
  let h = `<div class="panel"><p class="eyebrow">You</p><h2>${esc(me.name || 'No name yet')}</h2><p style="color:var(--dim)">${esc(me.email)}</p>
    <div class="field"><label for="meName">Name on the board</label><input id="meName" value="${esc(me.name || '')}" maxlength="40"></div>
    <div class="row"><button class="btn small" id="meSave" type="button">Save name</button><button class="btn small ghost" id="meOut" type="button">Sign out</button></div></div>`;
  if(!standalone()){
    h += `<div class="panel"><h2>Put it on your home screen</h2>${installEvt ? '<p>One tap and it opens like an app, full screen.</p><button class="btn primary" id="install" type="button">Install the app</button>'
      : isIOS ? '<p>In Safari, tap the Share button <b>⬆︎</b>, then <b>Add to Home Screen</b>. It opens full screen like an app.</p>'
      : '<p>Open your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>'}</div>`;
  }
  h += `<div class="panel"><h2>Running the night?</h2><p>Enter the admin PIN to manage the guest list and swap pubs.</p>
    <div class="field"><label for="pinIn">Admin PIN</label><input id="pinIn" type="password" autocomplete="off" autocapitalize="off"></div>
    <button class="btn small" id="pinGo" type="button">${pin ? 'Unlocked ✓' : 'Unlock'}</button> <span class="fine" id="pinMsg"></span></div>`;
  $('v-me').innerHTML = h;
  $('meSave').onclick = async () => { try{ await rpc('join_crawl', {p_email: email, p_name: $('meName').value}); toast('Saved.'); refresh(); }catch(e){ toast('Couldn\'t save. Try again with signal.'); } };
  $('meOut').onclick = () => { store.del('email'); store.del('state'); store.del('pin'); email = null; S = null; pin = null; showGate(); };
  if($('install')) $('install').onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderMe(); };
  $('pinGo').onclick = async () => {
    const v = $('pinIn').value.trim(); if(!v) return;
    try{ admin = await rpc('admin_state', {p_pin: v}); pin = v; store.set('pin', v); $('adminTab').hidden = false; toast('Admin unlocked.'); go('admin'); }
    catch(e){ $('pinMsg').textContent = e.server ? 'Wrong PIN. Too many wrong tries locks it for an hour.' : 'No signal.'; }
  };
}

/* admin */
let archMap = null, archLayer = null, archYear = null, confirmClear = false, confirmRemove = null;
function renderAdmin(){
  if(!pin){ go('me'); return; }
  if(!admin){ $('v-admin').innerHTML = '<div class="empty">Loading…</div>'; refresh(); return; }
  const P = plan(), used = new Set(P.map(s => s.pub.name));
  const subsAll = admin.subs_all || [];
  let h = `<div class="panel"><p class="eyebrow">Guest list · ${admin.guests.length}</p><h2>Who gets in</h2>
    <div class="field"><label for="aName">Name</label><input id="aName" maxlength="40" placeholder="Optional"></div>
    <div class="field"><label for="aEmail">Email</label><input id="aEmail" type="email" inputmode="email" placeholder="name@example.com"></div>
    <div class="row"><button class="btn small primary" id="aAdd" type="button">Add to the list</button><button class="btn small ghost" id="aInvite" type="button">Copy invite message</button></div>
    <div class="glist">${admin.guests.map(g => `<div class="gitem"><span>${esc(g.name || '–')} <small>${esc(g.email)} · ${g.checkins} in</small></span>${confirmRemove === g.email ? `<button class="btn small danger" data-rm="${esc(g.email)}" type="button">Axe ${esc(g.name || 'them')}?</button>` : `<button class="btn small ghost" data-rmask="${esc(g.email)}" type="button">🪓</button>`}</div>`).join('')}</div></div>`;
  h += `<div class="panel"><p class="eyebrow">On the night</p><h2>Swap a pub</h2><p>Everyone's app picks up the change within 20 seconds.</p>${P.map(s => {
      const orig = s.swapped_from || s.pub.name;
      const opts = [`<option value="">${esc(orig)}${s.swapped_from ? ' (put back)' : ''}</option>`].concat(subsAll.map(sb => {
        const isHere = s.pub.id === sb.id, inUse = used.has(sb.name) && !isHere, early = toMin(sb.opens) > s.start;
        return `<option value="${sb.id}" ${isHere ? 'selected' : ''} ${inUse || early ? 'disabled' : ''}>${esc(sb.name)}${inUse ? ' (in use)' : early ? ' (opens ' + sb.opens + ')' : ''}</option>`;
      }));
      return `<div class="swaprow"><span class="n">${s.slot}</span><select data-swap="${s.slot}" aria-label="Stop ${s.slot}">${opts.join('')}</select></div>`;
    }).join('')}</div>`;
  h += `<div class="panel"><h2>Check-ins</h2><p>${(S.checkins || []).length} ${(S.checkins || []).length === 1 ? 'check-in' : 'check-ins'} so far. Clear the practice ones before the night.</p>${confirmClear ? '<div class="confirm"><p>This deletes every check-in for everyone. Photos stay stored but drop off the board.</p><div class="row"><button class="btn small danger" id="clearYes" type="button">Yes, clear them all</button><button class="btn small ghost" id="clearNo" type="button">Keep them</button></div></div>' : '<button class="btn small danger" id="clearAsk" type="button">Clear all check-ins</button>'}</div>`;
  h += `<div class="panel"><p class="eyebrow">Only you see this</p><h2>The MasterList</h2><div class="years">${admin.archive.map(y => `<button type="button" data-year="${y.year}" aria-pressed="${archYear === y.year}">${y.year}</button>`).join('')}</div><div id="archMap"></div><div class="arch-list" id="archList"></div></div>`;
  h += `<button class="btn small ghost" id="lock" type="button">Lock admin on this phone</button>`;
  $('v-admin').innerHTML = h;

  $('aAdd').onclick = async () => {
    const em = $('aEmail').value.trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ toast('Check the email.'); return; }
    try{ await rpc('admin_guest', {p_pin: pin, p_email: em, p_name: $('aName').value, p_remove: false}); toast('Added ' + em); await refresh(); }catch(e){ toast(e.server ? e.message : 'No signal.'); }
  };
  $('aInvite').onclick = () => copy(`12 Pubs Of Winter. Wednesday 2 December, 15:30.\nRoute, check-ins and the board are here, guests only: ${SITE}\nUse the email I have for you. Can't make it? 🪓`);
  document.querySelectorAll('[data-rmask]').forEach(b => b.onclick = () => { confirmRemove = b.dataset.rmask; renderAdmin(); });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { try{ await rpc('admin_guest', {p_pin: pin, p_email: b.dataset.rm, p_name: null, p_remove: true}); confirmRemove = null; toast('Axed. 🪓'); await refresh(); }catch(e){ toast('Couldn\'t remove.'); } });
  document.querySelectorAll('[data-swap]').forEach(sel => sel.onchange = async () => {
    try{ await rpc('admin_swap', {p_pin: pin, p_slot: +sel.dataset.swap, p_pub_id: sel.value || null}); toast(sel.value ? 'Swapped. Everyone\'s app updates shortly.' : 'Put back.'); await refresh(); }
    catch(e){ toast(e.server ? 'Couldn\'t swap: ' + e.message : 'No signal.'); render(); }
  });
  if($('clearAsk')) $('clearAsk').onclick = () => { confirmClear = true; renderAdmin(); };
  if($('clearNo')) $('clearNo').onclick = () => { confirmClear = false; renderAdmin(); };
  if($('clearYes')) $('clearYes').onclick = async () => { try{ await rpc('admin_clear_checkins', {p_pin: pin}); confirmClear = false; toast('All check-ins cleared.'); await refresh(); }catch(e){ toast('Couldn\'t clear.'); } };
  document.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { archYear = archYear === +b.dataset.year ? null : +b.dataset.year; renderAdmin(); });
  $('lock').onclick = () => { pin = null; admin = null; store.del('pin'); go('route'); };
  drawArchive();
}
const YEAR_HUE = {2011:198,2012:14,2013:262,2014:40,2015:330,2017:150,2018:24,2019:210,2021:100,2022:284,2023:52,2024:172,2025:0};
function drawArchive(){
  if(!window.L) return;
  archMap = L.map('archMap', {zoomControl: false, attributionControl: false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, className: 'darkmap'}).addTo(archMap);
  const years = admin.archive.filter(y => archYear === null || y.year === archYear), pts = [];
  years.forEach(y => {
    const col = `hsl(${YEAR_HUE[y.year] ?? (y.year * 37) % 360} 62% 58%)`;
    L.polyline(y.pubs.map(p => [p.lat, p.lng]), {color: col, weight: 2, opacity: .6}).addTo(archMap);
    y.pubs.forEach((p, i) => { pts.push([p.lat, p.lng]); L.marker([p.lat, p.lng], {icon: L.divIcon({className: '', iconSize: [12, 12], iconAnchor: [6, 6], html: `<div class="pin yr" style="background:${col}"></div>`})}).bindPopup(`<b>${esc(p.name)}</b><br>${y.year} · stop ${i + 1}`).addTo(archMap); });
  });
  if(pts.length) archMap.fitBounds(pts, {padding: [16, 16]});
  const total = admin.archive.reduce((a, y) => a + y.pubs.length, 0);
  $('archList').innerHTML = archYear === null ? `${admin.archive.length} crawls, ${total} pubs. Tap a year to see its route.`
    : (y => `<b>${y.year} · ${esc(y.district)}</b><ol>${y.pubs.map(p => '<li>' + esc(p.name) + '</li>').join('')}</ol>`)(admin.archive.find(y => y.year === archYear));
}
async function copy(text){
  try{ await navigator.clipboard.writeText(text); toast('Copied. Paste it into the group.'); }
  catch(e){ window.prompt('Copy this:', text); }
}

/* ---------------- check-in ---------------- */
let sheetSlot = null, sheetBlob = null, sheetPos = null;
function openSheet(slot){
  const s = plan().find(x => x.slot === slot); if(!s) return;
  sheetSlot = slot; sheetBlob = null; sheetPos = null;
  $('sheetSlot').textContent = 'Pub ' + slot + ' of 12 · ' + hm(s.start);
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
    loc.innerHTML = ok ? `<span class="ok">📍 You're at the pub (${d}m)</span>` : `<span class="meh">📍 You look ${d > 999 ? (d / 1000).toFixed(1) + 'km' : d + 'm'} away. You can still check in, but the board will show it as not confirmed.</span>`;
  }, () => { if(sheetSlot === slot) loc.innerHTML = '<span class="meh">📍 Couldn\'t get your location. The photo still counts; the board shows it as not confirmed.</span>'; },
  {enableHighAccuracy: true, timeout: 15000, maximumAge: 30000});
}
function closeSheet(){ $('sheet').hidden = true; sheetSlot = null; }
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
async function compress(file){
  let img;
  try{ img = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
  catch(e){ img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const max = 1280, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, 'image/jpeg', .74));
}
$('sheetGo').addEventListener('click', async () => {
  if(!sheetBlob || sheetSlot === null) return;
  const job = {slot: sheetSlot, blob: sheetBlob, lat: sheetPos ? sheetPos.latitude : null, lng: sheetPos ? sheetPos.longitude : null, acc: sheetPos ? sheetPos.accuracy : null};
  $('sheetGo').disabled = true; $('sheetMsg').textContent = 'Sending…';
  try{
    await sendCheckin(job);
    closeSheet(); toast('Checked in. 🍺'); await refresh();
  }catch(e){
    if(e.server){ $('sheetMsg').textContent = 'That didn\'t go through: ' + e.message; $('sheetGo').disabled = false; return; }
    await queuePut(job); pending[job.slot] = true; closeSheet(); toast('No signal. Saved on your phone; it sends when you\'re back online.'); render();
  }
});
async function sendCheckin(job){
  const path = '2026/' + uuid() + '.jpg';
  await upload(path, job.blob);
  return rpc('check_in', {p_email: email, p_slot: job.slot, p_photo: path, p_lat: job.lat, p_lng: job.lng, p_acc: job.acc});
}

/* offline queue (IndexedDB holds the photo until there's signal) */
function idb(){ return new Promise((res, rej) => { const r = indexedDB.open('12pubs', 1); r.onupgradeneeded = () => r.result.createObjectStore('queue', {keyPath: 'slot'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function queuePut(job){ try{ const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('queue', 'readwrite'); t.objectStore('queue').put(job); t.oncomplete = res; t.onerror = () => rej(t.error); }); }catch(e){} }
async function queueAll(){ try{ const db = await idb(); return await new Promise((res, rej) => { const r = db.transaction('queue').objectStore('queue').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }catch(e){ return []; } }
async function queueDel(slot){ try{ const db = await idb(); await new Promise(res => { const t = db.transaction('queue', 'readwrite'); t.objectStore('queue').delete(slot); t.oncomplete = res; }); }catch(e){} }
let flushing = false;
async function flushQueue(){
  if(flushing || !email) return; flushing = true;
  try{
    const jobs = await queueAll();
    jobs.forEach(j => { pending[j.slot] = true; });
    for(const j of jobs){
      try{ await sendCheckin(j); await queueDel(j.slot); delete pending[j.slot]; toast('Sent your saved check-in. 🍺'); }
      catch(e){ if(e.server){ await queueDel(j.slot); delete pending[j.slot]; } break; }
    }
    if(jobs.length){ S = await rpc('crawl_state', {p_email: email}).catch(() => S); store.set('state', S); render(); }
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
$('ring').addEventListener('click', () => go('board'));
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-checkin]'); if(c){ openSheet(+c.dataset.checkin); return; }
  const st = e.target.closest('[data-story]'); if(st){ const n = +st.dataset.story; openStory.has(n) ? openStory.delete(n) : openStory.add(n); renderRoute(); return; }
  const u = e.target.closest('[data-undo]'); if(u){ try{ await rpc('undo_check_in', {p_email: email, p_slot: +u.dataset.undo}); toast('Check-in removed.'); refresh(); }catch(err){ toast('Couldn\'t undo. Try again with signal.'); } }
});
setInterval(() => { if(email && document.visibilityState === 'visible' && navigator.onLine) refresh(); else if(S) renderTop(); }, 20000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && email) refresh(); });

/* ---------------- boot ---------------- */
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if(email && S){ showApp(); refresh(); }
else if(email){ refresh(true).then(() => S ? showApp() : showGate()); }
else showGate();
