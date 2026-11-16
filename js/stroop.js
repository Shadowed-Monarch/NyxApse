/* stroop.js - logic for the Focus game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_focus')) || 1;
const colorList = [
    {name:'RED', hex:'#FF3333', cb:'#D55E00', sym:'▲'}, {name:'BLUE', hex:'#33A0FF', cb:'#0072B2', sym:'■'}, {name:'GREEN', hex:'#33FF33', cb:'#009E73', sym:'●'},
    {name:'YELLOW', hex:'#FFFF33', cb:'#F0E442', sym:'★'}, {name:'PINK', hex:'#FF33FF', cb:'#CC79A7', sym:'◆'}, {name:'ORANGE', hex:'#FF9933', cb:'#E69F00', sym:'✚'}
];
const cbOn = () => document.documentElement.classList.contains('bt-cb');   // colorblind mode: safe colours + a symbol per colour

class FocusGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false; 
        this.updateUI();
    }

    updateUI() {
        document.getElementById('total-brains').innerText = localStorage.getItem('bt_coins') || 0;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }

    start() {
        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('btn-container').style.display = 'none';
        this.solved = 0; 
        this.time = BT.time('focus', 30); document.getElementById('time').innerText = this.time; 
        this.isPlaying = true;
        document.getElementById('count').innerText = "0";
        document.getElementById('ans').value = "";
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

        // Speed Curve Formula (Manageable high levels)
        let speed = Math.max(2.2, 1.2 + (4.0 / (1 + (selectedLvl * 0.15))));
        el.style.animation = `drift ${speed}s linear forwards`;
        el.style.left = Math.random() * (container.clientWidth - 110) + "px";

        const wordObj = colorList[Math.floor(Math.random()*colorList.length)];
        const colorObj = colorList[Math.floor(Math.random()*colorList.length)];

        const cb = cbOn();
        el.textContent = wordObj.name;
        if (cb) { const s = document.createElement('div'); s.textContent = colorObj.sym; s.style.fontSize = '1.1rem'; el.appendChild(s); el.style.flexDirection = 'column'; }
        el.style.color = cb ? colorObj.cb : colorObj.hex;

        container.appendChild(el);
        this.active = { el, ans: colorObj.name.toLowerCase() };

        el.addEventListener('animationend', () => { 
            if(this.isPlaying) { 
                el.remove(); 
                this.spawn(); 
            } 
        });
    }

    end(reason) {
        this.isPlaying = false; 
        clearInterval(this.timer);
        if(this.active) this.active.el.remove();

        const btnContainer = document.getElementById('btn-container');
        btnContainer.style.display = 'flex';
        btnContainer.innerHTML = reason === "win" ? `<h1>LEVEL CLEAR!</h1>` : `<h1>TIME OVER! 💀</h1>`;

        if(reason === "win") {
            let reward = selectedLvl * 5;
            let newTotal = (parseInt(localStorage.getItem('bt_coins')) || 0) + reward;
            localStorage.setItem('bt_coins', newTotal);

            if(selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_focus')) || 1)) {
                localStorage.setItem('bt_unlocked_focus', selectedLvl + 1);
            }

            const nextBtn = document.createElement('button');
            nextBtn.className = 'game-btn'; nextBtn.innerText = "NEXT LEVEL";
            nextBtn.onclick = () => { location.reload(); };
            btnContainer.appendChild(nextBtn);
        } else {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'game-btn'; retryBtn.innerText = "RETRY";
            retryBtn.onclick = () => { this.start(); };
            btnContainer.appendChild(retryBtn);
        }
        this.updateUI();
    }
}

const game = new FocusGame();

document.getElementById('ans').addEventListener('input', (e) => {
    if(game.isPlaying && game.active && e.target.value.toLowerCase() === game.active.ans) {
        game.active.el.remove(); 
        game.active = null; 
        game.solved++; 
        game.time += 1; // Small time bonus for focus
        document.getElementById('count').innerText = game.solved;
        document.getElementById('ans').value = "";
        if(game.solved >= 10) game.end("win"); else game.spawn();
    }
});
