// ─── Persistence ───────────────────────────────────────────────
const savedData = JSON.parse(localStorage.getItem("savedData")) || {};

function saveData() {
  localStorage.setItem(
    "savedData",
    JSON.stringify({
      quoteText: savedQuoteText,
      quoteAuthor: savedQuoteAuthor,
      sessionCount,
    }),
  );
}

// ─── Constants ─────────────────────────────────────────────────
const POMODORO_DEFAULT = 1500;
const BREAK_DEFAULT = 300;
const LONG_BREAK_DEFAULT = 900;
const ADJUST_STEP = 300;

// ─── Audio ─────────────────────────────────────────────────────
const breakSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3",
);
const workSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3",
);
const longBreakSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2320/2320-preview.mp3",
);

// ─── DOM Elements ──────────────────────────────────────────────
const quoteEl = document.getElementById("quote-OTD");
const sections = document.getElementById("timer-break-sections");
const timerEl = document.getElementById("timer-string");
const start = document.getElementById("start");
const summary = document.getElementById("summary");
const increment = document.getElementById("increment");
const decrement = document.getElementById("decrement");
const reset = document.getElementById("reset-btn");
const timer = document.getElementById("timer");
const breakShort = document.getElementById("break");
const breakLong = document.getElementById("long-break");
const buttons = document.querySelectorAll("#timer-break-sections button");

// ─── Dynamic Elements ──────────────────────────────────────────
const pause = document.createElement("button");
const resume = document.createElement("button");
const stop = document.createElement("button");
const message = document.createElement("p");

pause.className = "pause";
pause.innerText = "pause";
resume.className = "resume";
resume.innerText = "resume";
stop.className = "stop";
stop.innerText = "stop";
message.className = "message";
message.id = "message";

// ─── State ─────────────────────────────────────────────────────
let timeInSec = POMODORO_DEFAULT;
let originalTime = timeInSec;
let intervalId;
let quoteInterval;
let currentSection = "timer";
let sessionCount = savedData.sessionCount || 0;
let savedQuoteText = savedData.quoteText || null;
let savedQuoteAuthor = savedData.quoteAuthor || null;

// ─── Mode Helpers ──────────────────────────────────────────────
const MODES = {
  timer: { class: "pomodoro-mode", sound: null, message: "Time to focus!" },
  breakShort: {
    class: "break-mode",
    sound: breakSound,
    message: "Time to rest!",
  },
  breakLong: {
    class: "long-break-mode",
    sound: longBreakSound,
    message: "Time for a break!",
  },
};
const ALL_MODE_CLASSES = ["pomodoro-mode", "break-mode", "long-break-mode"];

function applyMode(modeKey) {
  const mode = MODES[modeKey];
  document.body.classList.remove(...ALL_MODE_CLASSES);
  document.body.classList.add(mode.class);
  message.innerHTML = mode.message;
  if (mode.sound) mode.sound.play();
  if (!message.parentNode) summary.after(message);
}

// ─── Quote ─────────────────────────────────────────────────────
function renderQuote(text, author, prefix = "") {
  quoteEl.innerHTML = `<p class="quote">${text}</p><p class="author">${prefix}${author}</p>`;
}

async function getQuoteApi() {
  try {
    const response = await fetch("https://dummyjson.com/quotes/random");
    if (!response.ok) return;
    const { quote: text, author } = await response.json();
    savedQuoteText = text;
    savedQuoteAuthor = author;
    renderQuote(text, author);
  } catch (err) {
    console.error("Failed to fetch quote:", err);
  }
  saveData();
}

if (savedQuoteText && savedQuoteAuthor) {
  renderQuote(savedQuoteText, savedQuoteAuthor, "-");
} else {
  getQuoteApi();
}
quoteInterval = setInterval(getQuoteApi, 1000 * 60 * 60);

// ─── Display ───────────────────────────────────────────────────
function updateDisplay() {
  const min = Math.floor(timeInSec / 60);
  const sec = timeInSec % 60;
  timerEl.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  summary.textContent = `session: #${sessionCount}`;
}

// ─── Timer Core ────────────────────────────────────────────────
function timerCountDown() {
  if (--timeInSec < 0) {
    if (currentSection === "timer") sessionCount++;
    clearInterval(intervalId);
    pause.remove();
    resume.remove();
    stop.replaceWith(start);
    updateDisplay();
    handleSessions();
    return;
  }
  updateDisplay();
  saveData();
}

function resetTimer() {
  clearInterval(intervalId);
  pause.remove();
  resume.remove();
  stop.replaceWith(start);
}

function startTimer() {
  start.replaceWith(pause, stop);
  if (message.parentNode) message.remove();
  intervalId = setInterval(timerCountDown, 1000);
}

// ─── Session Routing ───────────────────────────────────────────
const sectionTimes = {
  timer: POMODORO_DEFAULT,
  break: BREAK_DEFAULT,
  "long-break": LONG_BREAK_DEFAULT,
};

function handleSessions() {
  if (currentSection === "timer") {
    const isLongBreak = sessionCount % 2 === 0 && sessionCount !== 0;
    currentSection = isLongBreak ? "long-break" : "break";
    timeInSec = originalTime = isLongBreak ? LONG_BREAK_DEFAULT : BREAK_DEFAULT;
    applyMode(isLongBreak ? "breakLong" : "breakShort");
    startTimer();
  } else if (currentSection === "break") {
    currentSection = "timer";
    timeInSec = originalTime = POMODORO_DEFAULT;
    applyMode("timer");
    workSound.play();
    startTimer();
  } else if (currentSection === "long-break") {
    currentSection = "timer";
    timeInSec = originalTime = POMODORO_DEFAULT;
    message.innerHTML = "Time to focus!";
    if (!message.parentNode) summary.after(message);
    document.body.classList.remove(...ALL_MODE_CLASSES);
    document.body.classList.add("pomodoro-mode");
    clearInterval(intervalId);
  }
  updateDisplay();
  saveData();
}

// ─── Event Listeners ───────────────────────────────────────────
start.addEventListener("click", () => {
  const modeMap = {
    timer: "timer",
    break: "breakShort",
    "long-break": "breakLong",
  };
  startTimer();
  applyMode(modeMap[currentSection]);
  saveData();
});

pause.addEventListener("click", () => {
  pause.replaceWith(resume);
  clearInterval(intervalId);
  saveData();
});

resume.addEventListener("click", () => {
  resume.replaceWith(pause);
  intervalId = setInterval(timerCountDown, 1000);
  saveData();
});

stop.addEventListener("click", () => {
  resetTimer();
  timeInSec = originalTime;
  updateDisplay();
  saveData();
});

reset.addEventListener("click", () => {
  resetTimer();
  sessionCount = 0;
  currentSection = "timer";
  timeInSec = POMODORO_DEFAULT;
  document.body.classList.remove(...ALL_MODE_CLASSES);
  updateDisplay();
  saveData();
});

sections.addEventListener("click", (e) => {
  const newTime = sectionTimes[e.target.id];
  if (!newTime) return;
  resetTimer();
  timeInSec = originalTime = newTime;
  currentSection = e.target.id;
  updateDisplay();
  saveData();
});

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

increment.addEventListener("click", () => {
  timeInSec = originalTime = timeInSec + ADJUST_STEP;
  updateDisplay();
  saveData();
});

decrement.addEventListener("click", () => {
  if (timeInSec <= ADJUST_STEP) return;
  timeInSec = originalTime = timeInSec - ADJUST_STEP;
  updateDisplay();
  saveData();
});

// ─── Init ──────────────────────────────────────────────────────
updateDisplay();
