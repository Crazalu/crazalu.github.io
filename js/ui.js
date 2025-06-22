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
      // Before starting, ensure user has selected a game mode for the custom game
      if (elements.modeSelector.value === "") {
        alert("Please select a game mode for your custom game first!");
        return;
      }
      game.setupGameSettings(); // Apply settings from main menu
      game.startCustomGame(selectedTracks);
    }
  });

  populateCustomGrid();
}