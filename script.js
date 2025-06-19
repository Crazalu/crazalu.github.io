let gameSeed = null;

function getUsedImages() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('usedImages='));
  return cookie ? JSON.parse(decodeURIComponent(cookie.split('=')[1])) : [];
}

function setUsedImages(list) {
  document.cookie = "usedImages=" + encodeURIComponent(JSON.stringify(list)) + "; path=/";
}

function clearUsedImages() {
  document.cookie = "usedImages=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Basic seeded RNG (Mulberry32)
function mulberry32(seed) {
  let a = typeof seed === 'string'
    ? Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : seed;

  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seed) {
  const rand = mulberry32(seed);
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

document.addEventListener("DOMContentLoaded", () => {
const tracks = [
  { image: "images/img1.webp",  mapX: 1349,  mapY: 450 },
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
  { image: "images/img16.webp", mapX: 700,  mapY: 1300, enabled: false },
  { image: "images/img17.webp", mapX: 1150, mapY: 500,  enabled: false },
  { image: "images/img18.webp", mapX: 1550, mapY: 650,  enabled: false },
  { image: "images/img19.webp", mapX: 1350, mapY: 800,  enabled: false },
  { image: "images/img20.webp", mapX: 950,  mapY: 1200, enabled: false },
  { image: "images/img21.webp", mapX: 1250, mapY: 600,  enabled: false },
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


  const MAX_ROUNDS = 5;
  let gameSeed, shuffledTracks, currentTrack;
  let score = 0, round = 0, pendingGuess = null;

  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");
  const gameUI = document.getElementById("game");
  const trackWrapper = document.getElementById("track-wrapper");
  const trackContainer = document.getElementById("track-container");
  const trackImage = document.getElementById("track-image");
  const confirmBtn = document.getElementById("confirm-btn");
  const nextBtn = document.getElementById("next-btn");
  const restartBtn = document.getElementById("restart-btn");
  const roundDisplay = document.getElementById("round-display");
  const scoreDisplay = document.getElementById("score-display");
  const resultText = document.getElementById("result");

  const mapWrapper = document.getElementById("map-wrapper");
  const mapContainer = document.getElementById("map-container");
  const markerGuess = document.getElementById("marker-guess");
  const markerPlayer = document.getElementById("marker-player");
  const markerAnswer = document.getElementById("marker-answer");
  const guessLine = document.getElementById("guess-line").querySelector("line");

  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seed) {
    const rand = mulberry32(typeof seed==="string"
      ? Array.from(seed).reduce((a,c)=>a+c.charCodeAt(0),0)
      : seed);
    const a = [...arr];
    for (let i = a.length-1; i>0; i--) {
      const j = Math.floor(rand()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function loadTrack() {
    currentTrack = shuffledTracks[round];
    trackImage.src = currentTrack.image;
    markerGuess.style.display=markerPlayer.style.display=markerAnswer.style.display="none";
    guessLine.style.display="none";
    confirmBtn.style.display="none";
    nextBtn.style.display="none";
    pendingGuess = null;
    roundDisplay.textContent = `Round ${round+1} / ${MAX_ROUNDS}`;
  }

  startBtn.onclick = () => {
    const seedVal = document.getElementById("seed").value;
    gameSeed = seedVal || Math.floor(Math.random()*100000);
    const enabledTracks = tracks.filter(t => t.enabled !== false);
    shuffledTracks = seededShuffle(enabledTracks, gameSeed).slice(0, MAX_ROUNDS);    score = round = 0;
    scoreDisplay.textContent = "Score: 0";
    menu.style.display="none"; gameUI.style.display="block";
    loadTrack();
  };

  nextBtn.onclick = () => {
    round++;
    if (round<MAX_ROUNDS) loadTrack();
    nextBtn.style.display="none";
  };

  restartBtn.onclick = () => { startBtn.click(); };

  // Track pan/zoom
  let tScale=1, tO= {x:0,y:0}, tDown=false, tPrev={x:0,y:0};
  function updateTrack() {
    tO.x = Math.min(Math.max(tO.x, -(600*(tScale-1))).toFixed(2), 0);
    tO.y = Math.min(Math.max(tO.y, -(400*(tScale-1))).toFixed(2), 0);
    trackContainer.style.transform=`scale(${tScale}) translate(${tO.x}px,${tO.y}px)`;
  }
  trackWrapper.addEventListener("wheel", e => {
    e.preventDefault();
    const old=tScale;
    tScale = Math.min(Math.max(tScale + (e.deltaY<0?0.1:-0.1),1),3);
    const rect=trackWrapper.getBoundingClientRect(),
          mx=e.clientX-rect.left, my=e.clientY-rect.top,
          owl=(mx/old)-tO.x, oyl=(my/old)-tO.y;
    tO.x -= owl-owl*(old/tScale);
    tO.y -= oyl-oyl*(old/tScale);
    updateTrack();
  });
  trackWrapper.addEventListener("mousedown", e => {
    tDown=true, tPrev={x:e.clientX,y:e.clientY};
  });
  document.addEventListener("mousemove", e => {
    if(!tDown) return;
    tO.x += (e.clientX - tPrev.x)/tScale;
    tO.y += (e.clientY - tPrev.y)/tScale;
    tPrev={x:e.clientX,y:e.clientY}; updateTrack();
  });
  document.addEventListener("mouseup", ()=>tDown=false);

  // Map pan/zoom
  let mScale=1, mO={x:0,y:0}, mDown=false, mPrev={x:0,y:0};
  function updateMap() {
    const maxX = -(1900*mScale -950),
          maxY = -(1661*mScale -830);
    mO.x = Math.min(Math.max(mO.x, maxX),0);
    mO.y = Math.min(Math.max(mO.y, maxY),0);
    mapContainer.style.transform=`scale(${mScale}) translate(${mO.x}px,${mO.y}px)`;
  }
  mapWrapper.addEventListener("wheel", e => {
    e.preventDefault();
    const old=mScale;
    mScale = Math.min(Math.max(mScale + (e.deltaY<0?0.1:-0.1),1),3);
    const rect=mapWrapper.getBoundingClientRect(),
          mx=e.clientX-rect.left, my=e.clientY-rect.top,
          owl=(mx/old)-mO.x, oyl=(my/old)-mO.y;
    mO.x -= owl-owl*(old/mScale);
    mO.y -= oyl-oyl*(old/mScale);
    updateMap();
  });
  mapWrapper.addEventListener("mousedown", e => {
    mDown=true; mPrev={x:e.clientX,y:e.clientY};
  });
  document.addEventListener("mousemove", e => {
    if(!mDown) return;
    mO.x += (e.clientX - mPrev.x)/mScale;
    mO.y += (e.clientY - mPrev.y)/mScale;
    mPrev={x:e.clientX,y:e.clientY}; updateMap();
  });
  document.addEventListener("mouseup", ()=>mDown=false);

  // Guess click
  mapWrapper.addEventListener("click", e => {
    const rect=mapWrapper.getBoundingClientRect(),
          cx=e.clientX-rect.left, cy=e.clientY-rect.top,
          gx = (cx/mScale) - mO.x,
          gy = (cy/mScale) - mO.y;
    pendingGuess = {x: gx, y: gy};
    markerGuess.style.left=`${gx}px`; markerGuess.style.top=`${gy}px`;
    markerGuess.style.display="block"; confirmBtn.style.display="inline-block";
  });

  confirmBtn.onclick = () => {
    if(!pendingGuess) return;
    const dx=pendingGuess.x-currentTrack.mapX,
          dy=pendingGuess.y-currentTrack.mapY,
          dist=Math.hypot(dx,dy);
    let pts=0;
    if(dist<=5) pts=100;
    else if(dist<=100) pts=Math.round(100-dist);
    score+=pts; scoreDisplay.textContent=`Score: ${score}`;
    resultText.textContent=`Distance: ${Math.round(dist)}px | +${pts} pts`;
    markerPlayer.style.left=`${pendingGuess.x}px`;
    markerPlayer.style.top=`${pendingGuess.y}px`; markerPlayer.style.display="block";
    markerAnswer.style.left=`${currentTrack.mapX}px`;
    markerAnswer.style.top=`${currentTrack.mapY}px`; markerAnswer.style.display="block";
    guessLine.setAttribute("x1", currentTrack.mapX);
    guessLine.setAttribute("y1", currentTrack.mapY);
    guessLine.setAttribute("x2", pendingGuess.x);
    guessLine.setAttribute("y2", pendingGuess.y);
    guessLine.style.display="block";
    confirmBtn.style.display="none";
    nextBtn.style.display=(round<MAX_ROUNDS-1?"inline-block":"none");
    restartBtn.style.display=(round>=MAX_ROUNDS-1?"inline-block":"none");
  };
});
