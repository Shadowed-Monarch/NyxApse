/* dots.js - logic for the Dots game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_dots')) || 1;
class DotGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.unlockedLvl = parseInt(localStorage.getItem('bt_unlocked_dots')) || 1;
        this.isPlaying = false;
        this.nextNum = 1;
        this.timeLeft = 10;
        this.timerInt = null;
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    initMenu() {
        const btnContainer = document.getElementById('btn-container');
        btnContainer.style.display = 'none';
        btnContainer.innerHTML = `<h1 id="m-title" style="font-size:2.2rem;"></h1>`;
        this.nextNum = 1;
        this.timeLeft = BT.time('dots', Math.max(6, 11 - Math.floor(selectedLvl/10))); 
        document.getElementById('next-num').innerText = "1";
        document.getElementById('time').innerText = this.timeLeft;
    }
    start() {
        document.getElementById('main-start-btn').style.display = 'none';
        this.initMenu();
        this.isPlaying = true;
        this.spawnDots(Math.min(5 + Math.floor(selectedLvl/2), 14));
        this.timerInt = setInterval(() => {
            this.timeLeft--;
            document.getElementById('time').innerText = this.timeLeft;
            if(this.timeLeft <= 0) this.end("time");
        }, 1000);
    }
    spawnDots(count) {
        const container = document.getElementById('game-container');
        const dotsList = []; 
        const minDistance = 75; 
        for(let i=1; i<=count; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.innerText = i;
            let x, y, tooClose;
            let attempts = 0;
            do {
                tooClose = false;
                x = Math.random() * (container.clientWidth - 65);
                y = Math.random() * (container.clientHeight - 65);
                attempts++;
                for (let other of dotsList) {
                    const dx = x - other.x;
                    const dy = y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) { tooClose = true; break; }
                }
                if (attempts > 100) break; 
            } while (tooClose);
            dotsList.push({ x, y });
            dot.style.left = x + "px";
            dot.style.top = y + "px";
            let fadeSpeed = Math.max(0.5, 3 - (selectedLvl * 0.1));
            dot.style.transition = `opacity ${fadeSpeed}s`;
            const handleTouch = (e) => {
                if(e) e.preventDefault();
                if(!this.isPlaying) return;
                if(parseInt(dot.innerText) === this.nextNum) {
                    dot.remove();
                    this.nextNum++;
                    document.getElementById('next-num').innerText = this.nextNum;
                    this.timeLeft += 1;
                    document.getElementById('time').innerText = this.timeLeft;
                    if(this.nextNum > count) this.end("win");
                } else {
                    this.end("wrong");
                }
            };
            dot.ontouchstart = handleTouch;
            dot.onmousedown = handleTouch;
            container.appendChild(dot);
        }
    }
    end(reason) {
        this.isPlaying = false;
        clearInterval(this.timerInt);
        const container = document.getElementById('game-container');
        container.querySelectorAll('.dot').forEach(d => d.remove());
        const btnContainer = document.getElementById('btn-container');
        const title = document.getElementById('m-title');
        btnContainer.style.display = 'flex';
        if(reason === "win") {
            this.brains += (selectedLvl * 5);
            if (selectedLvl === this.unlockedLvl) {
                this.unlockedLvl++;
                localStorage.setItem('bt_unlocked_dots', this.unlockedLvl);
            }
            localStorage.setItem('bt_coins', this.brains);
            title.innerText = "LEVEL CLEAR!";
            const nextBtn = document.createElement('button');
            nextBtn.className = 'game-btn';
            nextBtn.innerText = "NEXT LEVEL";
            nextBtn.style.marginTop = "20px";
            nextBtn.onclick = () => { selectedLvl++; this.initMenu(); this.updateUI(); this.start(); };
            btnContainer.appendChild(nextBtn);
        } else {
            if(reason === "time") {
                title.innerText = "TIME OVER ! TOO LATE, YOU CAN'T DO THIS LEVEL 💀";
            } else {
                title.innerText = "YOU CAN'T DO THIS LEVEL 💀";
            }
            const retryBtn = document.createElement('button');
            retryBtn.className = 'game-btn';
            retryBtn.innerText = "PLAY AGAIN";
            retryBtn.style.marginTop = "20px";
            retryBtn.onclick = () => this.start();
            btnContainer.appendChild(retryBtn);
        }
        this.updateUI();
    }
}
const game = new DotGame();
