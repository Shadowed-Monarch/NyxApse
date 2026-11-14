/* theme.js - Shared theme for every NyxApse page
   Handles: light/dark mode, accent skin, rainbow animation, fallback CSS variables */
const BT_BUILD = '1.0.0';
const BT_SKIN_LIST = [
    // solid colours (cost in coins)
    {id: 'red', name: 'Red', hex: '#ff0000', cost: 0}, {id: 'blue', name: 'Blue', hex: '#0088ff', cost: 100}, {id: 'coral', name: 'Coral', hex: '#ff6f61', cost: 150},
    {id: 'yellow', name: 'Yellow', hex: '#ffcc00', cost: 250}, {id: 'lime', name: 'Lime', hex: '#b5e61d', cost: 300}, {id: 'mint', name: 'Mint', hex: '#3ef0b0', cost: 400},
    {id: 'green', name: 'Green', hex: '#00ff00', cost: 500}, {id: 'sky', name: 'Sky', hex: '#5ec8ff', cost: 600}, {id: 'teal', name: 'Teal', hex: '#14b8a6', cost: 700},
    {id: 'cyan', name: 'Cyan', hex: '#00ffff', cost: 800}, {id: 'indigo', name: 'Indigo', hex: '#6366f1', cost: 900}, {id: 'rose', name: 'Rose', hex: '#fb7185', cost: 1100},
    {id: 'pink', name: 'Pink', hex: '#ff00ff', cost: 1200}, {id: 'crimson', name: 'Crimson', hex: '#dc143c', cost: 1500}, {id: 'peach', name: 'Peach', hex: '#ffb482', cost: 1600},
    {id: 'purple', name: 'Purple', hex: '#9900ff', cost: 1800}, {id: 'silver', name: 'Silver', hex: '#cfd8dc', hexLight: '#607d8b', cost: 2000}, {id: 'orange', name: 'Orange', hex: '#ff6600', cost: 2500},
    {id: 'white', name: 'White', hex: '#ffffff', hexLight: '#222222', cost: 2800}, {id: 'gold', name: 'Gold', hex: '#ffd700', cost: 4000},
    // animated colours
    {id: 'aurora', name: 'Aurora', anim: ['#00ff88', '#00d4ff', '#9b5cff'], cost: 6000}, {id: 'sunset', name: 'Sunset', anim: ['#ff9a00', '#ff3d71', '#9b5cff'], cost: 7000},
    {id: 'ocean', name: 'Ocean', anim: ['#0066ff', '#00d4ff', '#00ffaa'], cost: 8000}, {id: 'lava', name: 'Lava', anim: ['#ff0000', '#ff6600', '#ffcc00'], cost: 9000},
    {id: 'rainbow', name: 'Rainbow', anim: ['#ff0000', '#ffcc00', '#00ff00', '#00ffff', '#9900ff'], cost: 10000},
    // earned (cannot be bought)
    {id: 'legend', name: 'Legend', anim: ['#fff6c2', '#ffd700', '#ffb347'], cost: Infinity, earn: 'Reach level 100 in any game', cond: 'lvl100'},
    {id: 'dgold', name: 'Aureate', anim: ['#ffd700', '#ff9f1c', '#fff3b0'], cost: Infinity, earn: 'Reach Gold on the leaderboard', cond: 'tier2'},
    {id: 'dplat', name: 'Platinum Mist', anim: ['#e5fffb', '#7fe5e0', '#b8c0ff'], cost: Infinity, earn: 'Reach Platinum on the leaderboard', cond: 'tier3'},
    {id: 'ddiamond', name: 'Diamond Edge', anim: ['#6ec6ff', '#e0f7ff', '#3b82f6'], cost: Infinity, earn: 'Reach Diamond on the leaderboard', cond: 'tier4'},
    {id: 'dmaster', name: 'Mystic', anim: ['#c77dff', '#7b2cbf', '#ff6bd6'], cost: Infinity, earn: 'Reach Master on the leaderboard', cond: 'tier5'},
    {id: 'dlegend', name: 'Inferno', anim: ['#ff7a18', '#ffd000', '#ff2d55'], cost: Infinity, earn: 'Reach Legend on the leaderboard', cond: 'tier6'},
    {id: 'ember', name: 'Ember', anim: ['#ff3d00', '#ff9100', '#ff3d00'], cost: Infinity, earn: 'Keep a 30-day streak', cond: 'streak30'}
];
const BT_SKINS = BT_SKIN_LIST;   // old name, kept for compatibility

(function injectSharedStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @property --accent { syntax: '<color>'; initial-value: #ff0000; inherits: true; }
        @keyframes rainbow-loop {
            0% { --accent: #ff0000; } 20% { --accent: #ffcc00; } 40% { --accent: #00ff00; }
            60% { --accent: #00ffff; } 80% { --accent: #9900ff; } 100% { --accent: #ff0000; }
        }
        .rainbow-active { animation: rainbow-loop 5s infinite linear !important; }
        ${BT_SKIN_LIST.filter(s => s.anim && s.id !== 'rainbow').map(s => { const n = s.anim.length; return `@keyframes skin-${s.id} {` + s.anim.concat(s.anim[0]).map((c, i) => `${Math.round(i * 100 / n)}% { --accent: ${c}; }`).join(' ') + `} body.skin-${s.id} { animation: skin-${s.id} 8s infinite linear !important; }`; }).join('\n        ')}
        :where(:root[data-theme="dark"]) {
            --bg: #050505; --panel: #111; --card: #111; --text: #fff; --subtext: #888;
            --border: #333; --brain: #ff77ff; --overlay: rgba(0,0,0,0.9); --shadow-color: var(--accent);
        }
        :where(:root[data-theme="light"]) {
            --bg: #f5f5f5; --panel: #fff; --card: #fff; --text: #000; --subtext: #555;
            --border: #ddd; --brain: #9900ff; --overlay: rgba(255,255,255,0.9); --shadow-color: transparent;
        }
    `;
    document.head.appendChild(style);
})();


const BT_DEFAULTS = {noise: 'off', vol: 0.8, sfx: true, vibe: true, theme: 'dark', style: 'neon', glow: true, grain: true, confetti: true, big: false, compact: false, mono: false, cb: false, leaderboard: false, timers: {}};
function btCfg() {
    let s = {}; try { s = JSON.parse(localStorage.getItem('bt_settings')) || {}; } catch (e) {}
    const legacy = {theme: localStorage.getItem('bt_mode') || 'dark', sfx: localStorage.getItem('bt_sfx') !== 'off'};
    return Object.assign({}, BT_DEFAULTS, legacy, s);
}
function btSave(patch) { const c = Object.assign(btCfg(), patch); localStorage.setItem('bt_settings', JSON.stringify(c)); applyTheme(); return c; }
function btApplyClasses() {
    const c = btCfg(), root = document.documentElement;
    root.setAttribute('data-theme', c.theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : c.theme);
    root.classList.toggle('bt-min', c.style === 'minimal'); root.classList.toggle('bt-noglow', !c.glow); root.classList.toggle('bt-nograin', !c.grain);
    root.classList.toggle('bt-mono', !!c.mono); root.classList.toggle('bt-cb', !!c.cb); root.classList.toggle('bt-big', !!c.big); root.classList.toggle('bt-compact', !!c.compact);
}
function applySkin(id) {
    const skin = BT_SKIN_LIST.find(c => c.id === id) || BT_SKIN_LIST[0], b = document.body, root = document.documentElement;
    [...b.classList].filter(c => c.indexOf('skin-') === 0 || c === 'rainbow-active').forEach(c => b.classList.remove(c));
    if (skin.anim && btCfg().style !== 'minimal') { b.classList.add('skin-anim', 'skin-' + skin.id); if (skin.id === 'rainbow') b.classList.add('rainbow-active'); return; }
    // solid colour (in Minimal mode an animated skin holds still on its middle colour, which is lighter on the device)
    const light = root.getAttribute('data-theme') === 'light', hex = skin.hex || skin.anim[Math.floor(skin.anim.length / 2)];
    root.style.setProperty('--accent', (light && skin.hexLight) || hex);
}
function applyTheme() {
    btApplyClasses();
    applySkin(localStorage.getItem('bt_current_skin') || 'red');
}
window.addEventListener('DOMContentLoaded', applyTheme);
window.addEventListener('focus', applyTheme);

btApplyClasses();   // apply the saved look straight away (no flash)
