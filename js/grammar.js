/* grammar.js - logic for the Grammar game.
   Read the sentence, tap the word or phrase that fills the gap. 10 right answers clear the level.
   Each right answer adds 1 second, each wrong answer costs 3 seconds. */
let selectedLvl = parseInt(localStorage.getItem('bt_unlocked_grammar')) || 1;

// Question bank. Each line: sentence with ___ | right answer | wrong answers...
// Tier 0 = basics, 1 = everyday, 2 = harder, 3 = expert. Every item has exactly one right answer.
const GRAMMAR_BANK = [
  [ // tier 0
    'I have ___ apple.|an|a',
    'He has ___ new car.|a|an',
    'This is ___ umbrella.|an|a',
    'He ___ my brother.|is|are',
    'They ___ happy today.|are|is',
    'I ___ a student.|am|is|are',
    'We ___ friends.|are|is|am',
    'My sister ___ a doctor.|is|are',
    'My parents ___ at home.|are|is',
    'It ___ cold today.|is|are',
    'How ___ you?|are|is|am',
    'What ___ your name?|is|are',
    'We ___ going to the park.|are|is|am',
    'The dogs ___ barking.|are|is',
    'The cat ___ on the sofa.|sleeps|sleep',
    'She ___ tea every morning.|drinks|drink',
    'I ___ football on Sundays.|play|plays',
    'The sun ___ in the east.|rises|rise',
    'Birds ___ in the sky.|fly|flies',
    'There ___ two birds in the tree.|are|is',
    'There ___ a dog in the garden.|is|are',
    'Two ___ are on the table.|boxes|box|boxs',
    'I have three ___.|children|childs|childrens',
    'Look at those ___!|mice|mouses|mices',
    '___ am hungry.|I|Me',
    '___ is my best friend.|She|Her',
    'That book is ___.|mine|me|my',
    'Give the keys to ___.|me|I',
    'This is ___ car.|my|me',
    'He ___ not like fish.|does|do',
    'I ___ not know.|do|does',
    'She can ___ very fast.|run|runs|running',
    'Please ___ the door.|close|closes',
    'My cat has ___ legs.|four|fours'
  ],
  [ // tier 1
    'Yesterday I ___ to the market.|went|go|gone',
    'I ___ him yesterday.|saw|seen|see',
    'He ___ his keys yesterday.|lost|lose|losed',
    'She ___ a letter last night.|wrote|written|writed',
    'She has ___ her homework.|finished|finish|finishing',
    'I have never ___ sushi.|eaten|ate|eat',
    'They have ___ here for two years.|lived|live|living',
    'She is taller ___ her sister.|than|then|that',
    'This is the ___ movie I have seen.|best|better|good',
    'He is ___ than me.|smarter|smartest|more smart',
    'I am interested ___ music.|in|on|at',
    'She is good ___ math.|at|in|on',
    'He is allergic ___ peanuts.|to|with|of',
    'We arrived ___ the airport at noon.|at|to|on',
    'The meeting is ___ Monday.|on|in|at',
    'I was born ___ 1998.|in|on|at',
    'See you ___ 5 o\'clock.|at|on|in',
    'I live ___ London.|in|on|at',
    'The book is ___ the table.|on|in|at',
    'She sat ___ me.|next to|next of|next at',
    'If it rains tomorrow, we ___ at home.|will stay|stayed',
    'There isn\'t ___ milk left.|any|some|no',
    'How ___ water do you drink?|much|many|few',
    'How ___ books do you have?|many|much|little',
    'He gave ___ a gift.|her|she|hers',
    'My brother and ___ went to the cinema.|I|me|myself',
    'She looks ___.|happy|happily|happiness',
    'He speaks ___.|slowly|slow|slowness',
    'I enjoy ___ music.|listening to|to listen to|listen to',
    'She wants ___ a doctor.|to be|being|be',
    'They are ___ a movie tonight.|watching|watch|watches',
    'He ___ lives in Paris.|still|yet',
    'I have ___ finished.|already|yet',
    'You should ___ more careful.|be|being|to be'
  ],
  [ // tier 2
    'The dog wagged ___ tail.|its|it\'s',
    '___ going to be late.|They\'re|Their|There',
    'The students left ___ books here.|their|there|they\'re',
    'I have ___ time than before.|less|fewer',
    'There were ___ people at the show.|fewer|less',
    'The weather will ___ our plans.|affect|effect',
    'The ___ of the medicine was fast.|effect|affect',
    'If I ___ you, I would apologize.|were|was|am',
    'If she had studied, she ___ the exam.|would have passed|will pass|would pass',
    'The letter ___ yesterday.|was sent|sent|is sent',
    'English ___ all over the world.|is spoken|speaks|is speaking',
    'She said that she ___ tired.|was|were|been',
    'Neither of the answers ___ correct.|is|are',
    'Each of the players ___ a medal.|received|receive',
    'Everyone ___ to the party.|was invited|were invited',
    'He must ___ the report by Friday.|submit|submits|submitted',
    'You ___ smoke here. It is forbidden.|must not|don\'t have to',
    'The man ___ car was stolen called the police.|whose|who|whom',
    'I wish I ___ more time.|had|have|would have',
    'She suggested ___ early.|leaving|to leave|leave',
    'He is used to ___ up early.|getting|get|got',
    'By next year, I ___ here for ten years.|will have worked|will work|work',
    'Hardly ___ arrived when it started to rain.|had we|we had|did we',
    'She is the ___ of the two sisters.|taller|tallest|more tall',
    'I look forward to ___ you.|seeing|see|saw',
    'She ___ here since 2019.|has lived|lives|lived',
    'Between you and ___, this is a secret.|me|I',
    'He doesn\'t have ___ experience.|much|many',
    'The number of students ___ increasing.|is|are',
    'A number of students ___ absent.|are|is',
    'He told me not ___ late.|to be|be|being',
    'Despite ___ tired, he kept working.|being|be|of being',
    'She is afraid ___ spiders.|of|from|at',
    'He apologized ___ being late.|for|of|about',
    'The harder you work, ___ you will be.|the better|better|best',
    'The film ___ by the time we arrived.|had started|started|has started'
  ],
  [ // tier 3
    'It is essential that he ___ on time.|be|is|will be',
    'I suggest that she ___ a doctor.|see|sees|saw',
    'Not only ___ late, but he also forgot the tickets.|was he|he was|is he',
    'Never before ___ such a beautiful sunset.|had I seen|I had seen|have seen I',
    'Rarely ___ such kindness.|do we see|we see|we do see',
    'Were I rich, I ___ travel the world.|would|will',
    'Had I known, I ___ come earlier.|would have|would|will have',
    'The book, ___ cover is torn, belongs to Anna.|whose|who\'s|which',
    'Honesty is a guiding ___.|principle|principal',
    'She is the school ___.|principal|principle',
    'He is one of those people who ___ never satisfied.|are|is',
    'She ___ the book on the desk.|laid|lay|lain',
    'The weather was ___ cold that we stayed in.|so|such|very',
    'It was ___ a cold day that we stayed in.|such|so|very',
    'I\'m not sure ___ he will come.|whether|weather|wether',
    'She would rather ___ at home than go out.|stay|to stay|staying',
    'He denied ___ the window.|breaking|to break|break',
    'I can\'t help ___ when I see that.|laughing|to laugh|laugh',
    'If I ___ known, I would have called.|had|have|would have',
    'The committee members disagreed ___ themselves.|among|between',
    'The two friends divided the cake ___ them.|between|among',
    'I would have gone if I ___ invited.|had been|was|would be',
    'She insisted that he ___ the truth.|tell|tells|told',
    'Scarcely ___ the door when the phone rang.|had she opened|she had opened|did she opened',
    'The reason is ___ he was ill.|that|because of|why',
    'I prefer walking ___ driving.|to|than|over',
    'He is not only smart ___ also kind.|but|and|then'
  ]
];
GRAMMAR_BANK.forEach((tier, t) => tier.forEach((s, i) => { const p = s.split('|'); tier[i] = {q: p[0], ok: p[1], bad: p.slice(2)}; }));

class GrammarGame {
    constructor() {
        this.brains = parseInt(localStorage.getItem('bt_coins')) || 0;
        this.isPlaying = false;
        this.recent = [];
        this.updateUI();
    }
    updateUI() {
        document.getElementById('total-brains').innerText = this.brains;
        document.getElementById('lvl-display').innerText = selectedLvl;
    }
    start() {
        document.getElementById('start-btn').style.display = 'none';
        const bc = document.getElementById('btn-container'); bc.style.display = 'none'; bc.innerHTML = '';
        this.found = 0; this.time = BT.time('grammar', 30); this.isPlaying = true;
        document.getElementById('count').innerText = '0';
        document.getElementById('time').innerText = this.time;
        this.round();
        this.timer = setInterval(() => {
            this.time--; document.getElementById('time').innerText = this.time;
            if (this.time <= 0) this.end('time');
        }, 1000);
    }
    // which tiers are in play at this level: weights for tier 0..3
    weights() {
        const L = selectedLvl;
        return L < 5 ? [1, 0, 0, 0] : L < 10 ? [3, 1, 0, 0] : L < 20 ? [1, 3, 1, 0] : L < 35 ? [0, 2, 3, 1] : L < 60 ? [0, 1, 3, 3] : [0, 0, 2, 4];
    }
    pickItem() {
        const w = this.weights(), total = w.reduce((a, b) => a + b, 0);
        for (let tries = 0; tries < 30; tries++) {
            let r = Math.random() * total, t = 0;
            while (t < 3 && r >= w[t]) { r -= w[t]; t++; }
            const bank = GRAMMAR_BANK[t], it = bank[Math.floor(Math.random() * bank.length)];
            if (!this.recent.includes(it.q)) { this.recent.push(it.q); if (this.recent.length > 60) this.recent.shift(); return it; }
        }
        this.recent = [];
        const bank = GRAMMAR_BANK[0]; return bank[Math.floor(Math.random() * bank.length)];
    }
    round() {
        const it = this.pickItem(), L = selectedLvl, cap = L < 8 ? 2 : L < 20 ? 3 : 4;
        const wrong = it.bad.slice().sort(() => Math.random() - 0.5).slice(0, cap - 1);
        const opts = [it.ok].concat(wrong).sort(() => Math.random() - 0.5);
        const box = document.getElementById('gq'), oldBtns = document.getElementById('gopts');
        if (oldBtns) oldBtns.remove();
        const parts = it.q.split('___');
        box.innerHTML = '';
        box.append(parts[0]);
        const gap = document.createElement('span'); gap.className = 'gap'; gap.textContent = '\u00a0\u00a0\u00a0\u00a0\u00a0'; box.appendChild(gap);
        box.append(parts[1] || '');
        const wrap = document.createElement('div'); wrap.id = 'gopts';
        opts.forEach((o, i) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'gopt';
            b.innerHTML = '<kbd>' + (i + 1) + '</kbd>';
            b.append(o);
            b.onpointerdown = e => { e.preventDefault(); this.pick(o === it.ok, b, gap, o); };
            wrap.appendChild(b);
        });
        box.after(wrap);
        this.cur = {it, opts};
    }
    pick(ok, btn, gap, text) {
        if (!this.isPlaying || this.locked) return;
        if (ok) {
            this.locked = true;
            this.found++; this.time += 1;
            btn.classList.add('right'); gap.textContent = text; gap.classList.add('filled');
            document.getElementById('count').innerText = this.found; document.getElementById('time').innerText = this.time;
            if (this.found >= 10) { this.locked = false; this.end('win'); return; }
            setTimeout(() => { this.locked = false; if (this.isPlaying) this.round(); }, 220);
        } else {
            this.time -= 3;                                                      // a wrong answer costs 3 seconds
            btn.classList.add('wrong'); btn.disabled = true;
            const c = document.getElementById('game-container'); c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 260);
            document.getElementById('time').innerText = Math.max(0, this.time);
            if (this.time <= 0) this.end('time');
        }
    }
    end(reason) {
        if (!this.isPlaying) return;
        this.isPlaying = false; this.locked = false; clearInterval(this.timer);
        const o = document.getElementById('gopts'); if (o) o.remove();
        document.getElementById('gq').textContent = '';
        const bc = document.getElementById('btn-container'); bc.innerHTML = ''; bc.style.display = 'flex';
        const title = document.createElement('h1'); bc.appendChild(title);
        const btn = document.createElement('button'); btn.className = 'game-btn';
        if (reason === 'win') {
            this.brains += selectedLvl * 5;
            if (selectedLvl === (parseInt(localStorage.getItem('bt_unlocked_grammar')) || 1)) localStorage.setItem('bt_unlocked_grammar', selectedLvl + 1);
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
const game = new GrammarGame();
document.addEventListener('keydown', e => {   // keys 1-4 pick an answer
    if (!game.isPlaying || BT.paused || e.repeat || !/^[1-4]$/.test(e.key)) return;
    const b = document.querySelectorAll('#gopts .gopt')[Number(e.key) - 1];
    if (b && !b.disabled) b.dispatchEvent(new PointerEvent('pointerdown', {cancelable: true, bubbles: true}));
});
