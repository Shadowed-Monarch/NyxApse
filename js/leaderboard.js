/* leaderboard.js - optional online leaderboard (Supabase). The game works fully without it. */
(function () {
 const C = window.NX_CONFIG || {}, LS = localStorage, SK = 'bt_lb_session', SENT = 'bt_lb_sent';
 const configured = () => !!(C.supabaseUrl && C.anonKey && /^https?:\/\//.test(C.supabaseUrl));
 const profile = () => { try { return JSON.parse(LS.getItem('bt_profile')); } catch (e) { return null; } };
 const enabled = () => configured() && !!btCfg().leaderboard && !!profile();
 const getS = () => { try { return JSON.parse(LS.getItem(SK)); } catch (e) { return null; } };
 const putS = r => LS.setItem(SK, JSON.stringify({access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600), uid: r.user && r.user.id}));

 async function call(path, body, token) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
  try {
   const res = await fetch(C.supabaseUrl.replace(/\/+$/, '') + path, {method: 'POST', signal: ctl.signal,
    headers: {'Content-Type': 'application/json', apikey: C.anonKey, Authorization: 'Bearer ' + (token || C.anonKey)}, body: JSON.stringify(body || {})});
   let data = null; try { data = await res.json(); } catch (e) {}
   if (!res.ok) { const err = new Error('http_' + res.status); err.status = res.status; err.data = data; throw err; }
   return data;
  } finally { clearTimeout(t); }
 }

 let pending = null;
 async function session() {
  const s = getS(), now = Math.floor(Date.now() / 1000);
  if (s && s.expires_at - 60 > now) return s;
  if (pending) return pending;
  pending = (async () => {
   try {
    if (s && s.refresh_token) {
     try { putS(await call('/auth/v1/token?grant_type=refresh_token', {refresh_token: s.refresh_token})); return getS(); }
     catch (e) { if (!(e.status >= 400 && e.status < 500)) throw e; }          // a network problem keeps your identity; only a rejected token starts a new one
    }
    putS(await call('/auth/v1/signup', {data: {}, gotrue_meta_security: {}})); return getS();   // anonymous sign-in: no email, no password
   } finally { pending = null; }
  })();
  return pending;
 }
 const rpc = async (fn, args) => { const s = await session(); return call('/rest/v1/rpc/' + fn, args, s.access_token); };

 async function join(nick, avatar) { try { return (await rpc('register_player', {p_nick: nick, p_avatar: avatar})) || {ok: false, error: 'network'}; } catch (e) { return {ok: false, error: 'network', code: e && e.message}; } }
 const board = game => rpc('get_board', {p_game: game || 'all'});
 const me = async () => { try { const r = await rpc('get_me', {}); if (r && r.joined) { LS.setItem('bt_lb_tier', String(r.best_tier)); LS.setItem('bt_lb_me', JSON.stringify(r)); if (window.BT && BT.checkAch) BT.checkAch(); } return r; } catch (e) { return null; } };
 const profileOf = nick => rpc('get_profile', {p_nick: nick});
 const report = nick => rpc('report_player', {p_nick: nick});
 // coin rewards from weekly / season results: given once, then confirmed to the server
 async function claim() {
  if (!enabled() || !window.BT || !BT.grant) return;
  try {
   const list = await rpc('get_rewards', {}); if (!Array.isArray(list) || !list.length) return;
   let done; try { done = JSON.parse(LS.getItem('bt_lb_claimed')) || []; } catch (e) { done = []; }
   const ids = [];
   list.forEach(x => { if (!done.includes(x.id)) { BT.grant(x.coins, x.label); done.push(x.id); } ids.push(x.id); });
   LS.setItem('bt_lb_claimed', JSON.stringify(done.slice(-300)));
   await rpc('ack_rewards', {p_ids: ids});
  } catch (e) { /* offline: tried again next time */ }
 }
 // ----- Cloud save: automatic backup, restored later with nickname + a 10-digit code -----
 const CK = 'bt_cloud_code';
 const digits = s => String(s || '').replace(/\D/g, '');
 const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h) + ':' + s.length; };
 const cloud = {
  on: () => LS.getItem('bt_cloud') === '1' && digits(LS.getItem(CK)).length === 10,
  code: () => digits(LS.getItem(CK)),
  pretty: c => c.slice(0, 5) + ' ' + c.slice(5),
  newCode() { const out = []; while (out.length < 10) { const b = crypto.getRandomValues(new Uint8Array(16)); for (const x of b) if (x < 250 && out.length < 10) out.push(x % 10); } return out.join(''); },
  async sync(force) {
   if (!cloud.on() || !configured() || !profile() || !window.BT || !BT.saveString) return {ok: false, error: 'off'};
   const s = BT.saveString(), h = hashStr(s);
   if (!force && LS.getItem('bt_cloud_h') === h) return {ok: true, same: true};
   try { const r = await rpc('cloud_save', {p_nick: profile().name, p_code: cloud.code(), p_blob: s}); if (r && r.ok) LS.setItem('bt_cloud_h', h); return r || {ok: false, error: 'network'}; }
   catch (e) { return {ok: false, error: 'network'}; }
  },
  async enable() {
   if (!configured()) return {ok: false, error: 'not_configured'};
   if (!profile()) return {ok: false, error: 'no_profile'};
   LS.setItem(CK, cloud.newCode()); LS.setItem('bt_cloud', '1'); LS.removeItem('bt_cloud_h');
   const r = await cloud.sync(true);
   if (!(r && r.ok)) { LS.removeItem(CK); LS.removeItem('bt_cloud'); return {ok: false, error: (r && r.error) || 'network'}; }
   return {ok: true, code: cloud.code(), nick: profile().name};
  },
  async disable() { let ok = true; try { const r = await rpc('cloud_delete', {}); ok = !!(r && r.ok); } catch (e) { ok = false; } LS.removeItem(CK); LS.removeItem('bt_cloud'); LS.removeItem('bt_cloud_h'); return {ok}; },
  async restore(nick, code) {
   if (!configured()) return {ok: false, error: 'not_configured'};
   const c = digits(code); if (c.length !== 10) return {ok: false, error: 'wrong'};
   let r; try { r = await rpc('cloud_restore', {p_nick: String(nick || '').trim(), p_code: c}); } catch (e) { return {ok: false, error: 'network'}; }
   if (!r || !r.ok) return r || {ok: false, error: 'network'};
   LS.setItem(CK, c); LS.setItem('bt_cloud', '1'); LS.setItem('bt_cloud_h', hashStr(r.blob));
   if (!BT.applySave(r.blob)) { LS.removeItem(CK); LS.removeItem('bt_cloud'); LS.removeItem('bt_cloud_h'); return {ok: false, error: 'bad_save'}; }
   return {ok: true};   // the page reloads
  }
 };
 function cloudLoop() { cloud.sync().catch(() => {}); setTimeout(cloudLoop, 45000); }
 // ----- division names and badges (shared by the board and the profiles) -----
 const TIERS = [['Bronze', '🥉', '#cd7f32'], ['Silver', '🥈', '#c0c0c0'], ['Gold', '🥇', '#ffd700'], ['Platinum', '💠', '#7fe5e0'], ['Diamond', '💎', '#6ec6ff'], ['Master', '🔮', '#c77dff'], ['Legend', '🔥', '#ff7a18']];
 const tierOf = d => Math.min(6, Math.floor(d / 3));
 const divName = d => tierOf(d) === 6 ? 'Legend' : TIERS[tierOf(d)][0] + ' ' + (3 - d % 3);
 let gid = 0;
 const SHAPES = ['M20 2L36 8V22C36 32 29 39 20 42C11 39 4 32 4 22V8Z', 'M20 2L36 10L33 28L20 42L7 28L4 10Z', 'M20 3A18 18 0 1 1 19.99 3Z', 'M20 2L38 22L20 42L2 22Z', 'M10 4H30L38 16L20 42L2 16Z', 'M20 2L25 14L38 15L28 24L32 38L20 30L8 38L12 24L2 15L15 14Z', 'M4 38V12L12 20L20 4L28 20L36 12V38Z'];
 const PIPY = [30, 30, 30, 28, 26, 22, 32];
 // a badge drawn in SVG: the shape tells the division family (so it works without colour), the dots tell the step
 function shield(dv, size, noPips) {
  const t = tierOf(dv), col = TIERS[t][2], id = 'sg' + (++gid), pips = t === 6 ? 3 : dv % 3 + 1;
  let p = '';
  if (!noPips) for (let i = 0; i < pips; i++) p += '<circle cx="' + (20 + (i - (pips - 1) / 2) * 7) + '" cy="' + PIPY[t] + '" r="2.4" fill="#fff" fill-opacity=".95"/>';
  return '<svg class="shield' + (t === 6 ? ' legend' : '') + '" width="' + size + '" height="' + Math.round(size * 1.1) + '" viewBox="0 0 40 44" aria-hidden="true" style="vertical-align:middle"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '"/><stop offset="1" stop-color="' + col + '" stop-opacity=".55"/></linearGradient></defs><path d="' + SHAPES[t] + '" fill="url(#' + id + ')" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>' + p + '</svg>';
 }
 const sup = n => String(n).replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
 const badge = (t, cnt) => shield(t * 3, 20, true) + (cnt >= 2 ? '<span class="sup">' + sup(cnt) + '</span>' : '');   // 🥇² = finished 2 seasons in Gold
 async function deleteMe() { try { const r = await rpc('delete_me', {}); LS.removeItem(SENT); LS.removeItem('bt_lb_tier'); LS.removeItem('bt_lb_me'); if (cloud.on()) cloud.disable(); return r; } catch (e) { return {ok: false, error: 'network'}; } }

 // ----- sending wins: only entries not sent before, a few seconds after a win, quietly retried later -----
 const ledger = () => { try { return JSON.parse(LS.getItem('bt_ledger')) || []; } catch (e) { return []; } };
 let timer = null, busy = false;
 async function submitNow() {
  if (!enabled() || busy) return;
  busy = true;
  try {
   const last = Number(LS.getItem(SENT)) || 0, fresh = ledger().filter(e => e.t === 'win' && e.ts > last).slice(0, 50);
   if (!fresh.length) return;
   const payload = fresh.map(e => ({g: e.g, l: e.l, s: e.s, bp: e.bp, ts: e.ts, h: e.h}));
   let r = await rpc('submit_entries', {p_entries: payload});
   if (r && r.error === 'not_joined') { const p = profile(); if (p && (await join(p.name, p.avatar)).ok) r = await rpc('submit_entries', {p_entries: payload}); }
   if (r && r.ok) { const top = Math.max.apply(null, fresh.map(e => e.ts)); LS.setItem(SENT, String(top)); if (ledger().some(e => e.t === 'win' && e.ts > top)) queue(); }
  } catch (e) { /* offline, paused or busy: it is tried again after the next win */ } finally { busy = false; }
 }
 function queue() { clearTimeout(timer); timer = setTimeout(submitNow, 4000); }

 window.LB = {build: '1.0.0', configured, enabled, join, board, deleteMe, queueSubmit: queue, submitNow, me, profileOf, report, claim, TIERS, tierOf, divName, badge, shield, cloud};
 document.addEventListener('DOMContentLoaded', () => { if (enabled()) { queue(); setTimeout(() => { claim(); me(); }, 2500); }
  if (cloud.on()) setTimeout(cloudLoop, 4000); });   // sends anything that was waiting
})();
