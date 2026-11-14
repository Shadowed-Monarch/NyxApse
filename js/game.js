/* game.js - shared NyxApse logic: ranks, streak, stats, sounds, save tools, UX helpers */
const BT_RANKS = [
 {name:'Student',min:0,icon:'🎓'},{name:'Scholar',min:500,icon:'📜'},{name:'Sage',min:1500,icon:'🦉'},
 {name:'Genius',min:3000,icon:'💡'},{name:'Prodigy',min:6000,icon:'⚡'},{name:'Mastermind',min:10000,icon:'👑'},
 {name:'Grandmaster',min:20000,icon:'🏆'},{name:'Overlord',min:50000,icon:'🌌'}];
const BT_GAMES = {math:'Math',dots:'Dots',memory:'Memory',focus:'Focus',aim:'Aim',reflex:'Reflex',odd:'Odd One Out',nback:'N-Back'};
const BT = {};
(function () {
 const LS = localStorage, rawSet = Storage.prototype.setItem, si = window.setInterval;
 const num = k => parseInt(LS.getItem(k)) || 0;
 const PAGES = {'math.html':'math','dots.html':'dots','memory.html':'memory','stroop.html':'focus','aim.html':'aim','avoid.html':'reflex','oddout.html':'odd','nback.html':'nback'};
 const FILES = {math:'math.html',dots:'dots.html',memory:'memory.html',focus:'stroop.html',aim:'aim.html',reflex:'avoid.html',odd:'oddout.html',nback:'nback.html'};
 const KEY = PAGES[location.pathname.split('/').pop()];
 BT.daily = () => { let h = 0; for (const ch of BT.today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const k = Object.keys(BT_GAMES); return {key: k[h % k.length], need: 2 + (h >> 3) % 3}; };
 const SALT = 'bt1-Shadowed-7f3a', PROT = k => /^bt_(coins|unlocked_.+|skins|current_skin|wins|ach|streak|daily_total|pb|wallet|cal|best_streak|daily_prog|ledger|lbase|lanchor)$/.test(k);
 const hash = s => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
 let noSign = false, tamperMsg = '';
 const snap = () => JSON.stringify(Object.fromEntries(Object.keys(LS).filter(PROT).sort().map(k => [k, LS.getItem(k)])));
 const sign = () => { const s = snap(); rawSet.call(LS, 'bt_sig', hash(SALT + s)); rawSet.call(LS, 'bt_bk', s); rawSet.call(LS, 'bt_bksig', hash(SALT + 'bk' + s)); };
 BT.build = '1.0.0';
 BT.raw = (k, v) => { rawSet.call(LS, k, v); if (!noSign && PROT(k)) sign(); };
 // Anti-tamper: progress is signed; edits made in DevTools are detected and undone
 function verifySig() {
  const sig = LS.getItem('bt_sig'), s = snap();
  if (!sig && !LS.getItem('bt_bksig')) { if (s !== '{}') sign(); return; }   // fresh or pre-update save
  if (hash(SALT + s) === sig) return;
  const bk = LS.getItem('bt_bk'); let ok = false;
  noSign = true;
  Object.keys(LS).filter(PROT).forEach(k => LS.removeItem(k));
  if (bk && hash(SALT + 'bk' + bk) === LS.getItem('bt_bksig')) { try { const o = JSON.parse(bk); Object.keys(o).forEach(k => rawSet.call(LS, k, o[k])); ok = true; } catch (e) {} }
  noSign = false; sign();
  tamperMsg = ok ? '⚠️ Save was edited outside the game. Your last real progress was restored.' : '⚠️ Save was edited outside the game, so progress was reset.';
  if (document.body) { toast(tamperMsg); tamperMsg = ''; }
 }
 // ---------- Earnings ledger: every reward is a chained log entry, and your totals must match the log ----------
 const LEDGER_MAX = 200, GKEYS = ['math', 'dots', 'memory', 'focus', 'aim', 'reflex', 'odd', 'nback'];
 BT.SKINS = Object.fromEntries(BT_SKIN_LIST.map(s => [s.id, s.cost]));   // prices (earned skins can never be bought)
 BT.BONUS = {math: 10, dots: 14, focus: 10, aim: 20, odd: 10, reflex: 0};   // most extra seconds a round can legitimately earn
 BT.MIN_S = {math: 5, dots: 1.5, memory: 2.5, focus: 4, aim: 3, odd: 3, nback: 25};   // fastest believable clear, in seconds
 const lget = () => { try { return JSON.parse(LS.getItem('bt_ledger')) || []; } catch (e) { return []; } };
 const lbase = () => { try { return JSON.parse(LS.getItem('bt_lbase')); } catch (e) { return null; } };
 const lh = (prev, body) => hash(SALT + 'L' + prev + JSON.stringify(body));
 function derive(base, L) {
  const d = {bp: base.bp, c: base.c, w: base.w, u: Object.assign({}, base.u)};
  L.forEach(e => { if (e.t === 'win') { d.bp += e.bp; d.c += e.c; d.w++; d.u[e.g] = Math.max(d.u[e.g] || 1, e.l + 1); } else d.c += e.c; });
  return d;
 }
 function chainBreak(L, anchor) { let prev = anchor; for (let i = 0; i < L.length; i++) { const {h, ...body} = L[i]; if (lh(prev, body) !== h) return i; prev = h; } return -1; }
 function ledgerAdd(e) {
  let L = lget(), base = lbase(), anchor = LS.getItem('bt_lanchor') || '';
  const prev = L.length ? L[L.length - 1].h : anchor, body = Object.assign({}, e, {ts: Date.now()});
  L.push(Object.assign({}, body, {h: lh(prev, body)}));
  if (L.length > LEDGER_MAX) { const old = L.splice(0, 50); base = derive(base, old); anchor = old[old.length - 1].h; BT.raw('bt_lbase', JSON.stringify(base)); BT.raw('bt_lanchor', anchor); }
  BT.raw('bt_ledger', JSON.stringify(L));
 }
 const bonus = (c, why) => { ledgerAdd({t: 'bonus', why, c}); BT.raw('bt_wallet', num('bt_wallet') + c); };
 BT.grant = (c, why) => { c = Math.floor(Number(c)); if (c > 0 && c <= 3000) { bonus(c, String(why || 'reward').slice(0, 60)); toast('🏆 ' + String(why || 'Reward').slice(0, 40) + ' · +' + c + ' 🪙'); } };   // leaderboard coin rewards
 function spend(c) { ledgerAdd({t: 'buy', c: -c}); BT.raw('bt_wallet', num('bt_wallet') - c); BT.lastSpend = {amt: c, t: Date.now()}; }
 function checkLedger() {
  let base = lbase(), L = lget(), flagged = false;
  if (!base) {   // first run (or a save from before the ledger): today's totals become the starting point
   const w0 = LS.getItem('bt_wallet') === null ? 500 : num('bt_wallet'), u = {};
   GKEYS.forEach(k => { u[k] = num('bt_unlocked_' + k) || 1; });
   base = {bp: num('bt_coins'), c: w0, w: num('bt_wins'), u};
   noSign = true; rawSet.call(LS, 'bt_lbase', JSON.stringify(base)); rawSet.call(LS, 'bt_lanchor', hash(SALT + 'G' + JSON.stringify(base)));
   rawSet.call(LS, 'bt_ledger', '[]'); rawSet.call(LS, 'bt_wallet', String(w0)); noSign = false; sign(); return;
  }
  const bad = chainBreak(L, LS.getItem('bt_lanchor') || '');
  noSign = true;
  if (bad >= 0) { L = L.slice(0, bad); rawSet.call(LS, 'bt_ledger', JSON.stringify(L)); flagged = true; }
  const d = derive(base, L);
  const fix = (k, val, cur) => { if (cur === val || (val === 1 && LS.getItem(k) === null)) return; if (cur > val) flagged = true; rawSet.call(LS, k, String(val)); };   // too high = edited, too low = heal
  fix('bt_coins', d.bp, num('bt_coins')); fix('bt_wallet', d.c, num('bt_wallet')); fix('bt_wins', d.w, num('bt_wins'));
  GKEYS.forEach(k => fix('bt_unlocked_' + k, d.u[k] || 1, num('bt_unlocked_' + k) || 1));
  noSign = false; sign();
  if (flagged) { tamperMsg = '⚠️ Some numbers did not match your play history, so they were set back.'; if (document.body) { toast(tamperMsg); tamperMsg = ''; } }
 }
 function verify() { verifySig(); checkLedger(); }
 verify();
 BT.TIMERS = {math: {base: 30, min: -10, max: 20}, dots: {base: 9, min: -3, max: 10}, memory: {base: 3, min: -1, max: 3}, focus: {base: 30, min: -10, max: 20}, aim: {base: 25, min: -10, max: 20}, reflex: {base: 20, min: -10, max: 20, inverse: true}, odd: {base: 30, min: -10, max: 20}};
 BT.off = k => { const d = BT.TIMERS[k]; if (!d) return 0; const o = Number(((btCfg().timers) || {})[k]) || 0; return Math.max(d.min, Math.min(d.max, Math.round(o))); };
 BT.time = (k, base) => Math.max(3, Math.round(base + BT.off(k)));
 BT.timeFactor = k => { const d = BT.TIMERS[k]; if (!d) return 1; const o = BT.off(k); return Math.max(0.5, Math.min(1.5, d.inverse ? (d.base + o) / d.base : d.base / (d.base + o))); };
 BT.reward = l => l <= 30 ? l * 5 : 150 + Math.floor(Math.sqrt(l - 30)) * 5;
 BT.rank = bp => BT_RANKS.filter(r => bp >= r.min).pop();
 BT.today = () => new Date().toDateString();
 const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
 BT.streak = () => { const l = LS.getItem('bt_last_day'); if (!l) return 0; const y = new Date(Date.now() - 864e5).toDateString(); return (l === BT.today() || l === y) ? num('bt_streak') : 0; };
 BT.cal = () => { try { return JSON.parse(LS.getItem('bt_cal')) || {}; } catch (e) { return {}; } };
 BT.markDay = v => { const c = BT.cal(), k = iso(new Date()); if ((c[k] || 0) < v) { c[k] = v; BT.raw('bt_cal', JSON.stringify(c)); } };

 // Pause every game timer while the tab is hidden
 window.setInterval = (f, t, ...a) => si(() => { if (!document.hidden && !BT.paused) f(...a); }, t, ...a);
 BT.sync = () => document.documentElement.classList.toggle('bt-paused', document.hidden || !!BT.paused);
 document.addEventListener('visibilitychange', BT.sync);

 // Time trained (the streak now counts days with a win)
 si(() => { if (!document.hidden) BT.raw('bt_time_s', num('bt_time_s') + 5); }, 5000);

 // Sound effects + vibration (toggle with localStorage bt_sfx = 'off')
 let ctx;
 function beep(notes) {
  if (btCfg().sfx === false || LS.getItem('bt_sfx') === 'off') return;
  try {
   ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
   if (ctx.state === 'suspended') ctx.resume();
   let at = ctx.currentTime;
   notes.forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.3, at); g.gain.exponentialRampToValueAtTime(0.001, at + d);
    o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + d); at += d * 0.8;
   });
  } catch (e) {}
 }
 const buzz = p => btCfg().vibe !== false && navigator.vibrate && navigator.vibrate(p);
 function toast(msg) {
  const d = document.createElement('div'); d.textContent = msg;
  d.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:var(--accent);color:#000;padding:10px 18px;border-radius:20px;font-weight:bold;z-index:99999;box-shadow:0 4px 20px #0008;max-width:90vw;text-align:center';
  document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
 }

 // Any increase of bt_coins = a win: sound, stats, daily bonus, rank-up
 let busy = false;
 BT.ctx = null;
 const reject = () => { BT.blocked = (BT.blocked || 0) + 1; if (document.body) toast('⚠️ That change was not earned in a game, so it was undone.'); };
 function onWin(ctx) {
  if (ctx.lvl > (num('bt_unlocked_' + KEY) || 1)) { reject(); return; }   // you can't win a level you haven't reached
  busy = true;
  const lvl = ctx.lvl, old = num('bt_coins'), tf = BT.timeFactor(KEY), tday = BT.today(), lday = LS.getItem('bt_last_day'), msgs = [];
  const bpGain = Math.round(BT.reward(lvl) * tf);                        // the game never decides the reward, this code does
  let gain = Math.round((5 + Math.min(lvl, 50)) * tf);
  if (lday !== tday) {                                                   // streak: only days with a win count
   const yd = new Date(Date.now() - 864e5).toDateString(), sk = lday === yd ? num('bt_streak') + 1 : 1;
   BT.raw('bt_streak', sk); BT.raw('bt_last_day', tday); if (sk > num('bt_best_streak')) BT.raw('bt_best_streak', sk);
  }
  BT.markDay(1);
  if (LS.getItem('bt_bonus_date') !== tday) { BT.raw('bt_bonus_date', tday); const b = Math.min(BT.streak(), 7) * 10; gain += b; msgs.push('🔥 Streak bonus +' + b + ' 🪙'); }
  const dc = BT.daily();                                                 // daily challenge: win the chosen game N times today
  if (KEY === dc.key && LS.getItem('bt_daily_done') !== tday) {
   let pr; try { pr = JSON.parse(LS.getItem('bt_daily_prog')) || {}; } catch (e) { pr = {}; }
   if (pr.d !== tday) pr = {d: tday, n: 0};
   pr.n++; BT.raw('bt_daily_prog', JSON.stringify(pr));
   if (pr.n >= dc.need) { BT.raw('bt_daily_done', tday); BT.raw('bt_daily_total', num('bt_daily_total') + 1); BT.markDay(2); gain += 60; msgs.push('🎯 Daily challenge complete! +60 🪙'); }
   else msgs.push('🎯 Daily challenge ' + pr.n + '/' + dc.need);
  }
  const sec = Math.round(ctx.sec * 10) / 10;
  if (BT.off(KEY) === 0) {                                               // best times only count at the normal timer
   let pb; try { pb = JSON.parse(LS.getItem('bt_pb')) || {}; } catch (e) { pb = {}; }
   pb[KEY] = pb[KEY] || {}; const prev = pb[KEY][lvl];
   if (!prev || sec < prev) { pb[KEY][lvl] = sec; BT.raw('bt_pb', JSON.stringify(pb)); if (prev) msgs.push('⚡ New best: ' + sec + 's'); }
  }
  BT.t0 = 0;
  ledgerAdd({t: 'win', g: KEY, l: lvl, s: sec, bp: bpGain, c: gain});     // the log entry comes first, the totals follow it
  const bp = old + bpGain;
  BT.raw('bt_coins', bp); BT.raw('bt_wallet', num('bt_wallet') + gain); BT.raw('bt_wins', num('bt_wins') + 1);
  if ((num('bt_unlocked_' + KEY) || 1) === lvl) BT.raw('bt_unlocked_' + KEY, lvl + 1);
  BT.lastCoins = gain; BT.lastTF = tf; BT.lastReward = bpGain; BT.newBest = msgs.some(m => m.includes('New best'));
  if (typeof game !== 'undefined' && 'brains' in game) { game.brains = bp; game.updateUI && game.updateUI(); }
  beep([[523,.12],[659,.12],[784,.25]]); buzz(60);
  msgs.forEach((m, i) => setTimeout(() => toast(m), i * 1200));
  confetti(); checkAch();
  if (window.LB && LB.enabled()) LB.queueSubmit();
  const a = BT.rank(old), c = BT.rank(bp);
  if (a !== c) setTimeout(() => toast('🎉 Rank up: ' + c.icon + ' ' + c.name + '!'), 600 + msgs.length * 1200);
  busy = false;
 }
 Storage.prototype.setItem = function (k, v) {
  if (this !== LS || !PROT(k)) return rawSet.call(this, k, v);          // settings, profile and so on are stored normally
  verify();                                                              // undo any outside edit first
  const ctx = BT.ctx;
  if (k === 'bt_coins') { if (ctx && ctx.win && !busy) onWin(ctx); else reject(); return; }
  if (k.indexOf('bt_unlocked_') === 0) {
   const g = k.slice(12), cur = num(k) || 1;
   if (!(ctx && ctx.win && g === ctx.key && Number(v) === ctx.lvl + 1 && (cur === ctx.lvl || cur === ctx.lvl + 1))) reject();   // allowed: the level comes from the win entry below
   return;
  }
  if (k === 'bt_wallet') { const nv = Number(v), cur = num('bt_wallet'); if (Number.isInteger(nv) && nv >= 0 && nv < cur) spend(cur - nv); else reject(); return; }   // only spending
  let own; try { own = JSON.parse(LS.getItem('bt_skins')) || ['red']; } catch (e) { own = ['red']; }
  if (k === 'bt_skins') {
   let nl; try { nl = JSON.parse(v); } catch (e) { nl = null; }
   const add = nl && Array.isArray(nl) ? nl.filter(x => !own.includes(x)) : [];
   if (nl && nl.length === own.length + 1 && own.every(x => nl.includes(x)) && add.length === 1 && BT.SKINS[add[0]] !== undefined && BT.lastSpend && Date.now() - BT.lastSpend.t < 4000 && BT.lastSpend.amt >= BT.SKINS[add[0]]) { BT.lastSpend.amt -= BT.SKINS[add[0]]; BT.raw(k, v); } else reject();
   return;
  }
  if (k === 'bt_current_skin') { if (own.includes(v)) BT.raw(k, v); else reject(); return; }
  reject();                                                              // everything else can only be changed by the game's own code
 };

 function confetti() {
  if (btCfg().confetti === false) return;
  const cols = ['#ff0055','#ffcc00','#00ff88','#00ccff','#9900ff'];
  for (let i = 0; i < 40; i++) {
   const e = document.createElement('div');
   e.style.cssText = 'position:fixed;top:-10px;left:' + Math.random() * 100 + 'vw;width:8px;height:12px;background:' + cols[i % 5] + ';z-index:99999;pointer-events:none';
   document.body.appendChild(e);
   e.animate([{transform:'translateY(0) rotate(0deg)',opacity:1},{transform:'translateY(105vh) rotate(' + (360 + Math.random() * 360) + 'deg)',opacity:.8}], {duration: 1500 + Math.random() * 1500, easing:'ease-in'}).onfinish = () => e.remove();
  }
 }
 BT.confetti = confetti;
 const ACH = [
  {id:'first',icon:'🏁',name:'First Win',test:() => num('bt_wins') >= 1},
  {id:'w50',icon:'💪',name:'50 Wins',test:() => num('bt_wins') >= 50},
  {id:'s3',icon:'🔥',name:'3-Day Streak',test:() => BT.streak() >= 3},
  {id:'s7',icon:'⚡',name:'7-Day Streak',test:() => BT.streak() >= 7},
  {id:'l10',icon:'🔟',name:'Level 10',test:() => Object.keys(BT_GAMES).some(k => num('bt_unlocked_' + k) >= 10)},
  {id:'l50',icon:'🚀',name:'Level 50',test:() => Object.keys(BT_GAMES).some(k => num('bt_unlocked_' + k) >= 50)},
  {id:'l100',icon:'💯',name:'Level 100',test:() => Object.keys(BT_GAMES).some(k => num('bt_unlocked_' + k) >= 100)},
  {id:'all',icon:'🎮',name:'All-Rounder',test:() => Object.keys(BT_GAMES).every(k => num('bt_unlocked_' + k) >= 2)},
  {id:'gen',icon:'💡',name:'Genius Rank',test:() => num('bt_coins') >= 3000},
  {id:'skins',icon:'🎨',name:'Collector',test:() => { try { return JSON.parse(LS.getItem('bt_skins')).length >= 10; } catch (e) { return false; } }},
  {id:'daily',icon:'🎯',name:'Challenger',test:() => num('bt_daily_total') >= 1},
  {id:'hour',icon:'⏱',name:'1 Hour Trained',test:() => num('bt_time_s') >= 3600}
 ];
 function grantSkins() {   // earned skins appear on their own once you qualify
  let own; try { own = JSON.parse(LS.getItem('bt_skins')) || ['red']; } catch (e) { own = ['red']; }
  const got = BT_SKIN_LIST.filter(s => s.cond && !own.includes(s.id) && ((s.cond === 'lvl100' && GKEYS.some(k => (num('bt_unlocked_' + k) || 1) >= 100)) || (s.cond === 'streak30' && Math.max(num('bt_best_streak'), BT.streak()) >= 30) || (/^tier\d$/.test(s.cond) && Number(LS.getItem('bt_lb_tier') || -1) >= Number(s.cond.slice(4)))));
  if (got.length) { BT.raw('bt_skins', JSON.stringify(own.concat(got.map(s => s.id)))); got.forEach((s, i) => setTimeout(() => toast('🎨 New skin unlocked: ' + s.name + '!'), 1500 + i * 1200)); }
 }
 function checkAch() {
  grantSkins();
  let got; try { got = JSON.parse(LS.getItem('bt_ach')) || []; } catch (e) { got = []; }
  const fresh = ACH.filter(a => !got.includes(a.id) && a.test());
  if (fresh.length) { BT.raw('bt_ach', JSON.stringify(got.concat(fresh.map(a => a.id)))); bonus(25 * fresh.length, 'badge'); fresh.forEach((a, i) => setTimeout(() => toast('🏅 Achievement: ' + a.icon + ' ' + a.name + ' +25 🪙'), 2500 + i * 1200)); }
  return got.concat(fresh.map(a => a.id));
 }
 BT.checkAch = checkAch; BT.achTotal = ACH.length;
 const HOW = {
  math:'Type the answer to the falling equation. Solve 10 to clear the level. Each correct answer adds 1 second.',
  dots:'Tap the numbered dots in order, starting from 1, before time runs out. A wrong tap fails the level.',
  memory:'Watch the glowing blocks, then tap all of them from memory. One wrong tap fails the level.',
  focus:'Tap or type the COLOR of the word, not the word itself. Solve 10 to clear the level.',
  odd:'Tap the one shape that is different from the others (color, size or rotation). Find 10 to clear the level. A wrong tap costs 3 seconds.',
  aim:'Two bubbles fall at once. Tap them before they reach the bottom. Pop 15 to clear the level (the goal rises to 20 by level 100).',
  reflex:'Move your mouse or finger to dodge the falling bubbles. Survive until the timer reaches 0.',
  nback:'A square lights up on the grid, one at a time. Tap SAME when the lit square is where it was N steps ago (N is shown on screen). 3 mistakes fail the level.'
 };
 function showHelp(k) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px';
  o.innerHTML = '<div style="max-width:340px;background:#111;color:#fff;border:2px solid var(--accent);border-radius:16px;padding:22px;text-align:center;line-height:1.5"><h2 style="margin-top:0">' + BT_GAMES[k] + ': how to play</h2><p>' + HOW[k] + '</p><button style="padding:10px 28px;border-radius:20px;border:2px solid var(--accent);background:none;color:#fff;cursor:pointer;font-size:1rem">Got it</button></div>';
  o.querySelector('button').onclick = () => { o.remove(); BT.raw('bt_seen_' + k, '1'); };
  document.body.appendChild(o);
 }
 function pause(on) {
  BT.paused = on; BT.sync();
  let o = document.getElementById('bt-pause');
  if (on && !o) {
   o = document.createElement('div'); o.id = 'bt-pause';
   o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);color:#fff;z-index:99997;display:flex;flex-direction:column;align-items:center;justify-content:center';
   o.innerHTML = '<h1>⏸ PAUSED</h1><button style="padding:12px 34px;border-radius:25px;border:2px solid var(--accent);background:none;color:#fff;cursor:pointer;font-size:1.2rem">Resume</button>';
   o.querySelector('button').onclick = () => pause(false);
   document.body.appendChild(o);
  }
  if (!on && o) o.remove();
 }

 const WIN_MSGS = ["🔥 LEVEL CRUSHED!", "💥 THAT WAS CLEAN!", "⚡ YOU'RE ON FIRE!", "🧠 BIG BRAIN ENERGY!", "🚀 LEVEL UP, LEGEND!", "😤 UNSTOPPABLE!", "🏆 ABSOLUTE WIN!", "✨ SHARP. VERY SHARP."];
 const LOSE_MSGS = ["So close. Run it back! 🔥", "Warm-up round. Go again! 💪", "That one stung. The next one's yours! ⚡", "Almost! Your brain is getting sharper. 🧠", "Every legend drops a round. Again! 🚀", "Shake it off. You've got this! 😤"];
 const TIME_MSGS = ["⏱️ The clock won that one. Beat it next time!", "⏱️ Just a few seconds short. Go again! 🔥", "⏱️ So close! Speed it up. You can do it! ⚡"];
 const HIT_MSGS = ["💥 Clipped! Dodge it back!", "😤 The bubbles got you. Not next time!", "🔥 One tiny slip. Run it back!"];
 const pick = (arr, key) => { let i; do { i = Math.floor(Math.random() * arr.length); } while (arr.length > 1 && i === BT['_last' + key]); BT['_last' + key] = i; return arr[i]; };
 function resultMessage(h, original) {
  const lose = original.includes('💀'), lvl = typeof selectedLvl !== 'undefined' ? selectedLvl : '';
  const p = document.createElement('p'); p.style.cssText = 'margin:6px 0 0;font-size:1.05rem;opacity:.85;max-width:90%';
  if (lose) {
   h.textContent = pick(/WASTED/i.test(original) ? HIT_MSGS : /TIME/i.test(original) ? TIME_MSGS : LOSE_MSGS, 'l');
   let n = 1; try { n = (parseInt(sessionStorage.getItem('bt_ls_' + KEY + '_' + lvl)) || 0) + 1; sessionStorage.setItem('bt_ls_' + KEY + '_' + lvl, n); } catch (e) {}
   p.textContent = n >= 3 ? 'Tip: use ◀ to warm up on an easier level, then come back stronger. 💪' : 'Level ' + lvl + ' is waiting. Try again!';
  } else {
   h.textContent = pick(WIN_MSGS, 'w');
   try { sessionStorage.removeItem('bt_ls_' + KEY + '_' + lvl); } catch (e) {}
   p.textContent = '+' + (BT.lastReward || BT.reward(lvl)) + ' BP · +' + (BT.lastCoins || 0) + ' 🪙 · Level ' + lvl + ' cleared' + (BT.lastTF && BT.lastTF !== 1 ? ' · timer ×' + BT.lastTF.toFixed(2) : '') + (BT.newBest ? ' · ⚡ New best time!' : '');
  }
  h.after(p);
 }

 // Save tools
 BT.exportSave = () => {
  const o = {}; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k.startsWith('bt_')) o[k] = LS.getItem(k); }
  const s = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(() => alert('Save code copied!'), () => prompt('Copy your save code:', s));
 };
 BT.importSave = () => {
  const s = prompt('Paste your save code:'); if (!s) return;
  try { const o = JSON.parse(decodeURIComponent(escape(atob(s.trim())))); const body = JSON.stringify(Object.fromEntries(Object.keys(o).filter(PROT).sort().map(k => [k, o[k]])));
   if (!o.bt_sig || hash(SALT + body) !== o.bt_sig) { alert('Invalid, edited or old save code. Export a fresh code from the updated game.'); return; }
   Object.keys(LS).filter(PROT).forEach(k => LS.removeItem(k)); noSign = true;
   Object.keys(o).forEach(k => k.startsWith('bt_') && rawSet.call(LS, k, o[k])); noSign = false; sign(); location.reload(); }
  catch (e) { alert('Invalid save code.'); }
 };
 BT.resetSave = () => {
  if (confirm('Erase ALL progress? This cannot be undone.')) { Object.keys(LS).filter(k => k.startsWith('bt_')).forEach(k => LS.removeItem(k)); location.reload(); }
 };

 document.addEventListener('DOMContentLoaded', () => {
  if (tamperMsg) { toast(tamperMsg); tamperMsg = ''; }
  const st = document.createElement('style');
  st.textContent = '.bt-paused *{animation-play-state:paused!important}';
  document.head.appendChild(st);

  // Home / About: stats and rank table
  const s = document.getElementById('bt-stats');
  if (s) s.innerHTML = '🔥 ' + BT.streak() + '-day streak · 🏁 ' + num('bt_wins') + ' wins · ⏱ ' + Math.round(num('bt_time_s') / 60) + ' min trained<br>' +
   Object.entries(BT_GAMES).map(([k, n]) => n + ' L' + (num('bt_unlocked_' + k) || 1)).join(' · ');
  const rl = document.getElementById('rank-list');
  if (rl) rl.innerHTML = BT_RANKS.map((r, i) => { const n = BT_RANKS[i + 1];
   return '<li><span class="rank-name">' + r.icon + ' ' + r.name.toUpperCase() + '</span> <span class="rank-val">' + r.min.toLocaleString() + (n ? ' - ' + (n.min - 1).toLocaleString() : '+') + ' BP (🧠)</span></li>'; }).join('');

  // Game pages: lose sound + level picker
  const gc = document.getElementById('game-container');
  if (gc) {
   let said = false;
   new MutationObserver(() => {
    const b = document.getElementById('btn-container'); if (!b) return;
    const show = getComputedStyle(b).display !== 'none', h = b.querySelector('h1');
    if (!show) { said = false; return; }
    if (said || !h || h.dataset.bt) return;
    const t = h.textContent, lose = t.includes('💀');
    if (!lose && !/CLEAR|SURVIVED/i.test(t)) return;
    said = true; h.dataset.bt = '1';
    if (lose) { beep([[220,.2],[165,.35]]); buzz([120,60,120]); }
    resultMessage(h, t);
   }).observe(gc, {childList: true, subtree: true, attributes: true});
  }
  const key = PAGES[location.pathname.split('/').pop()], d = document.getElementById('lvl-display');
  if (key && d) {
   const mk = (txt, dl) => {
    const b = document.createElement('button'); b.textContent = txt;
    b.setAttribute('aria-label', dl > 0 ? 'Next level' : 'Previous level');
    b.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;margin:0 6px;padding:0 8px;min-width:34px;min-height:34px;font-size:1rem';
    b.onclick = () => {
     if (typeof game === 'undefined' || game.isPlaying) return;
     selectedLvl = Math.min(num('bt_unlocked_' + key) || 1, Math.max(1, selectedLvl + dl));
     game.updateUI && game.updateUI();
    };
    return b;
   };
   d.before(mk('◀', -1)); d.after(mk('▶', 1));
  }

  // Focus game: tap-to-answer color buttons (better on phones)
  const ans = document.getElementById('ans'), ia = document.getElementById('input-area');
  if (ans && ia && typeof colorList !== 'undefined') {
   ans.setAttribute('inputmode', 'none'); document.documentElement.classList.add('bt-colors');
   const row = document.createElement('div');
   row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px;width:95%;max-width:800px';
   colorList.forEach(c => {
    const b = document.createElement('button'); b.textContent = c.name;
    b.className = 'fbtn'; b.dataset.sym = c.sym || ''; b.style.setProperty('--c', c.hex); b.style.setProperty('--cb', c.cb || c.hex);
    b.style.cssText += ';padding:10px 12px;border-radius:10px;background:var(--bg);font-weight:bold;cursor:pointer';
    b.onclick = () => { ans.value = c.name; ans.dispatchEvent(new Event('input')); };
    row.appendChild(b);
   });
   ia.after(row);
  }
  const got = checkAch();
  const dl = document.getElementById('bt-daily');
  if (dl) {
   const k = BT.daily(), done = LS.getItem('bt_daily_done') === BT.today(); let pr; try { pr = JSON.parse(LS.getItem('bt_daily_prog')) || {}; } catch (e) { pr = {}; }
   const n = pr.d === BT.today() ? pr.n : 0;
   dl.innerHTML = done ? '✅ Daily challenge complete! Come back tomorrow.' : '🎯 Daily challenge: win <a href="' + FILES[k.key] + '" style="color:var(--accent)">' + BT_GAMES[k.key] + '</a> ' + k.need + ' times today (' + n + '/' + k.need + ') · +60 🪙';
  }
  const ac = document.getElementById('bt-ach');
  if (ac) ac.innerHTML = ACH.map(a => '<div title="' + a.name + '" style="width:76px;text-align:center;font-size:.65rem;opacity:' + (got.includes(a.id) ? 1 : .25) + '"><div style="font-size:1.7rem">' + a.icon + '</div>' + a.name + '</div>').join('');
  const cl = document.getElementById('bt-cal');
  if (cl) {
   let mo = new Date(); mo = new Date(mo.getFullYear(), mo.getMonth(), 1);
   const draw = () => {
    const cal = BT.cal(), y = mo.getFullYear(), m = mo.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), today = iso(new Date());
    let h = '<div class="cal-head"><button class="header-btn" id="cal-prev" aria-label="Previous month">◀</button><b>' + mo.toLocaleString('en', {month: 'long', year: 'numeric'}) + '</b><button class="header-btn" id="cal-next" aria-label="Next month">▶</button></div>';
    h += '<div class="cal-grid">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => '<span class="cal-dow">' + d + '</span>').join('');
    for (let i = 0; i < first; i++) h += '<span></span>';
    for (let d = 1; d <= days; d++) {
     const k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), v = cal[k] || 0;
     h += '<span class="cal-day' + (v ? ' on' : '') + (k === today ? ' today' : '') + '" title="' + (v === 2 ? 'Daily challenge done' : v ? 'Won a level' : '') + '">' + d + (v === 2 ? '<i>⭐</i>' : '') + '</span>';
    }
    const s = BT.streak();
    h += '</div><div class="cal-foot">🔥 Streak: <b>' + s + '</b> day' + (s === 1 ? '' : 's') + ' · Best: <b>' + Math.max(num('bt_best_streak'), s) + '</b> · ⭐ = daily challenge done</div>';
    cl.innerHTML = h;
    document.getElementById('cal-prev').onclick = () => { mo = new Date(y, m - 1, 1); draw(); };
    document.getElementById('cal-next').onclick = () => { mo = new Date(y, m + 1, 1); draw(); };
   };
   draw();
  }
  if (key && d) {
   const hb = (txt, label, fn) => { const b = document.createElement('button'); b.textContent = txt; b.setAttribute('aria-label', label); b.style.cssText = 'background:none;border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;margin-left:6px;padding:0 8px;min-width:34px;min-height:34px;font-size:1rem'; b.onclick = fn; return b; };
   const pbEl = document.createElement('small'); pbEl.style.cssText = 'display:block;font-size:.65rem;color:var(--subtext);text-align:center';
   d.parentElement.append(hb('?', 'How to play', () => showHelp(key)), hb('⏸', 'Pause', () => { if (typeof game !== 'undefined' && game.isPlaying) pause(true); }), pbEl);
   const showPB = () => { let p; try { p = JSON.parse(LS.getItem('bt_pb')) || {}; } catch (e) { p = {}; } const v = (p[key] || {})[selectedLvl]; pbEl.textContent = v ? '⚡ Best: ' + v + 's' : ''; };
   showPB(); si(showPB, 500);
   if (typeof game !== 'undefined') { const s0 = game.start.bind(game); game.start = () => {
     BT.t0 = Date.now(); BT.active = 0; clearInterval(BT._ai);
     BT._ai = setInterval(() => { BT.active += 0.25; }, 250);              // counts only time the game is really running (not paused, not hidden)
     s0();
     const t0 = typeof game.time === 'number' ? game.time : game.timeLeft;   // the seconds the game gave at the start
     BT.maxActive = (typeof t0 === 'number' && BT.BONUS[KEY] !== undefined) ? t0 + BT.BONUS[KEY] + 4 : Infinity;
    };
    const e0 = game.end.bind(game);
    game.end = (res, ...a) => {
     const sec = BT.t0 ? (Date.now() - BT.t0) / 1000 : 0, need = KEY === 'reflex' ? BT.time('reflex', 20) - 3 : (BT.MIN_S[KEY] || 3);
     BT.ctx = {win: res === 'win' && sec >= need && (BT.active || 0) <= (BT.maxActive || Infinity) && typeof selectedLvl !== 'undefined', key: KEY, lvl: typeof selectedLvl !== 'undefined' ? selectedLvl : 1, sec};
     try { return e0(res, ...a); } finally { BT.ctx = null; clearInterval(BT._ai); }
    };
   }
   if (!LS.getItem('bt_seen_' + key)) showHelp(key);
  }
  // Answer-box pages (Math, Focus): pin the layout to the part of the screen above the keyboard
  if (document.getElementById('input-area')) {
   const vv = window.visualViewport, root = document.documentElement; let base = 0, lastW = 0;
   const fit = () => {
    const h = vv ? vv.height : innerHeight;
    if (innerWidth !== lastW) { lastW = innerWidth; base = h; }
    base = Math.max(base, h);
    root.style.setProperty('--vvh', h + 'px'); root.style.setProperty('--vvt', (vv ? vv.offsetTop : 0) + 'px');
    root.classList.toggle('kb', h < base * 0.75);
    window.scrollTo(0, 0);
   };
   (vv || window).addEventListener('resize', fit); if (vv) vv.addEventListener('scroll', fit); fit();
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
 });
})();
