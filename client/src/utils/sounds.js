/**
 * sounds.js — Web Audio API synthesized sound effects.
 * No external files needed. All sounds are generated procedurally.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Play a short tone burst */
function tone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (e) {
    // Silently ignore if audio is not available
  }
}

/** Soft click / thud when placing a block */
export function playPlaceSound() {
  tone(220, 0.08, 'triangle', 0.2);
  tone(110, 0.12, 'sine', 0.1, 0.04);
}

/**
 * Chime when line(s) are cleared.
 * linesCleared: number of lines (1–16 for an 8x8 grid)
 */
export function playClearSound(linesCleared = 1) {
  // Ascending arpeggio — higher/faster for more lines
  const baseNotes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  const count = Math.min(linesCleared + 1, baseNotes.length);
  const interval = linesCleared > 2 ? 0.07 : 0.1;

  for (let i = 0; i < count; i++) {
    tone(baseNotes[i], 0.25, 'sine', 0.3, i * interval);
  }

  // Extra sparkle on big clears (3+)
  if (linesCleared >= 3) {
    tone(2093, 0.3, 'sine', 0.15, count * interval);
  }
}

/** Descending sad tone when game is over */
export function playGameOverSound() {
  tone(440, 0.2, 'sine', 0.3, 0);
  tone(330, 0.2, 'sine', 0.3, 0.25);
  tone(220, 0.4, 'sine', 0.35, 0.5);
  tone(165, 0.6, 'sine', 0.3, 0.9);
}

/** Victory fanfare */
export function playWinSound() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => tone(f, 0.18, 'triangle', 0.28, i * 0.1));
}
