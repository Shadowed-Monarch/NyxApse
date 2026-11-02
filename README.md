# 🧠 NyxApse

**NyxApse** is a web-based mental training suite designed to sharpen your cognitive reflexes, mathematical speed, focus, and memory. Build your **Brain Power**, climb the ranks, and master your mental discipline.

**[🚀 Play NyxApse Now](https://shadowed-monarch.github.io/NyxApse/)**

---

## 🎮 Game Modes
* **🔢 Math:** Solve falling equations before they hit the bottom.
* **⚪ Dots:** Tap numbered dots in order to train focus and visual coordination.
* **🧠 Memory Matrix:** Memorize glowing blocks, then recall them. The grid grows with your level.
* **🎯 Focus:** Type the *color* of the word, not the word itself. Trains attention and impulse control.
* **🔴 Aim:** Pop the bubbles falling two at a time before time runs out. The goal grows from 15 to 20 pops by level 100, and bubbles get faster each level. Bubbles are smaller on phones.
* **⚡ Reflex:** Dodge the falling bubbles and survive until the timer ends.
* **🔷 Odd One Out:** Tap the one shape that differs in color, size or rotation. The grid grows with your level.

## 🏆 Ranking System
Eight ranks, with a rank-up celebration and "BP to next rank" on the home screen:
* 🎓 **Student:** 0 - 499 BP
* 📜 **Scholar:** 500 - 1,499 BP
* 🦉 **Sage:** 1,500 - 2,999 BP
* 💡 **Genius:** 3,000 - 5,999 BP
* ⚡ **Prodigy:** 6,000 - 9,999 BP
* 👑 **Mastermind:** 10,000 - 19,999 BP
* 🏆 **Grandmaster:** 20,000 - 49,999 BP
* 🌌 **Overlord:** 50,000+ BP

## ✨ Features
* **Unlimited Levels:** Each game tracks its own level; speed and difficulty scale up.
* **Two Currencies:** Each win earns Brain Power (level × 5 up to level 30, then slower), which sets your rank and never goes down, plus coins (5 + level, up to 55) that you spend in the shop.
* **Skin Shop:** 10 accent themes bought with 🪙 coins, from Blue (100) to the **Legendary Rainbow Skin** (10,000). Buying skins never lowers your rank.
* **Light / Dark Mode:** Toggle from the home screen; applies to every game.
* **Focus Sound:** Optional low-volume brown noise toggle.
* **Daily Streak & Calendar:** Win a level each day to keep your streak. Your first win of the day pays bonus coins (streak days × 10, max 70), and a calendar on the home screen shows every day you played.
* **Stats:** Streak, total wins, time trained and level per game on the home screen.
* **Level Select:** Use ◀ ▶ in any game to replay lower levels.
* **Save Tools:** Export, import or reset your save code from the Skin Shop.
* **Anti-Tamper:** Progress is signed, so edits made in browser DevTools are detected and undone. This is a deterrent, not real security, since everything runs on the player's device.
* **Sound:** Adjustable-volume focus noise, plus win/lose sounds and vibration.
* **Math Variety:** Subtraction unlocks at level 4, multiplication at level 8.
* **Focus Buttons:** Tap color buttons instead of typing.
* **Daily Challenge:** A different game each day. Win it 2 to 4 times for +60 coins.
* **Achievements:** 12 badges for wins, streaks, levels, skins and training time, 25 coins each.
* **Best Times:** Fastest clear is saved per game and level.
* **How-to-Play Popups:** Shown the first time you open a game (reopen with ?).
* **Pause Button:** Pause any running game with ⏸.
* **Confetti:** Celebrates every win and new skin.
* **Fair Timers:** Timers pause when you switch tabs.
* **Installable:** Add to your home screen and play offline (PWA).
* **About Page:** Rules, ranks and tips, linked from the home screen.
* **Local Progress:** Ranks, levels and skins are saved in your browser's `LocalStorage`.
* **Responsive UI:** Works on desktop and mobile (mouse and touch).

## 📁 Project Structure
```
NyxApse/
├── index.html, about.html          # home and About pages
├── math.html, dots.html, memory.html,
│   stroop.html (Focus), aim.html, avoid.html (Reflex), oddout.html
├── css/
│   ├── ui.css                      # shared responsive UI (loads last)
│   └── <page>.css                  # styles for each page
├── js/
│   ├── theme.js                    # light/dark mode + skins
│   ├── game.js                     # ranks, streaks, sounds, save protection, messages
│   └── <page>.js                   # logic for each page
├── manifest.json, sw.js            # installable / offline support
└── logo.png, icon.png, *.png       # images
```

## 🛠️ Technical Details
* **Frontend:** HTML5, CSS3, JavaScript (ES6+). No frameworks.
* **Data:** `LocalStorage`, no backend or account needed.
* **Shared Theme:** `theme.js` applies the saved mode and skin to every page.
* **Shared Logic:** `game.js` handles ranks, streaks, stats, sounds and save tools. `sw.js` + `manifest.json` make it installable.
* **Deployment:** Hosted via GitHub Pages.

> [!IMPORTANT]
> **Data Note:** Clearing your site data or browser history will reset your Brain Power, levels, and unlocked skins.

## 👤 Author
Developed and owned by **Shadowed**.
* **GitHub:** [@shadowed-monarch](https://github.com/shadowed-monarch)
