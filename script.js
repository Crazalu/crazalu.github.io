document.addEventListener("DOMContentLoaded", () => {
  const MAX_ROUNDS = 5;
  const USED_IMAGES_KEY = 'marioKartGeoGuessr_usedImages';
  const PRACTICE_UNLOCKS_KEY = 'marioKartGeoGuessr_practiceUnlocks';
  const LEADERBOARD_KEY = 'marioKartGeoGuessr_leaderboard';
  const LEADERBOARD_MAX_ENTRIES = 5;
  const MAP_WIDTH = 2004;
  const MIN_DISTANCE = 20;

  const MAGNIFIER_SIZE = 150;
  const MAGNIFICATION_LEVEL = 2.5;
  
  const MODE_KEY = 'marioKartGeoGuessr_mode';
  const MODE_OPTION_TRACK_KEY = 'marioKartGeoGuessr_modeOption_track';
  const MODE_OPTION_MAP_KEY = 'marioKartGeoGuessr_modeOption_map';
  const MODE_OPTION_SITE_KEY = 'marioKartGeoGuessr_modeOption_site';
  const SHOW_FADE_TIMER_KEY = 'marioKartGeoGuessr_showFadeTimer';
  const FRAGMENT_COST_KEY = 'marioKartGeoGuessr_fragmentCost';
  const FRAGMENT_GRID_KEY = 'marioKartGeoGuessr_fragmentGrid';
  const FRAGMENT_INITIAL_KEY = 'marioKartGeoGuessr_fragmentInitial';

  const getUsedImages = () => JSON.parse(localStorage.getItem(USED_IMAGES_KEY)) || [];
  const setUsedImages = (list) => localStorage.setItem(USED_IMAGES_KEY, JSON.stringify(list));
  
  const getPracticeUnlocks = () => JSON.parse(localStorage.getItem(PRACTICE_UNLOCKS_KEY)) || [];
  const setPracticeUnlocks = (list) => localStorage.setItem(PRACTICE_UNLOCKS_KEY, JSON.stringify(list));

  const getLeaderboard = () => JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  const setLeaderboard = (scores) => localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  const generateDataHash = (data) => JSON.stringify(data).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  function mulberry32(seed) { let a=typeof seed==='string'?Array.from(seed).reduce((a,c)=>a+c.charCodeAt(0),0):seed; return function(){a|=0;a=a+1831565813|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function seededShuffle(array, seed) { const r=mulberry32(seed);const c=[...array];for(let i=c.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[c[i],c[j]]=[c[j],c[i]]}return c }

  function selectSpacedTracks(shuffledList, count, minDistance) {
    if (shuffledList.length < count) {
        return shuffledList;
    }
    const result = [];
    const pool = [...shuffledList];
    if (pool.length > 0) {
        result.push(pool.shift());
    }
    while (result.length < count && pool.length > 0) {
        const lastTrack = result[result.length - 1];
        const foundIndex = pool.findIndex(track => 
            Math.hypot(track.mapX - lastTrack.mapX, track.mapY - lastTrack.mapY) > minDistance
        );
        if (foundIndex !== -1) {
            const [nextTrack] = pool.splice(foundIndex, 1);
            result.push(nextTrack);
        } else {
            console.warn("Could not find enough spaced-out tracks. The game will have fewer rounds.");
            break;
        }
    }
    return result;
  }

  class PanZoom {
    constructor(wrapper, container, options = {}) {
      this.wrapper = wrapper; this.container = container; this.options = options;
      this.offset = { x: 0, y: 0 }; this.scale = 1; this.isDown = false; this.didPan = false;
      this.prevPos = { x: 0, y: 0 }; this.prevPinchDist = null;
      this.onUpCallback = options.onUp || null;
      this.onUpdateCallback = options.onUpdate || null;
      this.bindEvents();
      this.wrapper.style.cursor = 'grab';
    }
    
    reset() {
      if (this.wrapper.clientWidth === 0) {
          this.options.retryCount = (this.options.retryCount || 0) + 1;
          if (this.options.retryCount < 20) {
              requestAnimationFrame(() => this.reset());
          } else {
              console.error("PanZoom reset failed: Wrapper has no dimensions.");
          }
          return;
      }
      delete this.options.retryCount;

      this.initialScale = 1; this.initialOffset = { x: 0, y: 0 };
      if (this.options.fit) {
        const wW = this.wrapper.clientWidth; const wH = this.wrapper.clientHeight;
        const cW = this.container.scrollWidth; const cH = this.container.scrollHeight;
        if (cW > 0 && cH > 0) {
          this.initialScale = Math.min(wW / cW, wH / cH);
          const oXP = (wW - (cW * this.initialScale)) / 2;
          const oYP = (wH - (cH * this.initialScale)) / 2;
          this.initialOffset.x = oXP / this.initialScale;
          this.initialOffset.y = oYP / this.initialScale;
        }
      }
      this.scale = this.initialScale; this.offset = { ...this.initialOffset };
      this.minScale = this.initialScale; this.maxScale = this.initialScale * (this.options.maxZoom || 4);
      this.updateTransform();
    }
    updateTransform() {
      const wW = this.wrapper.clientWidth; const wH = this.wrapper.clientHeight;
      const cW = this.container.scrollWidth; const cH = this.container.scrollHeight;
      const mX = Math.max(0, cW * this.scale - wW); const mY = Math.max(0, cH * this.scale - wH);
      const oX = mX / this.scale; const oY = mY / this.scale;
      this.offset.x = Math.max(-oX, Math.min(0, this.offset.x));
      this.offset.y = Math.max(-oY, Math.min(0, this.offset.y));
      this.container.style.transform = `scale(${this.scale}) translate(${this.offset.x}px, ${this.offset.y}px)`;
      
      if (this.onUpdateCallback) {
        this.onUpdateCallback();
      }
    }
    bindEvents() {
      this.wrapper.addEventListener('mousedown', this.handleStart.bind(this));
      window.addEventListener('mousemove', this.handleMove.bind(this));
      window.addEventListener('mouseup', this.handleEnd.bind(this));
      this.wrapper.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
      this.wrapper.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
      window.addEventListener('touchend', this.handleEnd.bind(this));
      this.wrapper.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }
    handleStart(e) {
      this.isDown = true;
      this.didPan = false;
      const point = e.touches ? e.touches[0] : e;
      this.prevPos = { x: point.clientX, y: point.clientY };
      this.wrapper.classList.add('grabbing');
      if (e.touches && e.touches.length === 2) {
        this.prevPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }
    handleMove(e) {
      if (!this.isDown) return;
      if (e.touches) e.preventDefault();
      
      if (e.touches && e.touches.length === 2 && this.prevPinchDist) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const scaleChange = dist / this.prevPinchDist;
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, oldScale * scaleChange));
        
        const rect = this.wrapper.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        this.offset.x += (midX / this.scale) - (midX / oldScale);
        this.offset.y += (midY / this.scale) - (midY / oldScale);

        this.prevPinchDist = dist;
      } else {
        const point = e.touches ? e.touches[0] : e;
        this.didPan = true;
        this.offset.x += (point.clientX - this.prevPos.x) / this.scale;
        this.offset.y += (point.clientY - this.prevPos.y) / this.scale;
        this.prevPos = { x: point.clientX, y: point.clientY };
      }
      this.updateTransform();
    }
    handleEnd(e) {
      if (!this.isDown) return;
      this.isDown = false;
      this.wrapper.classList.remove('grabbing');
      this.prevPinchDist = null;
      if (!this.didPan && this.onUpCallback) {
        const point = e.changedTouches ? e.changedTouches[0] : e;
        this.onUpCallback(point);
      }
    }
    handleWheel(e) {
      e.preventDefault();
      const oldScale = this.scale;
      const scaleDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + scaleDelta * this.initialScale));
      if (oldScale === newScale) return;

      const rect = this.wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const pointX = (mouseX / oldScale) - this.offset.x;
      const pointY = (mouseY / oldScale) - this.offset.y;
      
      this.offset.x = (mouseX / newScale) - pointX;
      this.offset.y = (mouseY / newScale) - pointY;
      
      this.scale = newScale;
      this.updateTransform();
    }
  }

  class Game {
    constructor(elements) {
      this.elements = elements;
      this.isImageInteraction = false;
      
      this.mapPanZoom = new PanZoom(elements.mapWrapper, elements.mapContainer, {
        fit: true,
        maxZoom: 8,
        onUp: (e) => this.handleMapClick(e),
        onUpdate: () => this.updateMarkerPositions()
      });

      this.populatePracticeGrid();
      this.bindEvents();
      this.updateStatusText();
      this.displayLeaderboard();
      
      this.pendingGuess = null;
      this.confirmedGuess = null;

      this.gameMode = 'normal';
      this.isMirrorTrack = false;
      this.isMirrorMap = false;
      this.isMirrorSite = false;
      this.isInvertedTrack = false;
      this.isInvertedMap = false;
      this.isInvertedSite = false;
      this.isRerunGame = false;
      this.isRandomizedPerRound = false;

      this.isFragmentedMode = false;
      this.fragmentGridSize = { rows: 0, cols: 0 };
      this.fragmentCells = [];
      this.freeRevealsRemaining = 0;
      this.fragmentCost = 20; 
      this.fragmentGrid = 'random';
      this.fragmentInitialReveals = 1;
      
      this.isPracticeMode = false;
      this.currentImageLoadedSuccessfully = false;
      this.seedWasModified = false;
      this.isTimerEnabled = true;
      this.timerDuration = 30;
      this.roundTimer = null;
      this.timeLeft = 0;
      this.isFadeTimerEnabled = false;
      this.fadeTimerDuration = 10;
      this.imageFadeTimer = null;
      this.fadeDisplayInterval = null;
    }

    updateMarkerPositions() {
      const { scale, offset } = this.mapPanZoom;
      const getPixelPos = (logicalPos) => ({
          x: (logicalPos.x + offset.x) * scale,
          y: (logicalPos.y + offset.y) * scale
      });

      if (this.pendingGuess) {
          const pixelPos = getPixelPos(this.pendingGuess);
          this.elements.markerGuess.style.left = `${pixelPos.x}px`;
          this.elements.markerGuess.style.top = `${pixelPos.y}px`;
          this.elements.markerGuess.hidden = false;
      } else {
          this.elements.markerGuess.hidden = true;
      }

      this.elements.markerPlayer.hidden = true;
      this.elements.markerAnswer.hidden = true;
      this.elements.guessLine.style.display = 'none';

      if (!this.canGuess) {
          let answerX = this.currentTrack.mapX;
          if (this.isMirrorMap) {
              answerX = (MAP_WIDTH - 1) - answerX;
          }
          const answerLogicalPos = {
              x: answerX,
              y: this.currentTrack.mapY
          };
          const answerPixelPos = getPixelPos(answerLogicalPos);
          this.elements.markerAnswer.style.left = `${answerPixelPos.x}px`;
          this.elements.markerAnswer.style.top = `${answerPixelPos.y}px`;
          this.elements.markerAnswer.hidden = false;

          if (this.confirmedGuess) {
              const playerPixelPos = getPixelPos(this.confirmedGuess);
              this.elements.markerPlayer.style.left = `${playerPixelPos.x}px`;
              this.elements.markerPlayer.style.top = `${playerPixelPos.y}px`;
              this.elements.markerPlayer.hidden = false;

              this.elements.guessLine.setAttribute("x1", answerPixelPos.x);
              this.elements.guessLine.setAttribute("y1", answerPixelPos.y);
              this.elements.guessLine.setAttribute("x2", playerPixelPos.x);
              this.elements.guessLine.setAttribute("y2", playerPixelPos.y);
              this.elements.guessLine.style.display = "block";
          }
      }
    }
    
    populatePracticeGrid() {
      const grid = this.elements.practiceGrid;
      grid.innerHTML = '';
      const enabledTracks = TRACKS_DATA.filter(t => t.enabled !== false);
      const unlockedImages = getPracticeUnlocks();

      enabledTracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'practice-card';
        const img = document.createElement('img');
        img.src = track.image;
        img.alt = "Image preview";
        img.loading = 'lazy';
        const p = document.createElement('p');
        p.textContent = track.name || 'Unnamed';
        card.appendChild(img);
        card.appendChild(p);
        
        if (unlockedImages.includes(track.image)) {
            card.addEventListener('click', () => this.startPracticeRound(track));
        } else {
            card.classList.add('locked');
        }
        grid.appendChild(card);
      });
    }
    
    updateStatusText() {
        const totalEnabled = TRACKS_DATA.filter(t => t.enabled !== false).length;
        const usedCount = getUsedImages().length;
        this.elements.statusText.textContent = `You have seen ${usedCount} of ${totalEnabled} images.`;
    }

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
      this.elements.endGameBtn.addEventListener('click', () => this.showFinalResults());
      this.elements.backToMenuBtn.addEventListener('click', () => { if (confirm("Are you sure you want to quit? Your score will not be saved.")) { this.hideGameAndShowMenu(); } });
      
      this.elements.modalPlayAgainBtn.addEventListener('click', () => {
        this.elements.endGameModal.hidden = true;
        this.hideGameAndShowMenu();
      });

      this.elements.modalBackToMenuBtn.addEventListener('click', () => { 
          this.elements.endGameModal.hidden = true; 
          this.hideGameAndShowMenu(); 
      });
      this.elements.saveScoreBtn.addEventListener('click', () => this.saveHighScore());

      this.elements.trackWrapper.addEventListener('mousemove', this.handleMagnifierMove.bind(this));
      this.elements.trackWrapper.addEventListener('mouseenter', this.handleMagnifierEnter.bind(this));
      this.elements.trackWrapper.addEventListener('mouseleave', this.handleMagnifierLeave.bind(this));

      this.elements.trackWrapper.addEventListener('mousedown', () => {
          this.isImageInteraction = true;
          this.elements.magnifier.style.display = 'none';
      });
      window.addEventListener('mouseup', () => {
          this.isImageInteraction = false;
      });

      this.elements.randomizerBtn.addEventListener('click', () => { this.elements.randomizerModal.hidden = false; });
      this.elements.cancelRandomBtn.addEventListener('click', () => { this.elements.randomizerModal.hidden = true; });
      this.elements.startRandomBtn.addEventListener('click', () => this.startRandomizedGame());
      this.elements.resetModeBtn.addEventListener('click', () => {
        this.elements.modeSelector.value = "normal";
        this.elements.modeSelector.dispatchEvent(new Event('change'));
      });
      this.elements.revealFragmentBtn.addEventListener('click', () => this._revealRandomFragment());
    }

    handleMagnifierEnter(e) {
      if (this.isImageInteraction || this.isFragmentedMode) return;

      if (this.currentImageLoadedSuccessfully && !this.elements.trackWrapper.classList.contains('faded-out')) {
        this.elements.magnifier.style.display = 'block';
      }
    }

    handleMagnifierLeave(e) {
      this.elements.magnifier.style.display = 'none';
    }

    handleMagnifierMove(e) {
      if (this.isImageInteraction || this.isFragmentedMode) return;
      if (this.elements.magnifier.style.display !== 'block') return;

      const { trackWrapper, trackContainer, trackImage, magnifier } = this.elements;
      const rect = trackWrapper.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const imgNaturalWidth = trackImage.naturalWidth;
      const imgNaturalHeight = trackImage.naturalHeight;
      const containerWidth = trackContainer.clientWidth;
      const containerHeight = trackContainer.clientHeight;
      const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let xOffset = 0, yOffset = 0;
      if (imgAspectRatio > containerAspectRatio) {
        const renderedImgWidth = containerHeight * imgAspectRatio;
        xOffset = (containerWidth - renderedImgWidth) / 2;
      } else {
        const renderedImgHeight = containerWidth / imgAspectRatio;
        yOffset = (containerHeight - renderedImgHeight) / 2;
      }

      magnifier.style.left = `${cursorX - MAGNIFIER_SIZE / 2}px`;
      magnifier.style.top = `${cursorY - MAGNIFIER_SIZE / 2}px`;

      const logicalX = cursorX - xOffset;
      const logicalY = cursorY - yOffset;
      
      const bgPosX = -logicalX * MAGNIFICATION_LEVEL + (MAGNIFIER_SIZE / 2);
      const bgPosY = -logicalY * MAGNIFICATION_LEVEL + (MAGNIFIER_SIZE / 2);

      magnifier.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }
    
    startPracticeRound(track) {
      if (!track) return;
      if (this.elements.modeSelector.value === "") {
        alert("Please select a game mode first!");
        return;
      }
      this.setupGameSettings();
      this.isPracticeMode = true;
      this._startGameWithSettings({ isPractice: true, practiceTrack: track });
    }
    
    start() {
      if (this.elements.modeSelector.value === "") {
        alert("Please select a game mode first!");
        return;
      }
      this.setupGameSettings();
      this.isPracticeMode = false;
      this._startGameWithSettings({ isPractice: false });
    }
    
    _randomizeCurrentSettings() {
      const { 
        randModeMirror, randModeInverted, randModeFragmented,
        randMirrorTrack, randMirrorMap, randMirrorSite,
        randInvertedTrack, randInvertedMap, randInvertedSite,
        randTimerEnable, randTimerMin, randTimerMax,
        randFadeEnable, randFadeMin, randFadeMax,
        randFragCostEnable, randFragCostMin, randFragCostMax,
        randFragInitialEnable, randFragInitialMin, randFragInitialMax,
        randFragGridRandom, randFragGrid2x2, randFragGrid2x3, randFragGrid3x3
      } = this.elements;

      const baseModePool = ['normal'];
      if (randModeMirror.checked || randModeInverted.checked) {
        baseModePool.push('effects'); 
      }
      if (randModeFragmented.checked) {
        baseModePool.push('fragmented');
      }
      const chosenBaseMode = baseModePool[Math.floor(Math.random() * baseModePool.length)];

      this.gameMode = 'normal';
      this.isFragmentedMode = false;
      this.isMirrorTrack = false; this.isMirrorMap = false; this.isMirrorSite = false;
      this.isInvertedTrack = false; this.isInvertedMap = false; this.isInvertedSite = false;

      if (chosenBaseMode === 'fragmented') {
        this.gameMode = 'fragmented';
        this.isFragmentedMode = true;

        if (randFragCostEnable.checked) {
          const min = parseInt(randFragCostMin.value, 10); const max = parseInt(randFragCostMax.value, 10);
          this.fragmentCost = Math.floor(Math.random() * ((max - min) / 5 + 1)) * 5 + min;
        } else {
          this.fragmentCost = parseInt(this.elements.fragmentCost.value, 10);
        }

        if (randFragInitialEnable.checked) {
          const min = parseInt(randFragInitialMin.value, 10); const max = parseInt(randFragInitialMax.value, 10);
          this.fragmentInitialReveals = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
          this.fragmentInitialReveals = parseInt(this.elements.fragmentInitialReveals.value, 10);
        }

        const gridPool = [];
        if (randFragGridRandom.checked) gridPool.push('random');
        if (randFragGrid2x2.checked) gridPool.push('2x2');
        if (randFragGrid2x3.checked) gridPool.push('2x3');
        if (randFragGrid3x3.checked) gridPool.push('3x3');
        this.fragmentGrid = gridPool.length > 0 ? gridPool[Math.floor(Math.random() * gridPool.length)] : 'random';

      } else if (chosenBaseMode === 'effects') {
        const buildModifierPool = (isMirror, isMirrorChecked, isInverted, isInvertedChecked) => {
          const pool = ['normal'];
          if (isMirror && isMirrorChecked) pool.push('mirror');
          if (isInverted && isInvertedChecked) pool.push('inverted');
          if (isMirror && isMirrorChecked && isInverted && isInvertedChecked) pool.push('both');
          return pool;
        };

        const modePool = [];
        if (randModeMirror.checked) modePool.push('mirror');
        if (randModeInverted.checked) modePool.push('inverted');
        if (modePool.length > 0) this.gameMode = modePool[Math.floor(Math.random() * modePool.length)];

        const trackModifiers = buildModifierPool(randModeMirror.checked, randMirrorTrack.checked, randModeInverted.checked, randInvertedTrack.checked);
        const mapModifiers = buildModifierPool(randModeMirror.checked, randMirrorMap.checked, randModeInverted.checked, randInvertedMap.checked);
        const siteModifiers = buildModifierPool(randModeMirror.checked, randMirrorSite.checked, randModeInverted.checked, randInvertedSite.checked);

        const randomTrack = trackModifiers[Math.floor(Math.random() * trackModifiers.length)];
        const randomMap = mapModifiers[Math.floor(Math.random() * mapModifiers.length)];
        const randomSite = siteModifiers[Math.floor(Math.random() * siteModifiers.length)];

        this.isMirrorTrack = randomTrack === 'mirror' || randomTrack === 'both';
        this.isInvertedTrack = randomTrack === 'inverted' || randomTrack === 'both';
        this.isMirrorMap = randomMap === 'mirror' || randomMap === 'both';
        this.isInvertedMap = randomMap === 'inverted' || randomMap === 'both';
        this.isMirrorSite = randomSite === 'mirror' || randomSite === 'both';
        this.isInvertedSite = randomSite === 'inverted' || randomSite === 'both';
      }
      
      if (randTimerEnable.checked) {
        this.isTimerEnabled = true;
        const min = parseInt(randTimerMin.value, 10); const max = parseInt(randTimerMax.value, 10);
        this.timerDuration = Math.floor(Math.random() * (max - min + 1)) + min;
      } else {
        this.isTimerEnabled = !this.elements.unlimitedTimeCheckbox.checked;
        this.timerDuration = parseInt(this.elements.roundTimerInput.value, 10);
      }

      if (randFadeEnable.checked) {
        this.isFadeTimerEnabled = true;
        const min = parseInt(randFadeMin.value, 10); const max = parseInt(randFadeMax.value, 10);
        this.fadeTimerDuration = Math.floor(Math.random() * (max - min + 1)) + min;
      } else {
        this.isFadeTimerEnabled = this.elements.fadeTimerCheckbox.checked;
        this.fadeTimerDuration = parseInt(this.elements.fadeTimerInput.value, 10);
      }
    }
    
    startRandomizedGame() {
      const { 
        randModeMirror, randModeInverted, randModeFragmented,
        randTimerEnable, randFadeEnable, randomizerModal, randPerRound 
      } = this.elements;

      if (!randModeMirror.checked && !randModeInverted.checked && !randModeFragmented.checked && !randTimerEnable.checked && !randFadeEnable.checked) {
          alert('You must select at least one option to randomize!');
          return;
      }

      this.isRandomizedPerRound = randPerRound.checked;
      
      if (!this.isRandomizedPerRound) {
        this._randomizeCurrentSettings();
      }

      randomizerModal.hidden = true;
      this.isPracticeMode = false;
      this._startGameWithSettings({ isPractice: false });
    }

    setupGameSettings() {
        this.gameMode = this.elements.modeSelector.value;
        this.isFragmentedMode = this.gameMode === 'fragmented';

        // Reset all effects before setting them based on mode
        this.isMirrorTrack = false; this.isMirrorMap = false; this.isMirrorSite = false;
        this.isInvertedTrack = false; this.isInvertedMap = false; this.isInvertedSite = false;

        if (this.isFragmentedMode) {
          this.fragmentCost = parseInt(this.elements.fragmentCost.value, 10) || 20;
          this.fragmentGrid = this.elements.fragmentGridSize.value;
          this.fragmentInitialReveals = parseInt(this.elements.fragmentInitialReveals.value, 10) || 1;
        } else {
          this.isMirrorTrack = (this.gameMode === 'mirror' && this.elements.modeOptionTrack.checked);
          this.isMirrorMap = (this.gameMode === 'mirror' && this.elements.modeOptionMap.checked);
          this.isMirrorSite = (this.gameMode === 'mirror' && this.elements.modeOptionSite.checked);
          this.isInvertedTrack = (this.gameMode === 'inverted' && this.elements.modeOptionTrack.checked);
          this.isInvertedMap = (this.gameMode === 'inverted' && this.elements.modeOptionMap.checked);
          this.isInvertedSite = (this.gameMode === 'inverted' && this.elements.modeOptionSite.checked);
        }
        
        this.isTimerEnabled = !this.elements.unlimitedTimeCheckbox.checked;
        const roundDuration = parseInt(this.elements.roundTimerInput.value, 10);
        this.timerDuration = !isNaN(roundDuration) && roundDuration >= 5 ? roundDuration : 30;
        this.isFadeTimerEnabled = this.elements.fadeTimerCheckbox.checked;
        const fadeDuration = parseInt(this.elements.fadeTimerInput.value, 10);
        this.fadeTimerDuration = !isNaN(fadeDuration) && fadeDuration >= 1 ? fadeDuration : 10;
        
        this.isRandomizedPerRound = false;
    }
    
    _startGameWithSettings(options) {
      this.isRerunGame = false;
      this.seedWasModified = false;

      let availableTracks;

      if (options.isPractice) {
        this.shuffledTracks = [options.practiceTrack];
      } else {
        const seedVal = this.elements.seedInput.value.trim();
        const isSeededGame = seedVal !== '';
        this.gameSeed = seedVal || Math.floor(Math.random() * 100000);
        
        const enabledTracks = TRACKS_DATA.filter(t => t.enabled !== false);

        if (isSeededGame) {
          availableTracks = enabledTracks;
        } else {
          availableTracks = enabledTracks.filter(track => !getUsedImages().includes(track.image));
          if (availableTracks.length < MAX_ROUNDS) {
            const confirmed = confirm("You've seen all available images! Do you want to play again with the same images?\n\n(High scores will be disabled for this session.)");
            if (confirmed) {
              this.isRerunGame = true;
              availableTracks = enabledTracks;
            } else {
              return;
            }
          }
        }
        
        if (availableTracks.length === 0) { alert("Error: No images are available to play."); return; }
        
        const fullyShuffled = seededShuffle(availableTracks, this.gameSeed);
        this.shuffledTracks = selectSpacedTracks(fullyShuffled, MAX_ROUNDS, MIN_DISTANCE);

        if (this.shuffledTracks.length < MAX_ROUNDS) {
            alert(`Warning: Could only find ${this.shuffledTracks.length} rounds that meet the minimum distance requirement. Your game will be shorter.`);
        }
      }

      this.score = 0;
      this.round = 0;
      this.elements.scoreDisplay.textContent = "Score: 0";
      document.body.classList.add('menu-active');
      this.elements.menu.hidden = true;
      this.elements.gameUI.hidden = false;
      
      this.loadRound();
    }

    _updateActiveSettingsDisplay() {
        let parts = [];
        
        if (this.isFragmentedMode) {
          const gridInfo = this.fragmentGrid === 'random' ? 'Random' : this.fragmentGridSize.rows ? `${this.fragmentGridSize.rows}x${this.fragmentGridSize.cols}` : 'Random';
          parts.push(`Mode: Fragmented (${gridInfo})`);
        } else {
          const mirrorParts = [];
          if (this.isMirrorTrack) mirrorParts.push('Track');
          if (this.isMirrorMap) mirrorParts.push('Map');
          if (this.isMirrorSite) mirrorParts.push('Site');
          if(mirrorParts.length > 0) parts.push(`Mirror: ${mirrorParts.join(', ')}`);

          const invertedParts = [];
          if (this.isInvertedTrack) invertedParts.push('Track');
          if (this.isInvertedMap) invertedParts.push('Map');
          if (this.isInvertedSite) invertedParts.push('Site');
          if(invertedParts.length > 0) parts.push(`Invert: ${invertedParts.join(', ')}`);
        }

        const timerParts = [];
        if (this.isTimerEnabled) timerParts.push(`Round (${this.timerDuration}s)`);
        if (this.isFadeTimerEnabled) timerParts.push(`Fade (${this.fadeTimerDuration}s)`);
        if(timerParts.length > 0) parts.push(`Timers: ${timerParts.join(', ')}`);

        this.elements.activeSettingsDisplay.textContent = parts.length > 0 ? `Active Settings: ${parts.join(' | ')}` : '';
    }

    applyInGameEffects() {
        const { trackImage, mapImage } = this.elements;
        
        let trackTransforms = [];
        let trackFilters = [];
        let mapTransforms = [];
        let mapFilters = [];

        document.body.classList.toggle('mirror-site', this.isMirrorSite);
        document.documentElement.classList.toggle('inverted-site', this.isInvertedSite);
        
        if (this.isMirrorTrack) trackTransforms.push('scaleX(-1)');
        if (this.isInvertedTrack) trackFilters.push('invert(1)');
        
        if (this.isMirrorMap) mapTransforms.push('scaleX(-1)');
        if (this.isInvertedMap) mapFilters.push('invert(1)');

        trackImage.style.transform = trackTransforms.join(' ');
        trackImage.style.filter = trackFilters.join(' ');
        trackImage.classList.toggle('inverted-by-js', this.isInvertedTrack || this.isInvertedSite);

        mapImage.style.transform = mapTransforms.join(' ');
        mapImage.style.filter = mapFilters.join(' ');
        mapImage.classList.toggle('inverted-by-js', this.isInvertedMap || this.isInvertedSite);
    }
    
    finalizeRoundSetup() {
      this.mapPanZoom.reset();
      this.elements.confirmBtn.hidden = true;
      this.elements.nextBtn.hidden = true;
      this.elements.endGameBtn.hidden = true;
      this.elements.resultText.textContent = "";
      const totalRounds = this.shuffledTracks.length;
      this.elements.roundDisplay.textContent = `Round ${this.round + 1} / ${totalRounds}`;
      const credit = this.currentTrack.credit || "Crazalu";
      this.elements.trackCredit.textContent = `Credit: ${credit}`;
      this.updateMarkerPositions();
      this.startRoundTimer();
      this.startImageFadeTimer();

      const { magnifier, trackImage, trackContainer } = this.elements;
      magnifier.style.backgroundImage = `url('${trackImage.src}')`;
      magnifier.style.width = `${MAGNIFIER_SIZE}px`;
      magnifier.style.height = `${MAGNIFIER_SIZE}px`;

      const imgNaturalWidth = trackImage.naturalWidth;
      const imgNaturalHeight = trackImage.naturalHeight;
      const containerWidth = trackContainer.clientWidth;
      const containerHeight = trackContainer.clientHeight;
      const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let renderedImgWidth, renderedImgHeight;
      if (imgAspectRatio > containerAspectRatio) {
        renderedImgHeight = containerHeight;
        renderedImgWidth = renderedImgHeight * imgAspectRatio;
      } else {
        renderedImgWidth = containerWidth;
        renderedImgHeight = renderedImgWidth / imgAspectRatio;
      }
      
      magnifier.style.backgroundSize = `${renderedImgWidth * MAGNIFICATION_LEVEL}px ${renderedImgHeight * MAGNIFICATION_LEVEL}px`;
    }
    
    loadRound() {
      if (this.isRandomizedPerRound) {
        this._randomizeCurrentSettings();
      }
      
      this.isFragmentedMode = this.gameMode === 'fragmented';
      this.elements.revealFragmentBtn.hidden = !this.isFragmentedMode;
      this.elements.fragmentOverlay.innerHTML = '';
      if (this.isFragmentedMode) {
          this.freeRevealsRemaining = (this.round === 0) ? 2 : 0;
          this._createFragmentGrid();
      }
      
      this.applyInGameEffects();
      this._updateActiveSettingsDisplay();

      clearTimeout(this.imageFadeTimer);
      clearInterval(this.fadeDisplayInterval);
      this.elements.trackWrapper.classList.remove('faded-out');
      this.elements.trackNameDisplay.textContent = ""; 
      this.elements.magnifier.style.display = 'none';
      this.elements.fadeTimerDisplay.hidden = true;
      
      this.pendingGuess = null;
      this.confirmedGuess = null;

      this.canGuess = true;
      this.currentImageLoadedSuccessfully = false;
      this.currentTrack = this.shuffledTracks[this.round];
      this.elements.trackImage.onload = () => {
        this.currentImageLoadedSuccessfully = true;
        this.finalizeRoundSetup();
      };
      this.elements.trackImage.onerror = () => { this.handleImageError(0); };
      this.elements.trackImage.src = this.currentTrack.image;
    }

    startRoundTimer() {
      clearInterval(this.roundTimer);
      this.elements.timerDisplay.classList.remove('low-time');
      if (!this.isTimerEnabled) {
        this.elements.timerDisplay.hidden = true;
        return;
      }
      this.elements.timerDisplay.hidden = false;
      this.timeLeft = this.timerDuration;
      this.elements.timerDisplay.textContent = `Time: ${this.timeLeft}`;
      this.roundTimer = setInterval(() => {
        this.timeLeft--;
        this.elements.timerDisplay.textContent = `Time: ${this.timeLeft}`;
        if (this.timeLeft <= 5) { this.elements.timerDisplay.classList.add('low-time'); }
        if (this.timeLeft <= 0) { this.handleTimeout(); }
      }, 1000);
    }
    
    startImageFadeTimer() {
        clearTimeout(this.imageFadeTimer);
        clearInterval(this.fadeDisplayInterval);
        if (!this.isFadeTimerEnabled) return;
        
        this.imageFadeTimer = setTimeout(() => {
            this.elements.trackWrapper.classList.add('faded-out');
            this.elements.magnifier.style.display = 'none';
        }, this.fadeTimerDuration * 1000);

        if (this.elements.showFadeTimerCheckbox.checked) {
            this.elements.fadeTimerDisplay.hidden = false;
            let fadeTimeLeft = this.fadeTimerDuration;
            this.elements.fadeTimerDisplay.textContent = `Fade in: ${fadeTimeLeft}s`;
            
            this.fadeDisplayInterval = setInterval(() => {
                fadeTimeLeft--;
                this.elements.fadeTimerDisplay.textContent = `Fade in: ${fadeTimeLeft}s`;
                if (fadeTimeLeft <= 0) {
                    clearInterval(this.fadeDisplayInterval);
                    this.elements.fadeTimerDisplay.hidden = true;
                }
            }, 1000);
        }
    }

    handleTimeout() {
        this.stopAllTimers();
        if (!this.canGuess) return;
        this.canGuess = false;
        
        this.elements.fragmentOverlay.innerHTML = '';
        this.elements.revealFragmentBtn.hidden = true;

        this.elements.trackNameDisplay.textContent = this.currentTrack.name || "Unknown Location";
        this.elements.trackWrapper.classList.remove('faded-out');
        this.elements.magnifier.style.display = 'none';
        
        if (this.pendingGuess) {
            alert("Time's up! Your guess has been automatically confirmed.");
            this.confirmedGuess = this.pendingGuess;
            this.pendingGuess = null;
            
            let answerX = this.currentTrack.mapX;
            if (this.isMirrorMap) {
                answerX = (MAP_WIDTH - 1) - answerX;
            }
            
            const dx = this.confirmedGuess.x - answerX;
            const dy = this.confirmedGuess.y - this.currentTrack.mapY;
            const distance = Math.hypot(dx, dy);
            let points = 200;
            if (distance > 15) points = Math.max(0, Math.round(200 - distance));
            
            this.score += points;
            this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
            this.elements.resultText.textContent = `Distance: ${Math.round(distance)}px | +${points} pts`;

        } else {
            alert("Time's up! You didn't make a guess.");
            this.confirmedGuess = null;
            this.score += 0;
            this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
            this.elements.resultText.textContent = "Time's up! +0 pts";
        }
        
        this.updateMarkerPositions();

        this.elements.confirmBtn.hidden = true;
        const isLastRound = this.round >= this.shuffledTracks.length - 1;
        if (isLastRound) {
            if (this.isPracticeMode) {
                this.elements.nextBtn.textContent = 'Back to Menu';
                this.elements.nextBtn.hidden = false;
            } else {
                this.elements.endGameBtn.hidden = false;
            }
        } else {
            this.elements.nextBtn.hidden = false;
        }
    }

    handleImageError(rerollAttempts) {
      const MAX_REROLLS = 10;
      if (rerollAttempts >= MAX_REROLLS) {
        alert("Could not find a working image after multiple attempts. Skipping this round.");
        if (this.round < this.shuffledTracks.length - 1) { this.nextRound(); } else { this.showFinalResults(); }
        return;
      }
      if (!this.seedWasModified && !this.isPracticeMode) {
        this.seedWasModified = true;
        alert("An image could not be found. Rerolling to a new one for this round.");
      }
      const currentRoundImagePaths = this.shuffledTracks.map(t => t.image);
      const replacementTracks = TRACKS_DATA.filter(track => track.enabled !== false && !currentRoundImagePaths.includes(track.image));
      if (replacementTracks.length > 0) {
        const newTrack = replacementTracks[Math.floor(Math.random() * replacementTracks.length)];
        this.shuffledTracks[this.round] = newTrack;
        this.currentTrack = newTrack;
        this.elements.trackImage.onerror = () => this.handleImageError(rerollAttempts + 1);
        this.elements.trackImage.src = newTrack.image;
      } else {
        alert("An image could not be found and no replacements are available. Skipping this round.");
        if (this.round < this.shuffledTracks.length - 1) { this.nextRound(); } else { this.showFinalResults(); }
      }
    }

    nextRound() {
      if (this.isPracticeMode) { this.hideGameAndShowMenu(); return; }
      this.round++;
      this.loadRound();
    }
    
    handleMapClick(e) {
      if (!this.canGuess) return;
      const rect = this.elements.mapWrapper.getBoundingClientRect();
      const { scale, offset } = this.mapPanZoom;

      const guessX = (e.clientX - rect.left) / scale - offset.x;
      const guessY = (e.clientY - rect.top) / scale - offset.y;
      this.pendingGuess = { x: guessX, y: guessY };

      this.updateMarkerPositions();
      this.elements.confirmBtn.hidden = false;
    }

    confirmGuess() {
      if (!this.pendingGuess || !this.canGuess) return;
      this.stopAllTimers();
      if (!this.currentImageLoadedSuccessfully) {
        alert("Please wait for the image to load or for a replacement to be found.");
        return;
      }
      this.canGuess = false;
      this.elements.fragmentOverlay.innerHTML = '';
      this.elements.revealFragmentBtn.hidden = true;
      this.elements.trackNameDisplay.textContent = this.currentTrack.name || "Unknown Location";
      this.elements.trackWrapper.classList.remove('faded-out');
      this.elements.magnifier.style.display = 'none';
      
      let answerX = this.currentTrack.mapX;
      if (this.isMirrorMap) {
          answerX = (MAP_WIDTH - 1) - answerX;
      }
      
      const dx = this.pendingGuess.x - answerX;
      const dy = this.pendingGuess.y - this.currentTrack.mapY;
      const distance = Math.hypot(dx, dy); let points = 200;
      if (distance > 15) points = Math.max(0, Math.round(200 - distance));
      this.score += points;
      
      this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
      this.elements.resultText.textContent = `Distance: ${Math.round(distance)}px | +${points} pts`;
      
      if (this.currentImageLoadedSuccessfully && this.elements.seedInput.value.trim() === '' && !this.isPracticeMode) {
        setUsedImages([...new Set([...getUsedImages(), this.currentTrack.image])]);
        setPracticeUnlocks([...new Set([...getPracticeUnlocks(), this.currentTrack.image])]);
      }
      
      this.confirmedGuess = this.pendingGuess;
      this.pendingGuess = null;
      this.updateMarkerPositions();
      
      this.elements.confirmBtn.hidden = true;
      
      const isLastRound = this.round >= this.shuffledTracks.length - 1;
      if (isLastRound) {
        if (this.isPracticeMode) {
          this.elements.nextBtn.textContent = 'Back to Menu';
          this.elements.nextBtn.hidden = false;
        } else {
          this.elements.endGameBtn.hidden = false;
        }
      } else {
        this.elements.nextBtn.hidden = false;
      }
    }
    
    stopAllTimers() {
        clearInterval(this.roundTimer);
        clearTimeout(this.imageFadeTimer);
        clearInterval(this.fadeDisplayInterval);
    }

    hideGameAndShowMenu() {
      this.stopAllTimers();
      this.elements.gameUI.hidden = true;
      this.elements.menu.hidden = false;
      
      document.body.classList.add('menu-active');

      document.body.classList.remove('mirror-site');
      document.documentElement.classList.remove('inverted-site');
      
      this.elements.mapImage.style.transform = 'none';
      this.elements.trackImage.style.transform = '';
      this.elements.trackImage.style.filter = '';
      this.elements.nextBtn.textContent = 'Next Round';
      this.elements.timerDisplay.hidden = false;
      this.elements.trackNameDisplay.textContent = "";
      this.elements.fadeTimerDisplay.hidden = true;
      this.elements.fragmentOverlay.innerHTML = '';
      this.elements.revealFragmentBtn.hidden = true;
      
      this.displayLeaderboard();
      this.populatePracticeGrid();
    }
    showFinalResults() {
      const maxScore = 200 * this.shuffledTracks.length;
      this.elements.modalFinalScore.textContent = `${this.score} / ${maxScore}`;
      
      this.elements.playerNameInput.value = '';
      this.elements.saveScoreBtn.disabled = false;
      this.elements.saveScoreBtn.textContent = "Save Score";
      
      if (this.isHighScore(this.score)) {
        this.elements.saveScoreForm.hidden = false;
      } else {
        this.elements.saveScoreForm.hidden = true;
      }
      
      const seedContainer = this.elements.modalSeedContainer;
      seedContainer.innerHTML = `<p>Game Seed:</p><div><span>${this.gameSeed}</span><button class="btn-secondary btn-copy-seed">Copy</button></div>`;
      seedContainer.querySelector('button').addEventListener('click', () => this.shareSeed(this.gameSeed));
      
      if (this.seedWasModified) {
        const warning = document.createElement('p');
        warning.className = 'seed-warning';
        warning.textContent = 'Note: An image failed to load and was rerolled. This seed will not produce the same game for others.';
        seedContainer.appendChild(warning);
      }

      this.elements.endGameModal.hidden = false;
    }
    isHighScore(score) {
      if (score === 0 || this.isPracticeMode || this.isRerunGame) return false;
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
      this.elements.saveScoreBtn.disabled = true;
      this.elements.saveScoreBtn.textContent = "Saved!";
    }
    shareSeed(seed, savedHash) {
      navigator.clipboard.writeText(seed).then(() => {
        let message = `Seed "${seed}" copied to clipboard.`;
        const currentHash = generateDataHash(TRACKS_DATA);
        if (savedHash && savedHash !== currentHash) {
          message += "\n\nWarning: The game's image data has changed since this score was set. Playing this seed may result in a different set of rounds.";
        } else if (!savedHash) {
          message += "\n\nNote: If the game's image data is updated in the future, this seed may produce different rounds.";
        }
        if (this.seedWasModified) {
          message += "\n\nAdditionally, an image failed to load during your game and was replaced, so this seed is unique to your playthrough.";
        }
        alert(message);
      }).catch(err => { console.error('Could not copy text: ', err); alert('Failed to copy seed.'); });
    }

    _createFragmentGrid() {
        const { fragmentOverlay } = this.elements;
        fragmentOverlay.innerHTML = '';
        this.fragmentCells = [];
        
        const gridOptions = { "2x2": {r:2, c:2}, "2x3": {r:2, c:3}, "3x3": {r:3, c:3} };
        const randomGridKeys = Object.keys(gridOptions);
        const selectedGridKey = this.fragmentGrid === 'random' ? randomGridKeys[Math.floor(Math.random() * randomGridKeys.length)] : this.fragmentGrid;
        const { r, c } = gridOptions[selectedGridKey] || { r: 3, c: 3 }; // Fallback
        this.fragmentGridSize = { rows: r, cols: c };
        
        fragmentOverlay.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        fragmentOverlay.style.gridTemplateRows = `repeat(${r}, 1fr)`;
        
        const totalCells = r * c;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'fragment-cell hidden';
            cell.dataset.index = i;
            this.fragmentCells.push(cell);
            fragment.appendChild(cell);
        }
        fragmentOverlay.appendChild(fragment);

        const revealCount = Math.min(totalCells, this.fragmentInitialReveals);
        const indices = Array.from({ length: totalCells }, (_, i) => i);
        const shuffledIndices = seededShuffle(indices, this.gameSeed + this.round);
        for(let i=0; i < revealCount; i++) {
            this._revealFragmentByIndex(shuffledIndices.pop());
        }
        this._updateRevealButtonState();
    }

    _revealFragmentByIndex(index) {
        const cell = this.fragmentCells[index];
        if (cell && cell.classList.contains('hidden')) {
            cell.classList.remove('hidden');
            cell.classList.add('revealed');
        }
    }
    
    _updateRevealButtonState() {
        const { revealFragmentBtn } = this.elements;
        const hiddenCellCount = this.fragmentCells.filter(c => c.classList.contains('hidden')).length;

        if (hiddenCellCount === 0) {
            revealFragmentBtn.disabled = true;
            revealFragmentBtn.textContent = 'All Revealed';
            return;
        }

        if (this.freeRevealsRemaining > 0) {
            revealFragmentBtn.disabled = false;
            revealFragmentBtn.textContent = `Reveal More (Free: ${this.freeRevealsRemaining})`;
        } else {
            revealFragmentBtn.textContent = `Reveal More (-${this.fragmentCost} pts)`;
            revealFragmentBtn.disabled = this.score < this.fragmentCost;
        }
    }
    
    _revealRandomFragment() {
        const hiddenCells = this.fragmentCells.filter(cell => cell.classList.contains('hidden'));
        if (hiddenCells.length === 0) return;

        const randomCell = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
        const indexToReveal = parseInt(randomCell.dataset.index, 10);
        
        if (this.freeRevealsRemaining > 0) {
            this.freeRevealsRemaining--;
            this._revealFragmentByIndex(indexToReveal);
        } else {
            if (this.score < this.fragmentCost) {
                alert("Not enough points to reveal another fragment!");
                return;
            }
            this.score -= this.fragmentCost;
            this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
            this._revealFragmentByIndex(indexToReveal);
        }
        this._updateRevealButtonState();
    }
  }

  const elements = {
    menu: document.getElementById("menu"), 
    menuBackground: document.getElementById('menu-background'),
    initialStartBtn: document.getElementById('initial-start-btn'),
    gameUI: document.getElementById("game"), 
    startBtn: document.getElementById("start-btn"),
    seedInput: document.getElementById("seed"),
    trackWrapper: document.getElementById("track-wrapper"), 
    trackContainer: document.getElementById("track-container"),
    trackImage: document.getElementById("track-image"), 
    trackNameDisplay: document.getElementById("track-name-display"),
    confirmBtn: document.getElementById("confirm-btn"), 
    nextBtn: document.getElementById("next-btn"),
    roundDisplay: document.getElementById("round-display"), 
    scoreDisplay: document.getElementById("score-display"),
    resultText: document.getElementById("result"), 
    mapWrapper: document.getElementById("map-wrapper"), 
    mapContainer: document.getElementById("map-container"),
    mapImage: document.getElementById("track-map"),
    markerGuess: document.getElementById("marker-guess"), 
    markerPlayer: document.getElementById("marker-player"), 
    markerAnswer: document.getElementById("marker-answer"),
    guessLine: document.getElementById("guess-line"), 
    statusText: document.getElementById("used-images-status"), 
    leaderboardList: document.getElementById("leaderboard-list"), 
    backToMenuBtn: document.getElementById("back-to-menu-btn"),
    endGameModal: document.getElementById("end-game-modal"), 
    modalFinalScore: document.getElementById("modal-final-score"),
    saveScoreForm: document.getElementById("save-score-form"), 
    playerNameInput: document.getElementById("player-name-input"),
    saveScoreBtn: document.getElementById("save-score-btn"), 
    modalPlayAgainBtn: document.getElementById("modal-play-again-btn"),
    modalBackToMenuBtn: document.getElementById("modal-back-to-menu-btn"),
    modalSeedContainer: document.getElementById("modal-seed-container"),
    themeSelector: document.getElementById('theme-selector'),
    customBgColorInput: document.getElementById('custom-bg-color'),
    roundTimerInput: document.getElementById('round-timer-input'),
    unlimitedTimeCheckbox: document.getElementById('unlimited-time-checkbox'),
    timerDisplay: document.getElementById('timer-display'),
    practiceGrid: document.getElementById('practice-grid'),
    trackCredit: document.getElementById('track-credit'),
    fadeTimerInput: document.getElementById('fade-timer-input'),
    fadeTimerCheckbox: document.getElementById('fade-timer-checkbox'),
    endGameBtn: document.getElementById('end-game-btn'),
    magnifier: document.getElementById('magnifier'),
    modeSelector: document.getElementById('mode-selector'),
    modeOptionsContainer: document.getElementById('mode-options-container'),
    modeOptionTrack: document.getElementById('mode-option-track'),
    modeOptionMap: document.getElementById('mode-option-map'),
    modeOptionSite: document.getElementById('mode-option-site'),
    resetModeBtn: document.getElementById('reset-mode-btn'),
    randomizerBtn: document.getElementById('randomizer-btn'),
    randomizerModal: document.getElementById('randomizer-modal'),
    startRandomBtn: document.getElementById('start-random-btn'),
    cancelRandomBtn: document.getElementById('cancel-random-btn'),
    resetRandomBtn: document.getElementById('reset-random-btn'),
    randModeMirror: document.getElementById('rand-mode-mirror'),
    randModeInverted: document.getElementById('rand-mode-inverted'),
    randMirrorOptions: document.getElementById('rand-mirror-options'),
    randMirrorTrack: document.getElementById('rand-mirror-track'),
    randMirrorMap: document.getElementById('rand-mirror-map'),
    randMirrorSite: document.getElementById('rand-mirror-site'),
    randInvertedOptions: document.getElementById('rand-inverted-options'),
    randInvertedTrack: document.getElementById('rand-inverted-track'),
    randInvertedMap: document.getElementById('rand-inverted-map'),
    randInvertedSite: document.getElementById('rand-inverted-site'),
    randTimerEnable: document.getElementById('rand-timer-enable'),
    randTimerMin: document.getElementById('rand-timer-min'),
    randTimerMax: document.getElementById('rand-timer-max'),
    randFadeEnable: document.getElementById('rand-fade-enable'),
    randFadeMin: document.getElementById('rand-fade-min'),
    randFadeMax: document.getElementById('rand-fade-max'),
    showFadeTimerCheckbox: document.getElementById('show-fade-timer-checkbox'),
    fadeTimerDisplay: document.getElementById('fade-timer-display'),
    activeSettingsDisplay: document.getElementById('active-settings-display'),
    randPerGame: document.getElementById('rand-per-game'),
    randPerRound: document.getElementById('rand-per-round'),
    fragmentOverlay: document.getElementById('fragment-overlay'),
    revealFragmentBtn: document.getElementById('reveal-fragment-btn'),
    fragmentedOptionsContainer: document.getElementById('fragmented-options-container'),
    fragmentCost: document.getElementById('fragment-cost'),
    fragmentGridSize: document.getElementById('fragment-grid-size'),
    fragmentInitialReveals: document.getElementById('fragment-initial-reveals'),
    randModeFragmented: document.getElementById('rand-mode-fragmented'),
    randFragmentedOptions: document.getElementById('rand-fragmented-options'),
    randFragCostEnable: document.getElementById('rand-frag-cost-enable'),
    randFragCostMin: document.getElementById('rand-frag-cost-min'),
    randFragCostMax: document.getElementById('rand-frag-cost-max'),
    randFragInitialEnable: document.getElementById('rand-frag-initial-enable'),
    randFragInitialMin: document.getElementById('rand-frag-initial-min'),
    randFragInitialMax: document.getElementById('rand-frag-initial-max'),
    randFragGridRandom: document.getElementById('rand-frag-grid-random'),
    randFragGrid2x2: document.getElementById('rand-frag-grid-2x2'),
    randFragGrid2x3: document.getElementById('rand-frag-grid-2x3'),
    randFragGrid3x3: document.getElementById('rand-frag-grid-3x3'),
  };
  
  new Game(elements);

  // --- Initial Setup ---
  elements.initialStartBtn.addEventListener('click', () => {
    document.body.classList.add('menu-active');
  });

  // --- Main Menu Controls ---
  elements.unlimitedTimeCheckbox.addEventListener('change', (e) => {
    elements.roundTimerInput.disabled = e.target.checked;
  });
  elements.fadeTimerCheckbox.addEventListener('change', (e) => {
    elements.fadeTimerInput.disabled = !e.target.checked;
    elements.showFadeTimerCheckbox.disabled = !e.target.checked;
  });
  elements.fadeTimerCheckbox.dispatchEvent(new Event('change'));

  elements.showFadeTimerCheckbox.addEventListener('change', (e) => {
    localStorage.setItem(SHOW_FADE_TIMER_KEY, e.target.checked);
  });
  
  // --- Theme Controls ---
  function applyTheme(theme, customColor) {
    document.documentElement.className = ''; // Clear all theme classes
    document.documentElement.style.setProperty('--background-color', '');
    document.documentElement.style.setProperty('--text-color', '');
    if (theme === 'custom') {
      elements.customBgColorInput.hidden = false;
      document.documentElement.style.setProperty('--background-color', customColor);
      const hex = customColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 125 ? '#000000' : '#FFFFFF';
      document.documentElement.style.setProperty('--text-color', textColor);
    } else {
      elements.customBgColorInput.hidden = true;
      if (theme !== 'light') {
        document.documentElement.classList.add(`theme-${theme}`);
      }
    }
    // Re-apply inverted-site if it was active
    if (localStorage.getItem(MODE_KEY) === 'inverted' && localStorage.getItem(MODE_OPTION_SITE_KEY) === 'true') {
        document.documentElement.classList.add('inverted-site');
    }
  }
  
  elements.themeSelector.addEventListener('change', () => {
    const selectedTheme = elements.themeSelector.value;
    const customColor = elements.customBgColorInput.value;
    localStorage.setItem('marioKartGeoGuessr_theme', selectedTheme);
    applyTheme(selectedTheme, customColor);
  });
  elements.customBgColorInput.addEventListener('input', () => {
    const customColor = elements.customBgColorInput.value;
    localStorage.setItem('marioKartGeoGuessr_customColor', customColor);
    if (elements.themeSelector.value === 'custom') {
      applyTheme('custom', customColor);
    }
  });

  // --- Game Mode Controls ---
  function applySiteEffects() {
      const mode = elements.modeSelector.value;
      const isSiteOptionChecked = elements.modeOptionSite.checked;
      document.body.classList.toggle('mirror-site', mode === 'mirror' && isSiteOptionChecked);
      document.documentElement.classList.toggle('inverted-site', mode === 'inverted' && isSiteOptionChecked);
  }

  function handleModeOptionChange() {
      if (elements.modeOptionSite.checked) {
          elements.modeOptionTrack.checked = true;
          elements.modeOptionMap.checked = true;
          elements.modeOptionTrack.disabled = true;
          elements.modeOptionMap.disabled = true;
      } else {
          elements.modeOptionTrack.disabled = false;
          elements.modeOptionMap.disabled = false;
      }
      localStorage.setItem(MODE_OPTION_TRACK_KEY, elements.modeOptionTrack.checked);
      localStorage.setItem(MODE_OPTION_MAP_KEY, elements.modeOptionMap.checked);
      localStorage.setItem(MODE_OPTION_SITE_KEY, elements.modeOptionSite.checked);
      applySiteEffects();
  }
  
  function updateModeOptionsUI() {
      const mode = elements.modeSelector.value;
      const isSpecialMode = mode === 'mirror' || mode === 'inverted';
      const isFragmented = mode === 'fragmented';
      elements.modeOptionsContainer.hidden = !isSpecialMode;
      elements.fragmentedOptionsContainer.hidden = !isFragmented;
      elements.resetModeBtn.hidden = mode === 'normal' || mode === '';
      handleModeOptionChange();
  }
  
  elements.modeSelector.addEventListener('change', () => {
      localStorage.setItem(MODE_KEY, elements.modeSelector.value);
      updateModeOptionsUI();
  });
  elements.modeOptionsContainer.addEventListener('change', handleModeOptionChange);
  elements.fragmentCost.addEventListener('change', () => localStorage.setItem(FRAGMENT_COST_KEY, elements.fragmentCost.value));
  elements.fragmentGridSize.addEventListener('change', () => localStorage.setItem(FRAGMENT_GRID_KEY, elements.fragmentGridSize.value));
  elements.fragmentInitialReveals.addEventListener('change', () => localStorage.setItem(FRAGMENT_INITIAL_KEY, elements.fragmentInitialReveals.value));

  // --- Randomizer Modal Listeners ---
  function setupRandomizerListeners() {
      // ++ MODIFIED: This function now also hides/shows the options container ++
      const setupOptionGroup = (mainCheckbox, optionsContainer) => {
          mainCheckbox.addEventListener('change', () => {
              optionsContainer.classList.toggle('disabled', !mainCheckbox.checked);
              // Also hide the container entirely
              optionsContainer.hidden = !mainCheckbox.checked; 
          });
          // Set initial state on load
          optionsContainer.classList.toggle('disabled', !mainCheckbox.checked);
          optionsContainer.hidden = !mainCheckbox.checked;
      };

      const setupSubOption = (checkbox, inputsToToggle) => {
          checkbox.addEventListener('change', () => {
              inputsToToggle.forEach(input => input.disabled = !checkbox.checked);
          });
          inputsToToggle.forEach(input => input.disabled = !checkbox.checked);
      };

      // Mirror, Inverted, Fragmented main toggles
      setupOptionGroup(elements.randModeMirror, elements.randMirrorOptions);
      setupOptionGroup(elements.randModeInverted, elements.randInvertedOptions);
      setupOptionGroup(elements.randModeFragmented, elements.randFragmentedOptions);
      
      // Special logic for Site options
      elements.randMirrorSite.addEventListener('change', () => {
          const disabled = elements.randMirrorSite.checked;
          elements.randMirrorTrack.checked = disabled ? true : elements.randMirrorTrack.checked;
          elements.randMirrorMap.checked = disabled ? true : elements.randMirrorMap.checked;
          elements.randMirrorTrack.disabled = disabled;
          elements.randMirrorMap.disabled = disabled;
      });
      elements.randInvertedSite.addEventListener('change', () => {
          const disabled = elements.randInvertedSite.checked;
          elements.randInvertedTrack.checked = disabled ? true : elements.randInvertedTrack.checked;
          elements.randInvertedMap.checked = disabled ? true : elements.randInvertedMap.checked;
          elements.randInvertedTrack.disabled = disabled;
          elements.randInvertedMap.disabled = disabled;
      });

      // Sub-options toggles
      setupSubOption(elements.randFragCostEnable, [elements.randFragCostMin, elements.randFragCostMax]);
      setupSubOption(elements.randFragInitialEnable, [elements.randFragInitialMin, elements.randFragInitialMax]);
      setupSubOption(elements.randTimerEnable, [elements.randTimerMin, elements.randTimerMax]);
      setupSubOption(elements.randFadeEnable, [elements.randFadeMin, elements.randFadeMax]);

      // Reset button
      elements.resetRandomBtn.addEventListener('click', () => {
          const allCheckboxes = [
              elements.randModeMirror, elements.randModeInverted, elements.randModeFragmented,
              elements.randMirrorTrack, elements.randMirrorMap, elements.randMirrorSite,
              elements.randInvertedTrack, elements.randInvertedMap, elements.randInvertedSite,
              elements.randFragCostEnable, elements.randFragInitialEnable,
              elements.randFragGridRandom, elements.randFragGrid2x2, elements.randFragGrid2x3, elements.randFragGrid3x3,
              elements.randTimerEnable, elements.randFadeEnable
          ];
          allCheckboxes.forEach(cb => cb.checked = true);
          elements.randPerGame.checked = true;

          // Dispatch change events to re-apply disabled/hidden states
          [
              elements.randModeMirror, elements.randModeInverted, elements.randModeFragmented,
              elements.randMirrorSite, elements.randInvertedSite,
              elements.randFragCostEnable, elements.randFragInitialEnable,
              elements.randTimerEnable, elements.randFadeEnable
          ].forEach(el => el.dispatchEvent(new Event('change')));
      });
  }

  // --- Initial Load and UI Setup ---
  function initialLoad() {
    const savedTheme = localStorage.getItem('marioKartGeoGuessr_theme') || 'light';
    const savedCustomColor = localStorage.getItem('marioKartGeoGuessr_customColor') || '#f0f0f0';
    elements.themeSelector.value = savedTheme;
    elements.customBgColorInput.value = savedCustomColor;
    applyTheme(savedTheme, savedCustomColor);

    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode) elements.modeSelector.value = savedMode;
    elements.modeOptionTrack.checked = localStorage.getItem(MODE_OPTION_TRACK_KEY) !== 'false';
    elements.modeOptionMap.checked = localStorage.getItem(MODE_OPTION_MAP_KEY) === 'true';
    elements.modeOptionSite.checked = localStorage.getItem(MODE_OPTION_SITE_KEY) === 'true';
    elements.fragmentCost.value = localStorage.getItem(FRAGMENT_COST_KEY) || '20';
    elements.fragmentGridSize.value = localStorage.getItem(FRAGMENT_GRID_KEY) || 'random';
    elements.fragmentInitialReveals.value = localStorage.getItem(FRAGMENT_INITIAL_KEY) || '1';
    updateModeOptionsUI();

    elements.showFadeTimerCheckbox.checked = localStorage.getItem(SHOW_FADE_TIMER_KEY) !== 'false';

    setupRandomizerListeners();
  }

  initialLoad();
});