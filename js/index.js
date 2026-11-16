/* index.js - logic for the home screen */
const ranks = BT_RANKS;

let userBrains, unlocked, currentSkin, wallet, previewId = null;

function updateUI() {
    userBrains = parseInt(localStorage.getItem('bt_coins')) || 0;
    wallet = parseInt(localStorage.getItem('bt_wallet')) || 0;
    unlocked = JSON.parse(localStorage.getItem('bt_skins')) || ['red'];
    currentSkin = localStorage.getItem('bt_current_skin') || 'red';

    document.getElementById('brains').innerText = userBrains;
    document.getElementById('wallet').innerText = wallet;

    let currentRank = ranks[0], nextRank = ranks[1] || ranks[0];
    ranks.forEach(r => { if (userBrains >= r.min) currentRank = r; });
    const nextIdx = ranks.indexOf(currentRank) + 1;
    nextRank = ranks[nextIdx] || { name: "MAX", min: userBrains, icon: "🌌" };

    document.getElementById('rank-name').innerText = currentRank.name;
    document.getElementById('rank-icon').innerText = currentRank.icon;
    document.getElementById('next-rank-info').innerText = nextRank.name === "MAX" ? "MAX RANK reached 🌌" : `${nextRank.min - userBrains} BP to ${nextRank.icon} ${nextRank.name}`;

    let progress = nextRank.name === "MAX" ? 100 : ((userBrains - currentRank.min) / (nextRank.min - currentRank.min)) * 100;
    document.getElementById('rank-progress').style.width = Math.min(progress, 100) + "%";

    if (typeof applyTheme === 'function' && !previewId) applyTheme();
}

function toggleShop() {
    const overlay = document.getElementById('shop-overlay');
    const open = overlay.style.display !== 'flex';
    overlay.style.display = open ? 'flex' : 'none';
    previewId = null; applyTheme();                      // closing or opening always drops any preview
    if (open) renderShop();
}

const swatch = s => s.anim ? 'linear-gradient(135deg, ' + s.anim.join(',') + ')' : s.hex;

function renderShop() {
    const own = JSON.parse(localStorage.getItem('bt_skins')) || ['red'];
    const cur = localStorage.getItem('bt_current_skin') || 'red';
    wallet = parseInt(localStorage.getItem('bt_wallet')) || 0;
    const sw = document.getElementById('shop-wallet'); if (sw) sw.innerText = '🪙 ' + wallet + ' coins';
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    BT_SKIN_LIST.forEach(s => {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'shop-item'; el.title = s.name; el.setAttribute('aria-label', s.name);
        el.style.background = swatch(s);
        if (cur === s.id) el.classList.add('selected');
        if (previewId === s.id) el.classList.add('previewing');
        if (!own.includes(s.id)) el.innerHTML = s.cost === Infinity ? '<span class="price">🔒</span>' : '<span class="price">' + s.cost + '</span>';
        el.onclick = () => { previewId = s.id; applySkin(s.id); renderShop(); };      // tapping only previews, it never buys
        grid.appendChild(el);
    });
    const id = previewId || cur, s = BT_SKIN_LIST.find(x => x.id === id), owned = own.includes(id), info = document.getElementById('shop-info');
    let action = '';
    if (owned && cur === id) action = '<span class="ok">✓ Equipped</span>';
    else if (owned) action = '<button class="bt-btn pri" id="skin-equip">Equip</button>';
    else if (s.cost === Infinity) action = '<span class="hint">🔒 ' + s.earn + '</span>';
    else action = '<button class="bt-btn pri" id="skin-buy">Buy for ' + s.cost + ' 🪙</button>';
    info.innerHTML = '<div><b>' + s.name + '</b>' + (s.anim ? ' <small>animated</small>' : '') + '</div><div class="skin-act">' + action + (previewId && !owned ? ' <button class="bt-btn" id="skin-cancel">Cancel</button>' : '') + '</div>';
    const eq = document.getElementById('skin-equip'), by = document.getElementById('skin-buy'), ca = document.getElementById('skin-cancel');
    if (eq) eq.onclick = () => { localStorage.setItem('bt_current_skin', id); previewId = null; applyTheme(); renderShop(); };
    if (ca) ca.onclick = () => { previewId = null; applyTheme(); renderShop(); };
    if (by) by.onclick = () => {
        if (wallet < s.cost) { alert('Not enough coins! You need ' + (s.cost - wallet) + ' more. Win levels and daily challenges to earn them.'); return; }
        localStorage.setItem('bt_wallet', wallet - s.cost);
        own.push(id); localStorage.setItem('bt_skins', JSON.stringify(own));
        localStorage.setItem('bt_current_skin', id);
        BT.confetti(); BT.checkAch();
        previewId = null; updateUI(); renderShop();
    };
}


window.onload = updateUI;
window.onfocus = updateUI;
