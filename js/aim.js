/* aim.js - logic for the Aim game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_aim')) || 1;
        class AimGame {
            constructor() { this.isPlaying = false; this.updateUI(); }
            updateUI() {
                document.getElementById('total-brains').innerText = localStorage.getItem('bt_coins') || 0;
                document.getElementById('lvl-display').innerText = selectedLvl;
                document.getElementById('goal').innerText = Math.min(20, 15 + Math.floor(selectedLvl / 20));
            }
            start() {
                document.getElementById('start-btn').style.display = 'none';
                document.getElementById('btn-container').style.display = 'none';
                this.solved = 0;
                this.goal = Math.min(20, 15 + Math.floor(selectedLvl / 20)); // 15 pops, rising to 20 at level 100

                // FIXED: Base time reduces slightly as levels go up (30s down to min 15s)
                this.time = BT.time('aim', Math.max(20, 30 - Math.floor(selectedLvl / 3)));

                this.isPlaying = true;
                document.getElementById('count').innerText = "0";
                document.getElementById('time').innerText = this.time;
                this.spawn(0); this.spawn(1); // two bubbles at a time

                this.timer = setInterval(() => {
                    this.time--; 
                    document.getElementById('time').innerText = this.time;
                    if(this.time <= 0) this.end("lose");
                }, 1000);
            }
            spawn(slot = 0) {
                if(!this.isPlaying) return;
                const container = document.getElementById('game-container');
                const b = document.createElement('div');
                b.className = 'bubble';

                // Difficulty Scaling
                const touch = matchMedia('(pointer: coarse)').matches; // phones and tablets get smaller bubbles
                let size = touch ? Math.max(42, 60 - (selectedLvl * 0.65)) : Math.max(52, 75 - (selectedLvl * 0.8));
                b.style.width = size + 'px'; b.style.height = size + 'px'; b.style.setProperty('--sz', size + 'px');
                const half = container.clientWidth / 2;
                b.style.left = (slot * half + Math.random() * Math.max(0, half - size - 4)) + "px"; // 2 lanes, so the 2 bubbles never overlap

                // FIXED: Speed uses an exponential decay curve so it doesn't get "impossible"
                // Formula: 1.0s + (10.0s / (1 + level * 0.1))
                let speedSeconds = 1.0 + (4.0 / (1 + (selectedLvl * 0.15)));
                speedSeconds = Math.max(1.8, 0.88 * speedSeconds * (container.clientHeight - size) / (container.clientHeight + 100)); // never faster than 1.8s
                b.style.animation = `drift ${speedSeconds}s linear forwards`;

             const pop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if(!this.isPlaying) return;
    b.remove(); this.solved++;

    // REDUCED: Only 1s per hit now. No more "infinite time".
    this.time += 1; 

    document.getElementById('count').innerText = this.solved;
    document.getElementById('time').innerText = Math.floor(this.time);

    if(this.solved >= this.goal) this.end("win"); else this.spawn(slot);
};
                b.onmousedown = pop; b.ontouchstart = pop;

                container.appendChild(b);
                b.addEventListener('animationend', () => { 
                    if(this.isPlaying) { 
                        b.remove(); 
                        this.spawn(slot); 
                    } 
                });
            }
            end(res) {
                this.isPlaying = false; clearInterval(this.timer);
                const bc = document.getElementById('btn-container');
                bc.style.display = 'flex';
                bc.innerHTML = res === "win" ? `<h1>LEVEL CLEAR!</h1>` : `<h1>TIME OVER! 💀</h1>`;
                if(res === "win") {
                    let coins = parseInt(localStorage.getItem('bt_coins') || 0) + (selectedLvl * 5);
                    localStorage.setItem('bt_coins', coins);
                    if(selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_aim')) || 1)) {
                        localStorage.setItem('bt_unlocked_aim', selectedLvl + 1);
                    }
                    const n = document.createElement('button'); n.className="game-btn"; n.innerText="NEXT"; n.onclick=()=>location.reload(); bc.appendChild(n);
                } else {
                    const r = document.createElement('button'); r.className="game-btn"; r.innerText="RETRY"; r.onclick=()=>location.reload(); bc.appendChild(r);
                }
                this.updateUI();
            }
        }
        const game = new AimGame();
