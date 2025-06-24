// js/game.js

const MAX_ROUNDS = 5;
const MAP_WIDTH = 2004;
const MIN_DISTANCE = 20;
const LEADERBOARD_MAX_ENTRIES = 5;
const MAGNIFIER_SIZE = 150;
const MAGNIFICATION_LEVEL = 2.5;

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
      
      this.bindEvents();
      this.updateStatusText();
      this.displayLeaderboard();
      
      this.pendingGuess = null;
      this.confirmedGuess = null;

      // Per-game settings
      this.isRerunGame = false;
      this.isRandomizedPerRound = false;
      this.isCustomChallenge = false;
      this.challengeConfig = null;

      // Per-round settings (will be overwritten by challenge/randomizer)
      this.gameMode = 'normal';
      this.isMirrorTrack = false;
      this.isMirrorMap = false;
      this.isMirrorSite = false;
      this.isInvertedTrack = false;
      this.isInvertedMap = false;
      this.isInvertedSite = false;
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
      const getPixelPos = (logicalPos) => {
        const isMapVisuallyFlipped = this.isMirrorMap ^ this.isMirrorSite;
        let displayX = logicalPos.x;
        if (isMapVisuallyFlipped) {
            displayX = MAP_WIDTH - displayX;
        }
        return {
            x: (displayX + offset.x) * scale,
            y: (logicalPos.y + offset.y) * scale
        };
      };

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
          const answerLogicalPos = { x: this.currentTrack.mapX, y: this.currentTrack.mapY };
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
      
      // Challenge buttons
      this.elements.createChallengeBtn.addEventListener('click', () => { this.elements.createChallengeModal.hidden = false; });
      this.elements.playChallengeBtn.addEventListener('click', () => { this.elements.playChallengeModal.hidden = false; });
      this.elements.startChallengeBtn.addEventListener('click', () => {
          const code = this.elements.challengeCodeInput.value.trim();
          if (code) {
              this.startFromChallengeCode(code);
          } else {
              alert("Please enter a challenge code.");
          }
      });
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
  
      if (this.isMirrorSite) {
          magnifier.style.right = `${cursorX - MAGNIFIER_SIZE / 2}px`;
          magnifier.style.left = 'auto';
      } else {
          magnifier.style.left = `${cursorX - MAGNIFIER_SIZE / 2}px`;
          magnifier.style.right = 'auto';
      }
      magnifier.style.top = `${cursorY - MAGNIFIER_SIZE / 2}px`;
  
      const isTrackVisuallyFlipped = this.isMirrorTrack ^ this.isMirrorSite;
  
      let logicalCursorX = cursorX;
      if (isTrackVisuallyFlipped) {
        logicalCursorX = trackWrapper.clientWidth - cursorX;
      }
  
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
      
      const bgCalcX = logicalCursorX - xOffset;
      const bgCalcY = cursorY - yOffset;
      
      const bgPosX = -bgCalcX * MAGNIFICATION_LEVEL + (MAGNIFIER_SIZE / 2);
      const bgPosY = -bgCalcY * MAGNIFICATION_LEVEL + (MAGNIFIER_SIZE / 2);
  
      magnifier.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
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

        let mTrack = randMirrorTrack.checked;
        let mMap = randMirrorMap.checked;
        let mSite = randMirrorSite.checked;
        if (mSite) { mTrack = true; mMap = true; }

        let iTrack = randInvertedTrack.checked;
        let iMap = randInvertedMap.checked;
        let iSite = randInvertedSite.checked;
        if (iSite) { iTrack = true; iMap = true; }

        const trackModifiers = buildModifierPool(randModeMirror.checked, mTrack, randModeInverted.checked, iTrack);
        const mapModifiers = buildModifierPool(randModeMirror.checked, mMap, randModeInverted.checked, iMap);
        const siteModifiers = buildModifierPool(randModeMirror.checked, mSite, randModeInverted.checked, iSite);

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
        randModeMirror, randMirrorSite, 
        randModeInverted, randModeFragmented, 
        randTimerEnable, randFadeEnable, randomizerModal
      } = this.elements;

      if (!randModeMirror.checked && !randModeInverted.checked && !randModeFragmented.checked && !randTimerEnable.checked && !randFadeEnable.checked) {
          alert('You must select at least one option to randomize!');
          return;
      }
      
      // Warn the user ONLY if the buggy "Mirror Site" option is included
      if (randModeMirror.checked && randMirrorSite.checked) {
          const confirmed = confirm("Warning: The 'Mirror Site' option is experimental and has bugs that may affect gameplay. There are no plans to fix this issue as it is only available in the randomizer. Continue anyway?");
          if (!confirmed) {
              return; // Do not start the game if they cancel
          }
      }

      this.isRandomizedPerRound = this.elements.randPerRound.checked;
      
      if (!this.isRandomizedPerRound) {
        this._randomizeCurrentSettings();
      }

      randomizerModal.hidden = true;
      this.isPracticeMode = false;
      this._startGameWithSettings({ isPractice: false });
    }

    setupGameSettings() {
        this.isCustomChallenge = false;
        this.challengeConfig = null;
        this.gameMode = this.elements.modeSelector.value;
        this.isFragmentedMode = this.gameMode === 'fragmented';
        this.isMirrorTrack = false; this.isMirrorMap = false; this.isMirrorSite = false;
        this.isInvertedTrack = false; this.isInvertedMap = false; this.isInvertedSite = false;

        if (this.isFragmentedMode) {
          this.fragmentCost = parseInt(this.elements.fragmentCost.value, 10) || 20;
          this.fragmentGrid = this.elements.fragmentGridSize.value;
          this.fragmentInitialReveals = parseInt(this.elements.fragmentInitialReveals.value, 10) || 1;
        } else if (this.gameMode === 'mirror') {
          this.isMirrorTrack = this.elements.modeOptionTrack.checked;
          this.isMirrorMap = this.elements.modeOptionMap.checked;
          this.isMirrorSite = false; // Cannot be selected from standard UI
        } else if (this.gameMode === 'inverted') {
          this.isInvertedTrack = this.elements.modeOptionTrack.checked;
          this.isInvertedMap = this.elements.modeOptionMap.checked;
          this.isInvertedSite = this.elements.modeOptionSite.checked;
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
        
        if (this.isCustomChallenge) {
          parts.push("Mode: Custom Challenge");
        } else if (this.isRandomizedPerRound) {
            parts.push("Mode: Randomized Per Round");
        } else if (this.isFragmentedMode) {
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
        
        document.body.classList.toggle('mirror-site', this.isMirrorSite);
        trackImage.classList.toggle('mirrored', this.isMirrorTrack);
        mapImage.classList.toggle('mirrored', this.isMirrorMap);

        // Set the site-wide inversion class.
        document.documentElement.classList.toggle('inverted-site', this.isInvertedSite);

        // Apply specific inversion filters ONLY when site-wide inversion is NOT active.
        trackImage.style.filter = (this.isInvertedTrack && !this.isInvertedSite) ? 'invert(1)' : '';
        mapImage.style.filter = (this.isInvertedMap && !this.isInvertedSite) ? 'invert(1)' : '';
    }
    
    finalizeRoundSetup() {
      this.mapPanZoom.reset();
      this.elements.confirmBtn.hidden = true;
      this.elements.nextBtn.hidden = true;
      this.elements.endGameBtn.hidden = true;
      this.elements.resultText.textContent = "";
      this.elements.resultText.classList.add('hidden');
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
      // Determine per-round settings before anything else
      if (this.isCustomChallenge) {
          this._applyChallengeSettingsForRound();
      } else if (this.isRandomizedPerRound) {
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

    _applyChallengeSettingsForRound() {
        const config = this.challengeConfig.r[this.round];
        const modeMap = ['normal', 'mirror', 'inverted', 'fragmented'];
        const gridMap = ['random', '2x2', '2x3', '3x3'];

        this.gameMode = modeMap[config.m];
        
        // Mirror Options
        this.isMirrorTrack = !!config.mt;
        this.isMirrorMap = !!config.mm;
        this.isMirrorSite = false;

        // Inverted Options
        this.isInvertedTrack = !!config.it;
        this.isInvertedMap = !!config.im;
        this.isInvertedSite = !!config.is;
        
        // Fragment Options
        this.fragmentCost = config.fc;
        this.fragmentGrid = gridMap[config.fg];
        this.fragmentInitialReveals = config.fi;

        // Timer Options
        this.isTimerEnabled = !!config.te;
        this.timerDuration = config.td;
        this.isFadeTimerEnabled = !!config.fe;
        this.fadeTimerDuration = config.fd;
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
            
            const dx = this.confirmedGuess.x - this.currentTrack.mapX;
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
        
        this.elements.resultText.classList.remove('hidden');
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
      if (!this.seedWasModified && !this.isPracticeMode && !this.isCustomChallenge) {
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
      if (this.isRerunGame && this.round >= this.shuffledTracks.length - 1) {
        this.showFinalResults();
        return;
      }
      this.round++;
      this.loadRound();
    }
    
    handleMapClick(e) {
        if (!this.canGuess) return;
        const rect = this.elements.mapWrapper.getBoundingClientRect();
        const { scale, offset } = this.mapPanZoom;
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        let containerX = (cursorX / scale) - offset.x;
        const containerY = (cursorY / scale) - offset.y;
        const isMapVisuallyFlipped = this.isMirrorMap ^ this.isMirrorSite;
        let logicalX = containerX;
        if (isMapVisuallyFlipped) {
            logicalX = MAP_WIDTH - containerX;
        }
        this.pendingGuess = { x: logicalX, y: containerY };
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
      
      const dx = this.pendingGuess.x - this.currentTrack.mapX;
      const dy = this.pendingGuess.y - this.currentTrack.mapY;
      const distance = Math.hypot(dx, dy); let points = 200;
      if (distance > 15) points = Math.max(0, Math.round(200 - distance));
      this.score += points;
      
      this.elements.scoreDisplay.textContent = `Score: ${this.score}`;
      this.elements.resultText.textContent = `Distance: ${Math.round(distance)}px | +${points} pts`;
      this.elements.resultText.classList.remove('hidden');
      
      if (this.currentImageLoadedSuccessfully && this.elements.seedInput.value.trim() === '' && !this.isPracticeMode && !this.isRerunGame && !this.isCustomChallenge) {
        setUsedImages([...new Set([...getUsedImages(), this.currentTrack.image])]);
      }
      
      this.confirmedGuess = this.pendingGuess;
      this.pendingGuess = null;
      this.updateMarkerPositions();
      
      this.elements.confirmBtn.hidden = true;
      
      const isLastRound = this.round >= this.shuffledTracks.length - 1;
      if (isLastRound) {
        this.elements.endGameBtn.hidden = false;
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
      
      this.elements.mapImage.style.transform = '';
      this.elements.mapImage.classList.remove('mirrored');
      this.elements.trackImage.style.transform = '';
      this.elements.trackImage.classList.remove('mirrored');
      this.elements.trackImage.style.filter = '';
      this.elements.nextBtn.textContent = 'Next Round';
      this.elements.timerDisplay.hidden = false;
      this.elements.trackNameDisplay.textContent = "";
      this.elements.fadeTimerDisplay.hidden = true;
      this.elements.fragmentOverlay.innerHTML = '';
      this.elements.revealFragmentBtn.hidden = true;
      
      this.displayLeaderboard();
      this.updateStatusText();
    }

    showFinalResults() {
      const totalRounds = this.shuffledTracks.length;
      const maxScore = 200 * totalRounds;
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
      if (this.isCustomChallenge) {
        seedContainer.innerHTML = `<p>This was a custom challenge game. High scores are disabled.</p>`;
      } else if(this.gameSeed === 'custom') {
        seedContainer.innerHTML = `<p>This was a custom game and cannot be shared with a seed.</p>`;
      } else {
        seedContainer.innerHTML = `<p>Game Seed:</p><div><span>${this.gameSeed}</span><button class="btn-secondary btn-copy-seed">Copy</button></div>`;
        seedContainer.querySelector('button').addEventListener('click', () => this.shareSeed(this.gameSeed));
      
        if (this.seedWasModified) {
          const warning = document.createElement('p');
          warning.className = 'seed-warning';
          warning.textContent = 'Note: An image failed to load and was rerolled. This seed will not produce the same game for others.';
          seedContainer.appendChild(warning);
        }
      }

      this.elements.endGameModal.hidden = false;
    }
    
    isHighScore(score) {
      if (score === 0 || this.isPracticeMode || this.isRerunGame || this.isCustomChallenge) return false;
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
        const gameSeedForShuffle = this.isCustomChallenge ? Date.now() : this.gameSeed;
        const indices = Array.from({ length: totalCells }, (_, i) => i);
        const shuffledIndices = seededShuffle(indices, gameSeedForShuffle + this.round);
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

    startCustomGame(tracks) {
      if (!tracks || tracks.length === 0) {
        alert("No tracks selected for custom game.");
        return;
      }
  
      this.isPracticeMode = false;
      this.isRerunGame = true; 
      this.seedWasModified = false;
      this.gameSeed = 'custom';
      this.isCustomChallenge = false;
      this.challengeConfig = null;
  
      this.shuffledTracks = seededShuffle(tracks, Math.random());
      
      this.score = 0;
      this.round = 0;
      this.elements.scoreDisplay.textContent = "Score: 0";
      
      document.body.classList.add('menu-active');
      this.elements.menu.hidden = true;
      this.elements.gameUI.hidden = false;
      
      this.loadRound();
    }

    startFromChallengeCode(code) {
        const config = decodeChallenge(code);
        if (!config || !config.i || !config.r || config.i.length !== 5 || config.r.length !== 5) {
            alert("Invalid or corrupt challenge code. The link may be incomplete.");
            return;
        }

        const tracks = config.i.map(index => TRACKS_DATA[index]).filter(Boolean);
        if (tracks.length !== 5) {
            alert("Challenge code contains invalid image references. The game data may have changed since the challenge was created.");
            return;
        }

        this.isCustomChallenge = true;
        this.challengeConfig = config;
        this.shuffledTracks = tracks;
        this.gameSeed = `challenge_${code.substring(0, 10)}`;
        
        this.score = 0;
        this.round = 0;
        
        this.elements.playChallengeModal.hidden = true;
        this.elements.challengeCodeInput.value = '';
        this.elements.scoreDisplay.textContent = "Score: 0";
        document.body.classList.add('menu-active');
        this.elements.menu.hidden = true;
        this.elements.gameUI.hidden = false;

        this.loadRound();
    }
}