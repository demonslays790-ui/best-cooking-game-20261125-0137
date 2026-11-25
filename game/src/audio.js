// Sizzle & Serve — audio.js
// One job: every sound the game makes, synthesised live with WebAudio.
// No audio files, no network: oscillators and filtered noise only.

let ctx = null;
let muted = false;
let sizzleNodes = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopSizzle();
  return muted;
}

export function isMuted() {
  return muted;
}

// A short tone with a pitch slide and a quick fade.
function blip(freqA, freqB, dur, type, vol) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqA, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A burst of filtered noise, for chops, sizzles and pops.
function noiseBurst(dur, filterFreq, vol, type = 'bandpass') {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t);
}

export const sfx = {
  pickup() { blip(520, 760, 0.09, 'sine', 0.16); },
  place() { blip(300, 210, 0.08, 'triangle', 0.16); },
  chop() { noiseBurst(0.09, 2400, 0.28); blip(180, 90, 0.06, 'square', 0.08); },
  chopDone() { blip(660, 990, 0.14, 'sine', 0.18); blip(990, 1320, 0.12, 'sine', 0.12); },
  cookDone() { blip(740, 1108, 0.16, 'sine', 0.18); },
  burn() { noiseBurst(0.4, 300, 0.2, 'lowpass'); blip(220, 110, 0.35, 'sawtooth', 0.1); },
  serve() {
    blip(523, 523, 0.12, 'sine', 0.18);
    setTimeout(() => blip(659, 659, 0.12, 'sine', 0.18), 90);
    setTimeout(() => blip(784, 784, 0.2, 'sine', 0.2), 180);
  },
  wrong() { blip(220, 160, 0.22, 'sawtooth', 0.12); },
  tick() { blip(980, 980, 0.05, 'square', 0.06); },
  orderIn() { blip(392, 523, 0.12, 'triangle', 0.14); },
  lost() { blip(330, 196, 0.4, 'triangle', 0.14); },
  click() { blip(700, 700, 0.04, 'sine', 0.1); },
  rush() {
    blip(440, 660, 0.18, 'square', 0.1);
    setTimeout(() => blip(660, 880, 0.22, 'square', 0.1), 160);
  },
};

// A looping stove sizzle while at least one patty is cooking: white noise
// through a low-pass filter, started once and stopped when the stove is empty.
export function startSizzle() {
  if (muted || sizzleNodes) return;
  const ac = ensureCtx();
  if (!ac) return;
  const len = ac.sampleRate;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3200;
  const gain = ac.createGain();
  gain.gain.value = 0.05;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
  sizzleNodes = { src, gain };
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try { sizzleNodes.src.stop(); } catch (e) { /* already stopped */ }
  sizzleNodes = null;
}
