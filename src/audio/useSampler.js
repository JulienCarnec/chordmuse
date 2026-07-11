import { useCallback } from 'react';
import * as Tone from 'tone';

// ─── Sample note lists ────────────────────────────────────────────────────────
// All instruments use MusyngKite soundfonts from gleitz/midi-js-soundfonts
// (https://gleitz.github.io/midi-js-soundfonts/MusyngKite/).
// Flat notation (Db, Eb, Gb, Ab, Bb) as provided by that collection.
// A sparse but evenly-spaced set of notes is enough — Tone.Sampler pitch-shifts
// the rest.

const SPARSE_NOTES = {
  A1: 'A1.mp3', A2: 'A2.mp3', A3: 'A3.mp3', A4: 'A4.mp3', A5: 'A5.mp3',
  C2: 'C2.mp3', C3: 'C3.mp3', C4: 'C4.mp3', C5: 'C5.mp3', C6: 'C6.mp3',
  Eb2: 'Eb2.mp3', Eb3: 'Eb3.mp3', Eb4: 'Eb4.mp3', Eb5: 'Eb5.mp3',
  Gb2: 'Gb2.mp3', Gb3: 'Gb3.mp3', Gb4: 'Gb4.mp3', Gb5: 'Gb5.mp3',
};

const MUSYNGKITE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/';

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
  epiano: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}electric_piano_1-mp3/`,
  },
  organ: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}drawbar_organ-mp3/`,
  },
  pad: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}pad_2_warm-mp3/`,
  },
  guitar: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}electric_guitar_clean-mp3/`,
  },
  'guitar-nylon': {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}acoustic_guitar_nylon-mp3/`,
  },
  synth: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}lead_2_sawtooth-mp3/`,
  },
  'synth-pad': {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}pad_3_polysynth-mp3/`,
  },
  strings: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}string_ensemble_1-mp3/`,
  },
  violin: {
    urls: SPARSE_NOTES,
    baseUrl: `${MUSYNGKITE}violin-mp3/`,
  },
};

// ─── Shared reverb ────────────────────────────────────────────────────────────
let reverbNode = null;
function getReverb() {
  if (!reverbNode) {
    reverbNode = new Tone.Reverb({ decay: 1.8, wet: 0.60 }).toDestination();
  }
  return reverbNode;
}

/** Set reverb wet level (0–1) immediately. Safe to call before reverb is created. */
export function setReverbWet(value) {
  if (reverbNode) reverbNode.wet.value = value;
}

// ─── Sampler cache ────────────────────────────────────────────────────────────
// One Tone.Sampler instance per instrument key, created on first use.
const samplerCache = {};
const samplerLoadingPromises = {};

function buildSampler(instrument) {
  const config = INSTRUMENT_CONFIGS[instrument];
  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls: config.urls,
      baseUrl: config.baseUrl,
      onload: () => {
        const s = sampler.connect(getReverb());
        samplerCache[instrument] = s;
        delete samplerLoadingPromises[instrument];
        resolve(s);
      },
    });
  });
}

export function stopAllSynths() {
  Object.values(samplerCache).forEach((s) => {
    s.releaseAll?.();
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSampler() {
  const getSynth = useCallback(async (instrument = 'piano') => {
    await Tone.start();

    if (samplerCache[instrument]) return samplerCache[instrument];
    if (samplerLoadingPromises[instrument]) return samplerLoadingPromises[instrument];

    samplerLoadingPromises[instrument] = buildSampler(instrument);
    return samplerLoadingPromises[instrument];
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
