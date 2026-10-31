/* ── Audio: synthesized sound effects (WebAudio), generative music, narrator voice + subtitle hook ──
   Nothing is created until AUD.unlock() (first user gesture). ?sessiz → no AudioContext ever, but narrator
   lines still drive AUD.onSubtitle with (recorded or estimated) durations. Only global: AUD. */
const AUD = (() => {
  'use strict';
  const QUIET = typeof SILENT !== 'undefined' ? SILENT : /[?&]sessiz(&|=|$)/.test(location.search);
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const semi = s => Math.pow(2, s / 12);
  const wallNow = () => performance.now() / 1000;

  // soundOn = sound effects only. The narrator has its own flag (voiceOn), never exposed in the kid-facing UI:
  // it is the only guidance a non-reader gets, so an accidental 'Ses' tap must not silence it.
  const A = { musicOn: true, soundOn: true, voiceOn: true, onSubtitle: null, LINES: {}, theme: null, current: null };
  let ctx = null, M = null, unlocked = false, want = null, lx = 0, lz = 0, dimmed = false;

  // ───────────────────────── mixer ─────────────────────────
  const MUSIC_VOL = 0.28, SFX_VOL = 0.8, VOICE_VOL = 1.0, DUCK = 0.3, DIM = 0.35;
  const musicLevel = () => (A.musicOn ? MUSIC_VOL * (dimmed ? DIM : 1) : 0);
  function gainNode(c, v) { const g = c.createGain(); g.gain.value = v; return g; }
  function wave(c, amps) {
    const n = amps.length + 1, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 0; i < amps.length; i++) im[i + 1] = amps[i];
    return c.createPeriodicWave(re, im);
  }
  // Soft room: decorrelated stereo noise, exponential decay, getting darker over time, a few early reflections.
  function makeIR(c, secs = 1.9) {
    const sr = c.sampleRate, n = Math.floor(sr * secs), b = c.createBuffer(2, n, sr), pre = Math.floor(sr * 0.012);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = pre; i < n; i++) {
        const x = (i - pre) / (n - pre);
        lp += (Math.random() * 2 - 1 - lp) * (0.75 - 0.62 * x);
        d[i] = lp * Math.exp(-x * 6.5);
      }
      const taps = ch ? [0.019, 0.034, 0.047] : [0.023, 0.029, 0.041];
      taps.forEach((tt, k) => { const i = Math.floor(sr * tt); if (i < n) d[i] += (0.5 - k * 0.12) * (k & 1 ? -1 : 1); });
    }
    return b;
  }
  function makeMix(c, full, raw) {
    const m = { c };
    m.out = gainNode(c, 0.95); m.out.connect(c.destination);
    const lim = c.createDynamicsCompressor();   // brick-wall-ish safety limiter
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.09;
    lim.connect(m.out);
    const comp = c.createDynamicsCompressor();  // glue: many sounds at once stay smooth
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(lim);
    const hp = c.createBiquadFilter();   // nothing below ~45 Hz: inaudible on tablet speakers, only eats headroom
    hp.type = 'highpass'; hp.frequency.value = 45; hp.Q.value = 0.7; hp.connect(raw ? m.out : comp);
    m.master = gainNode(c, 0.85); m.master.connect(hp);
    m.verb = c.createConvolver(); m.verb.buffer = makeIR(c);
    const vret = gainNode(c, 0.8); m.verb.connect(vret); vret.connect(m.master);
    m.sfx = gainNode(c, full || A.soundOn ? SFX_VOL : 0); m.sfx.connect(m.master);
    const ss = gainNode(c, 0.16); m.sfx.connect(ss); ss.connect(m.verb);
    m.duck = gainNode(c, 1); m.duck.connect(m.master);
    const ms = gainNode(c, 0.34); m.duck.connect(ms); ms.connect(m.verb);
    m.music = gainNode(c, full ? MUSIC_VOL : musicLevel()); m.music.connect(m.duck);
    m.voice = gainNode(c, full || A.voiceOn ? VOICE_VOL : 0); m.voice.connect(m.master);
    const vs = gainNode(c, 0.05); m.voice.connect(vs); vs.connect(m.verb);
    const nb = c.createBuffer(1, Math.floor(c.sampleRate * 3), c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    m.noise = nb;
    m.waves = {
      sq: wave(c, [1, 0, 0.33, 0, 0.17, 0, 0.09, 0, 0.045, 0, 0.02]),
      saw: wave(c, [1, 0.5, 0.3, 0.2, 0.13, 0.09, 0.06, 0.04, 0.025, 0.015]),
      brass: wave(c, [1, 0.8, 0.55, 0.38, 0.25, 0.16, 0.1, 0.06, 0.035, 0.02]),
      flute: wave(c, [1, 0.16, 0.05, 0.015]),
      rec: wave(c, [1, 0.1, 0.18, 0.035, 0.05, 0.012, 0.012]),   // recorder: pure, a touch of odd "woodiness"
    };
    return m;
  }

  // ───────────────────────── synthesis primitives (all take a mix so they also render offline) ─────────────────────────
  function curve(prm, t, pts, step) {
    prm.setValueAtTime(pts[0][1], t + pts[0][0]);
    for (let i = 1; i < pts.length; i++) {
      const tt = t + pts[i][0], v = Math.max(1e-4, pts[i][1]);
      if (step) prm.setValueAtTime(v, tt); else prm.exponentialRampToValueAtTime(v, tt);
    }
  }
  // Percussive (exp decay to -60 dB at t+dur) or held (hold=1: attack, sustain, linear release) envelope.
  function env(prm, t, a, vol, dur, hold, rel) {
    a = Math.min(a, dur * 0.5);
    prm.setValueAtTime(0, t);
    prm.linearRampToValueAtTime(vol, t + a);
    if (hold) { const r = Math.min(rel || 0.08, dur - a); prm.setValueAtTime(vol, t + dur - r); prm.linearRampToValueAtTime(0, t + dur); }
    else prm.exponentialRampToValueAtTime(Math.max(1e-6, vol * 1e-3), t + dur);
  }
  // Oscillator voice. o: {f1, glide, fs:[[dt,f]..], step, type, wave, det, a, hold, rel, vib:[hz,cents,delay], lp|hp|bp: f or [[dt,f]..], q}
  function T(m, out, t, f, dur, vol, o) {
    o = o || {};
    const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), end = t + dur + 0.03;   // gain starts at 0: no first-sample click
    if (o.wave) os.setPeriodicWave(m.waves[o.wave]); else os.type = o.type || 'sine';
    if (o.fs) curve(os.frequency, t, o.fs, o.step);
    else { os.frequency.setValueAtTime(f, t); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || dur)); }
    if (o.det) os.detune.setValueAtTime(o.det, t);
    if (o.vib && dur > (o.vib[2] || 0.08)) {
      const l = c.createOscillator(), lg = gainNode(c, 0);
      l.frequency.value = o.vib[0];
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] || 0.08));
      l.connect(lg); lg.connect(os.detune); l.start(t); l.stop(end);
    }
    let n = os;
    const ff = o.lp || o.hp || o.bp;
    if (ff) {
      const bq = c.createBiquadFilter();
      bq.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass'; bq.Q.value = o.q ?? 0.7;
      if (Array.isArray(ff)) curve(bq.frequency, t, ff); else bq.frequency.setValueAtTime(ff, t);
      os.connect(bq); n = bq;
    }
    env(g.gain, t, o.a ?? 0.004, vol, dur, o.hold, o.rel);
    n.connect(g); g.connect(out);
    os.start(t); os.stop(end);
  }
  // Filtered noise. o: {type='bandpass', f, f1, fs, q, a, hold, rel, am:[hz, depth]}
  function N(m, out, t, dur, vol, o) {
    o = o || {};
    const c = m.c, s = c.createBufferSource(), bq = c.createBiquadFilter(), g = gainNode(c, 0);
    s.buffer = m.noise;
    bq.type = o.type || 'bandpass'; bq.Q.value = o.q ?? 1;
    if (o.fs) curve(bq.frequency, t, o.fs);
    else { bq.frequency.setValueAtTime(o.f || 1000, t); if (o.f1) bq.frequency.exponentialRampToValueAtTime(o.f1, t + dur); }
    env(g.gain, t, o.a ?? 0.003, vol, dur, o.hold, o.rel);
    s.connect(bq); bq.connect(g);
    if (o.am) {
      const a = gainNode(c, 1 - o.am[1] * 0.5), l = c.createOscillator(), lg = gainNode(c, o.am[1] * 0.5);
      l.frequency.value = o.am[0]; l.connect(lg); lg.connect(a.gain); g.connect(a); a.connect(out);
      l.start(t); l.stop(t + dur + 0.03);
    } else g.connect(out);
    s.start(t, rnd(0, Math.max(0, m.noise.duration - dur - 0.1)), dur + 0.03);
  }
  // FM bell: ratio 3.5 = glassy twinkle, 4 = music box / celesta.
  function B(m, out, t, f, dur, vol, ratio = 3.5, idx = 1.2) {
    const c = m.c, car = c.createOscillator(), mod = c.createOscillator(), mg = gainNode(c, 0), g = gainNode(c, 0), end = t + dur + 0.03;
    car.frequency.setValueAtTime(f, t); mod.frequency.setValueAtTime(Math.min(f * ratio, 18000), t);
    mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    env(g.gain, t, 0.002, vol, dur);
    car.connect(g); g.connect(out);
    car.start(t); mod.start(t); car.stop(end); mod.stop(end);
  }
  const arp = (m, o, t, fs, gap, dur, vol, p, ratio = 4, idx = 0.8) => fs.forEach((f, i) => B(m, o, t + i * gap, f * p, dur, vol, ratio, idx));
  const sparkle = (m, o, t, n, f0, f1, span, vol) => { for (let i = 0; i < n; i++) B(m, o, t + span * i / n, f0 * Math.pow(f1 / f0, i / (n - 1)) * rnd(0.98, 1.02), 0.35, vol * rnd(0.7, 1), 3.5, 0.9); };
  // Lightsaber voice: two slightly detuned buzzy saws + a quiet octave square, a "projector" flutter (AM) for the grit,
  // through a resonant lowpass (kept ≤ ~3.5 kHz so it stays soft). fs / lp are [[dt, value]..] curves: a swing is the
  // doppler "vvzzum" = pitch and brightness up, then down. o: {a, rel, hold (0 = percussive), q, flutter (Hz), buzz (0..0.5)}
  // A gentle high-pass thins the fundamental: tablet speakers cannot play it anyway, it would only eat headroom.
  function saber(m, out, t, dur, vol, fs, lp, o) {
    o = o || {};
    const c = m.c, g = gainNode(c, 0), bq = c.createBiquadFilter(), hp = c.createBiquadFilter(), end = t + dur + 0.03, bz = o.buzz ?? 0.28;
    bq.type = 'lowpass'; bq.Q.value = o.q ?? 3; curve(bq.frequency, t, lp);
    hp.type = 'highpass'; hp.Q.value = 0.6; hp.frequency.value = o.hp || 130; bq.connect(hp);
    const am = gainNode(c, 1 - bz), l = c.createOscillator(), lg = gainNode(c, bz);
    l.frequency.value = o.flutter || 36; l.connect(lg); lg.connect(am.gain);
    for (const [mul, det, w, v] of [[1, 0, 'saw', 1], [1, 11, 'saw', 0.75], [2, -5, 'sq', 0.22]]) {
      const os = c.createOscillator(), og = gainNode(c, v);
      os.setPeriodicWave(m.waves[w]); os.detune.value = det;
      curve(os.frequency, t, fs.map(([a, f]) => [a, f * mul]));
      os.connect(og); og.connect(bq); os.start(t); os.stop(end);
    }
    hp.connect(am); am.connect(g);
    if (o.hold === 0) env(g.gain, t, o.a ?? 0.003, vol, dur);
    else env(g.gain, t, o.a ?? 0.05, vol, dur, 1, o.rel ?? 0.12);
    g.connect(out); l.start(t); l.stop(end);
  }
  // A few tiny random crackles (the electric "zzkt" of a lightsaber touching something), bandpassed so they never get shrill.
  const crackle = (m, o, t, n, span, vol, p) => { for (let i = 0; i < n; i++) N(m, o, t + rnd(0, span), 0.016, vol * rnd(0.6, 1), { f: rnd(1500, 3200) * p, q: 2.5, a: 0.001 }); };

  // ───────────────────────── sound effects (return length in seconds) ─────────────────────────
  // All soft and cartoony: sine bonks, filtered-noise whooshes, little bell arpeggios. p = pitch multiplier.
  const SFX = {
    // ── lightsaber (every weapon is an ışın kılıcı): "vvzzum" swings, crackly zap + soft thump on hit, ignite / retract.
    // Only short one-shots: there is deliberately no constant hum while walking around.
    swing(m, o, t, p) {
      saber(m, o, t, 0.3, 0.22, [[0, 100 * p], [0.12, 165 * p], [0.3, 105 * p]], [[0, 560], [0.12, 2700], [0.3, 700]], { a: 0.06, rel: 0.15 });
      N(m, o, t, 0.28, 0.2, { fs: [[0, 480 * p], [0.12, 1900 * p], [0.28, 650 * p]], q: 1.2, a: 0.08 }); return 0.33;
    },
    swingBig(m, o, t, p) {   // combo finisher: a longer, deeper "vvvZZUUMM" and a little twinkle
      saber(m, o, t, 0.46, 0.24, [[0, 84 * p], [0.19, 180 * p], [0.46, 90 * p]], [[0, 480], [0.19, 3200], [0.46, 600]], { a: 0.09, rel: 0.22 });
      N(m, o, t, 0.44, 0.24, { fs: [[0, 350 * p], [0.19, 2000 * p], [0.44, 520 * p]], q: 1.1, a: 0.12 });
      B(m, o, t + 0.2, 1760 * p, 0.35, 0.03); B(m, o, t + 0.26, 2349 * p, 0.35, 0.026); return 0.55;
    },
    hit(m, o, t, p) {   // crackly "zzkt" + soft thump
      T(m, o, t, 290 * p, 0.13, 0.45, { f1: 95 * p, a: 0.002 });   // "thup" high enough for tablet speakers
      T(m, o, t, 580 * p, 0.05, 0.06, { f1: 200 * p, type: 'triangle', a: 0.001 });
      saber(m, o, t, 0.12, 0.2, [[0, 215 * p], [0.12, 125 * p]], [[0, 3000], [0.12, 800]], { hold: 0, flutter: 62, buzz: 0.45 });
      N(m, o, t, 0.09, 0.1, { f: 2300 * p, q: 1.2, am: [70, 0.9], a: 0.001 });
      crackle(m, o, t, 4, 0.07, 0.18, p); return 0.18;
    },
    hitSoft(m, o, t, p) { T(m, o, t, 600 * p, 0.08, 0.3, { f1: 260 * p, a: 0.002 }); N(m, o, t, 0.03, 0.09, { type: 'lowpass', f: 2500, a: 0.001 }); return 0.1; },
    // Eski Bilbo adları (havlama kaydı yok artık): Pırıl'ın sesleri çalar (minik kükreme / cıvıltı / kıkırtı, sırayla değişerek).
    bilboBark(m, o, t, p) {
      const k = (m.bark = ((m.bark || 0) + 1 + (Math.random() < 0.3 ? 1 : 0)) % 3), n = ['pirilKukre', 'pirilCivil', 'pirilKikir'][k], g = gainNode(m.c, SVOL[n] || 1);
      g.connect(o); return SFX[n](m, g, t, p);
    },
    bilboGuard(m, o, t, p) { return SFX.kopukKalkan(m, o, t, p); },
    crit(m, o, t, p) {   // bigger zap, rounder thump, then a happy twinkle
      T(m, o, t, 250 * p, 0.24, 0.55, { f1: 70 * p, a: 0.002 });
      T(m, o, t, 500 * p, 0.07, 0.07, { f1: 160 * p, type: 'triangle', a: 0.001 });
      saber(m, o, t, 0.22, 0.24, [[0, 240 * p], [0.05, 300 * p], [0.22, 110 * p]], [[0, 3400], [0.22, 750]], { hold: 0, flutter: 55, buzz: 0.5 });
      N(m, o, t, 0.18, 0.13, { f: 2200 * p, q: 1, am: [55, 0.9], a: 0.001 });
      crackle(m, o, t, 7, 0.14, 0.2, p);
      arp(m, o, t + 0.04, [1568, 2093, 2637], 0.05, 0.5, 0.1, p, 3.5, 1); return 0.7;
    },
    saberOn(m, o, t, p) {   // ignition: tiny snap-hiss, the hum rises into place ("tssh-vMMMM"), a sparkle for the flash, then fades
      N(m, o, t, 0.09, 0.22, { type: 'highpass', f: 2600, q: 0.7, a: 0.002 });
      saber(m, o, t, 0.8, 0.24, [[0, 44 * p], [0.26, 120 * p], [0.4, 104 * p], [0.8, 100 * p]], [[0, 300], [0.26, 2900], [0.45, 1400], [0.8, 650]], { a: 0.03, rel: 0.45 });
      T(m, o, t, 320 * p, 0.28, 0.035, { f1: 1250 * p, a: 0.02 });
      B(m, o, t + 0.24, 1760 * p, 0.5, 0.045); B(m, o, t + 0.3, 2637 * p, 0.5, 0.035); return 0.85;
    },
    saberOff(m, o, t, p) {   // retract: the hum sinks and closes ("vmmmp")
      saber(m, o, t, 0.46, 0.22, [[0, 104 * p], [0.08, 112 * p], [0.46, 38 * p]], [[0, 1900], [0.46, 240]], { a: 0.01, rel: 0.2 });
      N(m, o, t, 0.3, 0.07, { fs: [[0, 2400], [0.3, 420]], q: 1, a: 0.01 }); return 0.5;
    },
    pop(m, o, t, p) {   // enemy turned happy: bubbly bloop + happy little arpeggio
      T(m, o, t, 340 * p, 0.1, 0.42, { f1: 1250 * p, glide: 0.06, a: 0.002 });
      [1047, 1319, 1568, 2093].forEach((f, i) => B(m, o, t + 0.06 + i * 0.055, f * p, 0.42, 0.11 - i * 0.012, 4, 0.7));
      N(m, o, t + 0.05, 0.25, 0.035, { type: 'highpass', f: 6500, a: 0.02 }); return 0.65;
    },
    coin(m, o, t, p) {
      T(m, o, t, 988 * p, 0.075, 0.11, { wave: 'sq', lp: 5000, a: 0.001, hold: 1, rel: 0.012 });
      T(m, o, t + 0.07, 1319 * p, 0.4, 0.11, { wave: 'sq', lp: 5000, a: 0.001 });
      T(m, o, t + 0.07, 2638 * p, 0.2, 0.025, { a: 0.001 }); return 0.5;
    },
    heart(m, o, t, p) {
      T(m, o, t, 520 * p, 0.2, 0.3, { f1: 1040 * p, a: 0.01 });
      B(m, o, t + 0.08, 1319 * p, 0.5, 0.09, 4, 0.7); B(m, o, t + 0.16, 1760 * p, 0.5, 0.075, 4, 0.7); return 0.7;
    },
    potion(m, o, t, p) {
      for (let i = 0; i < 3; i++) T(m, o, t + i * 0.1, 280 * p * semi(i * 2), 0.08, 0.28, { f1: 500 * p * semi(i * 2), a: 0.005 });
      arp(m, o, t + 0.32, [1319, 1568, 2093, 2637], 0.05, 0.4, 0.065, p);
      N(m, o, t + 0.3, 0.45, 0.03, { type: 'highpass', f: 5500, a: 0.1 }); return 0.9;
    },
    levelup(m, o, t, p) {
      [523, 659, 784, 1047].forEach((f, i) => { T(m, o, t + i * 0.085, f * p, 0.25, 0.08, { wave: 'sq', lp: 3500 }); B(m, o, t + i * 0.085, f * p, 0.6, 0.07, 4, 0.7); });
      [1047, 1319, 1568].forEach((f, i) => T(m, o, t + 0.36, f * p, 1.0, 0.04, { wave: 'saw', lp: 2600, hold: 1, a: 0.04, rel: 0.55, vib: [5.5, 10, 0.25], det: (i - 1) * 6 }));
      B(m, o, t + 0.36, 2093 * p, 1.2, 0.07, 4, 0.8);
      sparkle(m, o, t + 0.42, 10, 2000 * p, 4200 * p, 0.5, 0.03);
      N(m, o, t + 0.36, 0.9, 0.022, { type: 'highpass', f: 7000, a: 0.25 }); return 1.5;
    },
    unlock(m, o, t, p) {
      arp(m, o, t, [784, 880, 1047, 1175, 1319, 1568, 1760, 2093], 0.05, 0.45, 0.065, p);
      [523, 784, 1319].forEach(f => T(m, o, t + 0.42, f * p, 1.0, 0.06, { hold: 1, a: 0.12, rel: 0.6, vib: [5, 8, 0.3] }));
      N(m, o, t + 0.4, 0.8, 0.022, { type: 'highpass', f: 6000, a: 0.2 }); return 1.5;
    },
    star(m, o, t, p) {
      T(m, o, t, 1760 * p, 0.15, 0.14, { f1: 900 * p, a: 0.003 });
      B(m, o, t, 2637 * p, 0.3, 0.07); N(m, o, t, 0.12, 0.035, { type: 'highpass', f: 5500, a: 0.01 }); return 0.35;
    },
    spin(m, o, t, p) {
      N(m, o, t, 0.9, 0.45, { fs: [[0, 350 * p], [0.2, 1500 * p], [0.4, 700 * p], [0.6, 1600 * p], [0.88, 500 * p]], q: 2.2, a: 0.12, hold: 1, rel: 0.35 });
      T(m, o, t, 180 * p, 0.9, 0.045, { type: 'triangle', fs: [[0, 180 * p], [0.45, 420 * p], [0.88, 220 * p]], hold: 1, a: 0.15, rel: 0.3 }); return 0.95;
    },
    ice(m, o, t, p) {
      for (let i = 0; i < 5; i++) B(m, o, t + rnd(0, 0.16), pick([2093, 2349, 2637, 3136, 3520]) * p, 0.6, 0.06, 2.76, 1);
      N(m, o, t, 0.4, 0.11, { type: 'highpass', f: 4200, a: 0.005 });
      T(m, o, t, 2600 * p, 0.18, 0.035, { f1: 3400 * p }); return 0.8;
    },
    shield(m, o, t, p) {
      T(m, o, t, 300 * p, 0.45, 0.13, { f1: 900 * p, a: 0.02 });
      [523, 784, 1319].forEach(f => T(m, o, t + 0.05, f * p, 1.0, 0.055, { hold: 1, a: 0.1, rel: 0.6, vib: [5, 10, 0.2] }));
      B(m, o, t + 0.1, 2093 * p, 0.8, 0.055, 4, 0.8); N(m, o, t, 0.7, 0.02, { type: 'highpass', f: 6000, a: 0.15 }); return 1.1;
    },
    zap(m, o, t, p) {   // cute "bzzt-ting", jagged pitch through a lowpass so it never gets harsh
      T(m, o, t, 700, 0.22, 0.08, { wave: 'saw', step: 1, lp: 2600, a: 0.002, fs: [[0, 700], [0.02, 1100], [0.04, 520], [0.06, 1300], [0.09, 600], [0.12, 1000], [0.16, 480], [0.19, 900]].map(([a, f]) => [a, f * p]) });
      N(m, o, t, 0.2, 0.11, { f: 3200, q: 1.2, am: [45, 0.8] });
      B(m, o, t + 0.12, 1760 * p, 0.35, 0.065); return 0.5;
    },
    meteorFall(m, o, t, p) {
      T(m, o, t, 1600 * p, 0.6, 0.13, { f1: 340 * p, a: 0.05, vib: [9, 25, 0.05] });
      N(m, o, t, 0.6, 0.09, { f: 2200 * p, f1: 600 * p, a: 0.08, q: 1.5 }); return 0.65;
    },
    boom(m, o, t, p) {   // round "pomf", no rumble tail
      T(m, o, t, 220 * p, 0.5, 0.55, { f1: 55 * p, a: 0.003 });
      N(m, o, t, 0.6, 0.4, { type: 'lowpass', fs: [[0, 2000], [0.5, 160]], q: 0.6 });
      N(m, o, t, 0.3, 0.22, { f: 450 * p, q: 0.8, a: 0.004 });
      T(m, o, t, 180 * p, 0.3, 0.16, { f1: 70 * p, type: 'triangle' });
      B(m, o, t + 0.06, 1319 * p, 0.5, 0.035); B(m, o, t + 0.12, 1760 * p, 0.5, 0.03); return 0.7;
    },
    hurt(m, o, t, p) {   // cartoony "boing-oof"
      T(m, o, t, 520 * p, 0.18, 0.24, { f1: 250 * p, type: 'triangle', a: 0.003, vib: [18, 40, 0.02] });
      T(m, o, t, 300 * p, 0.22, 0.24, { f1: 190 * p }); N(m, o, t, 0.05, 0.1, { type: 'lowpass', f: 1400 }); return 0.25;
    },
    chest(m, o, t, p) {
      T(m, o, t, 190 * p, 0.09, 0.28, { f1: 120 * p }); N(m, o, t, 0.05, 0.16, { f: 900, q: 1.5 });
      [784, 1047, 1319, 1568].forEach((f, i) => { B(m, o, t + 0.12 + i * 0.075, f * p, 0.55, 0.09, 4, 0.8); T(m, o, t + 0.12 + i * 0.075, f * p, 0.15, 0.035, { wave: 'sq', lp: 3000 }); });
      [1047, 1319, 1568].forEach(f => T(m, o, t + 0.45, f * p, 0.8, 0.035, { hold: 1, a: 0.05, rel: 0.5 }));
      N(m, o, t + 0.4, 0.7, 0.025, { type: 'highpass', f: 6000, a: 0.1 }); return 1.3;
    },
    portal(m, o, t, p) {
      N(m, o, t, 1.3, 0.26, { fs: [[0, 300], [0.9, 2600], [1.3, 1400]], q: 3, a: 0.3, hold: 1, rel: 0.4 });
      [220, 330, 440].forEach((f, i) => T(m, o, t, f * p, 1.3, 0.032, { wave: 'saw', lp: 900, hold: 1, a: 0.3, rel: 0.6, vib: [4, 14, 0.2], det: (i - 1) * 7 }));
      for (let i = 0; i < 5; i++) B(m, o, t + 0.2 + i * 0.18, pick([1319, 1568, 1760, 2093, 2637]) * p, 0.5, 0.035); return 1.4;
    },
    break(m, o, t, p) {   // clay pot / crate: a few woody clicks
      for (let i = 0; i < 5; i++) N(m, o, t + rnd(0, 0.12), 0.04, rnd(0.14, 0.28), { f: rnd(1200, 3400) * p, q: 2.5, a: 0.001 });
      T(m, o, t, 320 * p, 0.07, 0.24, { f1: 150 * p, a: 0.002 }); N(m, o, t, 0.1, 0.11, { type: 'lowpass', f: 1200 }); return 0.3;
    },
    drop(m, o, t, p) { T(m, o, t, 950 * p, 0.06, 0.11, { f1: 620 * p }); T(m, o, t, 260 * p, 0.09, 0.2, { f1: 150 * p }); N(m, o, t, 0.05, 0.09, { type: 'lowpass', f: 900 }); return 0.15; },
    dropRare(m, o, t, p) {
      SFX.drop(m, o, t, p); B(m, o, t + 0.06, 1319 * p, 0.5, 0.085, 4, 0.8); B(m, o, t + 0.14, 1976 * p, 0.6, 0.085, 4, 0.8);
      N(m, o, t + 0.1, 0.4, 0.02, { type: 'highpass', f: 6000, a: 0.08 }); return 0.8;
    },
    dropLegend(m, o, t, p) {
      SFX.drop(m, o, t, p);
      arp(m, o, t + 0.06, [784, 988, 1175, 1319, 1568, 1976, 2349, 2637], 0.055, 0.5, 0.065, p);
      [523, 659, 784].forEach((f, i) => T(m, o, t + 0.1, f * p, 1.6, 0.03, { wave: 'saw', lp: 1500, hold: 1, a: 0.25, rel: 0.7, vib: [5, 12, 0.3], det: (i - 1) * 5 }));
      T(m, o, t + 0.1, 1047 * p, 1.6, 0.03, { wave: 'flute', hold: 1, a: 0.3, rel: 0.7, vib: [5, 10, 0.3] });
      N(m, o, t + 0.1, 1.2, 0.028, { type: 'highpass', f: 6500, a: 0.3 }); return 1.8;
    },
    click(m, o, t, p) { T(m, o, t, 1150 * p, 0.045, 0.2, { f1: 880 * p, a: 0.002 }); T(m, o, t, 2300 * p, 0.02, 0.03, { type: 'triangle' }); return 0.06; },
    checkpoint(m, o, t, p) {
      arp(m, o, t, [659, 831, 988, 1319], 0.1, 0.9, 0.08, p);
      [659, 988, 1319].forEach(f => T(m, o, t + 0.35, f * p, 1.1, 0.04, { hold: 1, a: 0.2, rel: 0.7 }));
      N(m, o, t + 0.3, 1.0, 0.02, { type: 'highpass', f: 6000, a: 0.3 }); return 1.5;
    },
    roar(m, o, t, p) {   // a pretend, playful "rawr!" whose pitch goes UP (like a question), then a little "hee-hee-hee" giggle
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.62, end = t + d + 0.05;
      os.setPeriodicWave(m.waves.brass);
      curve(os.frequency, t, [[0, 175 * p], [0.1, 225 * p], [0.34, 262 * p], [0.54, 335 * p], [0.62, 310 * p]]);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 9; lg.gain.value = 40; l.connect(lg); lg.connect(os.detune);   // rolled "rrr" wobble
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g);
      [[[0, 620], [0.2, 880], [0.62, 600]], [[0, 1150], [0.25, 1400], [0.62, 1000]]].forEach((fs, k) => {   // "a-w" vowel
        const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = k ? 5 : 3.5; curve(bq.frequency, t, fs.map(([a, f]) => [a, f * p]));
        const bg = gainNode(c, k ? 0.55 : 1); os.connect(bq); bq.connect(bg); bg.connect(lp);
      });
      env(g.gain, t, 0.035, 0.6, d, 1, 0.14); g.connect(o);
      os.start(t); l.start(t); os.stop(end); l.stop(end);
      N(m, o, t, 0.5, 0.035, { f: 900 * p, a: 0.06, hold: 1, rel: 0.2 });
      for (let i = 0; i < 3; i++) {   // giggle: breathy "h" + a bright little "ee" that dips
        const tt = t + 0.7 + i * 0.12, f = (880 - i * 70) * p;
        N(m, o, tt, 0.035, 0.07, { type: 'highpass', f: 3000, a: 0.004 });
        T(m, o, tt + 0.012, f, 0.09, 0.22, { f1: f * 0.86, type: 'triangle', a: 0.006, vib: [22, 30, 0.01] });
      }
      return 1.1;
    },
    bite(m, o, t, p) {   // "nom nom"
      for (let i = 0; i < 2; i++) { T(m, o, t + i * 0.1, 320 * p, 0.07, 0.3, { f1: 120 * p, a: 0.002 }); N(m, o, t + i * 0.1, 0.03, 0.2, { f: 1600, q: 1.5, a: 0.001 }); }
      return 0.22;
    },
    spit(m, o, t, p) { N(m, o, t, 0.06, 0.2, { f: 1300 * p, q: 1, a: 0.002 }); T(m, o, t + 0.02, 480 * p, 0.08, 0.17, { f1: 900 * p, a: 0.005 }); return 0.12; },
    fireball(m, o, t, p) {   // magic "fwoosh" full of glitter and bubbles (flame-sprite puffs, the dragon's bubble breath, the pet dragon)
      N(m, o, t, 0.5, 0.32, { type: 'lowpass', fs: [[0, 400 * p], [0.15, 2000 * p], [0.5, 600 * p]], q: 1, a: 0.06 });
      N(m, o, t + 0.05, 0.4, 0.028, { type: 'highpass', f: 6000, a: 0.12 });
      T(m, o, t, 300 * p, 0.3, 0.05, { f1: 700 * p, a: 0.05 });
      for (let i = 0; i < 3; i++) { const f = rnd(500, 900) * p; T(m, o, t + 0.06 + rnd(0, 0.3), f, 0.06, 0.07, { f1: f * 1.8, a: 0.004 }); }
      sparkle(m, o, t + 0.08, 6, 1800 * p, 3200 * p, 0.35, 0.03); return 0.6;
    },
    slam(m, o, t, p) {
      T(m, o, t, 170 * p, 0.45, 0.6, { f1: 45 * p, a: 0.002 });
      N(m, o, t, 0.45, 0.45, { type: 'lowpass', fs: [[0, 1100], [0.4, 120]], q: 0.5 });
      N(m, o, t, 0.25, 0.2, { f: 380 * p, q: 0.9, a: 0.003 });
      T(m, o, t, 120 * p, 0.25, 0.18, { f1: 60 * p, type: 'triangle' }); N(m, o, t + 0.05, 0.5, 0.09, { f: 400, q: 0.8, a: 0.05 }); return 0.6;
    },
    whoosh(m, o, t, p) { N(m, o, t, 0.38, 0.45, { fs: [[0, 300 * p], [0.18, 1600 * p], [0.38, 500 * p]], q: 1.4, a: 0.1 }); return 0.42; },
    bat(m, o, t, p) {
      N(m, o, t, 0.28, 0.13, { f: 900 * p, q: 1.3, a: 0.02, am: [24, 0.9] });
      T(m, o, t, 2500 * p, 0.05, 0.07, { f1: 3200 * p }); T(m, o, t + 0.11, 2700 * p, 0.05, 0.06, { f1: 3400 * p }); return 0.32;
    },
    splash(m, o, t, p) {
      N(m, o, t, 0.32, 0.28, { fs: [[0, 1400 * p], [0.3, 450 * p]], q: 0.9, a: 0.005 });
      for (let i = 0; i < 4; i++) { const f = rnd(500, 1000) * p; T(m, o, t + rnd(0.04, 0.26), f, 0.05, 0.09, { f1: f * 1.7 }); }
      return 0.38;
    },
    cheer(m, o, t, p) {   // "yippee": two happy whistles, a few claps, sparkles
      T(m, o, t, 700 * p, 0.16, 0.11, { f1: 1050 * p, a: 0.01, vib: [11, 25, 0.04] });
      T(m, o, t + 0.17, 900 * p, 0.22, 0.11, { f1: 1400 * p, a: 0.01, vib: [11, 25, 0.04] });
      for (let i = 0; i < 6; i++) N(m, o, t + rnd(0, 0.45), 0.025, rnd(0.07, 0.14), { f: rnd(1300, 2300), q: 1.2, a: 0.001 });
      arp(m, o, t + 0.2, [1568, 2093, 2637], 0.07, 0.4, 0.05, p, 3.5, 0.9); return 0.7;
    },
    step(m, o, t, p) { N(m, o, t, 0.05, 0.12, { f: 850 * p, q: 0.9, a: 0.003 }); T(m, o, t, 230 * p, 0.04, 0.07, { f1: 140 * p, a: 0.002 }); return 0.07; },
    dig(m, o, t, p) {   // mole digging underground: three soft "shff" scoops, a low tock and a few pebbles
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.09 + rnd(0, 0.02);
        N(m, o, tt, 0.07, rnd(0.2, 0.28), { fs: [[0, 650 * p], [0.07, 1400 * p]], q: 1.4, a: 0.006 });
        N(m, o, tt + 0.02, 0.05, 0.08, { type: 'lowpass', f: 480, a: 0.002 });
      }
      T(m, o, t, 150 * p, 0.08, 0.14, { f1: 90 * p, a: 0.003 });
      for (let i = 0; i < 4; i++) N(m, o, t + 0.05 + rnd(0, 0.2), 0.015, rnd(0.05, 0.09), { f: rnd(1500, 2600) * p, q: 2.5, a: 0.001 });
      return 0.33;
    },
    emerge(m, o, t, p) {   // mole pops out of the ground: dirt puff + a springy "fwoop!"
      N(m, o, t, 0.14, 0.25, { fs: [[0, 500 * p], [0.14, 1300 * p]], q: 1.2, a: 0.004 });
      T(m, o, t + 0.02, 240 * p, 0.16, 0.3, { f1: 720 * p, glide: 0.12, a: 0.006, vib: [16, 30, 0.04] });
      for (let i = 0; i < 4; i++) N(m, o, t + 0.04 + rnd(0, 0.18), 0.015, rnd(0.05, 0.09), { f: rnd(1400, 2400) * p, q: 2.5, a: 0.001 });
      return 0.3;
    },
    bubble(m, o, t, p) {   // snail blows a soap bubble: soft breath, "blub-blub-bloop" rising, an iridescent glint
      N(m, o, t, 0.2, 0.045, { f: 1100 * p, q: 0.8, a: 0.05 });
      [[0.03, 420, 900], [0.11, 560, 1250], [0.2, 700, 1650]].forEach(([dt, f0, f1], i) => T(m, o, t + dt, f0 * p, 0.09, 0.22 - i * 0.04, { f1: f1 * p, glide: 0.06, a: 0.004 }));
      B(m, o, t + 0.25, 2349 * p, 0.35, 0.03, 3.5, 0.6); return 0.45;
    },
    bubblePop(m, o, t, p) {   // kabarcık patlar: su altı gibi yuvarlak, tatlı bir "blup", minik "plip" ve iki ışıltı
      T(m, o, t, 420 * p, 0.09, 0.26, { fs: [[0, 420 * p], [0.012, 520 * p], [0.09, 1150 * p]], a: 0.002 });   // "blup" (yukarı kayan)
      T(m, o, t + 0.05, 1000 * p, 0.04, 0.12, { f1: 1900 * p, a: 0.001 });   // "plip"
      N(m, o, t, 0.06, 0.05, { type: 'lowpass', f: 900, a: 0.002 });   // suyun yumuşak gövdesi
      B(m, o, t + 0.06, 2637 * p, 0.3, 0.032, 3.5, 0.7); B(m, o, t + 0.11, 3136 * p, 0.3, 0.024, 3.5, 0.7); return 0.4;
    },
    celesta(m, o, t, p) {   // celesta tınısı: üç notalık yumuşak, büyülü bir açılış (lamba yanar, kutu açılır)
      [[0, 72], [0.09, 76], [0.18, 79], [0.27, 84]].forEach(([dt, mm], i) => INST.celesta(m, o, t + dt, mtof(mm) * p, 0.5, 0.09 - i * 0.01));
      return 1.4;
    },
    sparkle(m, o, t, p) {   // kısa pırıltı: aşağıdan yukarı minik tınılar
      sparkle(m, o, t, 5, 2000 * p, 3600 * p, 0.2, 0.05); N(m, o, t, 0.25, 0.02, { type: 'highpass', f: 6500, a: 0.05 }); return 0.5;
    },
    // ── Round 3: the volcano and the zone bosses. Warm, round and bubbly; nothing hissy or scary.
    lava(m, o, t, p) {   // lava pool bubbling: two or three thick, soft "blup"s rising from below, a tiny crust plop after each
      const n = Math.random() < 0.5 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const tt = t + i * rnd(0.1, 0.15), f = rnd(165, 215) * p * (1 + i * 0.1);
        T(m, o, tt, f, 0.14, 0.3 - i * 0.06, { f1: f * 2.3, glide: 0.1, a: 0.01 });
        T(m, o, tt, f * 2, 0.08, 0.05, { f1: f * 4.2, glide: 0.07, type: 'triangle', a: 0.008 });
        N(m, o, tt + 0.09, 0.045, 0.06, { type: 'lowpass', f: 750, a: 0.003 });
      }
      return 0.5;
    },
    erupt(m, o, t, p) {   // volcano puff: a round soft "whoomp", warm air rushing up, then a gentle fizzy sizzle with little pops
      T(m, o, t, 210 * p, 0.45, 0.5, { f1: 62 * p, a: 0.012 });
      T(m, o, t, 330 * p, 0.25, 0.12, { f1: 125 * p, type: 'triangle', a: 0.008 });
      N(m, o, t, 0.55, 0.3, { type: 'lowpass', fs: [[0, 280 * p], [0.12, 1500 * p], [0.55, 330 * p]], q: 0.7, a: 0.02 });
      N(m, o, t + 0.12, 0.85, 0.04, { f: 4600, q: 0.9, a: 0.15, am: [21, 0.7] });   // soft fizz, bandpassed well below "hiss"
      crackle(m, o, t + 0.16, 9, 0.65, 0.07, p * 0.8);
      for (let i = 0; i < 4; i++) { const f = rnd(650, 1150) * p; T(m, o, t + 0.22 + rnd(0, 0.55), f, 0.045, 0.06, { f1: f * 1.6, a: 0.002 }); }
      return 1.05;
    },
    drill(m, o, t, p) {   // Usta Köstebek's hard-hat drill: a friendly toy "brrrrrr" that revs up, dirt and pebbles spraying
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.72, end = t + d + 0.03;
      const am = gainNode(c, 0.55), l = c.createOscillator(), lg = gainNode(c, 0.45);
      os.setPeriodicWave(m.waves.sq);
      curve(os.frequency, t, [[0, 118 * p], [0.16, 188 * p], [0.56, 206 * p], [0.72, 150 * p]]);
      curve(l.frequency, t, [[0, 16], [0.2, 32], [0.72, 24]]);   // the rate of the "rrr"
      l.connect(lg); lg.connect(am.gain);
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 1.4;
      os.connect(lp); lp.connect(am); am.connect(g);
      env(g.gain, t, 0.05, 0.3, d, 1, 0.16); g.connect(o);
      os.start(t); os.stop(end); l.start(t); l.stop(end);
      N(m, o, t + 0.05, 0.62, 0.11, { f: 850 * p, q: 1, a: 0.06, hold: 1, rel: 0.2, am: [28, 0.8] });
      for (let i = 0; i < 6; i++) N(m, o, t + 0.1 + rnd(0, 0.55), 0.015, rnd(0.05, 0.1), { f: rnd(1400, 2600) * p, q: 2.5, a: 0.001 });
      return 0.78;
    },
    roll(m, o, t, p) {   // turtle tucks into its shell ("fwip") and rolls: a bumpy "rrrolll" with soft shell "tok"s
      T(m, o, t, 300 * p, 0.1, 0.18, { f1: 720 * p, glide: 0.07, a: 0.004 });
      N(m, o, t + 0.06, 0.95, 0.32, { fs: [[0, 320 * p], [0.35, 720 * p], [0.95, 360 * p]], q: 1.3, a: 0.1, hold: 1, rel: 0.32, am: [12, 0.8] });   // bandpass: no boomy sub-bass
      T(m, o, t + 0.06, 135 * p, 0.95, 0.1, { type: 'triangle', fs: [[0, 130 * p], [0.35, 205 * p], [0.95, 140 * p]], hold: 1, a: 0.1, rel: 0.3, vib: [12, 45, 0.02] });
      for (let i = 0; i < 7; i++) { const tt = t + 0.12 + i * 0.12 + rnd(0, 0.02); T(m, o, tt, rnd(400, 540) * p, 0.045, 0.08 * (1 - i * 0.08), { f1: 210 * p, a: 0.001 }); }
      return 1.05;
    },
    bounce(m, o, t, p) {   // big jelly hop: a squishy squeeze, then a springy "boi-oi-oing"
      N(m, o, t, 0.08, 0.13, { type: 'lowpass', f: 900, a: 0.01 });
      T(m, o, t + 0.03, 150 * p, 0.5, 0.42, { f1: 430 * p, glide: 0.15, a: 0.006, vib: [13, 60, 0.08] });
      T(m, o, t + 0.03, 300 * p, 0.34, 0.08, { f1: 860 * p, glide: 0.15, type: 'triangle', a: 0.006, vib: [13, 60, 0.08] });
      return 0.56;
    },
    chirp(m, o, t, p) {   // fire chick "cip-cip!": quick little up-and-down peeps
      const n = Math.random() < 0.35 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const tt = t + i * 0.1, f = 2000 * p * (i === n - 1 ? 1.1 : 1);
        T(m, o, tt, f, 0.075, 0.16, { fs: [[0, f * 0.8], [0.028, f * 1.12], [0.075, f * 0.92]], a: 0.004 });
        T(m, o, tt, f * 2, 0.05, 0.025, { fs: [[0, f * 1.6], [0.028, f * 2.24], [0.05, f * 1.9]], a: 0.004 });
      }
      return 0.1 * n + 0.06;
    },
    splat(m, o, t, p) {   // jelly blob lands: a wet squishy "splotch" and a wobbly low jiggle
      N(m, o, t, 0.16, 0.32, { fs: [[0, 1600 * p], [0.16, 380 * p]], q: 1.4, a: 0.002 });
      T(m, o, t, 260 * p, 0.22, 0.3, { f1: 110 * p, a: 0.002, vib: [18, 55, 0.03] });
      for (let i = 0; i < 3; i++) { const f = rnd(600, 1100) * p; T(m, o, t + rnd(0.04, 0.2), f, 0.04, 0.07, { f1: f * 1.5, a: 0.002 }); }
      return 0.32;
    },
    rumble(m, o, t, p) {   // gentle ground rumble (a boss about to pop up, the volcano grumbling): soft rolling murmur + pebbles
      N(m, o, t, 1.3, 0.42, { fs: [[0, 240 * p], [0.5, 460 * p], [1.3, 220 * p]], q: 0.9, a: 0.35, hold: 1, rel: 0.6, am: [7, 0.6] });   // bandpass: soft, not boomy
      T(m, o, t, 150 * p, 1.3, 0.06, { hold: 1, a: 0.4, rel: 0.6, vib: [5, 30, 0.1] });
      T(m, o, t, 98 * p, 1.3, 0.05, { type: 'triangle', hold: 1, a: 0.4, rel: 0.6, vib: [6, 30, 0.1] });
      for (let i = 0; i < 5; i++) N(m, o, t + 0.25 + rnd(0, 0.9), 0.015, rnd(0.03, 0.06), { f: rnd(1300, 2400) * p, q: 2.5, a: 0.001 });
      return 1.35;
    },
    // ── Round 4: Kefir Vadisi. Creamy, fizzy and bubbly; round and friendly, never hissy or gross.
    fizz(m, o, t, p) {   // kefir fizz: a soft sparkly shimmer of tiny bubbles rising and popping (bandpassed well below "hiss")
      N(m, o, t, 0.8, 0.1, { f: 3300 * p, q: 1.2, a: 0.05, am: [17, 0.8] });
      N(m, o, t, 0.5, 0.14, { fs: [[0, 800 * p], [0.5, 1800 * p]], q: 2.4, a: 0.03, am: [11, 0.6] });   // soft bubbly body, rising
      for (let i = 0; i < 12; i++) {   // little bubbles popping at the surface, quick upward "plip"s getting sparser
        const tt = t + 0.72 * Math.pow(i / 12, 1.35) + rnd(0, 0.03), f = rnd(1200, 2500) * p;
        T(m, o, tt, f, 0.035, rnd(0.07, 0.12) * (1 - i / 16), { f1: f * 1.9, a: 0.004 });
      }
      B(m, o, t + 0.14, 2637 * p, 0.35, 0.04, 3.5, 0.6); B(m, o, t + 0.38, 3136 * p, 0.35, 0.03, 3.5, 0.6);
      return 0.85;
    },
    cork(m, o, t, p) {   // friendly bottle pop: a round hollow "pok!", the cap spins away ("fwiii"), a little fizz and a happy "ting"
      N(m, o, t, 0.014, 0.28, { f: 1700 * p, q: 0.9, a: 0.0005 });   // the snap
      T(m, o, t, 420 * p, 0.1, 0.5, { fs: [[0, 420 * p], [0.012, 880 * p], [0.1, 540 * p]], a: 0.001 });   // cheek-pop body
      N(m, o, t + 0.004, 0.09, 0.16, { f: 760 * p, q: 9, a: 0.002 });   // hollow bottle-neck resonance
      T(m, o, t + 0.07, 900 * p, 0.2, 0.05, { f1: 1700 * p, a: 0.012, vib: [28, 60, 0.02] });   // the cap flying off
      for (let i = 0; i < 6; i++) { const f = rnd(1400, 2700) * p; T(m, o, t + 0.13 + rnd(0, 0.35), f, 0.03, 0.05, { f1: f * 1.8, a: 0.001 }); }
      B(m, o, t + 0.1, 2093 * p, 0.45, 0.05, 4, 0.8); B(m, o, t + 0.17, 2637 * p, 0.4, 0.035, 4, 0.8);
      return 0.6;
    },
    slurp(m, o, t, p) {   // Feza drinks a glass of kefir: a cute bubbly "sluuurp", two soft "gulp"s, a happy "ahh" sparkle
      N(m, o, t, 0.42, 0.32, { fs: [[0, 500 * p], [0.3, 1450 * p], [0.42, 1100 * p]], q: 3, a: 0.05, am: [26, 0.85] });
      T(m, o, t, 300 * p, 0.42, 0.06, { fs: [[0, 300 * p], [0.3, 600 * p], [0.42, 500 * p]], type: 'triangle', a: 0.04, vib: [26, 50, 0.02] });
      for (let i = 0; i < 2; i++) {
        const tt = t + 0.5 + i * 0.2;
        T(m, o, tt, 380 * p, 0.09, 0.15, { f1: 180 * p, a: 0.006 });
        N(m, o, tt, 0.04, 0.07, { type: 'lowpass', f: 700, a: 0.002 });
      }
      N(m, o, t + 0.92, 0.32, 0.05, { f: 1100 * p, q: 1.2, a: 0.05 });   // satisfied little breath
      T(m, o, t + 0.92, 620 * p, 0.28, 0.07, { f1: 880 * p, a: 0.03, vib: [9, 20, 0.05] });
      arp(m, o, t + 0.98, [1319, 1568, 2093], 0.06, 0.45, 0.05, p);
      return 1.45;
    },
    squish(m, o, t, p) {   // soft creamy squish (a yogurt hop, poking a pudding, stepping in cream): squeezy "sqlch" + tiny wobble
      N(m, o, t, 0.14, 0.26, { fs: [[0, 700 * p], [0.05, 1500 * p], [0.14, 600 * p]], q: 2.2, a: 0.006 });
      T(m, o, t, 200 * p, 0.16, 0.24, { fs: [[0, 200 * p], [0.05, 340 * p], [0.16, 150 * p]], a: 0.004, vib: [20, 45, 0.02] });
      N(m, o, t, 0.06, 0.1, { type: 'lowpass', f: 800, a: 0.003 });
      return 0.2;
    },
    moo(m, o, t, p) {   // a soft, cute cow far across the valley: a round "mmuuuu" (lifts, then settles) and a fainter echo
      const c = m.c, one = (t0, v, open, d) => {
        const os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), fm = c.createBiquadFilter(), end = t0 + d + 0.05;
        os.setPeriodicWave(m.waves.brass);
        curve(os.frequency, t0, [[0, 176 * p], [0.2 * d, 214 * p], [0.62 * d, 204 * p], [d, 158 * p]]);
        const l = c.createOscillator(), lg = gainNode(c, 0);   // gentle vibrato arriving late
        l.frequency.value = 5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(16, t0 + d * 0.5); l.connect(lg); lg.connect(os.detune);
        lp.type = 'lowpass'; lp.Q.value = 1.1; curve(lp.frequency, t0, [[0, 300], [0.22 * d, open], [0.75 * d, open * 0.8], [d, 330]]);   // "m" → "uu" → closes
        fm.type = 'peaking'; fm.frequency.value = 400 * p; fm.Q.value = 2; fm.gain.value = 7;   // round "u" formant
        os.connect(lp); lp.connect(fm); fm.connect(g);
        env(g.gain, t0, 0.14, v, d, 1, d * 0.32); g.connect(o);
        os.start(t0); l.start(t0); os.stop(end); l.stop(end);
      };
      one(t, 0.1, 950, 0.95);
      one(t + 0.55, 0.022, 620, 0.8);   // echo from the far hills: quieter and duller
      return 1.45;
    },
    // ── Round 5: Surlu Şehir, the castle town. Wooden, jingly and brassy-toy; round and friendly, never martial or clangy.
    neigh(m, o, t, p) {   // a cute pony whinny: a bright wobbly "hiii-hi-hi-hi" tumbling down, then a soft lip-flutter "brrr"
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.74, end = t + d + 0.05;
      os.setPeriodicWave(m.waves.brass);
      curve(os.frequency, t, [[0, 480 * p], [0.06, 860 * p], [0.18, 800 * p], [0.42, 640 * p], [0.66, 480 * p], [0.74, 430 * p]]);
      const l = c.createOscillator(), lg = gainNode(c, 0), ag = gainNode(c, 0), am = gainNode(c, 0.62);   // one wobble for pitch and loudness
      curve(l.frequency, t, [[0, 10], [d, 14]]);
      lg.gain.setValueAtTime(20, t); lg.gain.linearRampToValueAtTime(150, t + 0.45);   // the "hi-hi-hi" widens as it tumbles
      ag.gain.setValueAtTime(0.06, t); ag.gain.linearRampToValueAtTime(0.38, t + 0.4);
      l.connect(lg); lg.connect(os.detune); l.connect(ag); ag.connect(am.gain);
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.8;
      const fm = c.createBiquadFilter(); fm.type = 'peaking'; fm.frequency.value = 1500 * p; fm.Q.value = 1.4; fm.gain.value = 6;   // nasal "ii"
      os.connect(fm); fm.connect(lp); lp.connect(am); am.connect(g);
      env(g.gain, t, 0.03, 0.34, d, 1, 0.2); g.connect(o);
      os.start(t); l.start(t); os.stop(end); l.stop(end);
      N(m, o, t, 0.3, 0.03, { f: 1800 * p, q: 1, a: 0.04 });   // a little breath in the voice
      N(m, o, t + 0.76, 0.24, 0.2, { type: 'lowpass', f: 650, a: 0.02, am: [23, 0.9] });   // "brrr": the lips flutter
      T(m, o, t + 0.76, 150 * p, 0.24, 0.1, { type: 'triangle', a: 0.02, vib: [23, 60, 0.01] });
      return 1.05;
    },
    gallop(m, o, t, p) {   // one hoof beat on the cobbles, "clip-clop": two hollow coconut "tok"s (the 2nd lower) + a soft thud.
      for (let i = 0; i < 2; i++) {   // GAME calls it once per stride (~0.25–0.35 s apart); SVAR keeps a run of them lively
        const tt = t + i * 0.085 + (i ? rnd(-0.008, 0.008) : 0), q = p * (i ? 0.82 : 1) * rnd(0.97, 1.03);
        T(m, o, tt, 920 * q, 0.05, 0.26, { f1: 700 * q, a: 0.0008 });   // hollow shell body
        N(m, o, tt, 0.035, 0.18, { f: 1500 * q, q: 5, a: 0.0006 });   // the woody "k"
        T(m, o, tt, 210 * q, 0.07, 0.16, { f1: 120 * q, a: 0.001 });   // the hoof landing (soft, high enough for tablet speakers)
      }
      return 0.18;
    },
    drum(m, o, t, p) {   // oyuncak davul: yuvarlak, keçe tokmaklı "DÜM", aynı anda minik çubuk "tık" ve kısa, yumuşak tel hışırtısı.
      // Gecikmeli vuruş yok: ritim oyunlarında (Mantar Müziği) ve kurmalı askercikte vuruş tam zamanında duyulur.
      T(m, o, t, 160 * p, 0.42, 0.5, { fs: [[0, 165 * p], [0.05, 112 * p], [0.42, 98 * p]], a: 0.003 });   // derinin gövdesi
      T(m, o, t, 245 * p, 0.2, 0.24, { fs: [[0, 255 * p], [0.05, 210 * p]], a: 0.003 });   // tablet hoparlörünün duyduğu kısım
      T(m, o, t, 340 * p, 0.09, 0.06, { f1: 290 * p, type: 'triangle', a: 0.002 });
      N(m, o, t, 0.06, 0.2, { type: 'lowpass', f: 1000, a: 0.002 });   // keçe
      T(m, o, t, 900 * p, 0.03, 0.06, { f1: 760 * p, a: 0.0008 }); N(m, o, t, 0.025, 0.07, { f: 2800, q: 1.6, a: 0.0006 });   // çubuk "tık"
      N(m, o, t + 0.005, 0.13, 0.05, { f: 2400 * p, q: 0.9, a: 0.004 });   // tel hışırtısı (kısa)
      return 0.45;
    },
    broom(m, o, t, p) {   // a straw broom sweeping: two quick bristly "shff-shff" strokes, scratchy but soft (bandpassed, never hissy)
      [[0, 0.16, 0.26], [0.17, 0.24, 0.3]].forEach(([dt, d, v], i) => {
        N(m, o, t + dt, d, v, { fs: [[0, 700 * p], [d * 0.45, 1900 * p], [d, 1000 * p]], q: 1.2, a: d * 0.4, am: [47 + i * 9, 0.7] });   // bristles
        N(m, o, t + dt, d * 0.8, v * 0.35, { type: 'lowpass', f: 700, a: d * 0.35 });   // the body of the stroke
        for (let k = 0; k < 3; k++) N(m, o, t + dt + rnd(0.02, d * 0.8), 0.012, rnd(0.05, 0.09), { f: rnd(1400, 2600) * p, q: 3, a: 0.001 });   // straw ticks
      });
      return 0.45;
    },
    horn(m, o, t, p) {   // the knight's tiny toy trumpet: a cheeky, nasal "ta-ta-ta-taaa!" (a toy, never a bugle call) + a twinkle
      [[0, 523, 0.075], [0.1, 523, 0.075], [0.2, 659, 0.09], [0.31, 784, 0.42]].forEach(([dt, f, d], i) => {
        const ff = f * p, last = i === 3;
        T(m, o, t + dt, ff, d, 0.15, { wave: 'brass', fs: [[0, ff * 0.97], [0.02, ff]], hold: 1, a: 0.012, rel: last ? 0.14 : 0.025,
          lp: [[0, ff * 1.5], [0.03, ff * 4], [d, ff * 2.6]], q: 1.4, vib: last ? [6.5, 22, 0.12] : null });
        T(m, o, t + dt, ff, d, 0.035, { wave: 'sq', det: 9, hold: 1, a: 0.012, rel: last ? 0.14 : 0.025, lp: ff * 3 });   // kazoo buzz
        N(m, o, t + dt, 0.03, 0.035, { f: 1400, q: 1, a: 0.002 });   // tongue "t"
      });
      B(m, o, t + 0.36, 2093 * p, 0.4, 0.03, 4, 0.8); B(m, o, t + 0.43, 2637 * p, 0.4, 0.024, 4, 0.8);
      return 0.85;
    },
    bell(m, o, t, p) {   // a friendly town bell: one warm "dinnng", a round hum under a gently beating ring (major-third tuning: happy, not solemn)
      const f = 587 * p;
      for (const [r, d, v, det] of [[0.5, 1.7, 0.1, 0], [1, 1.3, 0.13, 0], [1.25, 0.9, 0.045, 0], [1.5, 0.75, 0.05, 0], [2, 1.1, 0.08, 0], [2, 1.1, 0.045, 3], [3.01, 0.45, 0.03, 0]])
        T(m, o, t, f * r, d, v, { det, a: 0.002 });
      B(m, o, t, f * 2, 0.4, 0.07, 3.5, 1.4);   // the clapper's strike
      N(m, o, t, 0.025, 0.06, { type: 'lowpass', f: 2200, a: 0.001 });
      return 1.75;
    },
    clank(m, o, t, p) {   // soft armour "tink-clank": two little plate clinks (short, mellow inharmonic rings) over a padded thunk
      [[0, 1, 0.16], [0.07, 0.8, 0.13]].forEach(([dt, q, v]) => {
        const f = 1250 * p * q * rnd(0.98, 1.02);
        T(m, o, t + dt, f, 0.16, v, { a: 0.0008 });
        T(m, o, t + dt, f * 2.41, 0.09, v * 0.45, { a: 0.0008 });
        T(m, o, t + dt, f * 3.93, 0.05, v * 0.18, { a: 0.0008 });
        N(m, o, t + dt, 0.02, v * 0.5, { f: 3000 * q, q: 2, a: 0.0005 });
      });
      T(m, o, t, 240 * p, 0.08, 0.2, { f1: 140 * p, a: 0.002 });
      return 0.26;
    },
    // ── Round 6: boss bonus moments. Silly and soft: toy taps, squeaks, crunches and breaths, never a real smack.
    bonk(m, o, t, p) {   // a toy mallet tapping a head (the mole peeking out): a hollow wooden "tok!", a mini springy "boing", a twinkle
      N(m, o, t, 0.03, 0.18, { f: 1300 * p, q: 4, a: 0.0006 });   // the woody "k"
      T(m, o, t, 760 * p, 0.07, 0.34, { f1: 520 * p, a: 0.0008 });   // hollow toy body
      T(m, o, t, 230 * p, 0.06, 0.12, { f1: 140 * p, a: 0.001 });   // soft padded thud
      T(m, o, t + 0.05, 260 * p, 0.32, 0.24, { fs: [[0, 260 * p], [0.05, 520 * p], [0.32, 430 * p]], a: 0.004, vib: [14, 70, 0.05] });   // "boing"
      T(m, o, t + 0.05, 520 * p, 0.22, 0.04, { fs: [[0, 520 * p], [0.05, 1040 * p], [0.22, 860 * p]], type: 'triangle', a: 0.004, vib: [14, 70, 0.05] });
      B(m, o, t + 0.12, 1760 * p, 0.3, 0.03, 4, 0.8);
      return 0.42;
    },
    hiccup(m, o, t, p) {   // a cartoon "hık!": a quick rising squeak that ends in a round little pop and a bubble plip
      N(m, o, t, 0.04, 0.07, { f: 1200 * p, q: 1, a: 0.003 });   // the breathy "h"
      T(m, o, t, 520 * p, 0.1, 0.22, { fs: [[0, 520 * p], [0.07, 1250 * p], [0.1, 1100 * p]], type: 'triangle', a: 0.003 });   // squeak up
      N(m, o, t + 0.085, 0.012, 0.16, { f: 1500 * p, q: 1, a: 0.0005 });   // the snap of the pop
      T(m, o, t + 0.085, 380 * p, 0.09, 0.3, { fs: [[0, 380 * p], [0.012, 820 * p], [0.09, 500 * p]], a: 0.001 });   // round cheek pop
      for (let i = 0; i < 2; i++) { const f = rnd(1100, 1700) * p; T(m, o, t + 0.16 + i * 0.06, f, 0.035, 0.05, { f1: f * 1.8, a: 0.003 }); }
      return 0.3;
    },
    munch(m, o, t, p) {   // the knight's horse eating the carrot: two crunchy bites ("kırt-kırt"), each with a soft jaw "nom"
      for (let i = 0; i < 2; i++) {   // GAME calls it every 0.5 s while the horse chews
        const tt = t + i * 0.19, q = p * (i ? 0.9 : 1);
        T(m, o, tt, 300 * q, 0.08, 0.24, { f1: 130 * q, a: 0.002 });   // jaw "nom"
        N(m, o, tt, 0.08, 0.09, { type: 'lowpass', f: 900, a: 0.002 });   // mouthful
        for (let k = 0; k < 5; k++) N(m, o, tt + rnd(0, 0.07), 0.018, rnd(0.12, 0.2), { f: rnd(900, 2200) * q, q: 2.2, a: 0.0008 });   // crunch
      }
      return 0.36;
    },
    sigh(m, o, t, p) {   // the dragon's soft sigh before it blows hearts: a gentle falling breath "haaah" over a little "hmmm" hum
      N(m, o, t, 0.95, 0.2, { fs: [[0, 1500 * p], [0.3, 1100 * p], [0.95, 500 * p]], q: 1.1, a: 0.18, hold: 1, rel: 0.5 });   // breath
      T(m, o, t + 0.1, 330 * p, 0.9, 0.08, { fs: [[0, 330 * p], [0.25, 350 * p], [0.9, 235 * p]], type: 'triangle', lp: 1200, hold: 1, a: 0.15, rel: 0.45, vib: [5, 18, 0.2] });   // hum
      T(m, o, t + 0.1, 165 * p, 0.9, 0.05, { fs: [[0, 165 * p], [0.25, 175 * p], [0.9, 118 * p]], hold: 1, a: 0.15, rel: 0.45 });
      return 1.05;
    },
    // ── Pırıl, yavru ejderha: kanat, ışık nefesi, köpük, rüzgâr, kalp tozu, kıkırtı. Hepsi sentez; yumuşak, parlak, minik.
    kanat(m, o, t, p) {   // kanat pırpırı: iki üç hızlı yumuşak "fırr" çırpışı (hava, AM ile titreşen) + minik bir pırıltı
      for (let i = 0; i < 2; i++) {
        const tt = t + i * 0.13, q = p * (i ? 1.12 : 1);
        N(m, o, tt, 0.12, 0.3 - i * 0.06, { fs: [[0, 520 * q], [0.05, 1250 * q], [0.12, 700 * q]], q: 1.1, a: 0.02, am: [22, 0.9] });
        N(m, o, tt, 0.09, 0.12, { type: 'lowpass', f: 420, a: 0.01 });   // kanadın yumuşak "püf" gövdesi
      }
      B(m, o, t + 0.16, 2637 * p, 0.25, 0.018, 3.5, 0.6);
      return 0.32;
    },
    pirilPuf(m, o, t, p) {   // minik "püf" ışık nefesi: dudak "p", sıcak hava, parlak tozlar ve ışığın kısa tınısı
      N(m, o, t, 0.012, 0.16, { f: 900 * p, q: 0.8, a: 0.0006 });   // "p"
      N(m, o, t, 0.24, 0.34, { type: 'lowpass', fs: [[0, 500 * p], [0.05, 2400 * p], [0.24, 800 * p]], q: 0.9, a: 0.012 });
      T(m, o, t, 300 * p, 0.12, 0.14, { f1: 480 * p, a: 0.004 });
      T(m, o, t + 0.05, 1319 * p, 0.45, 0.045, { hold: 1, a: 0.04, rel: 0.3, vib: [6, 12, 0.08] });   // ışığın sesi
      sparkle(m, o, t + 0.05, 6, 1800 * p, 3600 * p, 0.22, 0.04);
      return 0.55;
    },
    kopukKalkan(m, o, t, p) {   // köpük kalkanı: köpük şişer (titrek yükselen ses), yuvarlak bir "blop" ile kapanır, gökkuşağı parıltısı
      T(m, o, t, 170 * p, 0.32, 0.34, { fs: [[0, 170 * p], [0.24, 400 * p], [0.32, 380 * p]], a: 0.012, vib: [10, 45, 0.04] });
      N(m, o, t, 0.3, 0.06, { fs: [[0, 400 * p], [0.3, 1300 * p]], q: 2, a: 0.08 });   // nefes
      N(m, o, t + 0.3, 0.012, 0.14, { f: 1400 * p, q: 1, a: 0.0005 });
      T(m, o, t + 0.3, 460 * p, 0.11, 0.4, { fs: [[0, 460 * p], [0.014, 1000 * p], [0.11, 640 * p]], a: 0.001 });   // "blop"
      [784, 988, 1319].forEach((f, i) => T(m, o, t + 0.34 + i * 0.03, f * p, 0.7, 0.032, { hold: 1, a: 0.08, rel: 0.45, vib: [5.5, 14, 0.1] }));
      B(m, o, t + 0.38, 2349 * p, 0.5, 0.035, 3.5, 0.7); B(m, o, t + 0.46, 3136 * p, 0.4, 0.025, 3.5, 0.7);
      return 1.05;
    },
    kopukPat(m, o, t, p) {   // köpük kalkanı söner: yumuşak bir "plop" ve dağılan minik baloncuklar
      T(m, o, t, 700 * p, 0.07, 0.26, { fs: [[0, 700 * p], [0.012, 1400 * p], [0.07, 900 * p]], a: 0.001 });
      N(m, o, t, 0.03, 0.08, { type: 'highpass', f: 2500, a: 0.001 });
      for (let i = 0; i < 4; i++) { const f = rnd(1200, 2200) * p; T(m, o, t + 0.05 + i * 0.05 + rnd(0, 0.02), f, 0.035, 0.07 - i * 0.012, { f1: f * 1.7, a: 0.002 }); }
      return 0.35;
    },
    kanatRuzgar(m, o, t, p) {   // kanat rüzgârı "vuuuş": iki güçlü kanat çırpışı, sonra geniş, yumuşak bir rüzgâr süpürmesi ve tınılar
      for (let i = 0; i < 2; i++) N(m, o, t + i * 0.1, 0.1, 0.22, { fs: [[0, 500 * p], [0.05, 1100 * p], [0.1, 600 * p]], q: 1, a: 0.015, am: [20, 0.85] });
      N(m, o, t + 0.12, 0.62, 0.48, { fs: [[0, 280 * p], [0.25, 1700 * p], [0.62, 420 * p]], q: 1.3, a: 0.16, hold: 1, rel: 0.3 });
      N(m, o, t + 0.16, 0.5, 0.05, { type: 'highpass', f: 5200, a: 0.15 });   // havanın ışıltısı
      T(m, o, t + 0.12, 220 * p, 0.6, 0.05, { fs: [[0, 220 * p], [0.25, 440 * p], [0.6, 260 * p]], type: 'triangle', a: 0.12, hold: 1, rel: 0.25 });
      arp(m, o, t + 0.3, [1568, 2093, 2637], 0.06, 0.4, 0.035, p, 3.5, 0.8);
      return 0.85;
    },
    kalpTozu(m, o, t, p) {   // kalp tozu: aşağı süzülen pembe pırıltı yağmuru, altında iki tatlı "din-dan" ve sıcak bir tını
      for (let i = 0; i < 12; i++) B(m, o, t + i * 0.045 + rnd(0, 0.02), pick([2093, 2349, 2637, 3136, 3520]) * p * (1 - i * 0.012), 0.45, 0.032 * (1 - i * 0.04), 3.5, 0.8);
      B(m, o, t + 0.05, 1319 * p, 0.8, 0.07, 4, 0.7); B(m, o, t + 0.2, 1760 * p, 0.9, 0.06, 4, 0.7);
      [659, 831, 988].forEach(f => T(m, o, t + 0.1, f * p, 0.8, 0.03, { hold: 1, a: 0.12, rel: 0.5, vib: [5, 12, 0.15] }));
      N(m, o, t, 0.7, 0.03, { type: 'highpass', f: 6500, a: 0.2, hold: 1, rel: 0.3 });
      return 0.95;
    },
    pirilKikir(m, o, t, p) {   // Pırıl kıkırdar: minik nefesli "hi-hi-hi-hii", her biri tatlı bir titreşimle aşağı kayar
      const n = Math.random() < 0.4 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const tt = t + i * 0.105, f = (1180 - i * 70) * p * (i === n - 1 ? 1.12 : 1), d = i === n - 1 ? 0.16 : 0.075;
        N(m, o, tt, 0.03, 0.06, { type: 'highpass', f: 2600, a: 0.003 });   // "h"
        T(m, o, tt + 0.01, f, d, 0.2, { f1: f * 0.84, type: 'triangle', a: 0.005, vib: [26, 40, 0.005] });
        T(m, o, tt + 0.01, f * 2, d * 0.7, 0.025, { f1: f * 1.7, a: 0.005 });
      }
      return 0.12 * n + 0.1;
    },
    pirilKukre(m, o, t, p) {   // minik, tatlı bir "rawr?": soru gibi yukarı kalkan yavru ejderha kükremesi ve küçük bir ışık pırıltısı
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.36, end = t + d + 0.05;
      os.setPeriodicWave(m.waves.brass);
      curve(os.frequency, t, [[0, 330 * p], [0.08, 400 * p], [0.26, 470 * p], [0.36, 560 * p]]);
      const l = c.createOscillator(), lg = gainNode(c, 45); l.frequency.value = 13; l.connect(lg); lg.connect(os.detune);   // yuvarlanan "rrr"
      lp.type = 'lowpass'; lp.frequency.value = 3000; lp.connect(g);
      [[[0, 900], [0.15, 1250], [0.36, 1000]], [[0, 1700], [0.2, 2100], [0.36, 1800]]].forEach((fs, k) => {   // "a-w" ünlüsü
        const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = k ? 5 : 3.5; curve(bq.frequency, t, fs.map(([a, f]) => [a, f * p]));
        const bg = gainNode(c, k ? 0.5 : 1); os.connect(bq); bq.connect(bg); bg.connect(lp);
      });
      env(g.gain, t, 0.03, 0.6, d, 1, 0.1); g.connect(o);
      os.start(t); l.start(t); os.stop(end); l.stop(end);
      N(m, o, t, 0.3, 0.03, { f: 1400 * p, a: 0.05, hold: 1, rel: 0.1 });
      sparkle(m, o, t + 0.3, 4, 2000 * p, 3200 * p, 0.15, 0.025);
      return 0.55;
    },
    pirilCivil(m, o, t, p) {   // neşeli cıvıltı: tatlı, titrek bir "prrr-iip!" (ejderha dilinde "evet!")
      T(m, o, t, 900 * p, 0.14, 0.14, { fs: [[0, 820 * p], [0.14, 1000 * p]], type: 'triangle', a: 0.01, vib: [30, 70, 0.005] });   // "prrr"
      T(m, o, t + 0.16, 1100 * p, 0.16, 0.2, { fs: [[0, 1000 * p], [0.06, 1500 * p], [0.16, 1650 * p]], type: 'triangle', a: 0.006 });   // "iip!"
      T(m, o, t + 0.16, 2200 * p, 0.1, 0.03, { fs: [[0, 2000 * p], [0.06, 3000 * p]], a: 0.006 });
      B(m, o, t + 0.3, 2637 * p, 0.3, 0.02, 4, 0.7);
      return 0.45;
    },
    pirilMutlu(m, o, t, p) {   // mutlu ejderha mırlaması "mrrr" ve sonunda soran gibi yükselen tatlı bir "ürü?"
      T(m, o, t, 240 * p, 0.42, 0.22, { fs: [[0, 230 * p], [0.2, 260 * p], [0.42, 250 * p]], type: 'triangle', hold: 1, a: 0.05, rel: 0.12, lp: 1500 });
      N(m, o, t, 0.42, 0.14, { type: 'lowpass', f: 700, a: 0.05, hold: 1, rel: 0.12, am: [27, 0.95] });   // "rrr"
      T(m, o, t + 0.42, 620 * p, 0.26, 0.15, { fs: [[0, 560 * p], [0.08, 640 * p], [0.26, 980 * p]], type: 'triangle', a: 0.02, vib: [8, 25, 0.05] });
      B(m, o, t + 0.6, 2093 * p, 0.35, 0.025, 4, 0.7);
      return 0.8;
    },
    isikKirinti(m, o, t, p) {   // ışık kırıntısı toplandı: kristal bir "ting" (art arda toplayınca yükselir, bkz. streak)
      B(m, o, t, 1568 * p, 0.5, 0.09, 3.5, 0.9); T(m, o, t, 3136 * p, 0.15, 0.03, { a: 0.001 });
      N(m, o, t, 0.15, 0.025, { type: 'highpass', f: 6500, a: 0.01 });
      return 0.5;
    },
    isikGeldi(m, o, t, p) {   // ejderha ışığı geri geldi: yükselen arp kaskadı, kanatlar açılır (vuuş + geniş major akor), pırıltı yağmuru
      arp(m, o, t, [523, 659, 784, 1047, 1319, 1568, 2093, 2637, 3136], 0.045, 0.6, 0.06, p);
      N(m, o, t + 0.38, 0.7, 0.17, { fs: [[0, 250 * p], [0.3, 1300 * p], [0.7, 380 * p]], q: 1.3, a: 0.15, hold: 1, rel: 0.35 });   // kanatlar açılıyor
      [262, 392, 523, 659, 784].forEach((f, i) => {   // kanat açılma akoru: yaylılar gibi, yavaşça kabaran
        T(m, o, t + 0.45, f * p, 1.9, 0.034, { wave: 'saw', det: (i - 2) * 6, lp: Math.min(f * 4, 3000), hold: 1, a: 0.3, rel: 0.9, vib: [5.2, 10, 0.4] });
        T(m, o, t + 0.45, f * p * 2, 1.9, 0.022, { wave: 'flute', hold: 1, a: 0.45, rel: 0.9, vib: [4.8, 12, 0.5] });
      });
      DRUM.timp(m, o, t + 0.45, 0.22, 65 * p);
      B(m, o, t + 0.45, 2093 * p, 1.6, 0.07, 4, 0.8);
      sparkle(m, o, t + 0.6, 16, 2000 * p, 4400 * p, 1.2, 0.035);
      N(m, o, t + 0.45, 1.8, 0.018, { type: 'highpass', f: 6500, a: 0.5, hold: 1, rel: 0.8 });
      return 2.5;
    },
    buyume(m, o, t, p) {   // final: Pırıl büyür: yavaş yükselen sihirli kabarma, en tepede kocaman parlak akor ve tınılar
      N(m, o, t, 1.4, 0.24, { fs: [[0, 300], [1.2, 2600], [1.4, 1800]], q: 2.5, a: 0.9, hold: 1, rel: 0.3 });
      T(m, o, t, 130 * p, 1.4, 0.07, { type: 'triangle', fs: [[0, 130 * p], [1.3, 523 * p]], hold: 1, a: 0.6, rel: 0.2, vib: [6, 20, 0.2] });
      for (let i = 0; i < 10; i++) B(m, o, t + i * 0.13, mtof(60 + [0, 4, 7][i % 3] + 12 * Math.floor(i / 3)) * p, 0.6, 0.04 + i * 0.003, 4, 0.7);
      [523, 659, 784, 1047].forEach((f, i) => T(m, o, t + 1.35, f * p, 1.6, 0.04, { wave: 'saw', det: (i - 1.5) * 6, lp: 2800, hold: 1, a: 0.08, rel: 0.9, vib: [5.5, 12, 0.3] }));
      DRUM.timp(m, o, t + 1.35, 0.25, 65 * p); DRUM.crash(m, o, t + 1.35, 0.05);
      sparkle(m, o, t + 1.4, 14, 2200 * p, 4400 * p, 1.0, 0.035);
      return 3.0;
    },
    ucus(m, o, t, p) {   // final: Feza Pırıl'ın sırtında uçuyor: uzun, yumuşak rüzgâr, ağır kanat çırpışları, tınılar
      N(m, o, t, 3, 0.22, { fs: [[0, 350], [1, 900], [2, 600], [3, 400]], q: 0.9, a: 0.8, hold: 1, rel: 1.0, am: [0.6, 0.5] });
      for (let i = 0; i < 4; i++) N(m, o, t + 0.3 + i * 0.6, 0.22, 0.16, { fs: [[0, 300 * p], [0.1, 800 * p], [0.22, 400 * p]], q: 1, a: 0.05, am: [14, 0.8] });
      for (let i = 0; i < 6; i++) B(m, o, t + 0.4 + i * 0.4 + rnd(0, 0.1), pick([1568, 1760, 2093, 2349, 2637]) * p, 0.7, 0.03, 4, 0.7);
      return 3.2;
    },
    bossNese(m, o, t, p) {   // boss neşelendi: yuvarlak "pof", kocaman neşeli arpej, alkış gibi pıtırtılar, kalp tınıları
      T(m, o, t, 200 * p, 0.3, 0.4, { f1: 700 * p, glide: 0.12, a: 0.004 });
      N(m, o, t, 0.25, 0.2, { type: 'lowpass', fs: [[0, 1800], [0.25, 400]], a: 0.004 });
      arp(m, o, t + 0.12, [523, 659, 784, 1047, 1319, 1568, 2093], 0.06, 0.6, 0.07, p);
      for (let i = 0; i < 8; i++) N(m, o, t + 0.2 + rnd(0, 0.6), 0.025, rnd(0.06, 0.12), { f: rnd(1300, 2300), q: 1.2, a: 0.001 });
      [523, 659, 784].forEach(f => T(m, o, t + 0.55, f * p * 2, 0.9, 0.03, { hold: 1, a: 0.05, rel: 0.6, vib: [5.5, 12, 0.2] }));
      sparkle(m, o, t + 0.5, 10, 2000 * p, 4000 * p, 0.6, 0.03);
      return 1.5;
    },
    // ── bölüm ortam sesleri
    damla(m, o, t, p) {   // mantar vadisinde su damlası: berrak "plip" ve hafif yankısı
      const f = rnd(900, 1300) * p;
      T(m, o, t, f, 0.08, 0.2, { f1: f * 2.3, glide: 0.05, a: 0.002 });
      T(m, o, t + 0.22, f * 1.02, 0.06, 0.05, { f1: f * 2.3, glide: 0.04, a: 0.002 });
      return 0.32;
    },
    mantarBoing(m, o, t, p) {   // pofuduk mantar şapkasında zıplama: yumuşak basılma, sonra lastik gibi "boyoyoing"
      N(m, o, t, 0.06, 0.12, { type: 'lowpass', f: 700, a: 0.008 });
      T(m, o, t + 0.02, 180 * p, 0.45, 0.36, { f1: 520 * p, glide: 0.12, a: 0.006, vib: [11, 70, 0.06] });
      B(m, o, t + 0.12, 1568 * p, 0.35, 0.025, 4, 0.7);
      return 0.5;
    },
    kabarcik(m, o, t, p) {   // mercan denizinde kabarcıklar: kısa, yumuşak "blub-blub"; her seferinde biraz farklı (sayı, aralık, yön, renk)
      const n = 2 + Math.floor(Math.random() * 3), gap = rnd(0.055, 0.09), up = Math.random() < 0.75, base = rnd(280, 380) * p, gl = rnd(1.8, 2.4);
      for (let i = 0; i < n; i++) {
        const f = base * (1 + (up ? i : n - 1 - i) * rnd(0.25, 0.4));
        T(m, o, t + i * gap + rnd(0, 0.015), f, rnd(0.06, 0.09), (0.2 - i * 0.025) * rnd(0.8, 1), { f1: f * gl, glide: 0.05, a: 0.004 });
      }
      if (Math.random() < 0.4) B(m, o, t + n * gap, rnd(2200, 3000) * p, 0.25, 0.012, 3.5, 0.6);   // ara sıra minik su ışıltısı
      return n * gap + 0.12;
    },
    kumFisilti(m, o, t, p) {   // çölde tatlı kum rüzgârı: kumların hışırtısı (yumuşak, tıss değil) ve uzaktan bir zil tınısı
      N(m, o, t, 1.2, 0.2, { fs: [[0, 900 * p], [0.6, 2200 * p], [1.2, 1100 * p]], q: 1.2, a: 0.4, hold: 1, rel: 0.5, am: [9, 0.5] });
      for (let i = 0; i < 6; i++) N(m, o, t + rnd(0.1, 1.0), 0.012, rnd(0.03, 0.06), { f: rnd(2500, 4000) * p, q: 3, a: 0.001 });
      B(m, o, t + 0.5, 2637 * p, 0.8, 0.018, 3.5, 0.8);
      return 1.3;
    },
    kumSaati(m, o, t, p) {   // dev kum saati döner (~1,4 s): tahta "tok", kum akışının yumuşak şıkırtısı, "tıngır tıngır" cam tınıları
      T(m, o, t, 700 * p, 0.06, 0.22, { f1: 520 * p, a: 0.001 }); N(m, o, t, 0.03, 0.12, { f: 1600 * p, q: 3, a: 0.0006 });
      N(m, o, t + 0.06, 1.25, 0.075, { fs: [[0, 2600 * p], [0.6, 3600 * p], [1.25, 2900 * p]], q: 1.5, a: 0.15, hold: 1, rel: 0.35, am: [31, 0.8] });   // akan kum
      for (let i = 0; i < 9; i++) N(m, o, t + 0.1 + rnd(0, 1.1), 0.01, rnd(0.025, 0.05), { f: rnd(3000, 4500) * p, q: 3, a: 0.0006 });   // kum taneleri
      [[0.1, 1760], [0.32, 2349], [0.55, 1976], [0.78, 2637], [1.0, 2093], [1.2, 2794]].forEach(([dt, f], i) =>
        B(m, o, t + dt, f * p, 0.6, 0.05 - i * 0.004, 2.76, 0.9));   // tıngır tıngır
      T(m, o, t + 1.3, 620 * p, 0.05, 0.12, { f1: 480 * p, a: 0.001 });   // yerine oturdu: küçük "tok"
      return 1.45;
    },
    tikTak(m, o, t, p) {   // saat kulesi: "tik-tak" (tahta, ikinci daha kalın)
      DRUM.tick(m, o, t, 0.3 * p); DRUM.tock(m, o, t + 0.25, 0.3 * p);
      return 0.32;
    },
    kurma(m, o, t, p) {   // kurmalı oyuncak anahtarı: "zırt-zırt-zırt" çark tıkırtıları yükselerek, sonunda bir "ting"
      for (let i = 0; i < 7; i++) {
        const tt = t + i * 0.06, q = p * (1 + i * 0.04);
        T(m, o, tt, 1800 * q, 0.02, 0.12, { a: 0.0005 }); N(m, o, tt, 0.015, 0.14, { f: 3000 * q, q: 2.5, a: 0.0005 });
      }
      B(m, o, t + 0.46, 2093 * p, 0.45, 0.05, 4, 0.8);
      return 0.65;
    },
    oyuncakDans(m, o, t, p) {   // müzik kutusundan kısa, neşeli bir ezgi (kutu açılınca / oyuncak dans edince)
      [[0, 84], [0.14, 88], [0.28, 91], [0.42, 96], [0.62, 91], [0.76, 93], [0.9, 96]].forEach(([dt, mm]) => INST.mbox(m, o, t + dt, mtof(mm) * p, 0.3, 0.09));
      return 1.6;
    },
    gokkusagiTini(m, o, t, p) {   // gökkuşağı köprüsü / adası: yedi renkli tını, yukarı süzülen arp ve hafif parıltı
      arp(m, o, t, [1047, 1175, 1319, 1568, 1760, 2093, 2349], 0.07, 0.7, 0.05, p, 4, 0.7);
      T(m, o, t, 523 * p, 1.0, 0.03, { wave: 'flute', hold: 1, a: 0.15, rel: 0.5, vib: [5, 10, 0.2] });
      N(m, o, t + 0.2, 0.7, 0.02, { type: 'highpass', f: 6500, a: 0.2 });
      return 1.1;
    },
    ruzgarCani(m, o, t, p) {   // rüzgâr çanı: üç beş ince cam/metal çubuk rastgele birbirine değer (pentatonik, hep uyumlu)
      const n = 3 + Math.floor(Math.random() * 3), sc = [0, 2, 4, 7, 9, 12, 14];
      for (let i = 0; i < n; i++) {
        const f = mtof(84 + pick(sc)) * p, tt = t + i * rnd(0.07, 0.14);
        B(m, o, tt, f, 1.1, 0.06 * rnd(0.7, 1), 2.76, 0.6);
        T(m, o, tt, f * 2.76, 0.4, 0.012, { a: 0.001 });
      }
      return 1.6;
    },
    hapsu(m, o, t, p) {   // Koca Pofuduk Mantar'ın komik hapşırığı: "ha... ha... HAP-şuu!" ve etrafa saçılan parlak sporlar
      [[0, 0.2, 330], [0.25, 0.22, 400]].forEach(([dt, d, f]) => {   // nefes alışlar: yükselen nefesli "ha"
        N(m, o, t + dt, d, 0.12, { f: 1200 * p, q: 1.2, a: d * 0.6, hold: 1, rel: 0.05 });
        T(m, o, t + dt, f * p, d, 0.08, { fs: [[0, f * p], [d, f * 1.3 * p]], type: 'triangle', lp: 1800, hold: 1, a: d * 0.5, rel: 0.05 });
      });
      const t2 = t + 0.52;
      N(m, o, t2, 0.08, 0.4, { type: 'lowpass', f: 2200, a: 0.003 });   // "HAP": yumuşak, yuvarlak patlama
      T(m, o, t2, 520 * p, 0.12, 0.3, { f1: 300 * p, type: 'triangle', a: 0.003 });
      N(m, o, t2 + 0.07, 0.28, 0.2, { f: 2800 * p, q: 1.4, a: 0.01, hold: 1, rel: 0.14 });   // "şş"
      T(m, o, t2 + 0.1, 440 * p, 0.28, 0.12, { f1: 300 * p, lp: 900, type: 'triangle', a: 0.02, vib: [7, 25, 0.05] });   // "uu"
      sparkle(m, o, t2 + 0.15, 6, 1600 * p, 3000 * p, 0.3, 0.03);
      return 0.95;
    },
    bulutPuf(m, o, t, p) {   // pofuduk bulut: yumuşacık "pufff" ve kıkırdar gibi titreyen hafif bir ses
      N(m, o, t, 0.45, 0.32, { type: 'lowpass', fs: [[0, 300 * p], [0.1, 1300 * p], [0.45, 400 * p]], q: 0.7, a: 0.04 });
      T(m, o, t + 0.05, 330 * p, 0.35, 0.1, { f1: 250 * p, type: 'triangle', a: 0.03, vib: [13, 40, 0.05] });
      return 0.5;
    },
    // extras
    nope(m, o, t, p) { T(m, o, t, 330 * p, 0.1, 0.14, { type: 'triangle', hold: 1, rel: 0.03 }); T(m, o, t + 0.12, 262 * p, 0.14, 0.14, { type: 'triangle', hold: 1, rel: 0.05 }); return 0.3; },
    open(m, o, t, p) { T(m, o, t, 620 * p, 0.09, 0.13, { f1: 930 * p }); B(m, o, t + 0.05, 1397 * p, 0.3, 0.05, 4, 0.7); return 0.35; },
    close(m, o, t, p) { T(m, o, t, 930 * p, 0.09, 0.13, { f1: 620 * p }); return 0.12; },
    cast(m, o, t, p) { N(m, o, t, 0.25, 0.14, { f: 800 * p, f1: 3000 * p, q: 1.2, a: 0.05 }); arp(m, o, t + 0.05, [1568, 2093], 0.05, 0.35, 0.06, p); return 0.4; },
  };
  // Loudness trim, calibrated offline (test/audio.html view=cal): voice ≈ -15, rewards -20…-23, combat -25…-28, steps -33
  // (speaker-weighted short-term loudness, dB). Keeps the order voice > effects > music.
  const SVOL = {
    swing: 0.42, swingBig: 0.58, hit: 0.82, hitSoft: 1.2, crit: 0.7, pop: 1.43, coin: 1.16, heart: 1.25, potion: 2.24,
    levelup: 2.12, unlock: 2.11, star: 1.89, spin: 1.5, ice: 1.64, shield: 1.44, zap: 3.8, meteorFall: 1.22, boom: 0.63,
    hurt: 1.24, chest: 2.54, portal: 2.12, break: 2.09, drop: 1.81, dropRare: 2.07, dropLegend: 2.74, click: 2.55, checkpoint: 2.67,
    roar: 0.68, bite: 1.53, spit: 1.95, fireball: 2.39, slam: 0.67, whoosh: 2.05, bat: 5.22, splash: 2.17, cheer: 2.61,
    step: 4.2, nope: 1.13, open: 2.12, close: 1.98, cast: 2.34,
    saberOn: 0.92, saberOff: 0.56, dig: 2.87, emerge: 1.13, bubble: 1.33, bubblePop: 1.5, sparkle: 1, celesta: 1,
    lava: 0.68, erupt: 0.58, drill: 0.5, roll: 1.43, bounce: 0.61, chirp: 2.14, splat: 0.91, rumble: 1.36,
    fizz: 2.55, cork: 1.04, slurp: 3.1, squish: 1.19, moo: 0.64,
    neigh: 0.49, gallop: 1.09, drum: 0.97, broom: 2.75, horn: 0.99, bell: 0.77, clank: 1.04,
    bonk: 1.08, hiccup: 1.44, munch: 1.8, sigh: 1.27, bilboBark: 1, bilboGuard: 1.5,
    // Pırıl ve bölüm sesleri (aynı yöntemle ölçüldü: ödüller ~-18, Pırıl yetenekleri ~-22…-25, ortam ~-30)
    kanat: 3.5, pirilPuf: 1.7, kopukKalkan: 1.5, kopukPat: 3.4, kanatRuzgar: 1.0, kalpTozu: 1.35, pirilKikir: 1.6, pirilMutlu: 0.54, pirilKukre: 0.47, pirilCivil: 1.9,
    isikKirinti: 3.5, isikGeldi: 1.46, buyume: 1.8, ucus: 1.5, bossNese: 2.07,
    damla: 3.05, mantarBoing: 0.83, kabarcik: 1.2, kumFisilti: 0.65, kumSaati: 2.0, tikTak: 0.9, kurma: 2.0, oyuncakDans: 0.8, gokkusagiTini: 1.35, bulutPuf: 2.0, ruzgarCani: 1.2, hapsu: 1,
  };
  // Random pitch spread (semitones, default 0.45), min retrigger gap (s) and "droppable when busy".
  const SVAR = { levelup: 0.05, unlock: 0.05, checkpoint: 0.05, chest: 0.1, dropLegend: 0.05, dropRare: 0.15, portal: 0.1, click: 0.15, coin: 0.05, pop: 0.08,
    saberOn: 0.1, saberOff: 0.1, drill: 0.2, rumble: 0.25, erupt: 0.3, cork: 0.6, slurp: 0.2, moo: 1.2,
    neigh: 0.3, gallop: 0.3, drum: 0.2, horn: 0.05, bell: 0.1, hiccup: 0.3, sigh: 0.2,
    isikKirinti: 0.03, isikGeldi: 0.05, buyume: 0.05, ucus: 0.1, bossNese: 0.1, kopukKalkan: 0.15, kalpTozu: 0.2, oyuncakDans: 0.05, gokkusagiTini: 0.05, tikTak: 0.1, kumSaati: 0.2, ruzgarCani: 0.03, hapsu: 0.3 };   // horn / bell: a tune and a tuned bell stay in tune
  const SGAP = { step: 0.07, hit: 0.035, hitSoft: 0.035, coin: 0.035, pop: 0.05, swing: 0.06, bat: 0.12, spit: 0.05, drop: 0.05, zap: 0.04, boom: 0.05, heart: 0.05,
    saberOn: 0.2, saberOff: 0.2, dig: 0.14, emerge: 0.08, bubble: 0.08, bubblePop: 0.04,
    lava: 0.3, erupt: 0.18, drill: 0.35, roll: 0.3, bounce: 0.1, chirp: 0.14, splat: 0.06, rumble: 0.7,
    fizz: 0.12, cork: 0.12, slurp: 0.5, squish: 0.06, moo: 7,   // moo: a rare ambient, never twice within 7 s however often it is asked for
    neigh: 0.7, gallop: 0.12, drum: 0.2, broom: 0.12, horn: 0.6, bell: 0.5, clank: 0.07,
    bonk: 0.08, hiccup: 0.2, munch: 0.3, sigh: 0.8, bilboBark: 1.2, bilboGuard: 0.5,
    kanat: 0.2, pirilPuf: 0.08, kopukKalkan: 0.3, kopukPat: 0.1, kanatRuzgar: 0.2, kalpTozu: 0.2, pirilKikir: 1.2, pirilMutlu: 1.2, pirilKukre: 1.2, pirilCivil: 0.8,
    isikKirinti: 0.035, isikGeldi: 1.5, buyume: 1.5, ucus: 1.5, bossNese: 0.5,
    damla: 0.25, mantarBoing: 0.1, kabarcik: 0.2, kumFisilti: 1.2, kumSaati: 0.5, tikTak: 0.4, kurma: 0.4, oyuncakDans: 1.2, gokkusagiTini: 0.4, bulutPuf: 0.2, ruzgarCani: 0.3, hapsu: 1.0 };   // munch: one per chew (GAME calls it every 0.5 s)   // gallop: one per hoof beat, strides ≥ 0.15 s apart all play
  const LOW = { step: 1, hitSoft: 1, swing: 1, bat: 1, spit: 1, drop: 1, click: 1, whoosh: 1, dig: 1, bubblePop: 1, lava: 1, chirp: 1, splat: 1,
    fizz: 1, squish: 1, moo: 1, broom: 1, clank: 1, munch: 1, kanat: 1, damla: 1, kabarcik: 1, kumFisilti: 1, tikTak: 1, kopukPat: 1 };
  const STREAK = [0, 2, 4, 7, 9, 12, 14, 16];   // coins picked up / enemies cheered up in a row climb a pentatonic scale

  function playRecipe(m, name, o, t) {
    const c = m.c, g = gainNode(c, o.g);
    let head = g;
    if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); head = pn; }
    head.connect(m.sfx);
    const len = SFX[name](m, g, t, o.p) || 1;
    return { len, g, head };
  }

  // Distance attenuation (full within 4 m, ~0.6 at 10 m, ~0.16 at 20 m) and gentle stereo pan by screen x.
  function spatial(x, z) {
    if (x === undefined || z === undefined) return [1, 0];
    const dx = x - lx, dz = z - lz, d = Math.sqrt(dx * dx + dz * dz), e = Math.max(0, d - 4) / 7;
    return [1 / (1 + e * e), cl(dx / 14, -0.7, 0.7)];
  }
  let active = 0, stepAlt = 0, effectEpoch = 0;
  const lastT = {}, streak = { coin: [0, -9], pop: [0, -9], isikKirinti: [0, -9] }, warned = {};
  function sfx(name, o) {
    if (!unlocked || !M || !A.soundOn || document.hidden || pageAway) return false;
    if (!SFX[name]) { if (!warned[name]) { warned[name] = 1; console.warn('AUD.sfx: unknown sound', name); } return false; }
    if (typeof o === 'number') o = { vol: o };
    o = o || {};
    const now = ctx.currentTime;
    if (now - (lastT[name] ?? -9) < (SGAP[name] ?? 0.025)) return false;
    if (active > 34 || (active > 22 && LOW[name])) return false;
    const sp = spatial(o.x, o.z), g = (o.vol ?? 1) * (SVOL[name] ?? 1) * sp[0], pan = sp[1];
    if (g < 0.02) return false;
    lastT[name] = now;
    let p = (o.pitch || 1) * semi(rnd(-1, 1) * (SVAR[name] ?? 0.45));
    if (name === 'step') p *= (stepAlt ^= 1) ? 1.04 : 0.96;
    const s = streak[name];
    if (s) { s[0] = now - s[1] < 0.5 ? Math.min(s[0] + 1, STREAK.length - 1) : 0; s[1] = now; p *= semi(STREAK[s[0]]); }
    try {
      const r = playRecipe(M, name, { g, p, pan }, now + 0.008);
      active++; const epoch = effectEpoch;
      setTimeout(() => { if (epoch === effectEpoch) active = Math.max(0, active - 1); try { r.head.disconnect(); } catch (e) { /* already gone */ } }, (r.len + 0.4) * 1000);
    } catch (e) { console.warn('AUD.sfx', name, e); return false; }
    return true;
  }

  // ───────────────────────── music: instruments ─────────────────────────
  const INST = {
    pad(m, out, t, f, d, v) { for (const det of [-9, 9]) T(m, out, t, f, d, v * 0.5, { wave: 'saw', det, hold: 1, a: Math.min(0.6, d * 0.3), rel: Math.min(0.9, d * 0.4) }); },
    bass(m, out, t, f, d, v) { T(m, out, t, f, d, v, { type: 'triangle', hold: 1, a: 0.012, rel: 0.08 }); T(m, out, t, f, d, v * 0.6, { hold: 1, a: 0.012, rel: 0.08 }); },
    pbass(m, out, t, f, d, v) { d = Math.max(d, 0.3); T(m, out, t, f, d, v, { wave: 'saw', lp: [[0, f * 7], [0.12, f * 2.2]], q: 2, a: 0.004 }); T(m, out, t, f, d, v * 0.7, { a: 0.004 }); },
    marimba(m, out, t, f, d, v) { d = cl(d * 2, 0.35, 0.8); T(m, out, t, f, d, v, { a: 0.002 }); T(m, out, t, f * 4, d * 0.16, v * 0.22, { a: 0.001 }); },
    kalimba(m, out, t, f, d, v) { T(m, out, t, f, 0.9, v, { a: 0.002 }); T(m, out, t, f * 5.4, 0.07, v * 0.18, { a: 0.001 }); },
    celesta(m, out, t, f, d, v) { B(m, out, t, f, 1.1, v, 4, 0.85); T(m, out, t, f * 2, 0.3, v * 0.12, { a: 0.001 }); },
    glock(m, out, t, f, d, v) { T(m, out, t, f, 1.2, v, { a: 0.001 }); T(m, out, t, f * 2.76, 0.35, v * 0.3, { a: 0.001 }); T(m, out, t, f * 5.4, 0.12, v * 0.1, { a: 0.001 }); },
    ocarina(m, out, t, f, d, v) { T(m, out, t, f, Math.max(d, 0.12), v, { wave: 'flute', hold: 1, a: 0.035, rel: 0.08, vib: [5.2, 14, 0.18] }); N(m, out, t, 0.08, v * 0.06, { f: f * 2, q: 6, a: 0.01 }); },
    brass(m, out, t, f, d, v) { d = Math.max(d, 0.12); T(m, out, t, f, d, v, { wave: 'brass', hold: 1, a: 0.025, rel: 0.09, lp: [[0, f * 1.5], [0.05, f * 5], [0.25, f * 3]], q: 1, vib: [5.5, 9, 0.22] }); },
    chip(m, out, t, f, d, v) { T(m, out, t, f, Math.max(d, 0.08), v, { wave: 'sq', lp: 3500, hold: 1, a: 0.005, rel: 0.04, vib: [6, 8, 0.15] }); },
    pluck(m, out, t, f, d, v) { T(m, out, t, f, cl(d * 2, 0.25, 0.6), v, { wave: 'saw', lp: [[0, f * 8], [0.1, f * 2]], a: 0.002 }); },
    // steel pan: round sine body (starts a hair sharp), strong octave, a little twelfth and a bright stick "ping" that mellows fast
    steel(m, out, t, f, d, v) {
      const dd = cl(d * 2.2, 0.45, 1.0);
      T(m, out, t, f, dd, v, { fs: [[0, f * 1.012], [0.03, f]], a: 0.003 });
      T(m, out, t, f * 2, dd * 0.6, v * 0.5, { det: 3, a: 0.002 });
      T(m, out, t, f * 3, dd * 0.28, v * 0.2, { det: -5, a: 0.001 });
      T(m, out, t, f * 4.02, 0.06, v * 0.1, { a: 0.001 });
    },
    // ── Round 4: Kefir Vadisi's little village band ──
    // accordion: two reeds tuned a hair apart (the "musette" shimmer, ~3 Hz beating), soft bellows attack, gently rounded top
    accordion(m, out, t, f, d, v) {
      d = Math.max(d, 0.05);   // short enough for the quick folk-turn notes
      const lp = Math.min(f * 5, 4000);
      T(m, out, t, f, d, v * 0.55, { wave: 'saw', det: -7, lp, q: 0.6, hold: 1, a: 0.03, rel: 0.07 });
      T(m, out, t, f, d, v * 0.45, { wave: 'sq', det: 8, lp, q: 0.6, hold: 1, a: 0.035, rel: 0.07 });
    },
    // ukulele: soft nylon pluck (the brightness closes quickly), a hair of pitch settle at the start
    uke(m, out, t, f, d, v) { T(m, out, t, f, 0.5, v, { wave: 'saw', fs: [[0, f * 1.006], [0.02, f]], lp: [[0, f * 6], [0.05, f * 2.2], [0.5, f * 1.2]], q: 0.8, a: 0.002 }); },
    // xylophone: hard mallet on a wooden bar: bright body, its tuned 3rd-harmonic overtone and a tiny woody tick, short
    xylo(m, out, t, f, d, v) {
      T(m, out, t, f, 0.34, v, { a: 0.001 });
      T(m, out, t, f * 3, 0.13, v * 0.28, { a: 0.001 });
      T(m, out, t, Math.min(f * 6.3, 16000), 0.025, v * 0.1, { a: 0.0005 });
    },
    // bağlama (saz): bright metallic pluck with its octave string; long notes turn into the saz's quick tremolo picking
    saz(m, out, t, f, d, v) {
      const one = (tt, vv) => {
        T(m, out, tt, f, 0.38, vv, { wave: 'saw', det: 4, lp: [[0, f * 9], [0.05, f * 3], [0.38, f * 1.6]], q: 1.5, a: 0.001 });
        T(m, out, tt, f * 2, 0.22, vv * 0.3, { wave: 'saw', det: -6, lp: [[0, f * 10], [0.05, f * 4]], q: 1, a: 0.001 });
      };
      if (d < 0.32) { one(t, v); return; }
      const step = 0.078, n = Math.min(8, Math.floor(d / step));
      for (let i = 0; i < n; i++) one(t + i * step, v * (i ? 0.5 - i * 0.025 : 1));
    },
    // ── Round 5: Surlu Şehir's market-day players ──
    // recorder: a pure, breathy pipe with a soft "tu" chiff at the start of each note and only a hint of late vibrato
    recorder(m, out, t, f, d, v) {
      d = Math.max(d, 0.06);
      T(m, out, t, f, d, v, { wave: 'rec', fs: [[0, f * 0.985], [0.022, f]], hold: 1, a: 0.016, rel: 0.05, vib: [5.5, 7, 0.28] });
      N(m, out, t, 0.035, v * 0.18, { f: Math.min(f * 3, 7000), q: 3, a: 0.003 });   // chiff
      if (d > 0.3) N(m, out, t, d, v * 0.02, { f: f * 2, q: 7, hold: 1, a: 0.06, rel: 0.05 });   // breath under a long note
    },
    // lute (ud): warm gut strings in a pair a hair apart (the 2nd plucked a moment later), round and woody, darker than the saz;
    // long notes get the quick tremolo picking (the light Anatolian touch)
    lute(m, out, t, f, d, v) {
      const one = (tt, vv) => {
        T(m, out, tt, f, 0.6, vv * 0.62, { wave: 'saw', det: -3, lp: [[0, f * 6], [0.035, f * 2.4], [0.6, f * 1.2]], q: 0.7, a: 0.0015 });
        T(m, out, tt + 0.006, f, 0.5, vv * 0.4, { wave: 'sq', det: 5, lp: [[0, f * 4], [0.05, f * 1.6]], q: 0.7, a: 0.002 });
      };
      if (d < 0.34) { one(t, v); return; }
      const step = 0.076, n = Math.min(8, Math.floor(d / step));
      for (let i = 0; i < n; i++) one(t + i * step, v * (i ? 0.52 - i * 0.025 : 1));
    },
    // ── Feza ile Pırıl: Kayıp Ejderha Işıkları — masal orkestrası ──
    // yaylılar: iki hafif akortsuz testere, yumuşak açılış, geç gelen vibrato; koyu tutulur (tablet hoparlöründe sıcak)
    strings(m, out, t, f, d, v) {
      const a = Math.min(0.45, d * 0.3), r = Math.min(0.9, d * 0.4), lp = Math.min(f * 3.2, 2600);
      T(m, out, t, f, d, v * 0.55, { wave: 'saw', det: -6, lp, q: 0.5, hold: 1, a, rel: r, vib: [5.1, 9, 0.35] });
      T(m, out, t, f, d, v * 0.45, { wave: 'saw', det: 7, lp, q: 0.5, hold: 1, a: a * 1.2, rel: r, vib: [5.6, 8, 0.45] });
    },
    // yumuşak koro "uuu": üç ses (her biri biraz farklı akort ve vibrato), alttan süzülmüş, nefesli
    choir(m, out, t, f, d, v) {
      const a = Math.min(0.6, d * 0.35), r = Math.min(1.0, d * 0.45), lp = Math.min(f * 2.1, 1300);
      for (let k = 0; k < 3; k++) T(m, out, t, f, d, v * 0.36, { wave: 'saw', det: (k - 1) * 9, lp, q: 0.6, hold: 1, a: a * (1 + k * 0.15), rel: r, vib: [4.4 + k * 0.5, 11, 0.3] });
      N(m, out, t, d, v * 0.05, { f: Math.min(f * 2, 3000), q: 4, hold: 1, a, rel: r });   // nefes
    },
    // arp: parmakla çekilen tel: yuvarlak gövde, oktav, açılışta biraz parlak; uzun tınlar
    harp(m, out, t, f, d, v) {
      const dd = cl(d * 3, 0.9, 1.8);
      T(m, out, t, f, dd, v, { type: 'triangle', lp: [[0, f * 6], [0.08, f * 2.2]], a: 0.002 });
      T(m, out, t, f * 2, dd * 0.4, v * 0.22, { a: 0.002 });
    },
    // flüt: saf, nefesli, yumuşak "tu" girişi ve geç vibrato
    flute(m, out, t, f, d, v) {
      d = Math.max(d, 0.1);
      T(m, out, t, f, d, v, { wave: 'flute', fs: [[0, f * 0.99], [0.03, f]], hold: 1, a: 0.04, rel: 0.09, vib: [5, 11, 0.25] });
      N(m, out, t, 0.05, v * 0.12, { f: Math.min(f * 2.5, 7000), q: 3, a: 0.006 });
      if (d > 0.3) N(m, out, t, d, v * 0.03, { f: f * 2, q: 6, hold: 1, a: 0.1, rel: 0.08 });
    },
    // ney rengi (çöl): daha nefesli, yavaş vibratolu, biraz kayarak giren flüt
    ney(m, out, t, f, d, v) {
      d = Math.max(d, 0.15);
      T(m, out, t, f, d, v, { wave: 'flute', fs: [[0, f * 0.97], [0.08, f]], hold: 1, a: 0.08, rel: 0.12, vib: [4.5, 16, 0.3] });
      N(m, out, t, d, v * 0.09, { f: Math.min(f * 1.5, 5000), q: 2.5, hold: 1, a: 0.06, rel: 0.1 });
    },
    // vibrafon: yuvarlak metal çubuk, motorun "vau-vau" titremesi (AM), uzun tınlama
    vibes(m, out, t, f, d, v) {
      const c = m.c, dd = cl(d * 2.5, 0.8, 1.8), end = t + dd + 0.05, am = gainNode(c, 0.78), l = c.createOscillator(), lg = gainNode(c, 0.22);
      l.frequency.value = 5.3; l.connect(lg); lg.connect(am.gain); am.connect(out); l.start(t); l.stop(end);
      T(m, am, t, f, dd, v, { a: 0.002 });
      T(m, am, t, f * 4, dd * 0.22, v * 0.12, { a: 0.001 });
    },
    // müzik kutusu: tarak dişi: çok kısa vuruş, ince metalik üst ses, yavaş sönen saf tını
    mbox(m, out, t, f, d, v) {
      T(m, out, t, f, 1.3, v, { a: 0.001 });
      T(m, out, t, f * 3.01, 0.35, v * 0.2, { a: 0.0008 });
      T(m, out, t, Math.min(f * 5.9, 15000), 0.08, v * 0.12, { a: 0.0005 });
    },
    // oyuncak piyano: metal çubuk: parlak, biraz "yanlış" (inharmonik) üst sesler, kısa
    toypiano(m, out, t, f, d, v) {
      T(m, out, t, f, 0.7, v, { a: 0.001 });
      T(m, out, t, f * 2.02, 0.35, v * 0.3, { a: 0.001 });
      T(m, out, t, Math.min(f * 3.87, 15000), 0.18, v * 0.2, { a: 0.0008 });
      N(m, out, t, 0.012, v * 0.4, { f: 3000, q: 2, a: 0.0005 });
    },
    // pizzicato: yaylı telin parmakla çekilmesi; parmak uçlarında yürüyüş için
    pizz(m, out, t, f, d, v) {
      T(m, out, t, f, 0.3, v, { type: 'triangle', lp: [[0, f * 5], [0.04, f * 1.6]], a: 0.002 });
      T(m, out, t, f * 2, 0.12, v * 0.2, { a: 0.002 });
    },
    // kanun: parlak, metalik çekme; uzun notalar kanunun hızlı tremolosuna dönüşür (hafif oryantal renk)
    kanun(m, out, t, f, d, v) {
      const one = (tt, vv) => {
        T(m, out, tt, f, 0.42, vv, { wave: 'saw', lp: [[0, f * 10], [0.03, f * 3.5], [0.42, f * 1.5]], q: 1.2, a: 0.001 });
        T(m, out, tt, f * 2, 0.2, vv * 0.22, { a: 0.001 });
      };
      if (d < 0.3) { one(t, v); return; }
      const step = 0.065, n = Math.min(9, Math.floor(d / step));
      for (let i = 0; i < n; i++) one(t + i * step, v * (i ? 0.5 - i * 0.02 : 1));
    },
  };
  const DRUM = {
    kick(m, o, t, v) { T(m, o, t, 150, 0.22, v, { fs: [[0, 150], [0.09, 50]], a: 0.002 }); N(m, o, t, 0.012, v * 0.2, { type: 'lowpass', f: 1800 }); },
    snare(m, o, t, v) { N(m, o, t, 0.13, v, { f: 1900, q: 0.8, a: 0.001 }); T(m, o, t, 200, 0.07, v * 0.5, { f1: 160, type: 'triangle' }); },
    rim(m, o, t, v) { T(m, o, t, 820, 0.035, v, { a: 0.001 }); N(m, o, t, 0.025, v * 0.5, { f: 2400, q: 2, a: 0.001 }); },
    clap(m, o, t, v) { for (let i = 0; i < 3; i++) N(m, o, t + i * 0.011, 0.02, v * 0.7, { f: 1300, q: 1.1, a: 0.001 }); N(m, o, t + 0.03, 0.12, v * 0.55, { f: 1300, q: 1.1, a: 0.002 }); },
    hat(m, o, t, v) { N(m, o, t, 0.035, v, { type: 'highpass', f: 7500, q: 0.7, a: 0.001 }); },
    shaker(m, o, t, v) { N(m, o, t, 0.07, v, { f: 5500, q: 1.2, a: 0.012 }); },
    wood(m, o, t, v) { T(m, o, t, 1000, 0.06, v, { a: 0.001 }); T(m, o, t, 2300, 0.03, v * 0.3, { a: 0.001 }); },
    tamb(m, o, t, v) { N(m, o, t, 0.06, v, { type: 'highpass', f: 6500, a: 0.002 }); N(m, o, t, 0.12, v * 0.5, { f: 9000, q: 4, a: 0.002 }); },
    crash(m, o, t, v) { N(m, o, t, 1.4, v, { type: 'highpass', f: 5000, q: 0.5, a: 0.005 }); },
    swell(m, o, t, v, d = 1) { N(m, o, t, d, v, { type: 'highpass', f: 4000, q: 0.5, a: d * 0.9, hold: 1, rel: 0.05 }); },
    timp(m, o, t, v, f = 98) { T(m, o, t, f * 1.4, 0.6, v, { f1: f, glide: 0.05, a: 0.003 }); N(m, o, t, 0.1, v * 0.3, { type: 'lowpass', f: 300 }); },
    conga(m, o, t, v, f = 196) { T(m, o, t, f * 1.35, 0.26, v, { f1: f, glide: 0.03, a: 0.002 }); N(m, o, t, 0.02, v * 0.3, { f: 1800, q: 1.2, a: 0.001 }); },
    bongo(m, o, t, v, f = 392) { T(m, o, t, f * 1.3, 0.13, v, { f1: f, glide: 0.02, a: 0.001 }); N(m, o, t, 0.012, v * 0.3, { f: 3000, q: 1.5, a: 0.001 }); },
    // darbuka: "düm" = round centre stroke (with a higher body partial so tablet speakers still hear it), "tek" = crisp rim, "ka" = soft rim
    dum(m, o, t, v) { T(m, o, t, 150, 0.3, v, { fs: [[0, 150], [0.05, 104]], a: 0.002 }); T(m, o, t, 245, 0.11, v * 0.35, { f1: 195, a: 0.002 }); N(m, o, t, 0.02, v * 0.15, { type: 'lowpass', f: 1500 }); },
    tek(m, o, t, v) { T(m, o, t, 720, 0.06, v * 0.5, { f1: 640, a: 0.0008 }); N(m, o, t, 0.05, v, { f: 3200, q: 1.4, a: 0.0008 }); },
    ka(m, o, t, v) { N(m, o, t, 0.035, v, { f: 2600, q: 1.6, a: 0.001 }); T(m, o, t, 680, 0.04, v * 0.3, { a: 0.001 }); },
    // saat: "tik" (ince tahta) ve "tak" (kalın tahta)
    tick(m, o, t, v) { T(m, o, t, 2350, 0.03, v, { a: 0.0006 }); N(m, o, t, 0.012, v * 0.5, { f: 5000, q: 3, a: 0.0005 }); },
    tock(m, o, t, v) { T(m, o, t, 1400, 0.045, v, { a: 0.0006 }); N(m, o, t, 0.015, v * 0.4, { f: 2800, q: 3, a: 0.0005 }); },
    tri(m, o, t, v) { T(m, o, t, 2960, 0.9, v, { a: 0.001 }); T(m, o, t, 2960 * 2.7, 0.3, v * 0.25, { a: 0.001 }); },   // üçgen zil
    zil(m, o, t, v) { B(m, o, t, 2489, 0.9, v, 1.41, 1.6); N(m, o, t, 0.4, v * 0.15, { f: 7000, q: 2, a: 0.002 }); },   // parmak zili
    drip(m, o, t, v, f = 1100) { T(m, o, t, f, 0.07, v, { f1: f * 2.2, glide: 0.05, a: 0.002 }); },   // su damlası
    blub(m, o, t, v, f = 380) { T(m, o, t, f, 0.08, v, { f1: f * 2, glide: 0.06, a: 0.004 }); },   // kabarcık
  };

  // ───────────────────────── music: themes ─────────────────────────
  const MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], AEO = [0, 2, 3, 5, 7, 8, 10];
  const LYD = [0, 2, 4, 6, 7, 9, 11], MIX = [0, 2, 4, 5, 7, 9, 10], HIC = [0, 1, 4, 5, 7, 8, 10];   // hicaz: çöl rengi
  const IV = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], s4: [0, 5, 7], s2: [0, 2, 7], a9: [0, 4, 7, 14], m9: [0, 3, 7, 14], D7: [0, 4, 7, 10] };
  const C = (r, q) => ({ r, iv: IV[q] });
  // 16-bar forms "a b c d | a b c e | bridge | a b c e" so the melody's A phrase fits both halves.
  const form = (a, b, c, d, e, br) => [a, b, c, d, a, b, c, e].concat(br, [a, b, c, e]);
  // Ezgi kalıbı: [[sekizlik, süre (sekizlik), midi], ...] 4 ölçü → genBars ile aynı biçim ({s, d, m})
  const mot = a => a.map(([s, d, m]) => ({ s, d, m }));
  const THEMES = {
    // ── Başlık: sıcak, rüya gibi. Yaylılar zemin, arp akışı, celesta ile akılda kalan bir ezgi, ikinci yarıda yumuşak koro "uuu"
    pr_menu: {
      bpm: 70, key: 3, scale: MAJ, vol: 0.92, swing: 0, fadeIn: 2,
      prog: form(C(39, 'M7'), C(36, 'm9'), C(44, 'M7'), C(46, 's4'), C(46, 'M'), [C(44, 'M7'), C(43, 'm7'), C(41, 'm7'), C(46, 's4')]),
      pad: { inst: 'strings', vol: 0.026, lo: 55, n: 4, cut: 1700 },
      bass: { inst: 'bass', pat: ['r.......', 'r...5...'], vol: 0.04, oct: 12 },
      arp: { inst: 'harp', step: 8, pat: ['0123.321', '0123.312'], lo: 63, vol: 0.02 },
      lead: { inst: 'celesta', alt: 'mbox', lo: 72, hi: 86, vol: 0.046, cells: 'slow', plan: [1, 1, 2, 1],
        motif: mot([[0, 3, 82], [3, 1, 79], [4, 2, 82], [6, 2, 86], [8, 3, 84], [11, 1, 82], [12, 4, 79],
          [16, 2, 80], [18, 2, 84], [20, 2, 82], [22, 2, 79], [24, 4, 77], [28, 4, 75]]) },
      extra(p, t, bar, ch) {
        if (bar % 16 >= 4) voice(ch, 62, 3).forEach(mm => p.note('choir', t, mm, p.beat * 4 + 0.3, 0.011));   // koro "uuu"
        if (bar % 2 && Math.random() < 0.6) p.note('celesta', t + p.beat * pick([1.5, 2.5, 3.5]), pick(ch.iv) + ch.r + 48, 1, 0.011);   // yıldız pırıltısı
      },
    },
    // ── Işıklı Mantar Vadisi: alacakaranlık, gizemli ama sevimli. Parmak ucunda pizzicato, damla gibi marimba, yumuşak bas,
    //    tahta "tok"lar; mantarlardan düşen su damlaları ve parlayan sporların tınısı
    pr_mantar: {
      bpm: 96, key: 9, scale: DOR, vol: 0.92, swing: 0.14, drumsIn: 4,
      prog: form(C(45, 'm9'), C(50, 'M'), C(45, 'm7'), C(43, 's4'), C(43, 'M'), [C(48, 'M7'), C(43, 'M'), C(40, 'm7'), C(50, 'M')]),
      pad: { vol: 0.028, lo: 57, n: 3, cut: 900 },
      bass: { inst: 'bass', pat: ['r..5r...', 'r..5r.f.'], vol: 0.05, oct: 12 },
      stab: { inst: 'pizz', pos: [2, 6], lo: 57, n: 2, vol: 0.022 },
      lead: { inst: 'marimba', alt: 'kalimba', lo: 69, hi: 86, vol: 0.05, cells: 'mid', plan: [1, 1, 2, 1], echo: 1 },
      kit: { wood: ['x.....x...x.....', 0.016], shaker: ['..o...o...o...o.', 0.007] },
      fill(p, t, bar, ch) { voice(ch, 69, 4).forEach((mm, i) => p.note('kalimba', t + p.beat * (3 + i * 0.25), mm, 0.2, 0.02)); },
      extra(p, t, bar, ch) {
        if (Math.random() < 0.6) { const tt = t + p.beat * rnd(0, 3.5), f = rnd(1000, 1500); p.drum('drip', tt, 0.02, f); p.drum('drip', tt + p.beat * 0.75, 0.007, f); }
        if (Math.random() < 0.4) B(p.M, p.out, t + p.beat * pick([0.5, 1.5, 2.5, 3.5]), pick([2349, 2637, 3136, 3520]), 0.8, 0.011, 3.5, 0.9);   // spor pırıltısı
        if (bar % 4 === 2 && Math.random() < 0.7) { const tt = t + p.beat * rnd(0.5, 2); for (let i = 0; i < 5; i++) p.drum('drip', tt + i * rnd(0.06, 0.11), 0.007, rnd(1300, 2100)); }   // dere şırıltısı
        if (bar % 8 === 6) voice(ch, 76, 2).forEach((mm, i) => B(p.M, p.out, t + p.beat * (1 + i * 1.5), mtof(mm), 1.6, 0.012, 2.76, 0.5));   // yumuşak çan
      },
    },
    // ── Mercan Denizi Bahçesi: kabarcıklı, yüzer gibi (salınan, üçlemeye yakın ritim). Vibrafon ezgisi, kalimba dalgaları,
    //    lidya rengi (yüzme hissi), yumuşak konga; aralarda yükselen kabarcıklar ve su ışıltısı
    pr_mercan: {
      bpm: 84, key: 2, scale: LYD, vol: 0.94, swing: 0.3, drumsIn: 4,
      prog: form(C(38, 'M7'), C(40, 'M'), C(47, 'm7'), C(45, 's2'), C(40, 'M'), [C(42, 'm7'), C(47, 'm7'), C(37, 'm7'), C(40, 'M')]),
      pad: { inst: 'strings', vol: 0.02, lo: 57, n: 3, cut: 1500 },
      bass: { inst: 'bass', pat: ['r.....5.'], vol: 0.05, oct: 12 },
      arp: { inst: 'kalimba', step: 8, pat: ['0.21.32.', '0.12.31.'], lo: 62, vol: 0.024 },
      lead: { inst: 'vibes', alt: 'kalimba', lo: 69, hi: 86, vol: 0.05, cells: 'mid', plan: [1, 1, 2, 1] },
      kit: { conga: ['x.....o...x.....', 0.022], shaker: ['o.o.o.o.o.o.o.o.', 0.006] },
      extra(p, t, bar, ch) {
        if (Math.random() < 0.55) { const tt = t + p.beat * rnd(0, 3), n = 3 + (Math.random() < 0.5 ? 1 : 0), f = rnd(300, 420); for (let i = 0; i < n; i++) p.drum('blub', tt + i * 0.09, 0.016 - i * 0.002, f * (1 + i * 0.3)); }
        if (bar % 8 === 7) voice(ch, 81, 5).forEach((mm, i) => p.note('glock', t + p.beat * (2 + i / 3), mm, 0.3, 0.011));   // su ışıltısı
      },
    },
    // ── Kum Saati Çölü: sıcak, hafif oryantal (hicaz rengi). Kanun ezgisi, ud akorları, darbuka "düm-tek" (maksum),
    //    ara sıra ney ve parmak zili
    pr_col: {
      bpm: 100, key: 2, scale: HIC, vol: 1.45, swing: 0.06, drumsIn: 2,
      prog: form(C(38, 'M'), C(36, 'm'), C(39, 'M'), C(38, 'M'), C(38, 'M'), [C(43, 'm'), C(36, 'm'), C(39, 'M'), C(38, 'M')]),
      pad: { inst: 'strings', vol: 0.015, lo: 57, n: 3, cut: 1200 },
      bass: { inst: 'pbass', pat: ['r..r..5.', 'r..r.5o.'], vol: 0.06, oct: 12 },
      arp: { inst: 'lute', step: 8, pat: ['0.1.2.1.', '0.12.21.'], lo: 57, vol: 0.019 },
      lead: { inst: 'kanun', alt: 'ney', lo: 69, hi: 86, vol: 0.046, cells: 'mid', plan: [1, 1, 2, 1], orn: 0.3 },
      kit: { dum: ['x.......x.......', 0.08], tek: ['..x...x.....x...', 0.028], ka: ['..........o...o.', 0.014] },
      fill(p, t) { for (let i = 10; i < 16; i++) p.drum(i & 1 ? 'ka' : 'tek', t + i * p.beat / 4, 0.016 + (i - 10) * 0.004); },
      extra(p, t, bar, ch) {
        if (bar % 4 === 0) p.drum('zil', t, 0.016);
        if (bar % 8 === 5 && Math.random() < 0.7) { const v = voice(ch, 74, 3); p.note('ney', t + p.beat * 2, v[2], p.beat * 1.8, 0.022); }
      },
    },
    // ── Saat Kulesi Oyuncak Atölyesi: tik-tak ritmi, oyuncak piyano ezgisi (ksilofon ikizi), müzik kutusu, zıplayan bas
    pr_atolye: {
      bpm: 112, key: 0, scale: MAJ, vol: 1.5, swing: 0,
      prog: form(C(48, 'M'), C(45, 'm7'), C(41, 'M'), C(43, 'M'), C(43, 'D7'), [C(41, 'M'), C(40, 'm7'), C(38, 'm7'), C(43, 'D7')]),
      pad: { vol: 0.013, lo: 60, n: 3, cut: 1200 },
      bass: { inst: 'pbass', pat: ['r.5.r.5.', 'r.5.r.3o'], vol: 0.055 },
      arp: { inst: 'mbox', step: 8, pat: ['0.2.1.2.', '0.2.13..'], lo: 72, vol: 0.017 },
      lead: { inst: 'toypiano', alt: 'xylo', lo: 72, hi: 88, vol: 0.046, cells: 'mid', plan: [1, 1, 2, 1], dbl: { inst: 'xylo', vol: 0.012, oct: 0 } },
      kit: { tick: ['x.......x.......', 0.028], tock: ['....x.......x...', 0.028], kick: ['x.......x.......', 0.05] },
      fill(p, t) { for (let i = 0; i < 6; i++) p.drum('tick', t + p.beat * (2.5 + i * 0.25), 0.014 + i * 0.003); },   // kurma tıkırtısı
      extra(p, t, bar) {
        if (bar % 16 === 0 && bar > 0) p.drum('tri', t, 0.02);
        if (bar % 8 === 3 && Math.random() < 0.5) { const f = 200; T(p.M, p.out, t + p.beat * 3, f, 0.35, 0.02, { f1: f * 2.6, glide: 0.1, a: 0.005, vib: [12, 60, 0.05] }); }   // yay "boing"
      },
    },
    // ── Gökkuşağı Adaları: geniş, uçar gibi. Flüt ezgisi, akan arp on altılıları, dolgun yaylılar, köprüde koro,
    //    cümle başlarında yumuşak timpani
    pr_gokkusagi: {
      bpm: 92, key: 7, scale: MAJ, vol: 0.8, swing: 0,
      prog: form(C(43, 'M'), C(40, 'm7'), C(48, 'M7'), C(50, 's4'), C(50, 'M'), [C(48, 'M7'), C(50, 'M'), C(47, 'm7'), C(50, 's4')]),
      pad: { inst: 'strings', vol: 0.028, lo: 55, n: 4, cut: 2200 },
      bass: { inst: 'bass', pat: ['r.......', 'r...5...'], vol: 0.045, oct: 12 },
      arp: { inst: 'harp', step: 16, pat: ['0123212301232123'], lo: 62, vol: 0.014 },
      lead: { inst: 'flute', alt: 'celesta', lo: 72, hi: 88, vol: 0.05, cells: 'slow', plan: [1, 1, 2, 1] },
      kit: { shaker: ['o.o.o.o.o.o.o.o.', 0.005] }, drumsIn: 4,
      extra(p, t, bar, ch) {
        if (bar % 4 === 0) p.drum('timp', t, 0.06, mtof(ch.r));
        if (bar % 16 >= 8 && bar % 16 < 12) voice(ch, 60, 3).forEach(mm => p.note('choir', t, mm, p.beat * 4 + 0.3, 0.012));
        if (bar % 8 === 7) voice(ch, 67, 8).forEach((mm, i) => p.note('harp', t + p.beat * (3 + i / 8), mm, 0.3, 0.016));   // glissando
      },
    },
    // ── Final: önce kısa bir fanfar (arp glissandosu, kanat açılma akoru, "ta-ta-ta-taaa"), sonra neşeli kutlama döngüsü
    pr_final: {
      bpm: 120, key: 0, scale: MAJ, vol: 1.1, swing: 0, fadeIn: 0.05,
      prog: form(C(48, 'M'), C(45, 'm'), C(41, 'M'), C(43, 'M'), C(43, 'D7'), [C(41, 'M'), C(43, 'M'), C(40, 'm'), C(45, 'm')]),
      pad: { inst: 'strings', vol: 0.022, lo: 60, n: 3, cut: 1800 },
      bass: { inst: 'pbass', pat: ['r.5.r.5.', 'r.3.5.o.'], vol: 0.08 },
      arp: { inst: 'harp', step: 8, pat: ['01232123'], lo: 64, vol: 0.016 },
      lead: { inst: 'glock', alt: 'flute', lo: 72, hi: 88, vol: 0.042, cells: 'mid', plan: [1, 1, 2, 1], dbl: { inst: 'celesta', vol: 0.012, oct: 0 } },
      kit: { kick: ['x.......x.......', 0.12], clap: ['....x.......x...', 0.04], tamb: ['o.x.o.x.o.x.o.x.', 0.009] }, crash: 0.022,
      fill(p, t) { for (let i = 12; i < 16; i++) p.drum('snare', t + i * p.beat / 4, 0.022 + (i - 12) * 0.006); },
      extra(p, t, bar, ch) { if (bar % 16 >= 8 && bar % 16 < 12) voice(ch, 64, 3).forEach(mm => p.note('choir', t, mm, p.beat * 4 + 0.3, 0.011)); },
      intro(p, t0) {
        const b = p.beat;
        for (let i = 0; i < 12; i++) p.note('harp', t0 + i * b / 6, [60, 64, 67][i % 3] + 12 * Math.floor(i / 3), 0.4, 0.03);
        const t1 = t0 + b * 2;
        [48, 55, 60, 64, 67].forEach(mm => p.note('strings', t1, mm, b * 5.5, 0.032));
        [64, 67, 72].forEach(mm => p.note('choir', t1, mm, b * 5.5, 0.018));
        p.drum('timp', t1, 0.2, 65); p.drum('swell', t1, 0.025, b * 2);
        [[0, 67, 0.28], [1 / 3, 67, 0.28], [2 / 3, 67, 0.28], [1, 72, 3]].forEach(([x, mm, d]) => {
          [mm, mm - 5, mm - 8].forEach(n => p.note('brass', t1 + b * (2 + x), n, b * d, 0.034));
          p.note('glock', t1 + b * (2 + x), mm + 12, 1, 0.035);
        });
        p.drum('timp', t1 + b * 3, 0.22, 65); p.drum('crash', t1 + b * 3, 0.04);
        for (let i = 0; i < 12; i++) p.note('celesta', t1 + b * 3 + i * b / 4, [72, 76, 79][i % 3] + 12 * Math.floor(i / 6), 0.6, 0.022);
        return b * 8;
      },
    },
    // ── Uyku molası: ninni. Müzik kutusu ezgisi, arp, çok yumuşak yaylılar ve mırıldanan koro; davul yok
    pr_uyku: {
      bpm: 58, key: 5, scale: MAJ, vol: 0.8, swing: 0, fadeIn: 3,
      prog: form(C(41, 'M'), C(46, 'M'), C(41, 'M'), C(48, 's4'), C(48, 'M'), [C(46, 'M7'), C(45, 'm7'), C(43, 'm7'), C(48, 's4')]),
      pad: { inst: 'strings', vol: 0.02, lo: 53, n: 3, cut: 900 },
      bass: { inst: 'bass', pat: ['r.......'], vol: 0.035, oct: 12 },
      arp: { inst: 'harp', step: 8, pat: ['0.1.2.1.'], lo: 60, vol: 0.015 },
      lead: { inst: 'mbox', alt: 'celesta', lo: 69, hi: 84, vol: 0.045, cells: 'slow', plan: [1, 1, 2, 1],
        motif: mot([[0, 3, 72], [3, 1, 77], [4, 4, 81], [8, 3, 82], [11, 1, 81], [12, 4, 77],
          [16, 2, 81], [18, 2, 79], [20, 2, 77], [22, 2, 76], [24, 6, 77], [30, 2, 79]]) },
      extra(p, t, bar, ch) { if (bar % 2 === 0) voice(ch, 60, 2).forEach(mm => p.note('choir', t, mm, p.beat * 8 + 0.3, 0.008)); },
    },
  };
  // ── Boss: hareketli, komik-heyecanlı, asla korkutucu değil (miksolidya: neşeli). Ortak iskelet + bölüme göre çalgı rengi.
  const BOSS = {
    bpm: 138, key: 0, scale: MIX, vol: 1.45, swing: 0,
    prog: form(C(48, 'M'), C(46, 'M'), C(41, 'M'), C(48, 'M'), C(43, 'm7'), [C(45, 'm'), C(41, 'M'), C(46, 'M'), C(43, 's4')]),
    pad: { vol: 0.018, lo: 60, n: 3, cut: 1500 },
    bass: { inst: 'pbass', pat: ['r.r.5.r.', 'r.r.5.o.'], vol: 0.065 },
    stab: { inst: 'pizz', pos: [2, 6], lo: 60, n: 2, vol: 0.022 },
    lead: { inst: 'brass', alt: 'glock', lo: 67, hi: 84, vol: 0.04, cells: 'busy', plan: [1, 1, 2, 1] },
    kit: { kick: ['x...x...x...x...', 0.09], clap: ['....x.......x...', 0.04], hat: ['..x...x...x...x.', 0.011] }, crash: 0.025,
    fill(p, t) { for (let i = 12; i < 16; i++) p.drum('snare', t + i * p.beat / 4, 0.025 + (i - 12) * 0.007); },
    extra(p, t, bar) {   // komik "fiyuuuv" kaydırak düdüğü, arada bir
      if (bar % 8 === 3 && Math.random() < 0.6) { const up = Math.random() < 0.5; T(p.M, p.out, t + p.beat * 3, up ? 700 : 1500, p.beat * 0.9, 0.018, { f1: up ? 1600 : 650, wave: 'flute', a: 0.03, vib: [6, 20, 0.1] }); }
    },
  };
  const bossOf = o => Object.assign({}, BOSS, o);
  THEMES.pr_boss_mantar = bossOf({ bpm: 134, lead: { inst: 'marimba', alt: 'kalimba', lo: 69, hi: 86, vol: 0.05, cells: 'busy', plan: [1, 1, 2, 1] },
    kit: Object.assign({}, BOSS.kit, { wood: ['..x.....x.x.....', 0.02] }) });
  THEMES.pr_boss_mercan = bossOf({ bpm: 132, swing: 0.12, stab: { inst: 'kalimba', pos: [2, 6], lo: 62, n: 2, vol: 0.02 },
    lead: { inst: 'steel', alt: 'vibes', lo: 67, hi: 84, vol: 0.05, cells: 'busy', plan: [1, 1, 2, 1] },
    kit: { kick: ['x...x...x...x...', 0.11], conga: ['..x...o...x.o...', 0.035], bongo: ['......x.......x.', 0.025], shaker: ['o.x.o.x.o.x.o.x.', 0.01] },
    extra(p, t) { if (Math.random() < 0.5) { const tt = t + p.beat * rnd(0, 3); for (let i = 0; i < 3; i++) p.drum('blub', tt + i * 0.07, 0.014, 380 * (1 + i * 0.3)); } } });
  THEMES.pr_boss_col = bossOf({ bpm: 132, key: 2, scale: HIC, vol: 1.75,
    prog: form(C(38, 'M'), C(36, 'm'), C(39, 'M'), C(38, 'M'), C(38, 'M'), [C(43, 'm'), C(36, 'm'), C(39, 'M'), C(38, 'M')]),
    stab: { inst: 'pizz', pos: [2, 6], lo: 57, n: 2, vol: 0.022 },
    lead: { inst: 'kanun', alt: 'lute', lo: 69, hi: 86, vol: 0.046, cells: 'busy', plan: [1, 1, 2, 1], orn: 0.2 },
    kit: { dum: ['x.....x.x.......', 0.1], tek: ['..x.x.....x.x...', 0.032], ka: ['.......o.......o', 0.016] },
    fill(p, t) { for (let i = 8; i < 16; i++) p.drum(i & 1 ? 'ka' : 'tek', t + i * p.beat / 4, 0.016 + (i - 8) * 0.004); },
    extra(p, t, bar) { if (bar % 4 === 0) p.drum('zil', t, 0.016); } });
  THEMES.pr_boss_atolye = bossOf({ bpm: 140, stab: { inst: 'mbox', pos: [2, 6], lo: 72, n: 2, vol: 0.016 },
    lead: { inst: 'toypiano', alt: 'xylo', lo: 72, hi: 88, vol: 0.05, cells: 'busy', plan: [1, 1, 2, 1] },
    kit: { kick: ['x...x...x...x...', 0.11], tick: ['x...x...x...x...', 0.024], tock: ['..x...x...x...x.', 0.024], clap: ['....x.......x...', 0.035] } });
  THEMES.pr_boss_gokkusagi = bossOf({ bpm: 132, vol: 1.15, pad: { inst: 'strings', vol: 0.026, lo: 55, n: 4, cut: 2200 },   // final bossu: daha görkemli
    extra(p, t, bar, ch) {
      if (bar % 4 === 0) p.drum('timp', t, 0.09, mtof(ch.r));
      if (bar % 16 >= 8 && bar % 16 < 12) voice(ch, 62, 3).forEach(mm => p.note('choir', t, mm, p.beat * 4 + 0.3, 0.014));
      if (bar % 8 === 7) voice(ch, 67, 8).forEach((mm, i) => p.note('harp', t + p.beat * (3 + i / 8), mm, 0.3, 0.02));
    },
    lead: { inst: 'brass', alt: 'flute', lo: 67, hi: 84, vol: 0.042, cells: 'busy', plan: [1, 1, 2, 1], dbl: { inst: 'glock', vol: 0.011, oct: 12 } },
    stab: { inst: 'harp', pos: [2, 6], lo: 64, n: 2, vol: 0.018 } });
  THEMES.pr_boss = THEMES.pr_boss_gokkusagi;   // bölüm bilinmiyorsa (A.music son bölümün rengini seçer)
  // Eski adlar (motor kopyasından kalan çağrılar) en yakın yeni temaya gider.
  const THEME_ALIAS = { title: 'pr_menu', orman: 'pr_mantar', magara: 'pr_mantar', tuvalet: 'pr_mercan', ay: 'pr_uyku', yanardag: 'pr_col',
    sehir: 'pr_col', kefir: 'pr_atolye', kale: 'pr_atolye', boss: 'pr_boss', zafer: 'pr_final' };
  const REGIONS = ['mantar', 'mercan', 'col', 'atolye', 'gokkusagi'];
  // Chord tones ascending from lo.
  function voice(ch, lo, n) {
    const pcs = ch.iv.map(i => (ch.r + i) % 12), out = [];
    for (let mm = lo; out.length < n && mm < lo + 40; mm++) if (pcs.includes(mm % 12)) out.push(mm);
    return out;
  }

  // ── generative melody: 4-bar phrases in an A A' B A' form, regenerated every so often ──
  const CELLS = {
    slow: [[[0, 4], [4, 4]], [[0, 2], [2, 2], [4, 4]], [[0, 6], [6, 2]], [[0, 3], [3, 1], [4, 4]], [[2, 2], [4, 4]], [[0, 4], [4, 2], [6, 2]]],
    mid: [[[0, 2], [2, 2], [4, 2], [6, 2]], [[0, 1], [1, 1], [2, 2], [4, 2], [6, 2]], [[0, 3], [3, 1], [4, 2], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 4]],
      [[0, 2], [2, 2], [4, 4]], [[1, 1], [2, 2], [4, 1], [5, 1], [6, 2]], [[0, 4], [4, 1], [5, 1], [6, 2]]],
  };
  CELLS.busy = CELLS.mid.concat([[[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]]]);
  const ENDS = [[[0, 2], [2, 2], [4, 4]], [[0, 4], [4, 4]], [[0, 2], [2, 6]], [[0, 1], [1, 1], [2, 6]]];
  const ENDS_SLOW = [[[0, 4], [4, 4]], [[0, 8]], [[0, 2], [2, 6]]];
  function scaleNotes(th) {
    const out = [];
    for (let mm = th.lead.lo - 12; mm <= th.lead.hi + 12; mm++) if (th.scale.includes(((mm - th.key) % 12 + 12) % 12)) out.push(mm);
    return out;
  }
  // Nearest scale index whose pitch class is in pcs, searching in the melody's direction first.
  function toPc(sc, i, pcs, dir = 1) {
    for (let k = 0; k < 8; k++) for (const s of k ? [dir, -dir] : [1]) { const j = i + k * s; if (j >= 0 && j < sc.length && pcs.includes(sc[j] % 12)) return j; }
    return cl(i, 0, sc.length - 1);
  }
  function genBars(th, bar0, b0, b1, startM, end) {
    const L = th.lead, sc = th._sc || (th._sc = scaleNotes(th)), cells = CELLS[L.cells || 'mid'], out = [], mid = (L.lo + L.hi) / 2, span = L.hi - L.lo;
    let i = 0, dir = Math.random() < 0.5 ? 1 : -1, p1 = -1, p2 = -1;
    for (let k = 1; k < sc.length; k++) if (Math.abs(sc[k] - startM) < Math.abs(sc[i] - startM)) i = k;
    for (let b = b0; b < b1; b++) {
      const ch = th.prog[(bar0 + b) % th.prog.length], pcs = ch.iv.map(x => (ch.r + x) % 12);
      const last = b === 3, cell = last ? pick(L.cells === 'slow' ? ENDS_SLOW : ENDS) : pick(cells);
      for (let k = 0; k < cell.length; k++) {
        const s = cell[k][0], d = cell[k][1], off = sc[i] - mid;
        if (Math.abs(off) > span * 0.3 && Math.random() < 0.75) dir = off > 0 ? -1 : 1;   // gravity toward the middle
        if (last && k === cell.length - 1) i = toPc(sc, i, end === 'a' ? (pcs.includes(th.key) ? [th.key] : [pcs[0]]) : [pcs[1], pcs[2]], dir);
        else if (s % 4 === 0) i = toPc(sc, i + dir * (Math.random() < 0.3 ? 2 : 1), pcs, dir);   // chord tone on strong beats
        else { i += dir * (Math.random() < 0.8 ? 1 : 2); if (Math.random() < 0.25) dir = -dir; }
        i = cl(i, 0, sc.length - 1);
        while (sc[i] > L.hi && i > 0) { i--; dir = -1; }
        while (sc[i] < L.lo && i < sc.length - 1) { i++; dir = 1; }
        if (i === p1 && i === p2) { i = cl(i + dir, 0, sc.length - 1); if (sc[i] > L.hi || sc[i] < L.lo) i = cl(i - 2 * dir, 0, sc.length - 1); }   // no 3 repeats
        p2 = p1; p1 = i;
        out.push({ s: b * 8 + s, d, m: sc[i] });
      }
    }
    return out;
  }

  // ── theme player: schedules one whole bar at a time, a little ahead of the audio clock ──
  const PADI = { pad: 1, strings: 1, choir: 1 };   // uzun, yumuşak katmanlar: ortak, yavaşça nefes alan alçak geçiren süzgeçten geçer
  class Player {
    constructor(m, name, t0) {
      const th = THEMES[name], c = m.c;
      this.m = m; this.M = m; this.th = th; this.name = name; this.beat = 60 / th.bpm; this.bar = 0; this.stopAt = Infinity;
      this.out = gainNode(c, 0); this.out.connect(m.music);
      this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.Q.value = 0.5;
      this.padF.frequency.value = th.pad ? th.pad.cut : 1000; this.padF.connect(this.out);
      this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.06;
      const lg = gainNode(c, (th.pad ? th.pad.cut : 1000) * 0.3); this.lfo.connect(lg); lg.connect(this.padF.frequency); this.lfo.start(t0);
      this.ph = -1; this.A = this.A2 = this.cur = null; this.inst = null;
      this.t = t0 + (th.intro ? th.intro(this, t0) : 0);
    }
    note(inst, t, midi, dur, vol) { INST[inst](this.m, PADI[inst] ? this.padF : this.out, t, mtof(midi), dur, vol); }
    drum(name, t, v, x) { DRUM[name](this.m, this.out, t, v, x); }
    // Own ramp bookkeeping instead of reading AudioParam.value mid-automation (not reliable on every Safari).
    fade(to, t, dur) {
      const g = this.out.gain, f = this.f, from = f ? f[0] + (f[1] - f[0]) * cl((t - f[2]) / Math.max(1e-3, f[3] - f[2]), 0, 1) : 0;
      g.cancelScheduledValues(t); g.setValueAtTime(from, t); g.linearRampToValueAtTime(to, t + dur);
      this.f = [from, to, t, t + dur];
    }
    stop(t, dur) { this.fade(0, t, dur); this.stopAt = t + dur; try { this.lfo.stop(t + dur + 3); } catch (e) { /* ignore */ } }
    pump(until) {
      const c = this.m.c;
      // fell behind (e.g. main thread stalled): skip ahead instead of piling notes into the past
      if (c.currentTime > 0 && this.t < c.currentTime - 0.05 && this.t < this.stopAt) {
        const bars = Math.ceil((Math.min(c.currentTime - 0.05, this.stopAt) - this.t) / (this.beat * 4));
        this.t += bars * this.beat * 4; this.bar += bars;
      }
      while (this.t < until && this.t < this.stopAt) { this.arrange(this.t, this.bar); this.t += this.beat * 4; this.bar++; }
    }
    leadBar(bar) {
      const th = this.th, L = th.lead, ph = Math.floor(bar / 4), part = ph % 4, mid = (L.lo + L.hi) >> 1, start = ph * 4;
      if (ph !== this.ph) {
        this.ph = ph;
        if (!this.A || (part === 0 && !L.motif && Math.random() < 0.6)) { this.A = L.motif || genBars(th, start - part * 4, 0, 4, mid, 'q'); this.A2 = null; }   // motif: akılda kalan sabit ezgi
        if (part === 1 || part === 3) {
          if (!this.A2) { const keep = this.A.filter(n => n.s < 24); this.A2 = keep.concat(genBars(th, start - (part - 1) * 4, 3, 4, keep.length ? keep[keep.length - 1].m : mid, 'a')); }
          this.cur = this.A2;
        } else this.cur = part === 2 ? genBars(th, start, 0, 4, this.A[this.A.length - 1].m, 'a') : this.A;
        this.inst = L.plan[part] === 2 ? L.alt : L.plan[part] ? L.inst : null;
        this.dbl = L.dbl && L.plan[part] === 1 ? L.dbl : null;
      }
      const rel = bar % 4;
      return this.inst ? this.cur.filter(n => (n.s >> 3) === rel) : null;
    }
    arrange(t, bar) {
      const th = this.th, b = this.beat, e8 = b / 2, ch = th.prog[bar % th.prog.length];
      const T8 = i => t + i * e8 + (i & 1 ? th.swing * e8 : 0);
      const T16 = i => t + i * b / 4 + ((i & 3) === 2 ? th.swing * e8 : 0);
      if (th.pad) for (const mm of voice(ch, th.pad.lo, th.pad.n)) this.note(th.pad.inst || 'pad', t, mm, b * 4 + 0.35, th.pad.vol);
      if (th.bass) {
        const pat = th.bass.pat[bar % th.bass.pat.length];
        for (let i = 0; i < 8; i++) {
          const cc = pat[i]; if (cc === '.') continue;
          let j = i + 1; while (j < 8 && pat[j] === '.') j++;
          const mm = ch.r + (th.bass.oct || 0) + (cc === '5' ? 7 : cc === 'f' ? -5 : cc === 'o' ? 12 : cc === '3' ? ch.iv[1] : 0);
          this.note(th.bass.inst, T8(i), mm, (j - i) * e8 * 0.92, th.bass.vol);
        }
      }
      if (th.stab) { const v = voice(ch, th.stab.lo, th.stab.n); for (const i of th.stab.pos) for (const mm of v) this.note(th.stab.inst, T8(i), mm, e8, th.stab.vol); }
      if (th.arp) {
        const a = th.arp, pat = a.pat[bar % a.pat.length], v = voice(ch, a.lo, 4), n = a.step === 16 ? 16 : 8;
        for (let i = 0; i < n; i++) {
          const cc = pat[i]; if (cc === '.' || cc === undefined) continue;
          const tt = n === 16 ? T16(i) : T8(i), mm = v[+cc % v.length];
          this.note(a.inst, tt, mm, e8, a.vol);
          if (a.echo) this.note(a.inst, tt + b * 0.75, mm, e8, a.vol * 0.3);
        }
      }
      const mel = th.lead && this.leadBar(bar);
      if (mel) for (const n of mel) {
        const tt = T8(n.s & 7), d = n.d * e8 * 0.9, sc = th._sc;
        if (th.lead.orn && n.d >= 2 && sc && Math.random() < th.lead.orn) {   // folk turn on a longer note: note, upper neighbour, note
          const up = sc[Math.min(sc.length - 1, sc.indexOf(n.m) + 1)], g = Math.min(0.055, d * 0.2);
          this.note(this.inst, tt, n.m, g, th.lead.vol); this.note(this.inst, tt + g, up, g, th.lead.vol * 0.85);
          this.note(this.inst, tt + 2 * g, n.m, d - 2 * g, th.lead.vol);
        } else this.note(this.inst, tt, n.m, d, th.lead.vol);
        if (this.dbl) this.note(this.dbl.inst, tt, n.m + this.dbl.oct, d, this.dbl.vol);
        if (th.lead.echo) this.note(this.inst, tt + b * 0.75, n.m, d, th.lead.vol * 0.28);
      }
      if (th.kit && bar >= (th.drumsIn || 0)) {
        for (const k in th.kit) {
          const [pat, v] = th.kit[k];
          for (let i = 0; i < 16; i++) { const cc = pat[i]; if (cc === 'x' || cc === 'o') this.drum(k, T16(i), cc === 'x' ? v : v * 0.55); }
        }
        if (th.crash && bar % 16 === 0 && bar > 0) this.drum('crash', t, th.crash);
      }
      if (th.fill && bar % 8 === 7) th.fill(this, t, bar, ch);
      if (th.extra) th.extra(this, t, bar, ch);
    }
  }

  let players = [], curP = null, pumpTimer = null;
  function pumpAll() {
    if (!ctx || document.hidden || pageAway) return;
    const now = ctx.currentTime;
    players = players.filter(p => {
      if (now > p.stopAt + 0.3) { try { p.out.disconnect(); } catch (e) { /* ignore */ } return false; }
      try { p.pump(now + 0.4); } catch (e) { console.warn('AUD music', e); }
      return true;
    });
    if (!players.length) { clearInterval(pumpTimer); pumpTimer = null; }
  }
  function startMusic(name) {
    if (!ctx || (curP && curP.name === name)) return;
    const now = ctx.currentTime;
    if (curP) curP.stop(now, 1.5);
    curP = null;
    if (name) {
      const p = new Player(M, name, now + 0.1), th = THEMES[name];
      p.fade(th.vol, now + 0.02, th.fadeIn || 1.4);
      players.push(p); curP = p;
      if (!pumpTimer) pumpTimer = setInterval(pumpAll, 50);
      pumpAll();
    }
  }

  // ───────────────────────── narrator ─────────────────────────
  const GAP = 0.8, vbufs = {}, vpend = {}, VQ = [];
  let vcur = null, vgap = null, ducked = false;
  let lastVoiceEnd = -1e9, lastChatter = -1e9;
  const lastSpoken = Object.create(null), lastCategory = Object.create(null);
  const voiceKey = key => 'tr:' + key;   // (yalnız Türkçe)
  const voiceText = key => A.LINES[key] || '';
  const mp3 = key => { const bank = window.VOICE_MP3; return bank && bank[key] || null; };
  // Recorded length if known (sesler.js also writes VOICE_DUR), otherwise ~14 characters per second.
  function lineDur(key) {
    const bank = window.VOICE_DUR;
    const d = bank && bank[key];
    if (d) return d;
    if (vbufs[voiceKey(key)]) return vbufs[voiceKey(key)].duration;
    const s = voiceText(key);
    return Math.max(0.9, 0.3 + s.length * 0.071);
  }
  function b64buf(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decodeWith(c, s) {
    return new Promise(res => {
      let done = false; const fin = b => { if (!done) { done = true; res(b || null); } };
      try { const pr = c.decodeAudioData(b64buf(s), fin, () => fin(null)); if (pr && pr.catch) pr.catch(() => fin(null)); } catch (e) { fin(null); }
    });
  }
  function getBuf(key) {
    if (vbufs[voiceKey(key)]) return Promise.resolve(vbufs[voiceKey(key)]);
    if (vpend[voiceKey(key)]) return vpend[voiceKey(key)];
    const s = mp3(key), cacheKey = voiceKey(key);
    if (!s || !ctx) return Promise.resolve(null);
    return (vpend[cacheKey] = decodeWith(ctx, s).then(b => { delete vpend[cacheKey]; if (b) vbufs[cacheKey] = b; return b; }));
  }
  function sub(text, key) { try { if (typeof A.onSubtitle === 'function') A.onSubtitle(text, key); } catch (e) { console.error(e); } }
  function duck(on) {
    if (!M || ducked === on) return;
    ducked = on;
    const g = M.duck.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(on ? DUCK : 1, t, on ? 0.06 : 0.35);
  }
  function show(it) { A.current = it.key; if (it.sub) { it.shown = true; sub(it.text, it.key); } }   // current first: onSubtitle may read it
  function startLine(it) {
    vcur = it; clearTimeout(vgap); vgap = null;
    const started = wallNow();
    lastSpoken[it.key] = started;
    if (it.category) { lastCategory[it.category] = started; lastChatter = started; }
    it.end = wallNow() + it.dur;
    const subOnly = () => { if (vcur !== it) return; show(it); it.end = wallNow() + it.dur; it.timer = setTimeout(() => endLine(it), it.dur * 1000); };
    if (ctx && unlocked && A.voiceOn && !document.hidden && !pageAway && mp3(it.key)) {
      getBuf(it.key).then(buf => {
        if (vcur !== it) return;
        if (!buf || document.hidden || pageAway) return subOnly();
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(M.voice); src.onended = () => endLine(it);
        src.start(ctx.currentTime + 0.02);
        it.src = src; it.dur = buf.duration; it.end = wallNow() + buf.duration;
        duck(true); show(it);
        it.timer = setTimeout(() => endLine(it), (buf.duration + 0.8) * 1000);   // in case onended never fires (suspended)
      });
    } else subOnly();
  }
  function endLine(it) {
    if (vcur !== it) return;
    clearTimeout(it.timer);
    if (it.shown) sub(null);
    vcur = null; A.current = null;
    const now = wallNow(); lastVoiceEnd = now;
    for (let i = VQ.length - 1; i >= 0; i--) if (now + GAP - VQ[i].t > VQ[i].wait) VQ.splice(i, 1);   // stale
    if (VQ.length) vgap = setTimeout(nextLine, GAP * 1000);
    else duck(false);
  }
  function nextLine() {
    vgap = null;
    const now = wallNow();
    while (VQ.length) { const it = VQ.shift(); if (now - it.t <= it.wait) { startLine(it); return; } }
    duck(false);
  }
  function stopCur() {
    const it = vcur; if (!it) return;
    clearTimeout(it.timer);
    if (it.src) { it.src.onended = null; try { it.src.stop(); } catch (e) { /* ignore */ } }
    if (it.shown) sub(null);
    vcur = null; A.current = null; lastVoiceEnd = wallNow();
  }
  // ── Konuşma sırası (Dev Ev): her cümlenin bir sınıfı var: hikâye 5 > boss 4 > görev/oda 3 > tanıtım 2 > övgü 1.
  // Aynı anda birçok sistem konuşmak isterse: yüksek sınıf kuyrukta öne geçer; övgü konuşma varken hiç söylenmez;
  // tanıtım ancak kuyruk boşsa bekler; yüksek sınıf gelince kuyruktaki övgü/tanıtımlar atılır ve o an çalan övgü/tanıtım kesilir;
  // düşük sınıflar beklemez; önemli cümlelerden sonra oyun bir süre sessiz kalır. Kuyruk en çok 2.
  const BOLUMLER = '(mantar|mercan|col|atolye|gokkusagi)';
  const RANK_RX = [
    [5, new RegExp('^(pr_(baslik|giris_|isik_|final_|yuva_ilk|yuva_donus|git_|uyku_)|pp_(baslik|giris_|guc_|final_|isik_sevinc|uyku_|yuva_ilk|sec_)'
      + '|pr_' + BOLUMLER + '_(giris|arena)$|pp_' + BOLUMLER + '_giris$|son$|kristal$|tekrar$|hos_geldin$)')],
    [4, /^(pp_(saril_|kalkti_|can_az$|gokkusagi_binis$)|can_az$|iksir_yok$|yoruldu$|pr_koca[A-Z]\w*_(giris|yarim|bitti|binis)$|pr_ipucu_|kocaman$|ejderha_)/],
    [1, /^(ovgu|pp_ovgu_|his_kombo_|his_nese_|his_yildiz|pp_(yasasin|vay|bak|komik|sasir|merak|guzel|kirinti|seviyorum|buradayim|sandik|nefes_|kalkan_|ruzgar_|kalptozu_|takim_|boss_\d|gokkusagi_isik_\d))/],
    [3, /^(yetenek_|pp_(kapi|yon_|isik_yakin|ucuyoruz|gokkusagi_isik_son))/],
    [2, new RegExp('^(pr_' + BOLUMLER + '_orta$|pp_' + BOLUMLER + '_orta$|pr_ilk_|ck_|surpriz_|kostum_|set_tamam|guclendi_|degnek$|kilic$|sapka$|pelerin$|efsane$|sandik$|seviye)')],
  ];
  const RANK_WAIT = [0, 0, 0, 4, 8, 20];   // s: bu kadar bekleyen cümle bayatlar (görev/oda ve altı: 4 s)
  // aynı anlamdaki cümleler üst üste söylenmez (biri çalarken/beklerken diğeri düşer)
  const GROUPS = [/^(pp_saril|pp_can_az|can_az|iksir_yok)/, /^(ovgu|pp_ovgu|seviye|his_kombo|his_nese)/, /^(pp_yon|pp_kapi|kapi$|kapi_kapali)/,
    /^pp_(nefes|kalkan|ruzgar|kalptozu)_/];
  const groupOf = key => { for (let i = 0; i < GROUPS.length; i++) if (GROUPS[i].test(key)) return i + 1; return 0; };
  let hushUntil = 0, hushRank = 0;   // kutlama anı: kısa süre yalnız önemli cümleler (A.hush)
  const rankCache = {};
  function rankOf(key) {
    if (rankCache[key]) return rankCache[key];
    let r = 3;
    for (const [k, rx] of RANK_RX) if (rx.test(key)) { r = k; break; }
    return (rankCache[key] = r);
  }
  // Ara konuşmalar arasında nefes: önemli yönlendirmeler bu aralıklara takılmaz.
  function chatterCategory(key, rank) {
    if (rank === 1) return 'praise';
    if (/^(pr_|pp_)(mantar|mercan|col|atolye|gokkusagi)_orta$/.test(key)) return 'ambience';
    return rank === 2 ? 'discovery' : null;
  }
  const CHAT_GAP = { praise: 50, ambience: 45, discovery: 28 };
  function say(key, o) {
    o = typeof o === 'number' ? { prio: o } : o || {};
    const text = voiceText(key);
    if (!text) { if (!warned['L' + key]) { warned['L' + key] = 1; console.warn('AUD.say: unknown line', key); } return 0; }
    const rank = o.rank ?? rankOf(key), prio = o.prio ?? 1;
    const now = wallNow(), category = chatterCategory(key, rank);
    if (!o.interrupt) {
      // İlk mekanik açıklaması duyulur; aynı saldırının tekrarındaki ses yağmuru susturulur.
      const repeatGap = rank >= 4 ? 35 : rank === 3 ? 24 : 55;
      if (!/^(pp_(saril_|kalkti_)|can_az$|iksir_yok$|yoruldu$)/.test(key) && now - (lastSpoken[key] ?? -1e9) < repeatGap) return 0;
      if (category && (now - lastVoiceEnd < 9 || now - lastChatter < 22 || now - (lastCategory[category] ?? -1e9) < CHAT_GAP[category])) return 0;
    }
    const it = { key, text, prio, rank, category, p: rank * 10 + clamp(prio, 0, 9), sub: o.sub !== false, dur: lineDur(key), t: wallNow(), wait: o.wait ?? RANK_WAIT[rank] + prio };
    if (!o.interrupt && hushUntil > wallNow() && rank < hushRank) return 0;
    const busy = vcur || VQ.length || vgap;
    if (category && busy && !o.interrupt) return 0;
    if (!busy) { startLine(it); return it.dur; }
    if (o.interrupt) { VQ.length = 0; stopCur(); clearTimeout(vgap); vgap = null; startLine(it); return it.dur; }
    const grp = groupOf(key);
    if (grp && ((vcur && groupOf(vcur.key) === grp) || VQ.some(q => groupOf(q.key) === grp))) return 0;
    if (prio <= 0 || rank <= 1) return 0;                        // "ancak sessizken": övgüler ve prio 0 cümleler
    if ((vcur && vcur.key === key) || VQ.some(q => q.key === key)) return 0;
    if (rank === 2 && VQ.length) return 0;                       // tanıtım: kuyrukta başka cümle varsa geç
    if (rank >= 3) for (let i = VQ.length - 1; i >= 0; i--) if (VQ[i].rank <= 2) VQ.splice(i, 1);   // eski düşük öncelikliler düşer
    if (vcur && vcur.rank <= 2 && rank >= 3 && !VQ.length) {     // çalan övgü/tanıtım, önemli cümleye yer açar
      stopCur(); clearTimeout(vgap); vgap = null; startLine(it); return it.dur;
    }
    let i = VQ.findIndex(q => q.p < it.p); if (i < 0) i = VQ.length;
    VQ.splice(i, 0, it);
    while (VQ.length > 2) if (VQ.pop() === it) return 0;   // kuyrukta en çok 2 cümle
    let w = vcur ? Math.max(0, vcur.end - wallNow()) : 0;
    for (let j = 0; j < i; j++) w += GAP + VQ[j].dur;
    return w + GAP + it.dur;
  }
  function prefetch() {
    // başlık düğme cümlesi, sonra giriş masalının sırayla çalan cümleleri (10_story.js): ilki iPad'de gecikmesiz başlasın
    const keys = ['basla', 'devam', 'pr_giris_1', 'pr_giris_3', 'pp_giris_uyan', 'pr_giris_4', 'pr_giris_6', 'pp_giris_hadi', 'hos_geldin'];
    let k = 0;
    const go = () => { if (k < keys.length) getBuf(keys[k++]).then(() => setTimeout(go, 40)); };
    setTimeout(go, 200);
  }

  // ───────────────────────── public API ─────────────────────────
  // everRan: the context has played at least once. Only such a context can come back with a stale clock/line to reset —
  // the very first resume (iOS: on the release of the first touch) must keep the line that touch just started ('kahraman_sec').
  let listenersOn = false, waking = null, needsWake = false, pageAway = false, everRan = false;
  function resetMusic() {
    for (const p of players) { try { p.lfo.stop(); } catch (e) { /* already stopped */ } try { p.out.disconnect(); } catch (e) { /* already gone */ } }
    players = []; curP = null; clearInterval(pumpTimer); pumpTimer = null;
  }
  function awake(c) {
    if (c !== ctx || c.state !== 'running' || document.hidden || pageAway) return;
    waking = null; everRan = true;
    if (needsWake) {
      needsWake = false;
      // Timers and the audio clock may have advanced differently while the screen was locked. Start the current
      // theme at today's clock, and drop an old spoken line rather than leave its ducking gain stuck forever.
      A.stopVoice(); resetMusic();
      Object.keys(lastT).forEach(k => delete lastT[k]); active = 0; effectEpoch++;
      for (const k of Object.keys(streak)) { streak[k][0] = 0; streak[k][1] = -9; }
      ramp(M.sfx.gain, A.soundOn ? SFX_VOL : 0, 0.05);
      ramp(M.voice.gain, A.voiceOn ? VOICE_VOL : 0, 0.05);
      ramp(M.music.gain, musicLevel(), 0.05);
    }
    if (want && A.musicOn) startMusic(want);
  }
  function suspendAudio() {
    if (!ctx || ctx.state === 'closed') return;
    needsWake = true; waking = null;
    const c = ctx;
    try {
      const p = c.suspend();
      // A quick hide/show can finish suspend after resume. Reconcile that race once the promise settles.
      if (p && p.then) p.then(() => { if (c === ctx && !document.hidden && !pageAway) A.unlock(); }, () => {});
    } catch (e) { /* interrupted by the operating system */ }
  }
  A.unlock = function () {
    if (QUIET || document.hidden || pageAway) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    if (ctx && ctx.state === 'closed') {
      A.stopVoice(); resetMusic(); ctx = M = null; unlocked = false; waking = null; needsWake = true;
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return false; } }
      M = makeMix(ctx);
      const c = ctx;
      c.onstatechange = () => {
        if (c !== ctx) return;
        if (c.state === 'running') awake(c);
        else if (everRan) needsWake = true;   // the next real gesture retries even if an earlier resume is still pending
      };
    }
    if (!unlocked) {
      try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) { /* ignore */ }
      unlocked = true;
      prefetch();
    }
    if (!listenersOn) {
      listenersOn = true;
      // Safari can require the *release* gesture after a screen lock. Keep these listeners after first unlock:
      // the UI's initial unlock listeners are intentionally removed as soon as sound first works.
      for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) addEventListener(ev, () => A.unlock(), true);
      document.addEventListener('visibilitychange', () => { if (document.hidden) suspendAudio(); else A.unlock(); });
      addEventListener('pagehide', () => { pageAway = true; suspendAudio(); });
      addEventListener('pageshow', () => { pageAway = false; A.unlock(); });
      addEventListener('focus', () => A.unlock());
    }
    if (ctx.state === 'running') awake(ctx);
    else {
      if (everRan) needsWake = true;
      const c = ctx;
      // Do not gate retries on a pending promise: iOS may leave resume() unresolved until a later touchend.
      try {
        const p = waking = c.resume();
        if (p && p.then) p.then(() => { if (c === ctx) awake(c); }, () => { if (waking === p) waking = null; });
      } catch (e) { waking = null; }
    }
    return true;
  };
  A.sfx = sfx;
  // Other modules may add a sound recipe: fn(audioContext, outNode, t, pitch) → length (s); played through A.sfx (same gating/volume).
  A.defineSfx = (name, fn, vol) => { if (!SFX[name]) SFX[name] = (m, o, t, p) => fn(m.c, o, t, p); if (vol) SVOL[name] = vol; };
  A.setListener = (x, z) => { lx = x; lz = z; };
  let lastRegion = null;
  A.music = function (name) {
    if (name && THEME_ALIAS[name]) name = THEME_ALIAS[name];
    if (name && REGIONS.includes(name.slice(3)) && name.startsWith('pr_')) lastRegion = name.slice(3);   // boss bu bölümün rengini alır
    if (name === 'pr_boss' && lastRegion) name = 'pr_boss_' + lastRegion;
    if (name && !THEMES[name]) { console.warn('AUD.music: unknown theme', name); return; }
    want = name || null; A.theme = want;
    if (ctx && unlocked && A.musicOn) startMusic(want);
  };
  function ramp(g, v, tc) { const t = ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(v, t, tc); }
  A.setMusic = function (on) {
    A.musicOn = !!on;
    if (on && unlocked) A.unlock();
    if (!ctx) return;
    if (A.musicOn) { ramp(M.music.gain, musicLevel(), 0.05); startMusic(want); }   // the bus may have been built at 0 (saved "off")
    else { if (curP) curP.stop(ctx.currentTime, 0.6); curP = null; }
  };
  // Sound effects only; the narrator keeps talking (see voiceOn).
  A.setSound = function (on) {
    A.soundOn = !!on;
    if (on && unlocked) A.unlock();
    if (M) ramp(M.sfx.gain, A.soundOn ? SFX_VOL : 0, 0.05);
  };
  // Narrator voice (parent/debug only; subtitles keep running when off).
  A.setVoice = function (on) {
    A.voiceOn = !!on;
    if (on && unlocked) A.unlock();
    if (M) ramp(M.voice.gain, A.voiceOn ? VOICE_VOL : 0, 0.05);
  };
  // Pause / wardrobe: music dips to ~35% and comes back on resume. Only a flag while silent or before unlock.
  A.dim = function (on) {
    dimmed = !!on;
    if (!on && unlocked) A.unlock();
    if (M && A.musicOn) ramp(M.music.gain, musicLevel(), 0.25);
  };
  A.say = say;
  A.rankOf = rankOf;
  A.hush = (sec, minRank = 4) => { hushUntil = wallNow() + sec; hushRank = minRank; for (let i = VQ.length - 1; i >= 0; i--) if (VQ[i].rank < minRank) VQ.splice(i, 1); };
  A.speaking = () => !!vcur || VQ.length > 0;
  A.stopVoice = function () { VQ.length = 0; clearTimeout(vgap); vgap = null; stopCur(); duck(false); };
  A.estimate = key => (A.LINES[key] ? lineDur(key) : 0);
  A.ready = () => !!(ctx && unlocked && ctx.state === 'running');

  // Test hooks: render into an OfflineAudioContext (never audible) to prove graphs build and measure levels.
  A._test = {
    sfxNames: Object.keys(SFX), themes: Object.keys(THEMES), svol: SVOL, THEMES,
    render(fn, secs = 2, sr = 44100, raw = false) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const c = new OC(2, Math.ceil(secs * sr), sr), m = makeMix(c, true, raw);
      fn(m, c);
      return c.startRendering();
    },
    sfx(name, secs = 2.2, o = {}) { return this.render(m => playRecipe(m, name, { g: o.vol ?? (SVOL[name] ?? 1), p: o.pitch || 1, pan: o.pan || 0 }, 0.02), secs, 44100, o.raw); },
    prim: { T, N, B },
    music(name, secs = 12) {
      return this.render(m => { const p = new Player(m, name, 0.05); p.fade(THEMES[name].vol, 0, 0.05); p.pump(secs); }, secs);
    },
    stress(secs = 3, theme = 'boss') {
      return this.render(m => {
        const p = new Player(m, theme, 0.05); p.fade(THEMES[theme].vol, 0, 0.05); p.pump(secs);
        for (let r = 0; r < 3; r++) for (const n of Object.keys(SFX)) playRecipe(m, n, { g: SVOL[n] ?? 1, p: semi(rnd(-0.5, 0.5)), pan: rnd(-0.6, 0.6) }, 0.1 + r * 0.05 + rnd(0, 0.02));
      }, secs);
    },
    decode(key) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, s = mp3(key);
      return s ? decodeWith(new OC(1, 44100, 44100), s) : Promise.resolve(null);
    },
    score(name, bars = 32) {   // generated lead line per bar (for reading, not playing)
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, p = new Player(makeMix(new OC(1, 128, 44100), true), name, 0), out = [];
      for (let b = 0; b < bars; b++) { const n = p.leadBar(b); out.push({ bar: b, ch: p.th.prog[b % p.th.prog.length], inst: p.inst, notes: n || [] }); }
      return out;
    },
    // Drive the real-time paths (unlock state, scheduler, crossfades, voice buffers, ducking) with an inaudible
    // OfflineAudioContext: attach(c) before c.startRendering(), call pump() at each c.suspend() step, detach() after.
    attach(c) { this._saved = [ctx, M, unlocked]; ctx = c; M = makeMix(c, true); unlocked = true; Object.keys(vbufs).forEach(k => delete vbufs[k]); return M; },
    detach() { players.forEach(p => { try { p.out.disconnect(); } catch (e) { /* ignore */ } }); players = []; curP = null; clearInterval(pumpTimer); pumpTimer = null; A.stopVoice(); [ctx, M, unlocked] = this._saved; },
    pump: () => pumpAll(),
    spatial: (x, z) => spatial(x, z),
    lineDur, state: () => ({ ctx: !!ctx, unlocked, dimmed, queue: VQ.map(q => q.key), cur: vcur && vcur.key, players: players.length }),
  };
  return A;
})();

AUD.LINES = /*SESLER*/{
  "kahraman_sec": "Bugün hangi Feza olacaksın? Birini seç, Pırıl seni bekliyor!",
  "giris2": "Huysuzlara dokun, neşelensinler! Gitmek istediğin yere parmağını bas.",
  "seviye1": "Seviye atladın! Daha da güçlendin!",
  "seviye2": "Bir seviye daha! Harikasın Feza!",
  "seviye3": "Seviye atladın! Kılıcın artık daha güçlü!",
  "seviye_buyu": "Seviye atladın! Sihirli asan artık daha güçlü!",
  "seviye_hibrit": "Seviye atladın! Kılıcın da asan da güçlendi!",
  "hibrit1": "Hilal Dalgası hazır! Kılıcından sihirli bir hilal gönder!",
  "hibrit2": "Işık Bağı açıldı! Dönen kılıçlar seni korusun!",
  "hibrit3": "Gökkuşağı Mührü hazır! Rengârenk sihir dalgaları yayılsın!",
  "buyu1": "Işık Okları hazır! Mor düğmeye bas, üç sihirli ok uçsun!",
  "buyu2": "Buz Çiçeği açıldı! Mavi düğmeyle huysuzları biraz serinlet!",
  "buyu3": "Yıldız Bahçesi hazır! Pembe düğmeye bas, yıldızlar dönsün!",
  "yetenek_yildiz": "Yeni yetenek: Yıldız Atışı! Yıldızlı düğmeye bas, uzağa yıldız fırlat!",
  "yetenek_kasirga": "Yeni yetenek: Kasırga! Parlayan düğmeye bas, fırıl fırıl dön!",
  "yetenek_meteor": "Yeni yetenek: Yıldız Yağmuru! Parlayan düğmeye bas, gökten yıldız yağsın!",
  "degnek": "Yeni bir sihirli asa buldun!",
  "kilic": "Yeni bir ışık kılıcı buldun! Sana çok yakıştı!",
  "sapka": "Yeni bir şapka! Çok tatlı oldun!",
  "pelerin": "Yeni bir gece pelerini! Yıldızları ışıl ışıl!",
  "efsane": "Vay canına! Işıl ışıl, çok özel bir hazine!",
  "sandik": "Bir sandık! Bakalım içinden ne çıkacak?",
  "can_az": "Canın azaldı! Kırmızı şişeye bas, hemen iyileş!",
  "iksir_yok": "Şişeler bitti. Kalpleri topla, canın dolsun!",
  "yoruldu": "Feza biraz yoruldu. Pırıl kanatlarıyla sarıyor, hemen kalkıyoruz!",
  "nese_tasi": "Parlayan bir rüya taşı! Yorulursak buradan devam ederiz.",
  "kapi": "Kapı açıldı! Hadi, uyku yuvasına dönelim!",
  "kocaman": "Bak bak! Kocaman bir huysuz geliyor!",
  "ejderha_yarim": "Yoruluyor! Devam et Feza, çok az kaldı!",
  "ejderha_yumurta": "Minik huysuzlar geldi! Onlara da dokun!",
  "ejderha_kalp": "Kalpler uçuşuyor! Hadi, hepsini topla!",
  "ejderha_sevgi": "Bütün kalpleri topladın! Ne kadar güzel!",
  "kristal": "Bak bak, sihirli bir yıldız! Ona dokun, büyü çözülsün!",
  "son": "Bütün ışıklar geri geldi! İyi ki varsın Feza!",
  "tekrar": "Yeni bir rüya başladı! Yeni huysuzlar, daha çok ışık!",
  "hos_geldin": "Tekrar hoş geldin Feza! Pırıl seni çok özlemiş.",
  "canta": "Çantana bak! Hangi kıyafeti giymek istersin?",
  "ovgu1": "Süper Feza!",
  "ovgu2": "Bravo sana!",
  "ovgu3": "Çok güçlüsün Feza!",
  "ovgu4": "İşte bu!",
  "ovgu5": "Vay, ne güzel yaptın!",
  "ovgu6": "Harikasın, aslan Feza!",
  "basla": "Oyna düğmesine bas, Pırıl'ın ışıklarını birlikte bulalım!",
  "devam": "Devam Et düğmesine bas, kaldığımız yerden uçalım!",
  "tuccar_merhaba": "Bak, gezgin satıcı geldi! Altınlarla küçük sürprizler alabilirsin.",
  "tuccar_iksir": "Yeni bir şişe çantana girdi. Canın azalınca içebilirsin.",
  "tuccar_bulut": "Bulut Örtüsü seni bu diyarda biraz daha koruyacak.",
  "tuccar_parilti": "Kılıcın ışıl ışıl oldu! Artık biraz daha güçlü.",
  "hayal_oyun_bitti": "Hepsi tamam! Şimdi ona dokunabilirsin!"
}/*SESLER-SON*/;
