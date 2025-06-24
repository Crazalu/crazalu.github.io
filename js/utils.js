// js/utils.js

// LocalStorage and Data Helpers
const USED_IMAGES_KEY = 'marioKartGeoGuessr_usedImages';
const PRACTICE_UNLOCKS_KEY = 'marioKartGeoGuessr_practiceUnlocks';
const LEADERBOARD_KEY = 'marioKartGeoGuessr_leaderboard';
const THEME_KEY = 'marioKartGeoGuessr_theme';
const CUSTOM_COLOR_KEY = 'marioKartGeoGuessr_customColor';
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

// Randomization and Hashing
const generateDataHash = (data) => JSON.stringify(data).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);

function mulberry32(seed) {
  let a = typeof seed === 'string' ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0) : seed;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function seededShuffle(array, seed) {
  const r = mulberry32(seed);
  const c = [...array];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

// --- NEW, SIMPLIFIED CHALLENGE CODE FUNCTIONS ---

function encodeChallenge(config) {
    try {
        const jsonString = JSON.stringify(config);
        // btoa() creates a Base64 encoded string from a binary string.
        return btoa(jsonString);
    } catch (error) {
        console.error("Failed to encode challenge:", error);
        return null;
    }
}

function decodeChallenge(encodedString) {
    try {
        // atob() decodes a Base64 encoded string.
        const jsonString = atob(encodedString);
        if (!jsonString) return null;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to decode or parse challenge string. It might be invalid or corrupt.", error);
        return null;
    }
}