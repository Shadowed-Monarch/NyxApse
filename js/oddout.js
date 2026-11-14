/* oddout.js - logic for the Odd One Out game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_odd')) || 1;
class OddGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false;
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        const bc = document.getElementById('btn-container'); bc.style.display = 'none'; bc.innerHTML = '';
        this.found = 0; this.time = BT.time('odd', 30); this.isPlaying = true;
        document.getElementById('count').innerText = '0';
        document.getElementById('time').innerText = this.time;
        this.round();
        this.timer = setInterval(() => {
            this.time--; document.getElementById('time').innerText = this.time;
            if (this.time <= 0) this.end('time');
        }, 1000);
    }
    // One round: a grid of identical shapes with exactly one that differs in color, size or rotation
    round() {
        const L = selectedLvl, n = Math.min(3 + Math.floor(L / 5), 7);          // grid 3x3 up to 7x7
        const f = 1 - 0.75 * Math.min(1, L / 60);                                 // differences shrink, then stop at level 60
        const kind = ['color', 'size', 'turn'][Math.floor(Math.random() * 3)];
        const shape = kind === 'turn' ? 'tri' : ['tri', 'sq', 'circle'][Math.floor(Math.random() * 3)];
        const hue = document.documentElement.classList.contains('bt-cb') ? [210, 35][Math.floor(Math.random() * 2)] : Math.floor(Math.random() * 360), odd = Math.floor(Math.random() * n * n), sign = Math.random() < 0.5 ? -1 : 1;
        const c = document.getElementById('game-container'), old = document.getElementById('grid'); if (old) old.remove();
        const grid = document.createElement('div'); grid.id = 'grid';
        grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        grid.style.width = grid.style.height = (Math.min(c.clientWidth, c.clientHeight) - 24) + 'px';
        for (let i = 0; i < n * n; i++) {
            let l = 55, s = 0.7, r = 0;
            if (i === odd) {
                if (kind === 'color') l += sign * 22 * f;
                if (kind === 'size') s = Math.min(0.95, 0.7 * (1 + sign * 0.4 * f));
                if (kind === 'turn') r = sign * 45 * f;
            }
            const cell = document.createElement('button'); cell.className = 'cell'; cell.setAttribute('aria-label', 'shape');
            const sh = document.createElement('div'); sh.className = 'shape ' + shape;
            sh.style.cssText = `--h:${hue};--l:${l}%;--s:${s};--r:${r}deg`;
            cell.appendChild(sh); cell.onpointerdown = e => { e.preventDefault(); this.pick(i === odd); };
            grid.appendChild(cell);
        }
        c.insertBefore(grid, c.firstChild);
    }
    pick(ok) {
        if (!this.isPlaying) return;
        if (ok) {
            this.found++; this.time += 1;
            document.getElementById('count').innerText = this.found; document.getElementById('time').innerText = this.time;
            if (this.found >= 10) this.end('win'); else this.round();
        } else {
            this.time -= 3;                                                      // a wrong tap costs 3 seconds
            const c = document.getElementById('game-container'); c.classList.add('wrong'); setTimeout(() => c.classList.remove('wrong'), 260);
            document.getElementById('time').innerText = Math.max(0, this.time);
            if (this.time <= 0) this.end('time');
        }
    }
    end(reason) {
        if (!this.isPlaying) return;
        this.isPlaying = false; clearInterval(this.timer);
        const g = document.getElementById('grid'); if (g) g.remove();
        const bc = document.getElementById('btn-container'); bc.innerHTML = ''; bc.style.display = 'flex';
        const title = document.createElement('h1'); bc.appendChild(title);
        const btn = document.createElement('button'); btn.className = 'game-btn';
        if (reason === 'win') {
            this.brains += selectedLvl * 5;
            if (selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_odd')) || 1)) localStorage.setItem('bt_unlocked_odd', selectedLvl + 1);
            localStorage.setItem('bt_coins', this.brains);
            title.innerText = 'LEVEL CLEAR!'; btn.innerText = 'NEXT LEVEL';
            btn.onclick = () => { selectedLvl++; this.updateUI(); this.start(); };
        } else {
            title.innerText = 'TIME OVER ! 💀'; btn.innerText = 'PLAY AGAIN';
            btn.onclick = () => this.start();
        }
        bc.appendChild(btn); this.updateUI();
    }
}
const game = new OddGame();
