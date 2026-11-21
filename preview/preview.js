/* Private preview only. A pretend database and a time machine, so you can see any day
   before it happens. Nothing here touches the real site or the real guest list. */
(function(){
  'use strict';
  const D = window.PREVIEW_DATA, PIN = 'preview';
  const P = id => Object.assign({}, D.pubs[id]);
  const pad = n => String(n).padStart(2, '0');
  const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const DROPS = [...Array(12)].map((_, i) => local(new Date(2026, 10, 21 + i, 12, 0)) + ':00');
  const START = new Date(2026, 11, 2, 15, 30).getTime();
  const LIVE = new Date(2026, 11, 2, 12, 0).getTime();     // door 12 and the full route

  let shift = 0;
  try{ shift = +sessionStorage.getItem('pv:shift') || 0; }catch(e){}
  const now = () => Date.now() + shift;

  /* the fake database */
  const lads = ['James', 'Dec', 'Barry', 'Gav', 'Shane', 'Rob', 'Fergal'];
  const guests = new Map();
  lads.forEach(n => guests.set(n.toLowerCase() + '@example.com', {email: n.toLowerCase() + '@example.com', name: n, blocked: false}));
  guests.set('axed@example.com', {email: 'axed@example.com', name: 'Mick', blocked: true});
  const route = D.route.map((id, i) => ({slot: i + 1, pub_id: id, original: null}));
  const mine = new Map();           // email -> Map(slot -> checkin)
  const files = new Map();          // storage path -> blob url
  const pubPhoto = {};              // admin uploads
  let cleared = 0;                  // admin cleared the board at this time

  function slots(){
    let t = 15 * 60 + 30;
    return route.map((r, i) => { const len = i < 6 ? 30 : 45, s = {slot: r.slot, start: t}; t += len; return s; });
  }
  const minToIso = m => `2026-12-02T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const opensAt = slot => { const s = slots()[slot - 1]; return minToIso(s.start - 15); };
  const pubOut = id => { const p = P(id); if(pubPhoto[id] !== undefined){ if(pubPhoto[id]){ p.photo_url = pubPhoto[id]; p.photo_credit = 'Photo: Kevin'; p.photo_page = null; } else { delete p.photo_url; delete p.photo_credit; } } return p; };

  // Made-up lads move through the route at their own pace on the night.
  const pace = {James: 0, Dec: 4, Barry: 9, Gav: 2, Shane: 14, Rob: 6, Fergal: 20};
  const stamina = {James: 12, Dec: 12, Barry: 9, Gav: 7, Shane: 12, Rob: 4, Fergal: 11};
  function ladCheckins(t){
    const out = [];
    if(t < START - 15 * 6e4) return out;
    const S = slots();
    lads.forEach((who, li) => {
      if(guests.get(who.toLowerCase() + '@example.com').blocked) return;
      S.forEach(s => {
        if(s.slot > stamina[who]) return;
        const at = new Date(2026, 11, 2, 0, s.start + pace[who] + (s.slot % 3)).getTime();
        if(at <= t && at > cleared) out.push({who, mine: false, slot: s.slot, pub: D.pubs[route[s.slot - 1].pub_id].name, at: local(new Date(at)) + ':00', photo: (s.slot + li) % 3 === 0 ? null : pint(li, s.slot), located: (s.slot * 7 + li) % 5 !== 0});
      });
    });
    return out;
  }
  function pint(a, b){
    const bg = ['#3B2A1E', '#1E3B34', '#2A2F4A', '#4A2A2A', '#2E3B1E'][(a + b) % 5];
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/><circle cx="${40 + (a * 37) % 120}" cy="40" r="60" fill="#FFD98A" opacity=".18"/><path d="M70 50h60l-8 120H78z" fill="#1A0F08"/><path d="M70 50h60l-2 24H72z" fill="#F4E6C6"/><text x="100" y="190" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#ffffff88">pretend photo</text></svg>`);
  }

  function state(email, pin){
    const t = now(), g = guests.get(email) || {email, name: null};
    const people = [...guests.values()].filter(x => !x.blocked).map(x => ({who: x.name || x.email.split('@')[0], me: x.email === email}));
    const base = {me: {email, name: g.name}, crawl: {title: '12 Pubs Of Winter', date: '2026-12-02', start: '15:30', last_orders: '23:30'}, people, drops: DROPS};
    const preview = pin === PIN && t < LIVE;
    if(t < LIVE && !preview){
      const revealed = route.filter(r => new Date(DROPS[r.slot - 1]).getTime() <= t).map(r => ({slot: r.slot, pub: pubOut(r.pub_id)}));
      return Object.assign(base, {locked: true, revealed});
    }
    const cs = ladCheckins(t);
    mine.forEach((m, em) => m.forEach(c => { const gg = guests.get(em); if(!gg || gg.blocked) return; cs.push(Object.assign({}, c, {who: gg.name || em.split('@')[0], mine: em === email})); }));
    cs.sort((a, b) => b.at.localeCompare(a.at));
    return Object.assign(base, {
      locked: false, preview,
      route: route.map(r => ({slot: r.slot, pub: pubOut(r.pub_id), swapped_from: r.original ? D.pubs[r.original].name : null, opens_at: opensAt(r.slot)})),
      subs: D.subs.map(pubOut), after: pubOut(D.after), checkins: cs
    });
  }
  const fail = msg => { const e = new Error(msg); e.server = true; throw e; };
  async function rpc(name, a){
    await new Promise(r => setTimeout(r, 120));
    switch(name){
      case 'join_crawl': {
        const em = String(a.p_email || '').toLowerCase().trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return {ok: false, reason: 'bad_email'};
        const g = guests.get(em);
        if(g && g.blocked) return {ok: false, reason: 'axed'};
        if(g){ if(a.p_name) g.name = a.p_name; } else guests.set(em, {email: em, name: a.p_name || null, blocked: false});
        return {ok: true, email: em, name: guests.get(em).name};
      }
      case 'crawl_state_v3': {
        if(!guests.has(a.p_email)) guests.set(a.p_email, {email: a.p_email, name: null, blocked: false}); // the pretend database forgets you on reload
        const g = guests.get(a.p_email); if(g.blocked) fail('not_on_list');
        return JSON.parse(JSON.stringify(state(a.p_email, a.p_pin)));
      }
      case 'check_in_v2': {
        const practice = a.p_pin === PIN;
        if(now() < LIVE && !practice) fail('locked');
        if(!practice && now() < new Date(opensAt(a.p_slot)).getTime()) fail('too_early:' + opensAt(a.p_slot).slice(11) + ' 02/12');
        const p = D.pubs[route[a.p_slot - 1].pub_id];
        const located = a.p_lat == null ? false : Math.hypot((a.p_lat - p.lat) * 111000, (a.p_lng - p.lng) * 66000) <= 120 + Math.min(a.p_acc || 0, 80);
        if(!mine.has(a.p_email)) mine.set(a.p_email, new Map());
        mine.get(a.p_email).set(a.p_slot, {slot: a.p_slot, pub: p.name, at: local(new Date(now())) + ':00', photo: files.get(a.p_photo) || null, located});
        return {ok: true, located, practice};
      }
      case 'undo_check_in': { const m = mine.get(a.p_email); if(m) m.delete(a.p_slot); return {ok: true}; }
      case 'admin_state': {
        if(a.p_pin !== PIN) fail('bad_pin');
        const counts = {}; mine.forEach((m, em) => { counts[em] = m.size; });
        const t = now();
        ladCheckins(t).forEach(c => { const em = c.who.toLowerCase() + '@example.com'; counts[em] = (counts[em] || 0) + 1; });
        return {
          guests: [...guests.values()].map(g => ({email: g.email, name: g.name, blocked: g.blocked, checkins: counts[g.email] || 0})),
          pubs: [...D.route, ...D.subs, D.after].map(id => { const p = pubOut(id); return {id, name: p.name, photo_url: p.photo_url || null, photo_credit: p.photo_credit || null}; }),
          subs_all: D.subs.map(pubOut), archive: D.archive
        };
      }
      case 'admin_guest': {
        if(a.p_pin !== PIN) fail('bad_pin');
        const g = guests.get(a.p_email) || {email: a.p_email, name: a.p_name, blocked: false};
        g.blocked = !!a.p_remove; if(a.p_remove) mine.delete(a.p_email);
        guests.set(a.p_email, g); return {ok: true};
      }
      case 'admin_swap': {
        if(a.p_pin !== PIN) fail('bad_pin');
        const r = route[a.p_slot - 1];
        if(!a.p_pub_id){ if(r.original){ r.pub_id = r.original; r.original = null; } }
        else { if(!r.original) r.original = r.pub_id; r.pub_id = a.p_pub_id; }
        return {ok: true};
      }
      case 'admin_clear_checkins': { if(a.p_pin !== PIN) fail('bad_pin'); mine.clear(); cleared = now(); return {ok: true}; }
      case 'admin_pub_photo': { if(a.p_pin !== PIN) fail('bad_pin'); pubPhoto[a.p_pub_id] = a.p_path ? files.get(a.p_path) : null; return {ok: true}; }
    }
    fail('unknown ' + name);
  }
  async function upload(path, blob){ files.set(path, URL.createObjectURL(blob)); }

  window.PREVIEW = {now, rpc, upload};

  /* the time machine bar */
  const MOMENTS = [
    ['Real time', null],
    ['Sat 21 Nov, 12:05 (door 1)', new Date(2026, 10, 21, 12, 5)],
    ['Wed 25 Nov, 18:00 (door 5)', new Date(2026, 10, 25, 18, 0)],
    ['Mon 30 Nov, 11:55 (door 10 due)', new Date(2026, 10, 30, 11, 55)],
    ['Tue 1 Dec, 21:00 (door 11)', new Date(2026, 11, 1, 21, 0)],
    ['Wed 2 Dec, 09:00 (morning of)', new Date(2026, 11, 2, 9, 0)],
    ['Wed 2 Dec, 15:20 (first pint due)', new Date(2026, 11, 2, 15, 20)],
    ['Wed 2 Dec, 17:40 (pub 5)', new Date(2026, 11, 2, 17, 40)],
    ['Wed 2 Dec, 21:10 (food stop)', new Date(2026, 11, 2, 21, 10)],
    ['Wed 2 Dec, 23:50 (Whelan\'s)', new Date(2026, 11, 2, 23, 50)]
  ];
  const css = document.createElement('style');
  css.textContent = `.pv{position:sticky;top:0;z-index:25;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 12px;background:#FFD98A;color:#22190A;font:14px/1.3 "Atkinson Hyperlegible",system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.4)}
  .pv b{font-weight:700}.pv select,.pv button{font:inherit;font-weight:700;color:#22190A;background:#fff8e2;border:2px solid #8F6F22;border-radius:8px;padding:5px 8px;min-height:36px}
  .pv .clock{flex:1 1 100%;font-size:12.5px;opacity:.85}.top{top:var(--pvh,0px)!important}`;
  document.head.appendChild(css);
  const bar = document.createElement('div');
  bar.className = 'pv';
  bar.innerHTML = `<b>Preview</b><select id="pvWhen" aria-label="Pretend it's">${MOMENTS.map((m, i) => `<option value="${i}">${m[0]}</option>`).join('')}</select><button type="button" id="pvAdmin">Admin PIN</button><button type="button" id="pvReset">Sign out</button><span class="clock" id="pvClock"></span>`;
  document.body.prepend(bar);
  const setH = () => document.documentElement.style.setProperty('--pvh', bar.offsetHeight + 'px');
  setH(); addEventListener('resize', setH); if(window.ResizeObserver) new ResizeObserver(setH).observe(bar);
  const sel = bar.querySelector('#pvWhen');
  try{ sel.value = sessionStorage.getItem('pv:moment') || '0'; }catch(e){}
  const tick = () => { bar.querySelector('#pvClock').textContent = 'Pretend it\'s ' + new Date(now()).toLocaleString('en-IE', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) + '. Made-up lads, nothing live.'; };
  tick(); setInterval(tick, 15000);
  sel.onchange = () => {
    const m = MOMENTS[+sel.value][1];
    shift = m ? m.getTime() - Date.now() : 0;
    try{ sessionStorage.setItem('pv:shift', shift); sessionStorage.setItem('pv:moment', sel.value); }catch(e){}
    tick();
    if(window.app){ window.app.refresh(); }
  };
  bar.querySelector('#pvAdmin').onclick = () => {
    if(!window.app || !window.app.S){ bar.querySelector('#pvClock').textContent = 'Sign in first, then tap Admin PIN.'; return; }
    window.app.go('me');
    setTimeout(() => { const i = document.getElementById('pinIn'); if(i){ i.value = PIN; document.getElementById('pinGo').click(); } }, 50);
  };
  bar.querySelector('#pvReset').onclick = () => { try{ localStorage.clear(); }catch(e){} location.reload(); };
})();
