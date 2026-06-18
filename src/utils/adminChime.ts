let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  return audioContext;
}

/**
 * Premium synthetic chime via Web Audio API — no external assets required.
 */
export function playNewOrderChime(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  const notes = [
    { freq: 880, type: 'sine' as OscillatorType, start: 0, dur: 0.28 },
    { freq: 1174.66, type: 'triangle' as OscillatorType, start: 0.1, dur: 0.32 },
    { freq: 1567.98, type: 'sine' as OscillatorType, start: 0.2, dur: 0.45 },
  ];

  notes.forEach(({ freq, type, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  });

  void ctx.resume();
}
