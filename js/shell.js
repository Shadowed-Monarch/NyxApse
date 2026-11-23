/* shell.js - settings, profile, welcome screen, menu and the focus sound (shared by every page) */
(function () {
 const LS = localStorage, $ = s => document.querySelector(s);
 const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦉', '🐺', '🐧', '🦄', '🐲', '🤖'];
 const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
 const num = k => parseInt(LS.getItem(k)) || 0;
 const AV = (a, n) => window.NXAv ? NXAv.html(a, n || 24) : esc(a);   // an emoji, or one of the drawn icons
 const getProfile = () => { try { return JSON.parse(LS.getItem('bt_profile')); } catch (e) { return null; } };
 const setProfile = p => LS.setItem('bt_profile', JSON.stringify(p));

 // ---------- Focus sound: keeps playing from page to page ----------
 let ctx, src, gain, kind = null;
 const NOISE_TRIM = 0.5;   // white, pink and brown noise play at half of the old loudness (the Volume slider still goes from quiet to loud)
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
  gain.gain.setTargetAtTime(c.vol * NOISE_TRIM, ctx.currentTime, 0.15);
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
 }
 // browsers may block sound until the first tap on a new page
 document.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended' && btCfg().noise !== 'off') ctx.resume().catch(() => {}); }, {passive: true});
 document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (btCfg().noise !== 'off') ctx.resume().catch(() => {}); });
 window.NXaudio = {apply: applyNoise, state: () => ({kind, ctx: ctx && ctx.state})};
 applyNoise();

 // ---------- Leaderboard on/off (joins the online board when it is set up) ----------
 async function setLeaderboard(on, say) {
  const tell = t => { if (say) say(t); };
  if (!on) { btSave({leaderboard: false}); tell(''); return true; }
  if (!window.LB || !LB.configured()) { btSave({leaderboard: true}); tell('Saved. The online leaderboard is not switched on in this version yet.'); return true; }
  const p = getProfile(); if (!p) { tell('Pick a nickname first: open Profile.'); return false; }
  if (LS.getItem('bt_terms') !== '1') {
   if (!confirm('To join the leaderboard you must be 16 or older (or older if your country requires it) and agree to the Terms (terms.html) and the Privacy Policy (privacy.html).\n\nYour nickname, avatar and wins are sent to the server and other players can see them.\n\nDo you agree?')) { tell('Not joined. You can still play everything offline.'); return false; }
   LS.setItem('bt_terms', '1');
  }
  tell('Joining...');
  const r = await LB.join(p.name, p.avatar);
  if (r.ok) { btSave({leaderboard: true}); tell('You are on the leaderboard as ' + p.name + '.'); LB.queueSubmit(); return true; }
  tell(r.error === 'nickname_taken' ? 'That nickname is already taken. Change it in Profile and try again.' : r.error === 'bad_nickname' ? 'That nickname is not allowed. Change it in Profile.' : 'Could not reach the leaderboard' + (r.code ? ' (' + r.code + ')' : '') + '. ' + lbHelp(r.code) + 'Try again later.');
  return false;
 }

 // what a server error code usually means (shown on the leaderboard screens so a problem can be found quickly)
 const lbHelp = c => /^http_(404|400)$/.test(c || '') ? 'The server database may not be set up yet. ' : /^http_(401|403|422)$/.test(c || '') ? 'The server refused the request (anonymous sign-ins may be switched off). ' : '';
 // ---------- Modals ----------
 let pausedByModal = false;
 function modal(html, locked, cls) {
  const m = document.createElement('div'); m.className = 'bt-modal' + (cls ? ' ' + cls : ''); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  if (locked) m.dataset.locked = '1';
  m.innerHTML = '<div class="bt-card">' + html + '</div>';
  const finish = () => { m.remove(); if (pausedByModal && !$('.bt-modal')) { BT.paused = false; BT.sync(); pausedByModal = false; } };
  const close = () => { if (m.dataset.closing) return; if (document.documentElement.classList.contains('bt-anim')) { m.dataset.closing = '1'; m.classList.add('bt-out'); setTimeout(finish, 200); } else finish(); };
  m.addEventListener('click', e => { if (e.target.closest('[data-close]') || (e.target === m && !locked)) close(); });
  document.body.appendChild(m);
  if (typeof game !== 'undefined' && game.isPlaying && !BT.paused) { BT.paused = true; BT.sync(); pausedByModal = true; }
  return {el: m, close};
 }
 document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('menu-open'); const ms = document.querySelectorAll('.bt-modal'), m = ms[ms.length - 1]; if (m && !m.dataset.locked) m.querySelector('[data-close]') && m.querySelector('[data-close]').click(); } });
 const head = t => '<div class="bt-head"><h2>' + t + '</h2><button class="bt-x" data-close aria-label="Close">✕</button></div>';

 // ---------- Settings ----------
 function openSettings() {
  const seg = (key, opts) => '<div class="seg" data-key="' + key + '">' + opts.map(o => '<button data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
  const sw = (key, label) => '<div class="row"><span>' + label + '</span><input type="checkbox" class="sw" data-key="' + key + '"></div>';
  const m = modal(head('⚙️ Settings') +
   '<div class="tabs"><button data-tab="sound" class="on">🔊 Sound</button><button data-tab="look">🎨 Look</button><button data-tab="effects">✨ Effects</button><button data-tab="online">🏆 Online</button><button data-tab="data">💾 Data</button></div><div class="tab on" data-tab="sound"><h3>🔊 Sound</h3><div class="row"><span>Focus sound</span>' + seg('noise', [['off', 'Off'], ['brown', 'Brown'], ['pink', 'Pink'], ['white', 'White']]) + '</div>' +
   '<div class="row"><span>Volume</span><input type="range" data-key="vol" min="0.05" max="1.5" step="0.05"></div>' + sw('sfx', 'Sound effects') + sw('vibe', 'Vibration') +
   '</div><div class="tab" data-tab="look"><h3>🎨 Look</h3><div class="row"><span>Theme</span>' + seg('theme', [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']]) + '</div>' +
   '<div class="row"><span>Style</span>' + seg('style', [['neon', 'Neon'], ['minimal', 'Minimal']]) + '</div>' +
   '<p class="hint">Minimal is flat, sleek and fast: no glow, shadows, grain, blur or colour animation. It keeps your colours.</p>' + sw('mono', 'Black &amp; white') + sw('cb', 'Colorblind-friendly (symbols + safe colours)') + sw('big', 'Large text') + sw('compact', 'Compact layout') +
   '</div><div class="tab" data-tab="effects"><h3>✨ Effects</h3>' + sw('anim', 'Menu, popup and page-slide animations (off in Minimal style and when your device asks for reduced motion)') + sw('glow', 'Glow effects') + sw('grain', 'Background grain') + sw('confetti', 'Confetti') + '<p class="hint">Minimal style turns glow, grain and confetti off for speed.</p>' +
   '</div><div class="tab" data-tab="online"><h3>🏆 Leaderboard</h3>' + sw('leaderboard', 'Show me on leaderboards') + '<p class="hint" id="lb-note"></p><div class="bt-btns"><button class="bt-btn" data-act="lbdel">Delete my leaderboard data</button></div>' +
   '<h3>☁️ Cloud save</h3><div class="row"><span>Back up my progress automatically</span><input type="checkbox" class="sw" data-key="cloud"></div><p class="hint">Off by default. When on, your game progress is stored on the server, so you can restore it after clearing data or on a new phone. For players 16 and older. <a href="privacy.html">Privacy</a></p><div class="bt-btns"><button class="bt-btn" data-act="cloudcode">🔑 Show my code</button><button class="bt-btn" data-act="cloudsync">🔄 Save now</button></div><p class="hint" id="cloud-note"></p>' +
   '</div><div class="tab" data-tab="data"><h3>💾 Data</h3><div class="bt-btns"><button class="bt-btn" data-act="export">📤 Export</button><button class="bt-btn" data-act="import">📥 Import</button><button class="bt-btn" data-act="reset">🗑 Reset</button><button class="bt-btn" data-act="cache">🧹 Clear app cache</button></div>' +
   '<p class="hint">Export shows a short code and a QR code (needs Cloud save on). Import takes the code, a scanned QR, or a photo of one, to move your progress to another device.</p>' +
   '<p class="hint"><a href="about.html">About</a> · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a></p></div>', false, 'bt-side');   // a side panel, not a centred popup
  const el = m.el;
  const sync = () => { const c = btCfg();
   el.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', c[s.dataset.key] === b.dataset.v)));
   el.querySelectorAll('input.sw').forEach(i => { i.checked = i.dataset.key === 'cloud' ? !!(window.LB && LB.cloud.on()) : !!c[i.dataset.key]; });
   const v = el.querySelector('[data-key="vol"]'); v.value = c.vol; };
  el.addEventListener('click', e => {
   const tb = e.target.closest('.tabs button');
   if (tb) { el.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === tb)); el.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.dataset.tab === tb.dataset.tab)); return; }
   const b = e.target.closest('.seg button'), a = e.target.closest('[data-act]');
   if (b) { const key = b.parentElement.dataset.key, v = b.dataset.v;
    if (key === 'style') btSave(v === 'minimal' ? {style: 'minimal', glow: false, grain: false, confetti: false} : {style: 'neon', glow: true, grain: true, confetti: true});
    else btSave({[key]: v});
    if (key === 'noise') applyNoise(); sync(); }
   if (a) { const t = a.dataset.act;
    if (t === 'lbdel') { const note = el.querySelector('#lb-note');
     if (!window.LB || !LB.configured()) note.textContent = 'The online leaderboard is not switched on in this version yet, so there is nothing to delete.';
     else if (confirm('Delete your nickname and win records from the leaderboard server?')) { note.textContent = 'Deleting...'; LB.deleteMe().then(r => { btSave({leaderboard: false}); note.textContent = r && r.ok ? 'Your leaderboard data was deleted.' : 'Could not reach the server. Try again later.'; sync(); }); } }
    if (t === 'cloudcode') { const note = el.querySelector('#cloud-note'); if (window.LB && LB.cloud.on()) showCode(LB.cloud.code(), (getProfile() || {}).name); else note.textContent = 'Cloud save is off. Turn it on first.'; }
    if (t === 'cloudsync') { const note = el.querySelector('#cloud-note'); if (!window.LB || !LB.cloud.on()) note.textContent = 'Cloud save is off. Turn it on first.'; else { note.textContent = 'Saving...'; LB.cloud.sync(true).then(r => { note.textContent = r && r.ok ? 'Saved.' : r && r.error === 'too_fast' ? 'Saved a moment ago. Try again in a few seconds.' : 'Could not reach the server. It will retry by itself.'; }); } }
    if (t === 'export') openExport(); if (t === 'import') openRestore(); if (t === 'reset') BT.resetSave(); }
  });
  el.addEventListener('input', e => {
   const i = e.target;
   if (i.dataset.key === 'vol') { btSave({vol: Number(i.value)}); applyNoise(); }
  });
  el.addEventListener('change', e => { const i = e.target; if (!i.classList.contains('sw')) return;
   if (i.dataset.key === 'cloud') { cloudToggle(i, t => { el.querySelector('#cloud-note').textContent = t; }); return; }
   if (i.dataset.key === 'leaderboard') { setLeaderboard(i.checked, t => { el.querySelector('#lb-note').textContent = t; }).then(() => sync()); return; }
   btSave({[i.dataset.key]: i.checked}); sync(); });
  sync();
 }

 // ---------- Cloud save screens ----------
 // ---------- QR codes: show and scan the short restore code ----------
 const qrPayload = (nick, code) => 'nyxapse:1:' + encodeURIComponent(nick || '') + ':' + code;
 const qrParse = t => { const m = /^nyxapse:1:([^:]+):(\d{10})$/.exec(String(t || '').trim()); if (!m) return null; try { return {nick: decodeURIComponent(m[1]), code: m[2]}; } catch (e) { return null; } };
 const loadQR = () => window.NXQR ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'js/qr.js?v=' + BT.build; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
 function drawQR(box, nick, code) { loadQR().then(() => { box.innerHTML = NXQR.svg(qrPayload(nick, code), 200); box.style.display = ''; }).catch(() => {}); }
 async function scanQR(say, done) {
  try { await loadQR(); } catch (e) { say('Could not load the scanner. Type the nickname and code instead.'); return; }
  let det = null; try { if (window.BarcodeDetector) det = new BarcodeDetector({formats: ['qr_code']}); } catch (e) { det = null; }   // the phone's own reader if it has one, else ours
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', {willReadFrequently: true});
  const read = async (src, sw, sh, maxSide) => {
   if (det) { try { const r = await det.detect(src); if (r.length) return r[0].rawValue; } catch (e) { /* use ours */ } }
   const sc = Math.min(1, maxSide / Math.max(sw, sh)); cv.width = Math.max(1, Math.round(sw * sc)); cv.height = Math.max(1, Math.round(sh * sc));
   cx.drawImage(src, 0, 0, cv.width, cv.height); const im = cx.getImageData(0, 0, cv.width, cv.height);
   return NXQR.decode(im.data, im.width, im.height);
  };
  const m = modal(head('📷 Scan QR code') + '<video id="sc-v" playsinline muted style="width:100%;border-radius:12px;background:#000"></video><p class="hint" id="sc-n">Starting the camera...</p><div class="bt-btns"><button class="bt-btn" id="sc-img">🖼 Use a photo or screenshot</button></div><input type="file" accept="image/*" id="sc-f" hidden>');
  const v = m.el.querySelector('#sc-v'), note = t => { m.el.querySelector('#sc-n').textContent = t; };
  let stream = null, dead = false;
  const stop = () => { dead = true; if (stream) stream.getTracks().forEach(t => t.stop()); };
  m.el.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === m.el) stop(); });
  const got = txt => { const p = qrParse(txt); if (!p) { note('That is not a NyxApse QR code.'); return false; } stop(); m.close(); done(p); return true; };
  const loop = async () => { if (dead) return; try { if (v.videoWidth) { const r = await read(v, v.videoWidth, v.videoHeight, 960); if (r && got(r)) return; } } catch (e) { /* keep trying */ } setTimeout(loop, 200); };
  m.el.querySelector('#sc-img').onclick = () => m.el.querySelector('#sc-f').click();
  m.el.querySelector('#sc-f').onchange = async e => {
   const f = e.target.files && e.target.files[0]; if (!f) return; note('Reading the picture...');
   try { const bmp = await createImageBitmap(f); let r = null; for (const side of [1400, 900, 600]) { r = await read(bmp, bmp.width, bmp.height, side); if (r) break; } if (!r) note('No QR code found in that picture. Try a sharper, closer one.'); else got(r); }
   catch (err) { note('Could not read that picture.'); }
   e.target.value = '';
  };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { v.style.display = 'none'; note('The camera cannot be used here (camera API missing; secure page: ' + (window.isSecureContext ? 'yes' : 'no') + '). You can still use a photo or screenshot of the QR code.'); return; }
  try { stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}}); if (dead) { stop(); return; } v.srcObject = stream; await v.play(); note('Point the camera at the QR code on your other device.'); loop(); }
  catch (e) {
   v.style.display = 'none';
   let st = ''; try { st = (await navigator.permissions.query({name: 'camera'})).state; } catch (e2) { /* not supported here */ }
   const inApp = location.protocol === 'file:', tail = ' You can also use a photo or screenshot of the QR code.';
   note(e && e.name === 'NotAllowedError'
    ? (inApp ? 'The app was not given the camera. Open Android Settings, then Apps, NyxApse, Permissions, and allow Camera. If Camera is not listed there, install the newest version of the app.'
       : st === 'denied' ? 'The camera is blocked for this site. Tap the lock icon in the address bar, open Permissions, allow Camera, then reload.'
       : 'The camera was not allowed. Allow it when your browser asks.') + tail
    : 'The camera is not available (' + ((e && e.name) || 'error') + ').' + tail);
  }
 }
 function openExport() {
  if (window.LB && LB.cloud.on() && getProfile()) { showCode(LB.cloud.code(), getProfile().name); return; }
  const m = modal(head('📤 Export') + '<p class="hint">The short code and QR code come from Cloud save. Turn it on in Settings → Online, then come back here: you get your nickname, a 10-digit code and a QR code to scan on the new device.</p><p class="hint">If you prefer not to use Cloud save, you can still copy the long offline save code.</p><div class="bt-btns"><button class="bt-btn" id="ex-long">📋 Copy long offline code</button><button class="bt-btn pri" data-close>Close</button></div>');
  m.el.querySelector('#ex-long').onclick = () => BT.exportSave();
 }
 const needTerms = () => { if (LS.getItem('bt_terms') === '1') return true; if (!confirm('This stores data on the server, so you must be 16 or older (or older if your country requires it) and agree to the Terms (terms.html) and the Privacy Policy (privacy.html).\n\nDo you agree?')) return false; LS.setItem('bt_terms', '1'); return true; };
 function showCode(code, nick) {
  const m = modal(head('🔑 Your restore code') + '<p class="hint"><b>Take a screenshot now</b> and keep it safe. If you clear your data or change phones, you restore your progress with your nickname and this code. Anyone with the code can restore your save, so do not share it.</p>' +
   '<div class="code-box"><div class="hint">Nickname</div><b>' + esc(nick || '') + '</b><div class="hint">Code</div><div class="code">' + esc(LB.cloud.pretty(code)) + '</div></div><div id="cc-qr" style="display:none;text-align:center;margin:8px 0"></div><p class="hint">On the new device: Settings → Data → Import → Scan QR code.</p>' +
   '<div class="bt-btns"><button class="bt-btn" id="cc-copy">📋 Copy code</button><button class="bt-btn pri" id="cc-ok">Done</button></div><p class="hint">You can see this code again in Settings → Online → Show my code, as long as this app keeps its data.</p>');
  m.el.querySelector('#cc-copy').onclick = () => { try { navigator.clipboard.writeText(code); } catch (e) { /* ignore */ } m.el.querySelector('#cc-copy').textContent = '✅ Copied'; };
  m.el.querySelector('#cc-ok').onclick = () => m.close();
  drawQR(m.el.querySelector('#cc-qr'), nick, code);
 }
 async function cloudToggle(box, say) {
  if (!window.LB || !LB.configured()) { box.checked = false; say('The online features are not switched on in this version yet.'); return; }
  if (box.checked) {
   if (!getProfile()) { box.checked = false; say('Pick a nickname first: open Profile.'); return; }
   if (!needTerms()) { box.checked = false; say('Not turned on. You can still play everything offline.'); return; }
   say('Turning on...'); const r = await LB.cloud.enable();
   if (r.ok) { say('Cloud save is on.'); showCode(r.code, r.nick); } else { box.checked = false; say(r.error === 'network' ? 'Could not reach the server. Try again later.' : 'Could not turn it on (' + (r.error || 'error') + ').'); }
  } else {
   if (!confirm('Turn off Cloud save and delete your copy from the server? You will not be able to restore with your code any more.')) { box.checked = true; return; }
   say('Turning off...'); const r = await LB.cloud.disable(); say(r.ok ? 'Cloud save is off and your cloud copy was deleted.' : 'Turned off here, but the server could not be reached to delete the copy. Try again later.');
  }
 }
 function openRestore() {
  const m = modal(head('☁️ Restore my progress') + '<p class="hint">Scan the QR code, or enter the nickname and the 10-digit code from your screenshot. This replaces the progress on this device.</p>' +
   '<input id="rs-nick" class="bt-in" maxlength="16" placeholder="Nickname" autocomplete="off"><input id="rs-code" class="bt-in" inputmode="numeric" maxlength="11" placeholder="Code (10 digits)" autocomplete="off">' +
   '<p class="err" id="rs-err"></p><div class="bt-btns"><button class="bt-btn pri" id="rs-go">Restore</button><button class="bt-btn" id="rs-scan">📷 Scan QR code</button></div><div class="bt-btns"><button class="bt-btn" id="rs-long">📋 I have a long save code</button></div>');
  const err = t => { m.el.querySelector('#rs-err').textContent = t; };
  m.el.querySelector('#rs-long').onclick = () => { m.close(); BT.importSave(); };
  m.el.querySelector('#rs-scan').onclick = () => scanQR(err, p => { m.el.querySelector('#rs-nick').value = p.nick; m.el.querySelector('#rs-code').value = p.code; m.el.querySelector('#rs-go').click(); });
  m.el.querySelector('#rs-go').onclick = async () => {
   if (!window.LB || !LB.configured()) { err('The online features are not switched on in this version yet.'); return; }
   err('Restoring...'); const r = await LB.cloud.restore(m.el.querySelector('#rs-nick').value, m.el.querySelector('#rs-code').value);
   if (r.ok) { err('Restored!'); return; }
   err(r.error === 'locked' ? 'Too many wrong tries. Try again in about ' + Math.max(1, Math.ceil((r.retry_in || 3600) / 60)) + ' minutes.' : r.error === 'wrong' ? 'The nickname or the code is not right.' : r.error === 'network' ? 'Could not reach the server. Check your internet and try again.' : r.error === 'bad_save' ? 'That save could not be read.' : 'Could not restore (' + (r.error || 'error') + ').');
  };
 }

 // ---------- Profile ----------
 function refreshChip() { const p = getProfile(); if (!p) return; const a = $('#pf-avatar'), n = $('#pf-name'); if (a) a.innerHTML = AV(p.avatar, 26); if (n) n.textContent = p.name; }
 const validName = n => /^[A-Za-z0-9_.\- ]{3,16}$/.test(n);
 const nameError = n => !validName(n) ? 'Use 3-16 letters, numbers, spaces, _ . or -' : (window.NXName && !NXName.check(n).ok ? NXName.message(NXName.check(n)) : '');
 function avatarPicker(sel) { return '<div class="av-grid">' + AVATARS.concat(window.NXAv ? NXAv.ids : []).map(a => '<button type="button" class="av' + (a === sel ? ' on' : '') + '" data-av="' + a + '">' + AV(a, 30) + '</button>').join('') + '</div>'; }
 function wirePicker(el) { el.addEventListener('click', e => { const b = e.target.closest('.av'); if (b) { el.querySelectorAll('.av').forEach(x => x.classList.toggle('on', x === b)); } }); }
 const picked = el => (el.querySelector('.av.on') || {}).dataset.av || AVATARS[0];
 function openWelcome() {
  const m = modal('<div class="bt-head"><h2>👋 Welcome to NyxApse</h2></div><p class="hint">Pick a nickname and an avatar. Please don\'t use your real name. You can change both later in your profile.</p>' +
   '<input id="nick" class="bt-in" maxlength="16" placeholder="Nickname (3-16 characters)" autocomplete="off">' + avatarPicker(AVATARS[0]) +
   '<p class="err" id="nick-err"></p><div class="bt-btns"><button class="bt-btn pri" id="nick-go">Start playing</button><button class="bt-btn" id="nick-skip">Skip for now</button></div><div class="bt-btns"><button class="bt-btn" id="nick-restore">☁️ I have a restore code</button></div>', true);
  wirePicker(m.el);
  const fin = name => { setProfile({id: (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(36).slice(2)), name, avatar: picked(m.el), created: Date.now()}); refreshChip(); m.close(); };
  m.el.querySelector('#nick-go').onclick = () => { const n = m.el.querySelector('#nick').value.trim().replace(/\s+/g, ' '); const er = nameError(n); if (er) { m.el.querySelector('#nick-err').textContent = er; return; } fin(n); };
  m.el.querySelector('#nick-restore').onclick = () => { m.close(); openRestore(); };
   m.el.querySelector('#nick-skip').onclick = () => fin('Player' + String(Math.floor(1000 + Math.random() * 9000)));
 }
 function openProfile() {
  let p = getProfile(); if (!p) { openWelcome(); return; }
  const bp = num('bt_coins'), r = BT.rank(bp), s = BT.streak(), ach = (() => { try { return JSON.parse(LS.getItem('bt_ach')).length; } catch (e) { return 0; } })();
  const lv = Object.entries(BT_GAMES).map(([k, n]) => '<span>' + n + ' <b>L' + (num('bt_unlocked_' + k) || 1) + '</b></span>').join('');
  const m = modal(head('👤 Profile') +
   '<div class="pf-top"><div class="pf-av">' + AV(p.avatar, 52) + '</div><div><b class="pf-nm">' + esc(p.name) + '</b><div class="hint">' + r.icon + ' ' + r.name + '</div></div></div>' +
   '<div class="stat-grid"><div>🧠<b>' + bp.toLocaleString() + '</b>Brain Power</div><div>🪙<b>' + num('bt_wallet').toLocaleString() + '</b>Coins</div><div>🔥<b>' + s + '</b>Streak (best ' + Math.max(num('bt_best_streak'), s) + ')</div><div>🏁<b>' + num('bt_wins') + '</b>Wins</div><div>⏱<b>' + Math.round(num('bt_time_s') / 60) + '</b>Minutes</div><div>🏅<b>' + ach + '/' + BT.achTotal + '</b>Badges</div></div>' +
   '<div id="pf-div"></div><div class="lv-grid">' + lv + '</div><h3>✏️ Edit</h3><input id="nick" class="bt-in" maxlength="16" value="' + esc(p.name) + '" autocomplete="off">' + avatarPicker(p.avatar) +
   '<p class="err" id="nick-err"></p><div class="bt-btns"><button class="bt-btn pri" id="pf-save">Save</button></div>' +
   '<div class="row"><span>Show me on leaderboards</span><input type="checkbox" class="sw" id="pf-lb"></div>');
  if (window.LB && LB.enabled()) LB.board('all').then(b => LB.me().then(me => { const box = m.el.querySelector('#pf-div'); if (box && me && me.joined) box.innerHTML = divLine(b && b.division != null ? b.division : me.dv, me.best_tier, me.best_cnt); })).catch(() => {});
  else { const c = (() => { try { return JSON.parse(LS.getItem('bt_lb_me')); } catch (e) { return null; } })(); const box = m.el.querySelector('#pf-div'); if (c && box && window.LB) box.innerHTML = divLine(c.dv, c.best_tier, c.best_cnt); }
  wirePicker(m.el); const lb = m.el.querySelector('#pf-lb'); lb.checked = !!btCfg().leaderboard; lb.onchange = async () => { const ok = await setLeaderboard(lb.checked, t => { m.el.querySelector('#nick-err').textContent = t; }); if (!ok) lb.checked = !lb.checked; };
  m.el.querySelector('#pf-save').onclick = () => { const n = m.el.querySelector('#nick').value.trim().replace(/\s+/g, ' '); const er = nameError(n); if (er) { m.el.querySelector('#nick-err').textContent = er; return; }
   p = Object.assign(p, {name: n, avatar: picked(m.el)}); setProfile(p); refreshChip(); if (btCfg().leaderboard && window.LB && LB.configured()) LB.join(p.name, p.avatar); m.close(); };
 }

 // ---------- Another player's public profile ----------
 function divLine(d, bestTier, bestCnt) {
  const t = LB.TIERS[LB.tierOf(d)], bt = LB.TIERS[bestTier];
  return '<div class="div-line"><span style="color:' + t[2] + '">' + LB.shield(d, 26) + ' <b>' + LB.divName(d) + '</b></span><span class="hint">Best: ' + LB.badge(bestTier, bestCnt) + ' ' + bt[0] + (bestCnt >= 2 ? ' · ' + bestCnt + ' seasons' : '') + '</span></div>';
 }
 async function openPlayer(nick) {
  const m = modal(head('👤 Player') + '<div id="pl-body">Loading...</div>');
  const box = m.el.querySelector('#pl-body');
  try {
   const r = await LB.profileOf(nick);
   if (!r || !r.found) { box.innerHTML = '<p class="hint">This player is not available.</p>'; return; }
   const rk = BT.rank(r.total_bp || 0), ml = r.maxlvl || {};
   const lv = Object.entries(BT_GAMES).map(([k, n]) => '<span>' + n + ' <b>' + (ml[k] ? 'L' + ml[k] : '-') + '</b></span>').join('');
   box.innerHTML = '<div class="pf-top"><div class="pf-av">' + AV(r.avatar, 52) + '</div><div><b class="pf-nm">' + esc(r.nick) + '</b><div class="hint">' + rk.icon + ' ' + rk.name + '</div></div></div>' +
    divLine(r.dv, r.best_tier, r.best_cnt) +
    '<div class="stat-grid"><div>🧠<b>' + Number(r.total_bp || 0).toLocaleString() + '</b>Leaderboard BP</div><div>🏁<b>' + (r.total_wins || 0) + '</b>Wins</div></div>' +
    '<h3>Best level per game</h3><div class="lv-grid">' + lv + '</div>' +
    '<div class="bt-btns"><button class="bt-btn" id="pl-rep">🚩 Report</button></div><p class="hint" id="pl-msg"></p>';
   box.querySelector('#pl-rep').onclick = async () => {
    if (!confirm('Report ' + r.nick + ' for cheating or an inappropriate name?')) return;
    const x = await LB.report(r.nick).catch(() => null);
    box.querySelector('#pl-msg').textContent = x && x.ok ? 'Thanks. Reports are checked, and a player reported by several people is hidden until reviewed.' : x && x.error === 'too_new' ? 'Reporting is for players with at least 3 days and 20 wins.' : x && x.error === 'other_group' ? 'You can only report players in your own group.' : 'Could not send the report. Try again later.';
   };
  } catch (e) { box.innerHTML = '<p class="hint">Can\'t reach the leaderboard right now.</p>'; }
 }

 // ---------- Leaderboard screen ----------
 function openRanks() {
  if (!window.LB || !LB.configured()) {
   modal(head('🏆 Leaderboard') + '<p>The online leaderboard is not switched on in this version yet. Your progress and rank are still saved on this device.</p>');
   return;
  }
  const opts = [['all', 'Overall']].concat(Object.entries(BT_GAMES)).map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
  const m = modal(head('🏆 Leaderboard') + '<select id="lb-game" class="bt-in">' + opts + '</select><div id="lb-meta" class="hint"></div><div id="lb-body" class="lb-body">Loading...</div><div id="lb-join"></div><div class="bt-btns"><button class="bt-btn" id="lb-ref">Refresh</button></div>');
  const el = m.el, body = el.querySelector('#lb-body'), meta = el.querySelector('#lb-meta'), joinBox = el.querySelector('#lb-join');
  const left = t => Math.floor(t / 86400) + 'd ' + Math.floor(t % 86400 / 3600) + 'h';
  const zoneMark = z => ({up: '▲', down: '▼', crown: '👑', steady: '•'}[z] || '');
  const load = async () => {
   body.textContent = 'Loading...';
   try {
    const game = el.querySelector('#lb-game').value, r = await LB.board(game);
    const rows = r.rows || [], hasDiv = r.division !== null && r.division !== undefined;
    showJoin(hasDiv);
    meta.innerHTML = hasDiv
     ? '<b style="color:' + LB.TIERS[LB.tierOf(r.division)][2] + '">' + LB.shield(r.division, 22) + ' ' + LB.divName(r.division) + '</b> · group of ' + r.group_size + '<br>Week ends in ' + left(r.resets_in || 0) + ' · season ends in ' + left(r.season_resets_in || 0)
     : 'This week · Brain Power earned · resets in ' + left(r.resets_in || 0);
    body.innerHTML = rows.length ? rows.map(x => '<div class="lb-row' + (x.me ? ' me' : '') + (x.zone ? ' z-' + x.zone : '') + '" data-nick="' + esc(x.nick) + '"><b>#' + x.rank + '</b><span class="zone" title="' + (x.zone || '') + '">' + zoneMark(x.zone) + '</span><span class="lb-av">' + AV(x.avatar, 26) + '</span><span class="lb-nm">' + esc(x.nick) + '</span><b>' + Number(x.bp).toLocaleString() + '</b></div>').join('') +
     (game === 'all' && hasDiv ? '<p class="hint">▲ Ascent Zone moves up · • Steady · ▼ Drop Zone moves down. You need at least 1 win this week to move up. Tap a name to see their profile.</p>' : '<p class="hint">Tap a name to see their profile.</p>') : '<p class="hint">' + (hasDiv ? 'No scores yet this week. Be the first!' : 'Join the leaderboard to get a division and a group.') + '</p>';
    LB.claim(); LB.me();
   } catch (e) { const c = e && e.message; meta.textContent = ''; body.innerHTML = '<p class="hint">Can\'t reach the leaderboard right now' + (c ? ' (' + esc(c) + ')' : '') + '. ' + lbHelp(c) + 'Your progress is safe, and your wins are sent when you are back online.</p>'; }
  };
  body.onclick = e => { const row = e.target.closest('.lb-row[data-nick]'); if (row) openPlayer(row.dataset.nick); };
  const showJoin = joined => {   // joined = what the server says; the local switch alone is not proof you are on the board
   joinBox.innerHTML = joined ? '' : '<p class="hint">You are not on the leaderboard yet. The leaderboard is for players 16 and older (or older if your country requires it). Joining shares your nickname, avatar and win records, and you agree to the <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a>.</p><button class="bt-btn pri" id="lb-on">Show me on the leaderboard</button><p class="err" id="lb-msg"></p>';
   const b = joinBox.querySelector('#lb-on');
   if (b) b.onclick = async () => { if (await setLeaderboard(true, t => { joinBox.querySelector('#lb-msg').textContent = t; })) { showJoin(true); setTimeout(load, 1500); } };
  };
  el.querySelector('#lb-game').onchange = load; el.querySelector('#lb-ref').onclick = load; showJoin(!!btCfg().leaderboard); load();
 }

 // ---------- Daily challenge popup ----------
 function openDaily() {
  const st = BT.dailyState(), next = st.list.find(k => !st.done.includes(k)), sk = BT.streak();
  const rows = st.list.map(k => { const d = st.done.includes(k); return '<a class="dc-row' + (d ? ' done' : '') + '" href="' + BT.FILES[k] + '"><span>' + (d ? '✅' : '▶') + '</span><b>' + esc(BT_GAMES[k]) + '</b><small>' + (d ? 'Done' : 'Win one level') + '</small></a>'; }).join('');
  modal(head('🎯 Daily challenge') + '<p class="hint">' + (st.complete ? '✅ All done for today! Come back tomorrow for a new challenge.' : 'Win one level in each game below today. Everyone gets the same games. Finish them all for <b>+60 🪙</b>.') + '</p><div class="dc-list">' + rows + '</div>' +
   (!st.complete && next ? '<div class="bt-btns"><a class="bt-btn pri" href="' + BT.FILES[next] + '">▶ Start ' + esc(BT_GAMES[next]) + '</a></div>' : '') +
   '<p class="hint">🔥 Streak: <b>' + sk + '</b> day' + (sk === 1 ? '' : 's') + '. Days you finish the challenge get a ⭐ on the streak calendar.</p>');
 }
 // ---------- Achievements popup ----------
 function openAch() {
  const list = BT.ach(), n = list.filter(a => a.got).length;
  modal(head('🏅 Achievements') + '<p class="hint">' + n + ' of ' + list.length + ' earned. Each badge pays 25 🪙.</p><div class="ach-grid">' +
   list.map(a => '<div class="ach' + (a.got ? ' got' : '') + '"><div class="ach-i">' + a.icon + '</div>' + esc(a.name) + '</div>').join('') + '</div>');
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
  if (where === 'daily') openDaily();
  if (where === 'ach') openAch();
  if (where === 'about') navigate('about.html');
  if (where === 'privacy') navigate('privacy.html');
  if (where === 'terms') navigate('terms.html');
 }
 // ---------- Page transitions: pages slide in from the right, going home slides back. Off in Minimal style, with reduced motion, or when animations are switched off ----------
 function navigate(url) {
  const root = document.documentElement;
  if (!root.classList.contains('bt-anim')) { location.href = url; return; }
  const bare = String(url).split('?')[0].split('#')[0];
  const fx = (/index\.html$/.test(bare) || /\/$/.test(bare)) ? 'back' : 'slide';
  try { sessionStorage.setItem('nx_enter', fx); } catch (e) { /* ignore */ }
  root.classList.add('nx-leave-' + fx);
  setTimeout(() => { location.href = url; }, 230);
 }
 document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
  let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
  if (u.origin !== location.origin || u.pathname === location.pathname || !(/\.html$/.test(u.pathname) || /\/$/.test(u.pathname))) return;
  e.preventDefault(); navigate(a.href);
 });
 window.addEventListener('pageshow', () => document.documentElement.classList.remove('nx-leave-zoom', 'nx-leave-slide', 'nx-leave-back'));
 // ---------- Scroll reveal: cards and sections fly in from different directions as you scroll down ----------
 document.addEventListener('DOMContentLoaded', () => {
  if (!('IntersectionObserver' in window) || !document.documentElement.classList.contains('bt-anim')) return;
  const FX = ['up', 'left', 'right', 'zoom'], els = [...document.querySelectorAll('.game-card, .section')];
  if (!els.length) return;
  els.forEach((el, i) => { el.classList.add('nx-reveal'); el.dataset.fx = FX[i % 4]; });
  const io = new IntersectionObserver(es => {
   es.filter(x => x.isIntersecting).forEach((x, k) => {
    const el = x.target; io.unobserve(el); el.style.transitionDelay = (k * 70) + 'ms';
    requestAnimationFrame(() => el.classList.add('nx-in'));
    el.addEventListener('transitionend', function done(ev) { if (ev.propertyName !== 'opacity') return; el.removeEventListener('transitionend', done); el.classList.remove('nx-reveal', 'nx-in'); el.style.transitionDelay = ''; delete el.dataset.fx; });
   });
  }, {threshold: 0.12});
  els.forEach(el => io.observe(el));
 });
 document.addEventListener('click', async e => {   // clears downloaded app files only; scores, coins and settings are kept
  const b = e.target.closest && e.target.closest('[data-act="cache"]'); if (!b) return;
  b.textContent = 'Clearing...';
  try { if (window.caches) { const k = await caches.keys(); await Promise.all(k.map(x => caches.delete(x))); } const rs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : []; await Promise.all(rs.map(r => r.unregister())); } catch (err) { /* ignore */ }
  location.reload();
 });
 window.NX = {openSettings, openProfile, openRanks, openPlayer, openDaily, openAch, navigate, go, menu: () => document.body.classList.toggle('menu-open')};

 document.addEventListener('DOMContentLoaded', () => {
  // all files must come from the same version (a half-finished upload or a cached old file shows up here)
  const builds = {theme: typeof BT_BUILD !== 'undefined' ? BT_BUILD : '?', game: BT.build, shell: '1.0.0', board: window.LB ? LB.build : '?'};
  if (Object.values(builds).some(v => v !== '1.0.0')) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#b00020;color:#fff;padding:10px 14px;font:14px sans-serif;text-align:center'; d.textContent = 'Some NyxApse files are out of date. Refresh the page (Ctrl+Shift+R) or clear this site\'s data, and make sure every file was uploaded.'; document.body.appendChild(d); }
  // settings button on every page
  if (!$('#gear')) {
   const h = $('header'); if (h) { const b = document.createElement('button'); b.id = 'gear'; b.className = 'header-btn'; b.textContent = '⚙️'; b.setAttribute('aria-label', 'Settings'); b.style.cssText = 'margin-left:auto'; b.onclick = openSettings; h.appendChild(b); }
  }
  // profile lives on the home page only
  if ($('#profile-chip')) { refreshChip(); if (!getProfile()) openWelcome(); }
 });
})();
