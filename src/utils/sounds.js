// src/utils/sounds.js
// Sprint 3 — Sons do baba usando Web Audio API (sem dependência externa).
// Gera tons sintéticos quando não há arquivo; usa /public/sounds/*.mp3 quando existir.

let ctx = null;

const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

// Tom sintético simples (fallback quando não há MP3)
const beep = (freq = 440, duration = 0.15, type = 'sine', gain = 0.3) => {
  try {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const gn  = ac.createGain();
    osc.connect(gn);
    gn.connect(ac.destination);
    osc.frequency.value = freq;
    osc.type            = type;
    gn.gain.setValueAtTime(gain, ac.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch {}
};

// Tenta tocar arquivo MP3; fallback para síntese se falhar
const playFile = async (path, fallbackFn) => {
  try {
    const audio = new Audio(path);
    audio.volume = 0.6;
    await audio.play();
  } catch {
    fallbackFn?.();
  }
};

export const Sounds = {
  goal: () => playFile('/sounds/goal.mp3', () => {
    beep(523, 0.1); // C5
    setTimeout(() => beep(659, 0.1), 100); // E5
    setTimeout(() => beep(784, 0.2), 200); // G5
  }),

  whistle: () => playFile('/sounds/whistle.mp3', () => {
    beep(1200, 0.3, 'sawtooth', 0.2);
  }),

  win: () => playFile('/sounds/win.mp3', () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => beep(f, 0.15), i * 100)
    );
  }),

  click: () => beep(800, 0.05, 'square', 0.1),

  unlock: () => {
    [659, 784, 988].forEach((f, i) =>
      setTimeout(() => beep(f, 0.12), i * 80)
    );
  },

  mvp: () => playFile('/sounds/mvp.mp3', () => {
    [784, 880, 988, 1047].forEach((f, i) =>
      setTimeout(() => beep(f, 0.18), i * 90)
    );
  }),
};
