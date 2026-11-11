/* avoid.js - logic for the Reflex game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_reflex')) || 1;
class ReflexGame {
    constructor() { 
        this.isPlaying = false; 
        this.px = 0; this.py = 0; 
        this.updateUI(); 
    }
    updateUI() {
        document.getElementById('total-brains').innerText = localStorage.getItem('bt_coins') || 0;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('btn-container').style.display = 'none';
        const p = document.getElementById('player'); 
        p.style.display = 'block';

        // Initial position center
        const container = document.getElementById('game-container');
        this.px = container.clientWidth / 2;
        this.py = container.clientHeight / 2;
        p.style.left = this.px + 'px'; p.style.top = this.py + 'px';

        this.isPlaying = true; 
        this.time = BT.time('reflex', 20); document.getElementById('time').innerText = this.time; 

        // Start Spawning
        const wScale = Math.min(2.5, Math.max(1, 800 / container.clientWidth));   // narrow screens get fewer bubbles
        this.spawnLoop = setInterval(() => this.spawn(), Math.max(190, 300 - (selectedLvl * 15)) * wScale);

        // Start Timer
        this.timer = setInterval(() => {
            this.time--; 
            document.getElementById('time').innerText = this.time;
            if(this.time <= 0) this.end("win");
        }, 1000);

        // Start THE COLLISION LOOP (Checks every single frame)
        this.runCollisionLoop();

        const move = (e) => {
            if(!this.isPlaying) return;
            const r = container.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.px = clientX - r.left;
            this.py = clientY - r.top;
            if (e.touches) this.py = Math.max(12, this.py - 60);   // finger would hide the dot
            p.style.left = this.px + 'px'; 
            p.style.top = this.py + 'px';
        };
        container.onmousemove = move; 
        container.ontouchmove = move;
    }
    spawn() {
        if(!this.isPlaying) return;
        const c = document.getElementById('game-container');
        const b = document.createElement('div');
        b.className = 'bubble';
        b.style.left = Math.random() * (c.clientWidth - 40) + 'px';
        b.style.animation = `drift ${Math.max(1.6, 3.5 - (selectedLvl * 0.15))}s linear forwards`;
        c.appendChild(b);
        b.addEventListener('animationend', () => b.remove());
    }
    runCollisionLoop() {
        if(!this.isPlaying) return;

        const bubbles = document.querySelectorAll('.bubble');
        bubbles.forEach(b => {
            // Get exact current position of falling bubble
            const bx = b.offsetLeft + 20;
            const by = b.offsetTop + 20;

            // Distance formula
            const dist = Math.hypot(this.px - bx, this.py - by);
            if(dist < 28) { // Hit detected
                this.end("lose");
            }
        });

        requestAnimationFrame(() => this.runCollisionLoop());
    }
    end(res) {
        if(!this.isPlaying) return;
        this.isPlaying = false; 
        clearInterval(this.timer); 
        clearInterval(this.spawnLoop);

        document.getElementById('player').style.display = 'none';
        const bc = document.getElementById('btn-container');
        bc.style.display = 'flex';
        bc.innerHTML = res === "win" ? `<h1>SURVIVED!</h1>` : `<h1>WASTED! 💀</h1>`;

        if(res === "win") {
            let coins = parseInt(localStorage.getItem('bt_coins') || 0) + (selectedLvl * 5);
            localStorage.setItem('bt_coins', coins);
            if(selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_reflex')) || 1)) {
                localStorage.setItem('bt_unlocked_reflex', selectedLvl + 1);
            }
            const n = document.createElement('button'); 
            n.className="game-btn"; n.innerText="NEXT"; 
            n.onclick=()=>location.reload(); 
            bc.appendChild(n);
        } else {
            const r = document.createElement('button'); 
            r.className="game-btn"; r.innerText="RETRY"; 
            r.onclick=()=>location.reload(); 
            bc.appendChild(r);
        }
        this.updateUI();
    }
}
const game = new ReflexGame();
