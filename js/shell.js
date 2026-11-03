/* shell.js - settings, profile, welcome screen, menu and the focus sound (shared by every page) */
(function () {
 const LS = localStorage, $ = s => document.querySelector(s);
 const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦉', '🐺', '🐧', '🦄', '🐲', '🤖'];
 const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
 const num = k => parseInt(LS.getItem(k)) || 0;
 const getProfile = () => { try { return JSON.parse(LS.getItem('bt_profile')); } catch (e) { return null; } };
 const setProfile = p => LS.setItem('bt_profile', JSON.stringify(p));

 // ---------- Focus sound: keeps playing from page to page ----------
 let ctx, src, gain, kind = null;
 function buffer(type) {
  const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), o = buf.getChannelData(0);
  if (type === 'white') { for (let i = 0; i < n; i++) o[i] = (Math.random() * 2 - 1) * 0.5; }
  else if (type === 'pink') {
   let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
   for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.2; b6 = w * 0.115926; }
  } else { let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; o[i] = (last + 0.02 * w) / 1.02; last = o[i]; o[i] *= 3.5; } }
  return buf;
 }
 function applyNoise() {
  const c = btCfg();
  if (c.noise === 'off') { if (gain && ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  if (!gain) { gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); }
  if (kind !== c.noise) {
   if (src) { try { src.stop(); } catch (e) {} }
   src = ctx.createBufferSource(); src.buffer = buffer(c.noise); src.loop = true; src.connect(gain); src.start(); kind = c.noise;
  }
  gain.gain.setTargetAtTime(c.vol, ctx.currentTime, 0.15);
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
 }
 // browsers may block sound until the first tap on a new page
 document.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended' && btCfg().noise !== 'off') ctx.resume().catch(() => {}); }, {passive: true});
 document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (btCfg().noise !== 'off') ctx.resume().catch(() => {}); });
 window.NXaudio = {apply: applyNoise, state: () => ({kind, ctx: ctx && ctx.state})};
 applyNoise();

 // ---------- Modals ----------
 let pausedByModal = false;
 function modal(html, locked) {
  const m = document.createElement('div'); m.className = 'bt-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  if (locked) m.dataset.locked = '1';
  m.innerHTML = '<div class="bt-card">' + html + '</div>';
  const close = () => { m.remove(); if (pausedByModal && !$('.bt-modal')) { BT.paused = false; BT.sync(); pausedByModal = false; } };
  m.addEventListener('click', e => { if (e.target.closest('[data-close]') || (e.target === m && !locked)) close(); });
  document.body.appendChild(m);
  if (typeof game !== 'undefined' && game.isPlaying && !BT.paused) { BT.paused = true; BT.sync(); pausedByModal = true; }
  return {el: m, close};
 }
 document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('menu-open'); const ms = document.querySelectorAll('.bt-modal'), m = ms[ms.length - 1]; if (m && !m.dataset.locked) m.querySelector('[data-close]') && m.querySelector('[data-close]').click(); } });
 const head = t => '<div class="bt-head"><h2>' + t + '</h2><button class="bt-x" data-close aria-label="Close">✕</button></div>';

 // ---------- Settings ----------
 function openSettings() {
  const names = {math: 'Math', dots: 'Dots', memory: 'Memory (look time)', focus: 'Focus', aim: 'Aim', reflex: 'Reflex (survive time)', odd: 'Odd One Out'};
  const seg = (key, opts) => '<div class="seg" data-key="' + key + '">' + opts.map(o => '<button data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
  const sw = (key, label) => '<div class="row"><span>' + label + '</span><input type="checkbox" class="sw" data-key="' + key + '"></div>';
  const timers = Object.keys(BT.TIMERS).map(k => { const d = BT.TIMERS[k];
   return '<div class="row"><span>' + names[k] + '</span><span class="rng"><input type="range" data-timer="' + k + '" min="' + d.min + '" max="' + d.max + '" step="1"><b class="tv"></b></span></div>'; }).join('');
  const m = modal(head('⚙️ Settings') +
   '<h3>🔊 Sound</h3><div class="row"><span>Focus sound</span>' + seg('noise', [['off', 'Off'], ['brown', 'Brown'], ['pink', 'Pink'], ['white', 'White']]) + '</div>' +
   '<div class="row"><span>Volume</span><input type="range" data-key="vol" min="0.05" max="1.5" step="0.05"></div>' + sw('sfx', 'Sound effects') + sw('vibe', 'Vibration') +
   '<h3>🎨 Look</h3><div class="row"><span>Theme</span>' + seg('theme', [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']]) + '</div>' +
   '<div class="row"><span>Style</span>' + seg('style', [['neon', 'Neon'], ['minimal', 'Minimal B&amp;W']]) + '</div>' +
   sw('glow', 'Glow effects') + sw('grain', 'Background grain') + sw('confetti', 'Confetti') + sw('big', 'Large text') + sw('compact', 'Compact layout') +
   '<h3>⏱ Game timers</h3><p class="hint">Change the seconds for each game. More time is easier, so wins pay less; less time pays more.</p>' + timers +
   '<button class="bt-btn" data-act="timers">Reset timers</button>' +
   '<h3>🏆 Leaderboard</h3>' + sw('leaderboard', 'Show me on leaderboards <small>(coming soon)</small>') +
   '<h3>💾 Data</h3><div class="bt-btns"><button class="bt-btn" data-act="export">📤 Export</button><button class="bt-btn" data-act="import">📥 Import</button><button class="bt-btn" data-act="reset">🗑 Reset</button></div>' +
   '<p class="hint">Export copies a save code you can use to back up or move your progress to another device.</p>' +
   '<p class="hint"><a href="about.html">About NyxApse</a></p>');
  const el = m.el, fmt = o => o === 0 ? 'normal' : (o > 0 ? '+' : '−') + Math.abs(o) + 's';
  const lab = k => { const o = BT.off(k); return fmt(o) + (o ? ' · wins pay ×' + BT.timeFactor(k).toFixed(2) : ''); };
  const sync = () => { const c = btCfg();
   el.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', c[s.dataset.key] === b.dataset.v)));
   el.querySelectorAll('input.sw').forEach(i => { i.checked = !!c[i.dataset.key]; });
   const v = el.querySelector('[data-key="vol"]'); v.value = c.vol;
   el.querySelectorAll('[data-timer]').forEach(r => { r.value = BT.off(r.dataset.timer); r.nextElementSibling.textContent = lab(r.dataset.timer); }); };
  el.addEventListener('click', e => {
   const b = e.target.closest('.seg button'), a = e.target.closest('[data-act]');
   if (b) { const key = b.parentElement.dataset.key, v = b.dataset.v;
    if (key === 'style') btSave(v === 'minimal' ? {style: 'minimal', glow: false, grain: false, confetti: false} : {style: 'neon', glow: true, grain: true, confetti: true});
    else btSave({[key]: v});
    if (key === 'noise') applyNoise(); sync(); }
   if (a) { const t = a.dataset.act;
    if (t === 'timers') { btSave({timers: {}}); sync(); }
    if (t === 'export') BT.exportSave(); if (t === 'import') BT.importSave(); if (t === 'reset') BT.resetSave(); }
  });
  el.addEventListener('input', e => {
   const i = e.target;
   if (i.dataset.key === 'vol') { btSave({vol: Number(i.value)}); applyNoise(); }
   if (i.dataset.timer) { const t = Object.assign({}, btCfg().timers); t[i.dataset.timer] = Number(i.value); btSave({timers: t}); i.nextElementSibling.textContent = lab(i.dataset.timer); }
  });
  el.addEventListener('change', e => { const i = e.target; if (i.classList.contains('sw')) { btSave({[i.dataset.key]: i.checked}); sync(); } });
  sync();
 }

 // ---------- Profile ----------
 function refreshChip() { const p = getProfile(); if (!p) return; const a = $('#pf-avatar'), n = $('#pf-name'); if (a) a.textContent = p.avatar; if (n) n.textContent = p.name; }
 const validName = n => /^[A-Za-z0-9_.\- ]{3,16}$/.test(n);
 function avatarPicker(sel) { return '<div class="av-grid">' + AVATARS.map(a => '<button type="button" class="av' + (a === sel ? ' on' : '') + '" data-av="' + a + '">' + a + '</button>').join('') + '</div>'; }
 function wirePicker(el) { el.addEventListener('click', e => { const b = e.target.closest('.av'); if (b) { el.querySelectorAll('.av').forEach(x => x.classList.toggle('on', x === b)); } }); }
 const picked = el => (el.querySelector('.av.on') || {}).dataset.av || AVATARS[0];
 function openWelcome() {
  const m = modal('<div class="bt-head"><h2>👋 Welcome to NyxApse</h2></div><p class="hint">Pick a nickname and an avatar. Please don\'t use your real name. You can change both later in your profile.</p>' +
   '<input id="nick" class="bt-in" maxlength="16" placeholder="Nickname (3-16 characters)" autocomplete="off">' + avatarPicker(AVATARS[0]) +
   '<p class="err" id="nick-err"></p><div class="bt-btns"><button class="bt-btn pri" id="nick-go">Start playing</button><button class="bt-btn" id="nick-skip">Skip for now</button></div>', true);
  wirePicker(m.el);
  const fin = name => { setProfile({id: (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(36).slice(2)), name, avatar: picked(m.el), created: Date.now()}); refreshChip(); m.close(); };
  m.el.querySelector('#nick-go').onclick = () => { const n = m.el.querySelector('#nick').value.trim().replace(/\s+/g, ' '); if (!validName(n)) { m.el.querySelector('#nick-err').textContent = 'Use 3-16 letters, numbers, spaces, _ . or -'; return; } fin(n); };
  m.el.querySelector('#nick-skip').onclick = () => fin('Player' + String(Math.floor(1000 + Math.random() * 9000)));
 }
 function openProfile() {
  let p = getProfile(); if (!p) { openWelcome(); return; }
  const bp = num('bt_coins'), r = BT.rank(bp), s = BT.streak(), ach = (() => { try { return JSON.parse(LS.getItem('bt_ach')).length; } catch (e) { return 0; } })();
  const lv = Object.entries(BT_GAMES).map(([k, n]) => '<span>' + n + ' <b>L' + (num('bt_unlocked_' + k) || 1) + '</b></span>').join('');
  const m = modal(head('👤 Profile') +
   '<div class="pf-top"><div class="pf-av">' + p.avatar + '</div><div><b class="pf-nm">' + esc(p.name) + '</b><div class="hint">' + r.icon + ' ' + r.name + '</div></div></div>' +
   '<div class="stat-grid"><div>🧠<b>' + bp.toLocaleString() + '</b>Brain Power</div><div>🪙<b>' + num('bt_wallet').toLocaleString() + '</b>Coins</div><div>🔥<b>' + s + '</b>Streak (best ' + Math.max(num('bt_best_streak'), s) + ')</div><div>🏁<b>' + num('bt_wins') + '</b>Wins</div><div>⏱<b>' + Math.round(num('bt_time_s') / 60) + '</b>Minutes</div><div>🏅<b>' + ach + '/' + BT.achTotal + '</b>Badges</div></div>' +
   '<div class="lv-grid">' + lv + '</div><h3>✏️ Edit</h3><input id="nick" class="bt-in" maxlength="16" value="' + esc(p.name) + '" autocomplete="off">' + avatarPicker(p.avatar) +
   '<p class="err" id="nick-err"></p><div class="bt-btns"><button class="bt-btn pri" id="pf-save">Save</button></div>' +
   '<div class="row"><span>Show me on leaderboards <small>(coming soon)</small></span><input type="checkbox" class="sw" id="pf-lb"></div>');
  wirePicker(m.el); const lb = m.el.querySelector('#pf-lb'); lb.checked = !!btCfg().leaderboard; lb.onchange = () => btSave({leaderboard: lb.checked});
  m.el.querySelector('#pf-save').onclick = () => { const n = m.el.querySelector('#nick').value.trim().replace(/\s+/g, ' '); if (!validName(n)) { m.el.querySelector('#nick-err').textContent = 'Use 3-16 letters, numbers, spaces, _ . or -'; return; }
   p = Object.assign(p, {name: n, avatar: picked(m.el)}); setProfile(p); refreshChip(); m.close(); };
 }

 // ---------- Ranks (leaderboard placeholder) ----------
 function openRanks() {
  const m = modal(head('🏆 Leaderboards') + '<p>Weekly top players for every game are coming soon. You\'ll see the best levels reached this week, and you choose whether to appear.</p>' +
   '<div class="row"><span>Show me on leaderboards</span><input type="checkbox" class="sw" id="lb2"></div><p class="hint">Only your nickname and avatar would ever be shown. This is off until leaderboards launch.</p>');
  const c = m.el.querySelector('#lb2'); c.checked = !!btCfg().leaderboard; c.onchange = () => btSave({leaderboard: c.checked});
 }

 // ---------- Menu ----------
 function go(where) {
  document.body.classList.remove('menu-open');
  if (where === 'profile') openProfile();
  if (where === 'settings') openSettings();
  if (where === 'home') window.scrollTo({top: 0, behavior: 'smooth'});
  if (where === 'games') { const g = $('.game-grid'); if (g) g.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  if (where === 'shop' && typeof toggleShop === 'function') toggleShop();
  if (where === 'ranks') openRanks();
  if (where === 'about') location.href = 'about.html';
 }
 window.NX = {openSettings, openProfile, openRanks, go, menu: () => document.body.classList.toggle('menu-open')};

 document.addEventListener('DOMContentLoaded', () => {
  // settings button on every page
  if (!$('#gear')) {
   const h = $('header'); if (h) { const b = document.createElement('button'); b.id = 'gear'; b.className = 'header-btn'; b.textContent = '⚙️'; b.setAttribute('aria-label', 'Settings'); b.style.cssText = 'margin-left:auto'; b.onclick = openSettings; h.appendChild(b); }
  }
  // profile lives on the home page only
  if ($('#profile-chip')) { refreshChip(); if (!getProfile()) openWelcome(); }
 });
})();
