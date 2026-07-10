import { useCallback } from 'react';
import * as Tone from 'tone';

const INSTRUMENT_CONFIGS = {
  piano: {
    urls: {
      A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
      A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
      A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
      A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
      A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
      A7: 'A7.mp3', C8: 'C8.mp3',
    },
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
  },
};

// Shared reverb — created once, connected to destination
let reverbNode = null;
function getReverb() {
  if (!reverbNode) {
    reverbNode = new Tone.Reverb({ decay: 1.8, wet: 0.50 }).toDestination();
  }
  return reverbNode;
}

/** Set reverb wet level (0–1) immediately. Safe to call before reverb is created. */
export function setReverbWet(value) {
  if (reverbNode) reverbNode.wet.value = value;
}

// ─── Synth factory — one distinct preset per instrument key ─────────────────

function makeSynth(instrument) {
  const reverb = getReverb();
  switch (instrument) {
    case 'epiano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.4 },
      }).connect(reverb);

    case 'harpsichord':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.2 },
      }).connect(reverb);

    case 'organ':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.0, sustain: 1.0, release: 0.05 },
      }).connect(reverb);

    case 'synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.5 },
      }).connect(reverb);

    case 'synthpad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 1.5 },
      }).connect(reverb);

    case 'synthbass':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
      }).connect(reverb);

    case 'pad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.6, decay: 0.4, sustain: 0.7, release: 2.0 },
      }).connect(reverb);

    case 'strings':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.8 },
      }).connect(reverb);

    case 'violin':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.08, decay: 0.05, sustain: 0.95, release: 0.6 },
      }).connect(reverb);

    case 'cello':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.12, decay: 0.1, sustain: 0.85, release: 0.9 },
      }).connect(reverb);

    case 'choir':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.3, decay: 0.2, sustain: 0.85, release: 1.2 },
      }).connect(reverb);

    case 'guitar':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.8 },
      }).connect(reverb);

    case 'guitar-distort':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.5 },
      }).connect(new Tone.Distortion(0.6).connect(reverb));

    case 'guitar-nylon':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.003, decay: 0.8, sustain: 0.0, release: 0.6 },
      }).connect(reverb);

    case 'bass':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4 },
      }).connect(reverb);

    case 'trumpet':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.3 },
      }).connect(reverb);

    case 'trombone':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.75, release: 0.5 },
      }).connect(reverb);

    case 'saxophone':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.4 },
      }).connect(reverb);

    case 'flute':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.05, sustain: 0.9, release: 0.3 },
      }).connect(reverb);

    case 'vibraphone':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 1.0, sustain: 0.1, release: 1.0 },
      }).connect(reverb);

    case 'marimba':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.5, sustain: 0.0, release: 0.4 },
      }).connect(reverb);

    case 'harp':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.003, decay: 0.9, sustain: 0.05, release: 1.0 },
      }).connect(reverb);

    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 1.2 },
      }).connect(reverb);
  }
}

// Module-level cache: one synth instance per instrument key, shared across hook instances
let samplerCache = {};
let samplerLoadingPromise = null;

// Synth cache keyed by instrument name
const synthCache = {};

export function stopAllSynths() {
  Object.values(synthCache).forEach((synth) => {
    synth.releaseAll?.();
    synth.triggerRelease?.(Object.keys(synth.activeVoices ?? {}));
  });
  Object.values(samplerCache).forEach((sampler) => {
    sampler.releaseAll?.();
    sampler.triggerRelease?.(Object.keys(sampler._activeSources ?? {}));
  });
}

export function useSampler() {
  const getSynth = useCallback(async (instrument = 'piano') => {
    await Tone.start();

    if (instrument === 'piano') {
      if (samplerCache.piano) return samplerCache.piano;
      if (samplerLoadingPromise) return samplerLoadingPromise;
      samplerLoadingPromise = new Promise((resolve) => {
        const sampler = new Tone.Sampler({
          ...INSTRUMENT_CONFIGS.piano,
          onload: () => {
            const s = sampler.connect(getReverb());
            samplerCache.piano = s;
            samplerLoadingPromise = null;
            resolve(s);
          },
        });
      });
      return samplerLoadingPromise;
    }

    // Non-piano: one cached PolySynth per instrument key
    if (!synthCache[instrument]) {
      synthCache[instrument] = makeSynth(instrument);
    }
    return synthCache[instrument];
  }, []);

  const playNotes = useCallback(async (notes, duration = '2n', instrument = 'piano') => {
    const synth = await getSynth(instrument);
    synth.triggerAttackRelease(notes, duration);
  }, [getSynth]);

  const playArpeggio = useCallback(async (notes, style = 'up', noteDuration = '8n', instrument = 'piano') => {
    const synth = await getSynth(instrument);
    let seq = [...notes];
    if (style === 'down') seq = seq.reverse();
    if (style === 'updown') seq = [...seq, ...[...seq].reverse().slice(1)];
    const now = Tone.now();
    const dur = Tone.Time(noteDuration).toSeconds();
    seq.forEach((note, i) => {
      synth.triggerAttackRelease(note, noteDuration, now + i * dur);
    });
  }, [getSynth]);

  return { playNotes, playArpeggio, getSynth, setReverbWet };
}
