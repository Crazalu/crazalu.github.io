// js/ui.js

function initializeUI(elements) {
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

      // Set component colors based on brightness for contrast
      const isDark = brightness <= 125;
      if (isDark) {
        // Dark custom theme
        document.documentElement.style.setProperty('--modal-bg', '#1a1e25');
        document.documentElement.style.setProperty('--leaderboard-bg', '#1a1e25');
        document.documentElement.style.setProperty('--leaderboard-border', '#444');
        document.documentElement.style.setProperty('--leaderboard-hover', '#3c4452');
        document.documentElement.style.setProperty('--border-color', '#778996');
      } else {
        // Light custom theme
        document.documentElement.style.setProperty('--modal-bg', '#ffffff');
        document.documentElement.style.setProperty('--leaderboard-bg', '#ffffff');
        document.documentElement.style.setProperty('--leaderboard-border', '#ccc');
        document.documentElement.style.setProperty('--leaderboard-hover', '#e9ecef');
        document.documentElement.style.setProperty('--border-color', '#444');
      }

    } else {
      elements.customBgColorInput.hidden = true;
      if (theme !== 'light') {
        document.documentElement.classList.add(`theme-${theme}`);
      }
      // Clear custom properties when switching to a built-in theme
      document.documentElement.style.setProperty('--modal-bg', '');
      document.documentElement.style.setProperty('--leaderboard-bg', '');
      document.documentElement.style.setProperty('--leaderboard-border', '');
      document.documentElement.style.setProperty('--leaderboard-hover', '');
      document.documentElement.style.setProperty('--border-color', '');
    }
    // Re-apply inverted-site if it was active
    if (localStorage.getItem(MODE_KEY) === 'inverted' && localStorage.getItem(MODE_OPTION_SITE_KEY) === 'true') {
        document.documentElement.classList.add('inverted-site');
    }
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
    if (elements.themeSelector.value === 'custom') {
      applyTheme('custom', customColor);
    }
  });

  // --- Game Mode Controls ---
  function applySiteEffects() {
      // Mirror site is no longer a standard option, so we only handle Inverted here.
      const mode = elements.modeSelector.value;
      const isSiteOptionChecked = elements.modeOptionSite.checked;
      document.documentElement.classList.toggle('inverted-site', mode === 'inverted' && isSiteOptionChecked);
  }

  function handleModeOptionChange() {
      if (elements.modeSelector.value === 'inverted' && elements.modeOptionSite.checked) {
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
      // Show the "Site" option only if the mode is 'inverted'
      if (elements.siteOptionWrapper) {
          elements.siteOptionWrapper.hidden = (mode !== 'inverted');
      }
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
      const setupOptionGroup = (mainCheckbox, optionsContainer) => {
          mainCheckbox.addEventListener('change', () => {
              optionsContainer.classList.toggle('disabled', !mainCheckbox.checked);
              optionsContainer.hidden = !mainCheckbox.checked; 
          });
      };

      const setupSubOption = (checkbox, inputsToToggle) => {
          checkbox.addEventListener('change', () => {
              inputsToToggle.forEach(input => input.disabled = !checkbox.checked);
          });
      };

      setupOptionGroup(elements.randModeMirror, elements.randMirrorOptions);
      setupOptionGroup(elements.randModeInverted, elements.randInvertedOptions);
      setupOptionGroup(elements.randModeFragmented, elements.randFragmentedOptions);
      
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

      setupSubOption(elements.randFragCostEnable, [elements.randFragCostMin, elements.randFragCostMax]);
      setupSubOption(elements.randFragInitialEnable, [elements.randFragInitialMin, elements.randFragInitialMax]);
      setupSubOption(elements.randTimerEnable, [elements.randTimerMin, elements.randTimerMax]);
      setupSubOption(elements.randFadeEnable, [elements.randFadeMin, elements.randFadeMax]);

      elements.resetRandomBtn.addEventListener('click', () => {
          const allCheckboxes = [
              elements.randModeMirror, elements.randModeInverted, elements.randModeFragmented,
              elements.randMirrorTrack, elements.randMirrorMap, elements.randMirrorSite,
              elements.randInvertedTrack, elements.randInvertedMap, elements.randInvertedSite,
              elements.randFragCostEnable, elements.randFragInitialEnable,
              elements.randFragGridRandom, elements.randFragGrid2x2, elements.randFragGrid2x3, elements.randFragGrid3x3,
              elements.randTimerEnable, elements.randFadeEnable
          ];
          // Set desired defaults
          allCheckboxes.forEach(cb => cb.checked = true);
          elements.randMirrorSite.checked = false;
          elements.randInvertedSite.checked = false;

          elements.randPerRound.checked = true;

          // Dispatch change events to update UI state
          [
              elements.randModeMirror, elements.randModeInverted, elements.randModeFragmented,
              elements.randMirrorSite, elements.randInvertedSite,
              elements.randFragCostEnable, elements.randFragInitialEnable,
              elements.randTimerEnable, elements.randFadeEnable
          ].forEach(el => el.dispatchEvent(new Event('change')));
      });
  }

  // --- Initial UI State on Load ---
  function initialLoad() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    const savedCustomColor = localStorage.getItem(CUSTOM_COLOR_KEY) || '#f0f0f0';
    elements.themeSelector.value = savedTheme;
    elements.customBgColorInput.value = savedCustomColor;
    applyTheme(savedTheme, savedCustomColor);

    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode) elements.modeSelector.value = savedMode;
    // Default track and map to true, site to false, unless saved otherwise
    elements.modeOptionTrack.checked = localStorage.getItem(MODE_OPTION_TRACK_KEY) !== 'false';
    elements.modeOptionMap.checked = localStorage.getItem(MODE_OPTION_MAP_KEY) !== 'false';
    elements.modeOptionSite.checked = localStorage.getItem(MODE_OPTION_SITE_KEY) === 'true';
    elements.fragmentCost.value = localStorage.getItem(FRAGMENT_COST_KEY) || '20';
    elements.fragmentGridSize.value = localStorage.getItem(FRAGMENT_GRID_KEY) || 'random';
    elements.fragmentInitialReveals.value = localStorage.getItem(FRAGMENT_INITIAL_KEY) || '1';
    updateModeOptionsUI();

    elements.showFadeTimerCheckbox.checked = localStorage.getItem(SHOW_FADE_TIMER_KEY) !== 'false';
    elements.fadeTimerCheckbox.dispatchEvent(new Event('change'));

    setupRandomizerListeners();

    [
        elements.randModeMirror, elements.randModeInverted, elements.randModeFragmented
    ].forEach(el => el.dispatchEvent(new Event('change')));
  }

  initialLoad();
}

function initializeCustomGameUI(elements, game) {
  const grid = elements.customImageGrid;
  const startBtn = elements.startCustomGameBtn;

  if (!grid || !startBtn) return;

  const populateCustomGrid = () => {
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const availableTracks = TRACKS_DATA.filter(t => t.enabled !== false);
    
    availableTracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'custom-card';
      card.dataset.imagePath = track.image;

      card.innerHTML = `
        <input type="checkbox" title="Select ${track.name}">
        <img src="${track.image}" alt="${track.name}" loading="lazy">
        <p>${track.name || 'Unnamed'}</p>
      `;
      
      card.addEventListener('click', () => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        updateCardSelection(card, checkbox.checked);
        updateStartButtonState();
      });
      
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  };

  const updateCardSelection = (card, isSelected) => {
    card.classList.toggle('selected', isSelected);
  };

  const updateStartButtonState = () => {
    const selectedCount = grid.querySelectorAll('.custom-card.selected').length;
    if (selectedCount > 0) {
      startBtn.disabled = false;
      startBtn.textContent = `Start Custom Game (${selectedCount})`;
    } else {
      startBtn.disabled = true;
      startBtn.textContent = 'Start Custom Game (0)';
    }
  };

  const selectAll = (shouldSelect) => {
    const cards = grid.querySelectorAll('.custom-card');
    cards.forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox.checked !== shouldSelect) {
        checkbox.checked = shouldSelect;
        updateCardSelection(card, shouldSelect);
      }
    });
    updateStartButtonState();
  };

  elements.selectAllBtn.addEventListener('click', () => selectAll(true));
  elements.deselectAllBtn.addEventListener('click', () => selectAll(false));

  startBtn.addEventListener('click', () => {
    const selectedCards = grid.querySelectorAll('.custom-card.selected');
    const selectedImagePaths = Array.from(selectedCards).map(card => card.dataset.imagePath);

    const selectedTracks = TRACKS_DATA.filter(track => selectedImagePaths.includes(track.image));
    
    if(selectedTracks.length > 0) {
      if (elements.modeSelector.value === "") {
        alert("Please select a game mode for your custom game first!");
        return;
      }
      game.setupGameSettings();
      game.startCustomGame(selectedTracks);
    }
  });

  populateCustomGrid();
}

function initializeChallengeUI(elements, game) {
    if (!elements.createChallengeModal) return;

    const MAX_CHALLENGE_ROUNDS = 5;
    let selectedTracks = new Map(); // Map<trackIndex, trackObject>

    const closeModal = (modal) => {
        modal.hidden = true;
    };
    elements.createChallengeModal.querySelector('.modal-close').addEventListener('click', () => closeModal(elements.createChallengeModal));
    elements.playChallengeModal.querySelector('.modal-close').addEventListener('click', () => closeModal(elements.playChallengeModal));

    const populateImageGrid = () => {
        const grid = elements.challengeImageGrid;
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const availableTracks = TRACKS_DATA.filter(t => t.enabled !== false);

        availableTracks.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'custom-card';
            card.dataset.trackIndex = index;
            card.innerHTML = `<img src="${track.image}" alt="${track.name}" loading="lazy"><p>${track.name || 'Unnamed'}</p>`;
            card.addEventListener('click', () => toggleTrackSelection(index, track, card));
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
    };
    
    const toggleTrackSelection = (index, track, cardElement) => {
        if (selectedTracks.has(index)) {
            selectedTracks.delete(index);
            cardElement.classList.remove('selected');
        } else {
            if (selectedTracks.size < MAX_CHALLENGE_ROUNDS) {
                selectedTracks.set(index, track);
                cardElement.classList.add('selected');
            } else {
                alert(`You can only select ${MAX_CHALLENGE_ROUNDS} images for a challenge.`);
            }
        }
        updateSelectedRoundsUI();
    };

    const updateSelectedRoundsUI = () => {
        const container = elements.challengeSelectedRounds;
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < MAX_CHALLENGE_ROUNDS; i++) {
            const roundEl = createRoundConfigElement(i);
            fragment.appendChild(roundEl);
        }
        container.appendChild(fragment);
        
        let roundIndex = 0;
        selectedTracks.forEach((track, trackIndex) => {
            const roundEl = container.children[roundIndex];
            roundEl.classList.remove('is-placeholder');
            roundEl.dataset.trackIndex = trackIndex;
            roundEl.querySelector('.challenge-round-image').src = track.image;
            roundEl.querySelector('.challenge-round-title').textContent = `Round ${roundIndex + 1}: ${track.name}`;
            roundIndex++;
        });

        elements.challengeGenerateBtn.disabled = selectedTracks.size !== MAX_CHALLENGE_ROUNDS;
    };

    const createRoundConfigElement = (roundNum) => {
        const el = document.createElement('div');
        el.className = 'challenge-round-config is-placeholder';
        el.innerHTML = `
            <div class="challenge-round-header">
                <img class="challenge-round-image" src="images/marker.webp" alt="Round image">
                <h4 class="challenge-round-title">Round ${roundNum + 1}: Select an image</h4>
            </div>
            <div class="challenge-round-body">
                <div class="challenge-config-group">
                    <label>Mode:</label>
                    <select class="challenge-mode-selector">
                        <option value="normal">Normal</option>
                        <option value="mirror">Mirror</option>
                        <option value="inverted">Inverted</option>
                        <option value="fragmented">Fragmented</option>
                    </select>
                </div>
                <!-- Mirror/Inverted Options -->
                <div class="challenge-config-group challenge-mi-options" hidden>
                    <span>Options:</span>
                    <div class="checkbox-wrapper"><input type="checkbox" class="mi-track"><label>Track</label></div>
                    <div class="checkbox-wrapper"><input type="checkbox" class="mi-map"><label>Map</label></div>
                    <div class="checkbox-wrapper mi-site-wrapper" style="display: none;"><input type="checkbox" class="mi-site"><label>Site</label></div>
                </div>
                <!-- Fragmented Options -->
                <div class="challenge-config-group challenge-frag-options" hidden>
                     <div class="fragment-option"><label>Cost:</label><input type="number" class="frag-cost" value="20" min="0" step="5"></div>
                     <div class="fragment-option"><label>Grid:</label><select class="frag-grid"><option value="random">Random</option><option value="2x2">2x2</option><option value="2x3">2x3</option><option value="3x3">3x3</option></select></div>
                     <div class="fragment-option"><label>Initial:</label><input type="number" class="frag-initial" value="1" min="0"></div>
                </div>
                <!-- Timer Options -->
                <div class="challenge-config-group challenge-timer-options">
                    <div class="checkbox-wrapper"><input type="checkbox" class="timer-enable" checked><label>Round Timer</label></div>
                    <input type="number" class="timer-duration" value="30" min="5">
                    <div class="checkbox-wrapper"><input type="checkbox" class="fade-enable"><label>Image Fade</label></div>
                    <input type="number" class="fade-duration" value="10" min="1" disabled>
                </div>
            </div>
        `;

        const modeSelector = el.querySelector('.challenge-mode-selector');
        const miOptions = el.querySelector('.challenge-mi-options');
        const fragOptions = el.querySelector('.challenge-frag-options');
        const miSiteWrapper = el.querySelector('.mi-site-wrapper');

        modeSelector.addEventListener('change', () => {
            const mode = modeSelector.value;
            miOptions.hidden = (mode !== 'mirror' && mode !== 'inverted');
            fragOptions.hidden = (mode !== 'fragmented');
            miSiteWrapper.style.display = (mode === 'inverted') ? 'inline-flex' : 'none';
        });

        const timerEnable = el.querySelector('.timer-enable');
        const timerDuration = el.querySelector('.timer-duration');
        timerEnable.addEventListener('change', () => timerDuration.disabled = !timerEnable.checked);

        const fadeEnable = el.querySelector('.fade-enable');
        const fadeDuration = el.querySelector('.fade-duration');
        fadeEnable.addEventListener('change', () => fadeDuration.disabled = !fadeEnable.checked);

        return el;
    };

    elements.challengeRandomizeImagesBtn.addEventListener('click', () => {
        const allTrackIndexes = TRACKS_DATA.map((t, i) => t.enabled !== false ? i : -1).filter(i => i !== -1);
        const shuffled = seededShuffle(allTrackIndexes, Date.now());
        
        selectedTracks.clear();
        document.querySelectorAll('#challenge-image-grid .custom-card.selected').forEach(c => c.classList.remove('selected'));

        for (let i = 0; i < Math.min(MAX_CHALLENGE_ROUNDS, shuffled.length); i++) {
            const trackIndex = shuffled[i];
            selectedTracks.set(trackIndex, TRACKS_DATA[trackIndex]);
            const card = document.querySelector(`#challenge-image-grid .custom-card[data-track-index="${trackIndex}"]`);
            if(card) card.classList.add('selected');
        }
        updateSelectedRoundsUI();
    });

    elements.challengeGenerateBtn.addEventListener('click', () => {
        const roundElements = elements.challengeSelectedRounds.querySelectorAll('.challenge-round-config:not(.is-placeholder)');
        if (roundElements.length !== MAX_CHALLENGE_ROUNDS) {
            alert("Please select 5 images before generating a code.");
            return;
        }

        const challengeData = {
            i: [], // images
            r: []  // rounds
        };

        const modeEnum = {'normal': 0, 'mirror': 1, 'inverted': 2, 'fragmented': 3};
        const gridEnum = {'random': 0, '2x2': 1, '2x3': 2, '3x3': 3};

        roundElements.forEach(roundEl => {
            challengeData.i.push(parseInt(roundEl.dataset.trackIndex, 10));

            const mode = roundEl.querySelector('.challenge-mode-selector').value;

            const roundConfig = {
                // Mode
                m: modeEnum[mode],
                // Options
                mt: (mode === 'mirror' && roundEl.querySelector('.mi-track').checked) ? 1 : 0,
                mm: (mode === 'mirror' && roundEl.querySelector('.mi-map').checked) ? 1 : 0,
                it: (mode === 'inverted' && roundEl.querySelector('.mi-track').checked) ? 1 : 0,
                im: (mode === 'inverted' && roundEl.querySelector('.mi-map').checked) ? 1 : 0,
                is: (mode === 'inverted' && roundEl.querySelector('.mi-site').checked) ? 1 : 0,
                // Fragment
                fc: parseInt(roundEl.querySelector('.frag-cost').value, 10),
                fg: gridEnum[roundEl.querySelector('.frag-grid').value],
                fi: parseInt(roundEl.querySelector('.frag-initial').value, 10),
                // Timer
                te: roundEl.querySelector('.timer-enable').checked ? 1 : 0,
                td: parseInt(roundEl.querySelector('.timer-duration').value, 10),
                // Fade
                fe: roundEl.querySelector('.fade-enable').checked ? 1 : 0,
                fd: parseInt(roundEl.querySelector('.fade-duration').value, 10),
            };
            challengeData.r.push(roundConfig);
        });

        const code = encodeChallenge(challengeData);
        if (code) {
            elements.challengeResultContainer.hidden = false;
            elements.challengeCodeOutput.value = code;
            const url = new URL(window.location.href);
            url.searchParams.set('challenge', code);
            elements.challengeLinkOutput.value = url.toString();
        } else {
            alert("Failed to generate challenge code. Please check console for errors.");
        }
    });

    const checkUrlForChallenge = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const challengeCode = urlParams.get('challenge');
        if (challengeCode) {
            history.pushState({}, document.title, window.location.pathname); // Clean URL
            const urlSafeCode = challengeCode.replace(/-/g, '+').replace(/_/g, '/');
            game.startFromChallengeCode(urlSafeCode);
        }
    };
    
    // Auto-fill and start from URL param
    checkUrlForChallenge();
    populateImageGrid();
    updateSelectedRoundsUI();
}