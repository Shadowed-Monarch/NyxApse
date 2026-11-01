/* math.js - logic for the Math game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_math')) || 1;
class MathGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false;
        this.solved = 0;
        this.time = 30;
        this.active = null;
        this.timer = null;
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    initMenu() {
        const btnContainer = document.getElementById('btn-container');
        btnContainer.style.display = 'none';
        btnContainer.innerHTML = "";
        this.nextQ = null;
        this.solved = 0;
        this.time = 30;
        document.getElementById('count').innerText = "0";
        document.getElementById('time').innerText = "30";
    }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        this.initMenu();
        this.isPlaying = true;
        this.spawn();
        this.timer = setInterval(() => {
            this.time--;
            document.getElementById('time').innerText = this.time;
            if(this.time <= 0) this.end("time");
        }, 1000);
        document.getElementById('ans').focus();
    }
    spawn() {
        if(!this.isPlaying) return;
        const container = document.getElementById('game-container');
        const el = document.createElement('div');
        el.className = 'bubble';
        let speed = Math.max(4, 8 - (selectedLvl * 0.15));
        el.style.animation = `drift ${speed}s linear forwards`;
        el.style.left = Math.random() * (container.clientWidth - 80) + "px";
        const mk = () => {
            const n1 = Math.floor(Math.random() * (5 + Math.min(selectedLvl, 25)));
            const n2 = Math.floor(Math.random() * (5 + Math.min(selectedLvl, 25)));
            const ops = ['+','-','×'].slice(0, selectedLvl < 4 ? 1 : selectedLvl < 8 ? 2 : 3);
            const op = ops[Math.floor(Math.random() * ops.length)];
            let a = n1, b = n2;
            if (op === '-' && b > a) [a, b] = [b, a];
            if (op === '×') { a = 2 + a % 11; b = 2 + b % 11; }
            return { text: `${a}${op}${b}`, res: op === '+' ? a + b : op === '-' ? a - b : a * b };
        };
        const q = this.nextQ || mk();
        this.nextQ = mk();
        el.innerText = q.text;
        const nx = document.getElementById('next-q'); if (nx) nx.innerText = this.nextQ.text;
        container.appendChild(el);
        this.active = { el, ans: String(q.res) };
        el.addEventListener('animationend', () => { if(this.isPlaying) { el.remove(); this.spawn(); } });
    }
    end(reason) {
        this.isPlaying = false;
        clearInterval(this.timer);
        if(this.active) this.active.el.remove();
        this.active = null;
        const btnContainer = document.getElementById('btn-container');
        const title = document.createElement('h1');
        title.style.fontSize = "2.2rem";
        btnContainer.appendChild(title);
        btnContainer.style.display = 'flex';
        if(reason === "win") {
            this.brains += (selectedLvl * 5);
            if(selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_math'))||1)) {
                 localStorage.setItem('bt_unlocked_math', selectedLvl + 1);
            }
            localStorage.setItem('bt_coins', this.brains);
            title.innerText = "LEVEL CLEAR!";
            const nextBtn = document.createElement('button');
            nextBtn.className = 'game-btn';
            nextBtn.innerText = "NEXT LEVEL";
            nextBtn.onclick = () => { selectedLvl++; this.initMenu(); this.updateUI(); this.start(); };
            btnContainer.appendChild(nextBtn);
        } else {
            title.innerText = "TIME OVER ! TOO LATE, YOU CAN'T DO THIS LEVEL 💀";
            const retryBtn = document.createElement('button');
            retryBtn.className = 'game-btn';
            retryBtn.innerText = "PLAY AGAIN";
            retryBtn.onclick = () => this.start();
            btnContainer.appendChild(retryBtn);
        }
    }
}
const game = new MathGame();
document.getElementById('ans').addEventListener('input', (e) => {
    if(game.isPlaying && game.active && e.target.value === game.active.ans) {
        game.active.el.remove();
        game.active = null;
        game.solved++;
        game.time += 1;
        document.getElementById('time').innerText = game.time;
        document.getElementById('count').innerText = game.solved;
        document.getElementById('ans').value = "";
        if(game.solved >= 10) { game.end("win"); } else { game.spawn(); }
    }
});
