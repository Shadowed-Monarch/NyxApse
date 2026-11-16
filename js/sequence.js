/* sequence.js - logic for the Sequence game
   Watch the squares light up in order, then tap the same squares in the same order. */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_seq')) || 1;

function seqParams(L) {   // longer sequence every 3 levels (max 12), a little faster as you climb
    return {n: Math.min(12, 3 + Math.floor((L - 1) / 3)), on: Math.max(300, 600 - L * 6), gap: Math.max(150, 280 - L * 3)};
}
function seqMake(n, rnd) {   // random squares, never the same square twice in a row
    const s = [];
    for (let i = 0; i < n; i++) { let c; do { c = Math.floor(rnd() * 9); } while (i && c === s[i - 1]); s.push(c); }
    return s;
}

class SeqGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false; this.phase = 'idle';
        const g = document.getElementById('grid');
        for (let i = 0; i < 9; i++) { const c = document.createElement('div'); c.className = 'sq-cell'; c.onpointerdown = e => { e.preventDefault(); this.tap(i); }; g.appendChild(c); }
        this.cells = [...g.children];
        this.updateUI();
    }
    status(t) { document.getElementById('status').textContent = t; }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
        document.getElementById('len').innerText = seqParams(selectedLvl).n;
    }
    light(i) { this.cells.forEach((c, k) => c.classList.toggle('on', k === i)); }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        const bc = document.getElementById('btn-container'); bc.style.display = 'none'; bc.innerHTML = '';
        this.p = seqParams(selectedLvl); this.seq = seqMake(this.p.n, Math.random);
        this.t = -600; this.pos = 0; this.phase = 'show'; this.isPlaying = true;
        document.getElementById('game-container').classList.add('locked');
        this.status('Watch...'); this.updateUI();
        this.timer = setInterval(() => this.tick(), 50);   // the shared pause logic stops this while paused or hidden
    }
    tick() {
        if (!this.isPlaying || this.phase !== 'show') return;
        this.t += 50;
        if (this.t < 0) return;
        const step = this.p.on + this.p.gap, k = Math.floor(this.t / step), w = this.t % step;
        if (k >= this.p.n) { this.light(-1); this.phase = 'input'; this.pos = 0; this.status('Your turn!'); document.getElementById('game-container').classList.remove('locked'); return; }
        this.light(w < this.p.on ? this.seq[k] : -1);
    }
    tap(i) {
        if (!this.isPlaying || this.phase !== 'input' || (window.BT && BT.paused)) return;
        this.light(i); setTimeout(() => this.light(-1), 180);
        if (i === this.seq[this.pos]) { this.pos++; this.status(this.pos + ' / ' + this.p.n); if (this.pos >= this.p.n) this.end('win'); }
        else { const c = document.getElementById('game-container'); c.classList.add('bad'); setTimeout(() => c.classList.remove('bad'), 350); this.end('lose'); }
    }
    end(reason) {
        if (!this.isPlaying) return;
        this.isPlaying = false; this.phase = 'idle'; clearInterval(this.timer); this.light(-1);
        const bc = document.getElementById('btn-container'); bc.innerHTML = ''; bc.style.display = 'flex';
        const title = document.createElement('h1'); bc.appendChild(title);
        const btn = document.createElement('button'); btn.className = 'game-btn';
        if (reason === 'win') {
            this.brains += selectedLvl * 5;
            if (selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_seq')) || 1)) localStorage.setItem('bt_unlocked_seq', selectedLvl + 1);
            localStorage.setItem('bt_coins', this.brains);
            title.innerText = 'PERFECT!'; btn.innerText = 'NEXT LEVEL';
            btn.onclick = () => { selectedLvl++; this.updateUI(); this.start(); };
        } else {
            title.innerText = 'WRONG SQUARE'; btn.innerText = 'TRY AGAIN';
            btn.onclick = () => this.start();
        }
        bc.appendChild(btn); this.updateUI();
    }
}
const game = new SeqGame();
