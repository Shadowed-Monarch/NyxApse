/* memory.js - logic for the Memory Matrix game */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_memory')) || 1;
class MemoryGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false;
        this.sequence = [];
        this.userClicks = 0;
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    start() {
        document.getElementById('main-start-btn').style.display = 'none';
        document.getElementById('btn-container').style.display = 'none';
        this.isPlaying = true;
        this.userClicks = 0;
        this.sequence = [];
        this.setupGrid();
    }
    setupGrid() {
        const container = document.getElementById('game-container');
        container.innerHTML = '<div id="btn-container"><h1 id="m-title" style="font-size:1.8rem;"></h1></div>';
        let gridSize = 3 + Math.floor((selectedLvl - 1) / 3);
        gridSize = Math.min(gridSize, 6); 
        container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        let totalBlocks = gridSize * gridSize;
        let blocksToRemember = Math.min(3 + Math.floor(selectedLvl / 2), Math.floor(totalBlocks / 3));
        for (let i = 0; i < totalBlocks; i++) {
            const block = document.createElement('div');
            block.className = 'block';
            block.dataset.id = i;
            container.appendChild(block);
        }
        const allIndices = Array.from({length: totalBlocks}, (_, i) => i);
        this.sequence = allIndices.sort(() => 0.5 - Math.random()).slice(0, blocksToRemember);
        setTimeout(() => {
            this.sequence.forEach(id => {
                container.children[id + 1].classList.add('glow');
            });
            setTimeout(() => {
                this.sequence.forEach(id => {
                    container.children[id + 1].classList.remove('glow');
                });
                this.enableUserClicks();
            }, 2000 + this.sequence.length * 150);
        }, 500);
    }
    enableUserClicks() {
        const blocks = document.querySelectorAll('.block');
        blocks.forEach(block => {
            const handleInput = (e) => {
                if (e) e.preventDefault();
                if (!this.isPlaying) return;
                const id = parseInt(block.dataset.id);
                if (this.sequence.includes(id)) {
                    if (!block.classList.contains('correct')) {
                        block.classList.add('correct');
                        this.userClicks++;
                        if (this.userClicks === this.sequence.length) this.end("win");
                    }
                } else {
                    block.classList.add('wrong');
                    this.end("fail");
                }
            };
            block.onpointerdown = handleInput;
        });
    }
    end(result) {
        this.isPlaying = false;
        const title = document.getElementById('m-title');
        const btnContainer = document.getElementById('btn-container');
        btnContainer.innerHTML = `<h1 id="m-title" style="font-size:1.8rem;"></h1>`;
        const newTitle = btnContainer.querySelector('#m-title');
        btnContainer.style.display = 'flex';
        if (result === "win") {
            this.brains += (selectedLvl * 5);
            if (selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_memory')) || 1)) {
                localStorage.setItem('bt_unlocked_memory', selectedLvl + 1);
            }
            localStorage.setItem('bt_coins', this.brains);
            newTitle.innerText = "LEVEL CLEAR!";
            const nextBtn = document.createElement('button');
            nextBtn.className = 'game-btn';
            nextBtn.innerText = "NEXT LEVEL";
            nextBtn.onclick = () => { selectedLvl++; this.updateUI(); this.start(); };
            btnContainer.appendChild(nextBtn);
        } else {
            newTitle.innerText = "YOU CAN'T DO THIS LEVEL 💀";
            const retryBtn = document.createElement('button');
            retryBtn.className = 'game-btn';
            retryBtn.innerText = "PLAY AGAIN";
            retryBtn.onclick = () => this.start();
            btnContainer.appendChild(retryBtn);
        }
        this.updateUI();
    }
}
const game = new MemoryGame();
