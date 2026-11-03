/* theme.js - Shared theme for every NyxApse page
   Handles: light/dark mode, accent skin, rainbow animation, fallback CSS variables */
(function injectSharedStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @property --accent { syntax: '<color>'; initial-value: #ff0000; inherits: true; }
        @keyframes rainbow-loop {
            0% { --accent: #ff0000; } 20% { --accent: #ffcc00; } 40% { --accent: #00ff00; }
            60% { --accent: #00ffff; } 80% { --accent: #9900ff; } 100% { --accent: #ff0000; }
        }
        .rainbow-active { animation: rainbow-loop 5s infinite linear !important; }
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

const BT_SKINS = [
    { id: 'red', hex: '#ff0000' }, { id: 'blue', hex: '#0088ff' }, { id: 'yellow', hex: '#ffcc00' },
    { id: 'green', hex: '#00ff00' }, { id: 'cyan', hex: '#00ffff' }, { id: 'pink', hex: '#ff00ff' },
    { id: 'purple', hex: '#9900ff' }, { id: 'orange', hex: '#ff6600' }, { id: 'gold', hex: '#ffd700' },
    { id: 'rainbow', hex: 'rainbow' }
];

const BT_DEFAULTS = {noise: 'off', vol: 0.8, sfx: true, vibe: true, theme: 'dark', style: 'neon', glow: true, grain: true, confetti: true, big: false, compact: false, leaderboard: false, timers: {}};
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
    root.classList.toggle('bt-big', !!c.big); root.classList.toggle('bt-compact', !!c.compact);
}
function applyTheme() {
    btApplyClasses();
    const id = localStorage.getItem('bt_current_skin') || 'red';
    const skin = BT_SKINS.find(c => c.id === id) || BT_SKINS[0];
    if (skin.id === 'rainbow') {
        document.body.classList.add('rainbow-active');
    } else {
        document.body.classList.remove('rainbow-active');
        document.documentElement.style.setProperty('--accent', skin.hex);
    }
}
window.addEventListener('DOMContentLoaded', applyTheme);
window.addEventListener('focus', applyTheme);

btApplyClasses();   // apply the saved look straight away (no flash)
