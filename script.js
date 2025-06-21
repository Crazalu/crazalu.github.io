// This is the full script with the "start game" bug fixed.
// The updateStatusText function is now a method of the Game class.

document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURATION & DATA ---
  const MAX_ROUNDS = 5;
  const USED_IMAGES_KEY = 'marioKartGeoGuessr_usedImages';
  const TRACKS_DATA = [
    // Your track data remains here...
    { image: "images/img1.webp",  mapX: 1349, mapY: 450 },
    { image: "images/img2.webp",  mapX: 1374, mapY: 1002 },
    { image: "images/img3.webp",  mapX: 313, mapY: 1121 },
    { image: "images/img4.webp",  mapX: 300,  mapY: 963 },
    { image: "images/img5.webp",  mapX: 388, mapY: 457 },
    { image: "images/img6.webp",  mapX: 321, mapY: 496 },
    { image: "images/img7.webp",  mapX: 966,  mapY: 808 },
    { image: "images/img8.webp",  mapX: 901,  mapY: 793 },
    { image: "images/img9.webp",  mapX: 915, mapY: 634 },
    { image: "images/img10.webp", mapX: 925, mapY: 603 },
    { image: "images/img11.webp", mapX: 1671,  mapY: 621 },
    { image: "images/img12.webp", mapX: 1594, mapY: 728 },
    { image: "images/img13.webp", mapX: 1497, mapY: 626 },
    { image: "images/img14.webp", mapX: 1526,  mapY: 572 },
    { image: "images/img15.webp", mapX: 1136, mapY: 1350 },
    { image: "images/img16.webp", mapX: 1197,  mapY: 1284 },
    { image: "images/img17.webp", mapX: 1105, mapY: 1081 },
    { image: "images/img18.webp", mapX: 1540, mapY: 1230 },
    { image: "images/img19.webp", mapX: 1350, mapY: 800 },
    { image: "images/img20.webp", mapX: 950,  mapY: 1200 },
    { image: "images/img21.webp", mapX: 1405, mapY: 1141 },
    { image: "images/img22.webp", mapX: 600,  mapY: 1000, enabled: false },
    { image: "images/img23.webp", mapX: 1550, mapY: 1150, enabled: false },
    { image: "images/img24.webp", mapX: 500,  mapY: 1450, enabled: false },
    { image: "images/img25.webp", mapX: 1700, mapY: 1050, enabled: false },
    { image: "images/img26.webp", mapX: 1750, mapY: 600,  enabled: false },
    { image: "images/img27.webp", mapX: 1600, mapY: 500,  enabled: false },
    { image: "images/img28.webp", mapX: 1150, mapY: 1350, enabled: false },
    { image: "images/img29.webp", mapX: 900,  mapY: 1500, enabled: false },
    { image: "images/img30.webp", mapX: 1000, mapY: 300,  enabled: false }
  ];

  // --- LOCALSTORAGE & UTILITY FUNCTIONS ---
  const getUsedImages = () => JSON.parse(localStorage.getItem(USED_IMAGES_KEY)) || [];
  const setUsedImages = (list) => localStorage.setItem(USED_IMAGES_KEY, JSON.stringify(list));
  const clearUsedImages = () => localStorage.removeItem(USED_IMAGES_KEY);

  const getLeaderboard = (key = LEADERBOARD_KEY) => JSON.parse(localStorage.getItem(key)) || [];
  const setLeaderboard = (scores, key = LEADERBOARD_KEY) => localStorage.setItem(key, JSON.stringify(scores));
  
  // Generates a simple "fingerprint" of the track data to validate seeded leaderboards
  const generateDataHash = (data) => JSON.stringify(data).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);

  function mulberry32(seed) { let a=typeof seed==='string'?Array.from(seed).reduce((a,c)=>a+c.charCodeAt(0),0):seed; return function(){a|=0;a=a+1831565813|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function seededShuffle(array, seed) { const r=mulberry32(seed);const c=[...array];for(let i=c.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[c[i],c[j]]=[c[j],c[i]]}return c }

  // --- PAN/ZOOM CLASS (with 'fit' and improved reset) ---
  class PanZoom {
    constructor(wrapper, container, options = {}) {
      this.wrapper = wrapper; this.container = container; this.offset = { x: 0, y: 0 }; this.isDown = false; this.prevPos = { x: 0, y: 0 }; this.options = options;
      
      this.initialScale = 1;
      if (options.fit) {
        const wW = this.wrapper.clientWidth; const wH = this.wrapper.clientHeight;
        const cW = this.container.scrollWidth; const cH = this.container.scrollHeight;
        if (cW > 0 && cH > 0) { this.initialScale = Math.min(wW / cW, wH / cH); }
      }
      this.scale = this.initialScale;
      this.minScale = this.initialScale;
      this.maxScale = this.initialScale * (options.maxZoom || 4);
      
      this.bindEvents(); this.wrapper.style.cursor = 'grab'; this.updateTransform();
    }
    updateTransform() { /* ... unchanged ... */ const wW = this.wrapper.clientWidth; const wH = this.wrapper.clientHeight; const cW = this.container.scrollWidth; const cH = this.container.scrollHeight; const mX = Math.max(0, cW * this.scale - wW); const mY = Math.max(0, cH * this.scale - wH); const oX = mX / this.scale; const oY = mY / this.scale; this.offset.x = Math.max(-oX, Math.min(0, this.offset.x)); this.offset.y = Math.max(-oY, Math.min(0, this.offset.y)); this.container.style.transform = `scale(${this.scale}) translate(${this.offset.x}px, ${this.offset.y}px)`; }
    bindEvents() { /* ... unchanged ... */ this.wrapper.addEventListener('wheel', this.handleWheel.bind(this)); this.wrapper.addEventListener('mousedown', this.handleMouseDown.bind(this)); window.addEventListener('mousemove', this.handleMouseMove.bind(this)); window.addEventListener('mouseup', this.handleMouseUp.bind(this)); }
    handleWheel(e) { /* ... unchanged ... */ e.preventDefault(); const oS = this.scale; this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale + (e.deltaY < 0 ? 0.1 * this.initialScale : -0.1 * this.initialScale))); if (oS === this.scale) return; const r = this.wrapper.getBoundingClientRect(); const mX = e.clientX - r.left; const mY = e.clientY - r.top; this.offset.x = mX / oS - (mX / this.scale) + this.offset.x; this.offset.y = mY / oS - (mY / this.scale) + this.offset.y; this.updateTransform(); }
    handleMouseDown(e) { /* ... unchanged ... */ this.isDown = true; this.prevPos = { x: e.clientX, y: e.clientY }; this.wrapper.classList.add('grabbing'); }
    handleMouseMove(e) { /* ... unchanged ... */ if (!this.isDown) return; this.offset.x += (e.clientX - this.prevPos.x) / this.scale; this.offset.y += (e.clientY - this.prevPos.y) / this.scale; this.prevPos = { x: e.clientX, y: e.clientY }; this.updateTransform(); }
    handleMouseUp() { /* ... unchanged ... */ this.isDown = false; this.wrapper.classList.remove('grabbing'); }
    reset() { this.scale = this.initialScale; this.offset = { x: 0, y: 0 }; this.updateTransform(); }
  }

  // --- MAIN GAME CLASS ---
  class Game {
    constructor(elements) {
      this.elements = elements;
      this.trackPanZoom = new PanZoom(elements.trackWrapper, elements.trackContainer);
      // Initialize map with the 'fit' option to make it start zoomed out
      this.mapPanZoom = new PanZoom(elements.mapWrapper, elements.mapContainer, { fit: true, maxZoom: 8 });
      this.bindEvents();
      this.updateStatusText();
      this.displayLeaderboard();
    }
    
    updateStatusText() { /* ... unchanged ... */ const totalEnabled = TRACKS_DATA.filter(t => t.enabled !== false).length; const usedCount = getUsedImages().length; this.elements.statusText.textContent = `You have seen ${usedCount} of ${totalEnabled} tracks.`; }
    displayLeaderboard() { /* ... unchanged ... */ const scores = getLeaderboard(); const list = this.elements.leaderboardList; list.innerHTML = ''; if (scores.length === 0) { list.innerHTML = `<li class="no-scores">No high scores yet!</li>`; return; } scores.forEach(entry => { const li = document.createElement('li'); li.innerHTML = `<span>${entry.name}</span><span class="score">${entry.score}</span>`; list.appendChild(li); }); }

    bindEvents() {
      this.elements.startBtn.addEventListener('click', () => this.start());
      this.elements.restartBtn.addEventListener('click', () => this.start());
      this.elements.nextBtn.addEventListener('click', () => this.nextRound());
      this.elements.confirmBtn.addEventListener('click', () => this.confirmGuess());
      this.elements.mapWrapper.addEventListener('click', (e) => this.handleMapClick(e));
      this.elements.resetUsedBtn.addEventListener('click', () => { if (confirm("Are you sure? This will reset your seen images history.")) { clearUsedImages(); this.updateStatusText(); alert("Seen images have been reset!"); } });
      this.elements.backToMenuBtn.addEventListener('click', () => { if (confirm("Are you sure you want to quit? Your score will not be saved.")) { this.elements.gameUI.hidden = true; this.elements.menu.hidden = false; this.displayLeaderboard(); } });
    }

    start() {
      // ++ HOW TO HARDCODE A SEED ++
      // To force a seed for a challenge, uncomment the next line and set your desired seed.
      // const hardcodedSeed = "CHALLENGE123";
      const seedVal = (typeof hardcodedSeed !== 'undefined') ? hardcodedSeed : this.elements.seedInput.value.trim();

      this.gameSeed = seedVal !== '' ? seedVal : Math.floor(Math.random() * 100000);
      this.isSeededGame = seedVal !== '';

      const enabledTracks = TRACKS_DATA.filter(t => t.enabled !== false);
      let availableTracks = this.isSeededGame ? enabledTracks : enabledTracks.filter(track => !getUsedImages().includes(track.image));

      if (!this.isSeededGame && availableTracks.length < MAX_ROUNDS) {
        if (getUsedImages().length > 0) alert("Not enough new tracks. Resetting the cycle for you!");
        clearUsedImages(); this.updateStatusText(); availableTracks = enabledTracks;
      }
      
      if (availableTracks.length === 0) { alert("Error: No tracks are available to play."); return; }

      this.shuffledTracks = seededShuffle(availableTracks, this.gameSeed).slice(0, MAX_ROUNDS);
      this.score = 0; this.round = 0;
      
      this.elements.scoreDisplay.textContent = "Score: 0";
      this.elements.menu.hidden = true; this.elements.gameUI.hidden = false;
      
      this.loadRound();
    }

    loadRound() { /* ... unchanged from previous version, but now reset() is more effective ... */ this.canGuess = true; this.currentTrack = this.shuffledTracks[this.round]; this.elements.trackImage.src = this.currentTrack.image; this.pendingGuess = null; this.trackPanZoom.reset(); this.mapPanZoom.reset(); this.elements.markerGuess.hidden = true; this.elements.markerPlayer.hidden = true; this.elements.markerAnswer.hidden = true; this.elements.guessLine.style.display = 'none'; this.elements.confirmBtn.hidden = true; this.elements.nextBtn.hidden = true; this.elements.restartBtn.hidden = true; this.elements.resultText.textContent = ""; this.elements.roundDisplay.textContent = `Round ${this.round + 1} / ${MAX_ROUNDS}`; }
    nextRound() { /* ... unchanged ... */ this.round++; if (this.round >= MAX_ROUNDS) { this.showFinalResults(); } else { this.loadRound(); } }
    handleMapClick(e) { /* ... unchanged ... */ if (!this.canGuess || this.mapPanZoom.isDown) return; const rect = this.elements.mapWrapper.getBoundingClientRect(); const { scale, offset } = this.mapPanZoom; const guessX = (e.clientX - rect.left) / scale - offset.x; const guessY = (e.clientY - rect.top) / scale - offset.y; this.pendingGuess = { x: guessX, y: guessY }; this.elements.markerGuess.style.left = `${guessX}px`; this.elements.markerGuess.style.top = `${guessY}px`; this.elements.markerGuess.hidden = false; this.elements.confirmBtn.hidden = false; }
    confirmGuess() { /* ... unchanged ... */ if (!this.pendingGuess) return; this.canGuess = false; const dx = this.pendingGuess.x - this.currentTrack.mapX; const dy = this.pendingGuess.y - this.currentTrack.mapY; const distance = Math.hypot(dx, dy); let points = 0; if (distance <= 15) points = 200; else if (distance <= 200) points = Math.round(200 - distance); this.score += points; this.elements.scoreDisplay.textContent = `Score: ${this.score}`; this.elements.resultText.textContent = `Distance: ${Math.round(distance)}px | +${points} pts`; if (!this.isSeededGame) { setUsedImages([...new Set([...getUsedImages(), this.currentTrack.image])]); } this.elements.markerPlayer.style.left = `${this.pendingGuess.x}px`; this.elements.markerPlayer.style.top = `${this.pendingGuess.y}px`; this.elements.markerAnswer.style.left = `${this.currentTrack.mapX}px`; this.elements.markerAnswer.style.top = `${this.currentTrack.mapY}px`; this.elements.markerPlayer.hidden = false; this.elements.markerAnswer.hidden = false; this.elements.guessLine.setAttribute("x1", this.currentTrack.mapX); this.elements.guessLine.setAttribute("y1", this.currentTrack.mapY); this.elements.guessLine.setAttribute("x2", this.pendingGuess.x); this.elements.guessLine.setAttribute("y2", this.pendingGuess.y); this.elements.guessLine.style.display = "block"; this.elements.markerGuess.hidden = true; this.elements.confirmBtn.hidden = true; if (this.round < MAX_ROUNDS - 1) { this.elements.nextBtn.hidden = false; } else { this.elements.restartBtn.hidden = false; } }
    
    showFinalResults() {
      this.elements.resultText.textContent = `Game Over! Final Score: ${this.score}`;
      this.elements.nextBtn.hidden = true;
      this.checkAndAddScore(this.score, this.gameSeed, this.isSeededGame);
    }
    
    checkAndAddScore(score, seed, isSeeded) {
      if (score === 0) return;
      
      let scores, key, dataHash;
      if (isSeeded) {
        key = `${LEADERBOARD_KEY}_seed_${seed}`;
        const storedData = getLeaderboard(key);
        dataHash = generateDataHash(TRACKS_DATA);
        
        // If the hash doesn't match, the track data has changed, so the leaderboard is invalid.
        if (storedData.hash && storedData.hash !== dataHash) {
          alert(`The track data has changed since this seed was last played. The leaderboard for seed "${seed}" has been reset.`);
          scores = [];
        } else {
          scores = storedData.scores || [];
        }
      } else {
        key = LEADERBOARD_KEY;
        scores = getLeaderboard(key);
      }

      const lowestScore = scores.length > 0 ? scores[scores.length - 1].score : 0;
      
      if (score > lowestScore || scores.length < LEADERBOARD_MAX_ENTRIES) {
        let name = prompt(`You got a high score of ${score}! Enter your name (max 10 chars):`);
        if (name) {
          name = name.substring(0, 10).trim() || "Player";
          let newScores = [...scores, { name, score }].sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_MAX_ENTRIES);
          
          if (isSeeded) {
            setLeaderboard({ hash: dataHash, scores: newScores }, key);
          } else {
            setLeaderboard(newScores, key);
          }
        }
      }
    }
  }

  // --- INITIALIZATION ---
  const elements = { /* ... unchanged ... */ menu: document.getElementById("menu"), gameUI: document.getElementById("game"), startBtn: document.getElementById("start-btn"), seedInput: document.getElementById("seed"), trackWrapper: document.getElementById("track-wrapper"), trackContainer: document.getElementById("track-container"), trackImage: document.getElementById("track-image"), confirmBtn: document.getElementById("confirm-btn"), nextBtn: document.getElementById("next-btn"), restartBtn: document.getElementById("restart-btn"), roundDisplay: document.getElementById("round-display"), scoreDisplay: document.getElementById("score-display"), resultText: document.getElementById("result"), mapWrapper: document.getElementById("map-wrapper"), mapContainer: document.getElementById("map-container"), markerGuess: document.getElementById("marker-guess"), markerPlayer: document.getElementById("marker-player"), markerAnswer: document.getElementById("marker-answer"), guessLine: document.getElementById("guess-line"), statusText: document.getElementById("used-images-status"), resetUsedBtn: document.getElementById("reset-used-btn"), leaderboardList: document.getElementById("leaderboard-list"), backToMenuBtn: document.getElementById("back-to-menu-btn"), };
  new Game(elements);
});