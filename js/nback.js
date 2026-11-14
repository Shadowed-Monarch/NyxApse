/* nback.js - logic for the N-Back game
   A square lights up on a 3x3 grid. Tap SAME when it is the square that lit up N steps ago. */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_nback')) || 1;

// How hard is a level? N grows slowly, the pace gets faster, rounds grow with N.
function nbackParams(L) {
    const n = L < 8 ? 1 : L < 16 ? 2 : L < 30 ? 3 : L < 60 ? 4 : 5;
    const ms = Math.round(Math.max(1200, 2400 - L * 15) / 100) * 100;      // time per round (multiple of 100)
    return {n, ms, total: 16 + 2 * n};
}
// Pure function so it can be tested: a sequence of cells 0..8 with enough real "same" rounds
function nbackSequence(n, total, rnd) {
    for (let tries = 0; tries < 50; tries++) {
        const s = [];
        for (let i = 0; i < total; i++) {
            const back = i >= n ? s[i - n] : -1;
            if (back >= 0 && rnd() < 0.3) s.push(back);
            else { let c; do { c = Math.floor(rnd() * 9); } while (c === back); s.push(c); }
        }
        let m = 0; for (let i = n; i < total; i++) if (s[i] === s[i - n]) m++;
        if (m >= 3 && m <= Math.ceil(total * 0.45)) return s;
    }
    return Array.from({length: total}, (_, i) => i % 9);   // never reached in practice
}

class NBackGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false;
        const g = document.getElementById('grid');
        for (let i = 0; i < 9; i++) { const c = document.createElement('div'); c.className = 'nb-cell'; g.appendChild(c); }
        this.cells = [...g.children];
        const same = document.getElementById('same');
        same.onpointerdown = e => { e.preventDefault(); this.press(); };
        document.addEventListener('keydown', e => { if (e.code === 'Space' && this.isPlaying) { e.preventDefault(); this.press(); } });
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
        const p = nbackParams(selectedLvl);
        document.getElementById('nval').innerText = p.n; document.getElementById('total').innerText = p.total;
    }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        const bc = document.getElementById('btn-container'); bc.style.display = 'none'; bc.innerHTML = '';
        const p = this.p = nbackParams(selectedLvl);
        this.seq = nbackSequence(p.n, p.total, Math.random);
        this.i = -1; this.mistakes = 0; this.tapped = false; this.elapsed = p.ms;   // first round starts on the first tick
        this.isPlaying = true;
        const same = document.getElementById('same'); same.style.display = 'block'; same.disabled = false;
        document.getElementById('miss').innerText = '0'; document.getElementById('count').innerText = '0';
        this.updateUI();
        this.timer = setInterval(() => this.tick(), 100);   // the shared pause logic stops this while paused or hidden
    }
    flash(cls) { const c = document.getElementById('game-container'); c.classList.remove('ok', 'bad'); void c.offsetWidth; c.classList.add(cls); setTimeout(() => c.classList.remove(cls), 350); }
    judge() {   // score the round that just finished
        if (this.i < 0) return;
        const isSame = this.i >= this.p.n && this.seq[this.i] === this.seq[this.i - this.p.n];
        if (isSame !== this.tapped) { this.mistakes++; document.getElementById('miss').innerText = this.mistakes; this.flash('bad'); }
        else if (isSame) this.flash('ok');
    }
    tick() {
        if (!this.isPlaying) return;
        this.elapsed += 100;
        if (this.elapsed >= this.p.ms) {                      // round boundary
            this.judge();
            if (this.mistakes >= 3) return this.end('lose');
            if (this.i + 1 >= this.p.total) return this.end('win');
            this.i++; this.elapsed = 0; this.tapped = false;
            document.getElementById('count').innerText = this.i + 1;
            this.cells.forEach((c, k) => c.classList.toggle('on', k === this.seq[this.i]));
        } else if (this.elapsed >= this.p.ms * 0.6) this.cells.forEach(c => c.classList.remove('on'));   // square fades, the answer window stays open
    }
    press() { if (this.isPlaying && this.i >= 0) this.tapped = true; }
    end(reason) {
        if (!this.isPlaying) return;
        this.isPlaying = false; clearInterval(this.timer);
        this.cells.forEach(c => c.classList.remove('on'));
        const same = document.getElementById('same'); same.style.display = 'none';
        const bc = document.getElementById('btn-container'); bc.innerHTML = ''; bc.style.display = 'flex';
        const title = document.createElement('h1'); bc.appendChild(title);
        const btn = document.createElement('button'); btn.className = 'game-btn';
        if (reason === 'win') {
            this.brains += selectedLvl * 5;
            if (selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_nback')) || 1)) localStorage.setItem('bt_unlocked_nback', selectedLvl + 1);
            localStorage.setItem('bt_coins', this.brains);
            title.innerText = 'LEVEL CLEAR!'; btn.innerText = 'NEXT LEVEL';
            btn.onclick = () => { selectedLvl++; this.updateUI(); this.start(); };
        } else {
            title.innerText = '3 MISTAKES 💀'; btn.innerText = 'PLAY AGAIN';
            btn.onclick = () => this.start();
        }
        bc.appendChild(btn); this.updateUI();
    }
}
const game = new NBackGame();
