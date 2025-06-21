document.addEventListener("DOMContentLoaded", () => {
  const MAX_ROUNDS = 5;
  const USED_IMAGES_KEY = 'marioKartGeoGuessr_usedImages';
  const LEADERBOARD_KEY = 'marioKartGeoGuessr_leaderboard';
  const LEADERBOARD_MAX_ENTRIES = 5;
  const MAP_WIDTH = 2004;

  const getUsedImages = () => JSON.parse(localStorage.getItem(USED_IMAGES_KEY)) || [];
  const setUsedImages = (list) => localStorage.setItem(USED_IMAGES_KEY, JSON.stringify(list));
  const clearUsedImages = () => localStorage.removeItem(USED_IMAGES_KEY);
  const getLeaderboard = () => JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  const setLeaderboard = (scores) => localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  const generateDataHash = (data) => JSON.stringify(data).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  function mulberry32(seed) { let a=typeof seed==='string'?Array.from(seed).reduce((a,c)=>a+c.charCodeAt(0),0):seed; return function(){a|=0;a=a+1831565813|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function seededShuffle(array, seed) { const r=mulberry32(seed);const c=[...array];for(let i=c.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[c[i],c[j]]=[c[j],c[i]]}return c }

  class PanZoom {
    constructor(wrapper, container, options = {}) {
      this.wrapper = wrapper; this.container = container; this.options = options;
      this.offset = { x: 0, y: 0 }; this.scale = 1; this.isDown = false; this.didPan = false; this.prevPos = { x: 0, y: 0 };
      this.onUpCallback = options.onUp || null;
      this.bindEvents();
      this.wrapper.style.cursor = 'grab';
    }
    reset() {
      this.initialScale = 1; this.initialOffset = { x: 0, y: 0 };
      if (this.options.fit) {
        const wW = this.wrapper.clientWidth; const wH = this.wrapper.clientHeight;
        const cW = this.container.scrollWidth; const cH = this.container.scrollHeight;
        if (cW > 0 && cH > 0) {
          this.initialScale = Math.min(wW / cW, wH / cH);
          const oXP = (wW - (cW * this.initialScale)) / 2;
          const oYP = (wH - (cH * this.initialScale)) / 2;
          this.initialOffset.x = oXP / this.initialScale; this.initialOffset.y = oYP / this.initialScale;
        }
      }
      this.scale = this.initialScale; this.offset = { ...this.initialOffset };
      this.minScale = this.initialScale; this.maxScale = this.initialScale * (this.options.maxZoom || 4);
      this.updateTransform();
    }
    updateTransform() { const wW=this.wrapper.clientWidth;const wH=this.wrapper.clientHeight;const cW=this.container.scrollWidth;const cH=this.container.scrollHeight;const mX=Math.max(0,cW*this.scale-wW);const mY=Math.max(0,cH*this.scale-wH);const oX=mX/this.scale;const oY=mY/this.scale;this.offset.x=Math.max(-oX,Math.min(0,this.offset.x));this.offset.y=Math.max(-oY,Math.min(0,this.offset.y));this.container.style.transform=`scale(${this.scale}) translate(${this.offset.x}px, ${this.offset.y}px)`}
    bindEvents() { this.wrapper.addEventListener('mousedown',this.handleMouseDown.bind(this));window.addEventListener('mousemove',this.handleMouseMove.bind(this));window.addEventListener('mouseup',this.handleMouseUp.bind(this));this.wrapper.addEventListener('wheel',this.handleWheel.bind(this),{passive:false})}
    handleWheel(e) { e.preventDefault();const oldScale=this.scale;const scaleDelta=e.deltaY>0?-0.1:0.1;this.scale=Math.min(this.maxScale,Math.max(this.minScale,this.scale+scaleDelta*this.initialScale));if(oldScale===this.scale)return;const rect=this.wrapper.getBoundingClientRect();const mouseX=e.clientX-rect.left;const mouseY=e.clientY-rect.top;this.offset.x=this.offset.x+mouseX*(1/this.scale-1/oldScale);this.offset.y=this.offset.y+mouseY*(1/this.scale-1/oldScale);this.updateTransform()}
    handleMouseDown(e) {
      this.isDown = true;
      this.didPan = false;
      this.prevPos = { x: e.clientX, y: e.clientY };
      this.wrapper.classList.add('grabbing');
    }
    handleMouseMove(e) {
      if (!this.isDown) return;
      this.didPan = true;
      this.offset.x += (e.clientX - this.prevPos.x) / this.scale;
      this.offset.y += (e.clientY - this.prevPos.y) / this.scale;
      this.prevPos = { x: e.clientX, y: e.clientY };
      this.updateTransform();
    }
    handleMouseUp(e) {
      if (this.isDown) {
        this.isDown = false;
        this.wrapper.classList.remove('grabbing');
        if (!this.didPan && this.onUpCallback) {
          this.onUpCallback(e);
        }
      }
    }
  }

  class Game {
    constructor(elements) {
      this.elements = elements;
      this.trackPanZoom = new PanZoom(elements.trackWrapper, elements.trackContainer);
      this.mapPanZoom = new PanZoom(elements.mapWrapper, elements.mapContainer, { fit: true, maxZoom: 8, onUp: (e) => this.handleMapClick(e) });
      this.bindEvents();
      this.updateStatusText();
      this.displayLeaderboard();
      this.isMirrorMode = false;
    }
    transformX(x) {
        if (this.isMirrorMode) {
            return (MAP_WIDTH - 1) - x;
        }
        return x;
    }
    updateStatusText() { const totalEnabled = TRACKS_DATA.filter(t => t.enabled !== false).length; const usedCount = getUsedImages().length; this.elements.statusText.textContent = `You have seen ${usedCount} of ${totalEnabled} tracks.`; }
    displayLeaderboard() {
      const scores = getLeaderboard();
      const list = this.elements.leaderboardList;
      list.innerHTML = '';
      if (scores.length === 0) { list.innerHTML = `<li class="no-scores">No high scores yet!</li>`; return; }
      scores.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${entry.name}</span><span class="score">${entry.score}</span>`;
        li.addEventListener('click', () => this.shareSeed(entry.seed, entry.dataHash));
        list.appendChild(li);
      });
    }
    bindEvents() {
      this.elements.startBtn.addEventListener('click', () => this.start());
      this.elements.nextBtn.addEventListener('click', () => this.nextRound());
      this.elements.confirmBtn.addEventListener('click', () => this.confirmGuess());
      this.elements.resetUsedBtn.addEventListener('click', () => { if (confirm("Are you sure? This will reset your seen images history.")) { clearUsedImages(); this.updateStatusText(); alert("Seen images have been reset!"); } });
      this.elements.backToMenuBtn.addEventListener('click', () => { if (confirm("Are you sure you want to quit? Your score will not be saved.")) { this.hideGameAndShowMenu(); } });
      this.elements.modalPlayAgainBtn.addEventListener('click', () => { this.elements.endGameModal.hidden = true; this.start(); });
      this.elements.modalBackToMenuBtn.addEventListener('click', () => { this.elements.endGameModal.hidden = true; this.hideGameAndShowMenu(); });
      this.elements.saveScoreBtn.addEventListener('click', () => this.saveHighScore());
    }
    start() {
      this.isMirrorMode = this.elements.mirrorModeCheckbox.checked;
      const hardcodedSeed = undefined;
      const seedVal = (typeof hardcodedSeed !== 'undefined') ? hardcodedSeed : this.elements.seedInput.value.trim();
      this.gameSeed = seedVal !== '' ? seedVal : Math.floor(Math.random() * 100000);
      const isSeededGame = seedVal !== '';
      const enabledTracks = TRACKS_DATA.filter(t => t.enabled !== false);
      let availableTracks = isSeededGame ? enabledTracks : enabledTracks.filter(track => !getUsedImages().includes(track.image));
      if (!isSeededGame && availableTracks.length < MAX_ROUNDS) {
        if (getUsedImages().length > 0) alert("Not enough new tracks. Resetting the cycle for you!");
        clearUsedImages(); this.updateStatusText(); availableTracks = enabledTracks;
      }
      if (availableTracks.length === 0) { alert("Error: No tracks are available to play."); return; }
      this.shuffledTracks = seededShuffle(availableTracks, this.gameSeed).slice(0, MAX_ROUNDS);
      this.score = 0; this.round = 0;
      this.elements.scoreDisplay.textContent = "Score: 0";
      this.elements.menu.hidden = true; this.elements.gameUI.hidden = false;
      this.elements.mapImage.style.transform = this.isMirrorMode ? 'scaleX(-1)' : 'none';
      this.loadRound();
    }
    loadRound() {
      this.canGuess = true; this.currentTrack = this.shuffledTracks[this.round];
      this.elements.trackImage.src = this.currentTrack.image; this.pendingGuess = null;
      this.elements.trackImage.style.transform = this.isMirrorMode ? 'scaleX(-1)' : 'none';
      this.trackPanZoom.reset(); this.mapPanZoom.reset();
      this.elements.markerGuess.hidden = true; this.elements.markerPlayer.hidden = true; this.elements.markerAnswer.hidden = true;
      this.elements.guessLine.style.display = 'none'; this.elements.confirmBtn.hidden = true; this.elements.nextBtn.hidden = true;
      this.elements.resultText.textContent = ""; this.elements.roundDisplay.textContent = `Round ${this.round + 1} / ${this.shuffledTracks.length}`;
    }
    nextRound() { this.round++; this.loadRound(); }
    handleMapClick(e) {
      if (!this.canGuess) return;
      const rect = this.elements.mapWrapper.getBoundingClientRect();
      const { scale, offset } = this.mapPanZoom;
      const guessX = (e.clientX - rect.left) / scale - offset.x; const guessY = (e.clientY - rect.top) / scale - offset.y;
      this.pendingGuess = { x: guessX, y: guessY };
      this.elements.markerGuess.style.left = `${guessX}px`; this.elements.markerGuess.style.top = `${guessY}px`;
      this.elements.markerGuess.hidden = false; this.elements.confirmBtn.hidden = false;
    }
    confirmGuess() {
      if (!this.pendingGuess) return;
      this.canGuess = false;
      const answerX = this.transformX(this.currentTrack.mapX);
      const answerY = this.currentTrack.mapY;
      const dx = this.pendingGuess.x - answerX;
      const dy = this.pendingGuess.y - answerY;
      const distance = Math.hypot(dx, dy); let points = 0;
      if (distance <= 15) points = 200; else if (distance <= 200) points = Math.round(200 - distance);
      this.score += points; this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
      this.elements.resultText.textContent = `Distance: ${Math.round(distance)}px | +${points} pts`;
      if (this.elements.seedInput.value.trim() === '') { setUsedImages([...new Set([...getUsedImages(), this.currentTrack.image])]); }
      this.elements.markerPlayer.style.left = `${this.pendingGuess.x}px`; this.elements.markerPlayer.style.top = `${this.pendingGuess.y}px`;
      this.elements.markerAnswer.style.left = `${answerX}px`;
      this.elements.markerAnswer.style.top = `${answerY}px`;
      this.elements.markerPlayer.hidden = false; this.elements.markerAnswer.hidden = false;
      this.elements.guessLine.setAttribute("x1", answerX);
      this.elements.guessLine.setAttribute("y1", answerY);
      this.elements.guessLine.setAttribute("x2", this.pendingGuess.x);
      this.elements.guessLine.setAttribute("y2", this.pendingGuess.y);
      this.elements.guessLine.style.display = "block";
      this.elements.markerGuess.hidden = true; this.elements.confirmBtn.hidden = true;
      if (this.round < this.shuffledTracks.length - 1) { this.elements.nextBtn.hidden = false; } else { this.showFinalResults(); }
    }
    hideGameAndShowMenu() {
      this.elements.gameUI.hidden = true; this.elements.menu.hidden = false;
      this.elements.mapImage.style.transform = 'none';
      this.displayLeaderboard();
    }
    showFinalResults() {
      const maxScore = 200 * this.shuffledTracks.length;
      this.elements.modalFinalScore.textContent = `${this.score} / ${maxScore}`;
      if (this.isHighScore(this.score)) {
        this.elements.saveScoreForm.hidden = false; this.elements.playerNameInput.value = '';
        this.elements.saveScoreBtn.disabled = false; this.elements.saveScoreBtn.textContent = "Save Score";
      } else { this.elements.saveScoreForm.hidden = true; }
      const seedContainer = this.elements.modalSeedContainer;
      seedContainer.innerHTML = `<p>Game Seed:</p><div><span>${this.gameSeed}</span><button class="btn-secondary btn-copy-seed">Copy</button></div>`;
      seedContainer.querySelector('button').addEventListener('click', () => this.shareSeed(this.gameSeed));
      this.elements.endGameModal.hidden = false;
    }
    isHighScore(score) {
      if (score === 0) return false;
      const scores = getLeaderboard();
      const lowestScore = scores.length > 0 ? scores[scores.length - 1].score : 0;
      return score > lowestScore || scores.length < LEADERBOARD_MAX_ENTRIES;
    }
    saveHighScore() {
      const name = this.elements.playerNameInput.value.trim().substring(0, 10) || "Player";
      const scores = getLeaderboard();
      const newEntry = { name, score: this.score, seed: this.gameSeed, dataHash: generateDataHash(TRACKS_DATA) };
      const newScores = [...scores, newEntry].sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_MAX_ENTRIES);
      setLeaderboard(newScores);
      this.elements.saveScoreBtn.disabled = true; this.elements.saveScoreBtn.textContent = "Saved!";
    }
    shareSeed(seed, savedHash) {
      navigator.clipboard.writeText(seed).then(() => {
        let message = `Seed "${seed}" copied to clipboard.`;
        const currentHash = generateDataHash(TRACKS_DATA);
        if (savedHash && savedHash !== currentHash) {
          message += "\n\nWarning: The game's track data has changed since this score was set. Playing this seed may result in a different set of rounds.";
        } else if (!savedHash) {
          message += "\n\nNote: If the game's track data is updated in the future, this seed may produce different rounds.";
        }
        alert(message);
      }).catch(err => { console.error('Could not copy text: ', err); alert('Failed to copy seed.'); });
    }
  }

  const elements = {
    menu: document.getElementById("menu"), gameUI: document.getElementById("game"), startBtn: document.getElementById("start-btn"),
    seedInput: document.getElementById("seed"),
    mirrorModeCheckbox: document.getElementById("mirror-mode"),
    trackWrapper: document.getElementById("track-wrapper"), trackContainer: document.getElementById("track-container"),
    trackImage: document.getElementById("track-image"), confirmBtn: document.getElementById("confirm-btn"), nextBtn: document.getElementById("next-btn"),
    roundDisplay: document.getElementById("round-display"), scoreDisplay: document.getElementById("score-display"),
    resultText: document.getElementById("result"), mapWrapper: document.getElementById("map-wrapper"), mapContainer: document.getElementById("map-container"),
    mapImage: document.getElementById("track-map"),
    markerGuess: document.getElementById("marker-guess"), markerPlayer: document.getElementById("marker-player"), markerAnswer: document.getElementById("marker-answer"),
    guessLine: document.getElementById("guess-line"), statusText: document.getElementById("used-images-status"), resetUsedBtn: document.getElementById("reset-used-btn"),
    leaderboardList: document.getElementById("leaderboard-list"), backToMenuBtn: document.getElementById("back-to-menu-btn"),
    endGameModal: document.getElementById("end-game-modal"), modalFinalScore: document.getElementById("modal-final-score"),
    saveScoreForm: document.getElementById("save-score-form"), playerNameInput: document.getElementById("player-name-input"),
    saveScoreBtn: document.getElementById("save-score-btn"), modalPlayAgainBtn: document.getElementById("modal-play-again-btn"),
    modalBackToMenuBtn: document.getElementById("modal-back-to-menu-btn"),
    modalSeedContainer: document.getElementById("modal-seed-container"),
    // ++ NEW: Elements for theme manager ++
    themeSelector: document.getElementById('theme-selector'),
    customBgColorInput: document.getElementById('custom-bg-color'),
  };
  
  new Game(elements);

  // ++ NEW: THEME MANAGER LOGIC ++
  const THEME_KEY = 'marioKartGeoGuessr_theme';
  const CUSTOM_COLOR_KEY = 'marioKartGeoGuessr_customColor';
  
  function applyTheme(theme, customColor) {
    // Reset all theme classes
    document.body.classList.remove('theme-dark', 'theme-darker', 'theme-black');
    // Reset inline styles
    document.body.style.setProperty('--background-color', '');
    document.body.style.setProperty('--text-color', '');
  
    if (theme === 'custom') {
      elements.customBgColorInput.hidden = false;
      document.body.style.setProperty('--background-color', customColor);
      // Basic contrast check for text color
      const hex = customColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 125 ? '#000000' : '#FFFFFF';
      document.body.style.setProperty('--text-color', textColor);
    } else {
      elements.customBgColorInput.hidden = true;
      if (theme !== 'light') {
        document.body.classList.add(`theme-${theme}`);
      }
    }
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    const savedCustomColor = localStorage.getItem(CUSTOM_COLOR_KEY) || '#f0f0f0';
    
    elements.themeSelector.value = savedTheme;
    elements.customBgColorInput.value = savedCustomColor;

    applyTheme(savedTheme, savedCustomColor);
  }

  elements.themeSelector.addEventListener('change', () => {
    const selectedTheme = elements.themeSelector.value;
    const customColor = elements.customBgColorInput.value;
    localStorage.setItem(THEME_KEY, selectedTheme);
    applyTheme(selectedTheme, customColor);
  });

  elements.customBgColorInput.addEventListener('input', () => {
    const customColor = elements.customBgColorInput.value;
    localStorage.setItem(CUSTOM_COLOR_KEY, customColor);
    // Ensure we're in custom theme mode
    if (elements.themeSelector.value === 'custom') {
      applyTheme('custom', customColor);
    }
  });

  // Load the saved theme on initial page load
  loadTheme();
});