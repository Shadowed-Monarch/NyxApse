/* index.js - logic for the home screen */
// --- AUDIO ENGINE ---
let audioCtx, noiseNode, gainNode;
let isPlaying = false;

let vol = parseFloat(localStorage.getItem("bt_vol")) || 0.8;
window.addEventListener('DOMContentLoaded', () => document.getElementById('vol').value = vol);
function setVol(v) { vol = parseFloat(v); localStorage.setItem("bt_vol", v); if (isPlaying) gainNode.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05); }
function toggleNoise() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown Noise
            lastOut = output[i];
            output[i] *= 3.5;
        }
        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0; // Start muted
        noiseNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        noiseNode.start();
    }

    isPlaying = !isPlaying;
    document.getElementById('sound-btn').innerText = isPlaying ? "🔊" : "🔇";
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gainNode.gain.setTargetAtTime(isPlaying ? vol : 0, audioCtx.currentTime, 0.1);
}

const colors = [
    {id:'red', hex:'#ff0000', cost:0}, {id:'blue', hex:'#0088ff', cost:500},
    {id:'yellow', hex:'#ffcc00', cost:1000}, {id:'green', hex:'#00ff00', cost:2000},
    {id:'cyan', hex:'#00ffff', cost:3500}, {id:'pink', hex:'#ff00ff', cost:5000},
    {id:'purple', hex:'#9900ff', cost:7500}, {id:'orange', hex:'#ff6600', cost:10000},
    {id:'gold', hex:'#ffd700', cost:25000}, {id:'rainbow', hex:'linear-gradient(45deg, #f00, #ff0, #0f0, #0ff, #90f)', cost:50000}
];

const ranks = BT_RANKS;

let userBrains, unlocked, currentSkin;

function updateUI() {
    const savedMode = localStorage.getItem('bt_mode') || 'dark';
    document.documentElement.setAttribute('data-theme', savedMode);
    userBrains = parseInt(localStorage.getItem('bt_coins')) || 0;
    unlocked = JSON.parse(localStorage.getItem('bt_skins')) || ['red'];
    currentSkin = localStorage.getItem('bt_current_skin') || 'red';

    document.getElementById('brains').innerText = userBrains;

    let currentRank = ranks[0], nextRank = ranks[1] || ranks[0];
    ranks.forEach(r => { if (userBrains >= r.min) currentRank = r; });
    const nextIdx = ranks.indexOf(currentRank) + 1;
    nextRank = ranks[nextIdx] || { name: "MAX", min: userBrains, icon: "🌌" };

    document.getElementById('rank-name').innerText = currentRank.name;
    document.getElementById('rank-icon').innerText = currentRank.icon;
    document.getElementById('next-rank-info').innerText = nextRank.name === "MAX" ? "MAX RANK reached 🌌" : `${nextRank.min - userBrains} BP to ${nextRank.icon} ${nextRank.name}`;

    let progress = nextRank.name === "MAX" ? 100 : ((userBrains - currentRank.min) / (nextRank.min - currentRank.min)) * 100;
    document.getElementById('rank-progress').style.width = Math.min(progress, 100) + "%";

    if(currentSkin === 'rainbow') {
        document.body.classList.add('rainbow-active');
    } else {
        document.body.classList.remove('rainbow-active');
        const skinObj = colors.find(c => c.id === currentSkin) || colors[0];
        document.documentElement.style.setProperty('--accent', skinObj.hex);
    }
}

function toggleShop() {
    const overlay = document.getElementById('shop-overlay');
    overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
    if(overlay.style.display === 'flex') renderShop();
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    colors.forEach(c => {
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.style.background = c.hex;
        if(unlocked.includes(c.id)) {
            if(currentSkin === c.id) el.classList.add('selected');
            el.onclick = () => { localStorage.setItem('bt_current_skin', c.id); updateUI(); renderShop(); };
        } else {
            el.innerHTML = `<span style="font-size:10px; font-weight:bold; color:black">${c.cost}</span>`;
            el.style.opacity = "0.7";
            el.onclick = () => {
                if(userBrains >= c.cost) {
                    userBrains -= c.cost; unlocked.push(c.id);
                    localStorage.setItem('bt_coins', userBrains);
                    localStorage.setItem('bt_skins', JSON.stringify(unlocked)); BT.confetti(); BT.checkAch();
                    localStorage.setItem('bt_current_skin', c.id);
                    updateUI(); renderShop();
                } else alert("Not enough Brains!");
            };
        }
        grid.appendChild(el);
    });
}

function toggleLightDark() {
    const currentMode = localStorage.getItem('bt_mode') || 'dark';
    localStorage.setItem('bt_mode', currentMode === 'dark' ? 'light' : 'dark');
    updateUI();
}

window.onload = updateUI;
window.onfocus = updateUI;
