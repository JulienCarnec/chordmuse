/**
 * useDrumSequencer — drives a 16-step Tone.js drum sequencer + optional click track.
 *
 * Drum sounds use real audio samples loaded via Tone.Players.
 * Each sample key maps to a specific file in /public/samples/drums/.
 *
 * Sample variants (selectable per-row via the "sample" field):
 *   Bass drum : kick-cr78, kick-kit3, kick-kit8
 *   Snare     : snare-cr78, snare-kit3, snare-kit8
 *   Hi-hat    : hihat-closed-cr78, hihat-closed-kit3, hihat-closed-korg,
 *               hihat-closed-roland, hihat-open-korg, hihat-open-roland
 *   Clap      : clap-roland
 *   Cymbal    : crash-berklee1, crash-berklee2, crash-roland,
 *               ride-berklee1, ride-roland
 *
 * Hi-hat cadence overrides:
 *   'quarter'   → HH on every quarter note (4 hits / 4/4 bar)
 *   'eighth'    → HH on every eighth note (8 hits / 4/4 bar)  ← default
 *   'sixteenth' → HH on every 16th note (16 hits / 4/4 bar)
 *
 * Bass pattern overrides (applied on top of the pattern rows):
 *   'standard'      → kick on beat 1 and beat 3
 *   'on-ones'       → kick on beat 1 only
 *   'four-on-floor' → kick on every beat (1, 2, 3, 4)
 *   'off'           → keep the pattern rows' own kick steps
 */

import { useCallback } from 'react';
import * as Tone from 'tone';

// ─── Sample catalogue ─────────────────────────────────────────────────────────
//
// Maps every sample key to:
//   file   : path under /public/samples/drums/
//   volOff : dB offset for timbre shaping
//
// The "group" field is used for routing (bd / snare / hh / cymbal / clap).
const SAMPLE_CATALOGUE = {
  // ── Bass drums ───────────────────────────────────────────────────────────────
  'kick':          { file: 'kick-cr78.mp3',          group: 'bd',     volOff:  0 },
  'kick-cr78':     { file: 'kick-cr78.mp3',          group: 'bd',     volOff:  0 },
  'kick-kit3':     { file: 'kick-kit3.mp3',          group: 'bd',     volOff:  0 },
  'kick-kit8':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff:  0 },

  // ── Snares ───────────────────────────────────────────────────────────────────
  'snare':         { file: 'snare-cr78.mp3',         group: 'snare',  volOff:  0 },
  'snare-cr78':    { file: 'snare-cr78.mp3',         group: 'snare',  volOff:  0 },
  'snare-kit3':    { file: 'snare-kit3.mp3',         group: 'snare',  volOff:  0 },
  'snare-kit8':    { file: 'snare-kit8.mp3',         group: 'snare',  volOff:  0 },

  // ── Hi-hats (closed) ─────────────────────────────────────────────────────────
  'hh':                  { file: 'hihat-closed-cr78.mp3',   group: 'hh', volOff:  0 },
  'hh-closed':           { file: 'hihat-closed-cr78.mp3',   group: 'hh', volOff:  0 },
  'hihat-closed-cr78':   { file: 'hihat-closed-cr78.mp3',   group: 'hh', volOff:  0 },
  'hihat-closed-kit3':   { file: 'hihat-closed-kit3.mp3',   group: 'hh', volOff:  0 },
  'hihat-closed-korg':   { file: 'hihat-closed-korg.wav',   group: 'hh', volOff: -2 },
  'hihat-closed-roland': { file: 'hihat-closed-roland.wav', group: 'hh', volOff: -2 },

  // ── Hi-hats (open) ───────────────────────────────────────────────────────────
  'hh-open':             { file: 'hihat-open-korg.wav',     group: 'hh', volOff:  2 },
  'hihat-open-korg':     { file: 'hihat-open-korg.wav',     group: 'hh', volOff:  2 },
  'hihat-open-roland':   { file: 'hihat-open-roland.wav',   group: 'hh', volOff:  2 },

  // ── Clap ─────────────────────────────────────────────────────────────────────
  'clap':          { file: 'clap-roland.wav',         group: 'clap',   volOff:  0 },
  'clap-roland':   { file: 'clap-roland.wav',         group: 'clap',   volOff:  0 },

  // ── Cymbals (crash) ──────────────────────────────────────────────────────────
  'crash':             { file: 'crash-berklee1.mp3',  group: 'cymbal', volOff:  0 },
  'crash-berklee1':    { file: 'crash-berklee1.mp3',  group: 'cymbal', volOff:  0 },
  'crash-berklee2':    { file: 'crash-berklee2.mp3',  group: 'cymbal', volOff:  0 },
  'crash-roland':      { file: 'crash-roland.wav',    group: 'cymbal', volOff: -2 },

  // ── Cymbals (ride) ───────────────────────────────────────────────────────────
  'ride':              { file: 'ride-berklee1.mp3',   group: 'cymbal', volOff:  0 },
  'ride-berklee1':     { file: 'ride-berklee1.mp3',   group: 'cymbal', volOff:  0 },
  'ride-roland':       { file: 'ride-roland.wav',     group: 'cymbal', volOff: -2 },

  // ─── Legacy aliases — kept so old saved patterns continue to work ─────────────
  'kick-acoustic':  { file: 'kick-kit3.mp3',          group: 'bd',     volOff: -2 },
  'kick-tight':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff:  0 },
  'side-stick':     { file: 'snare-cr78.mp3',         group: 'snare',  volOff: -4 },
  'snare-electric': { file: 'snare-kit8.mp3',         group: 'snare',  volOff:  2 },
  'snare-brush':    { file: 'snare-kit3.mp3',         group: 'snare',  volOff: -6 },
  'hh-pedal':       { file: 'hihat-closed-roland.wav',group: 'hh',     volOff: -4 },
  'snare-rim':      { file: 'snare-cr78.mp3',         group: 'snare',  volOff: -4 },
  'crash-cymbal':   { file: 'crash-berklee1.mp3',     group: 'cymbal', volOff:  0 },
  'ride-cymbal':    { file: 'ride-berklee1.mp3',      group: 'cymbal', volOff:  0 },
  // Percussion legacy keys — fall back to synthetic alternatives below
  'perc-conga':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -8 },
  'perc-shaker':    { file: 'hihat-closed-cr78.mp3',  group: 'hh',     volOff: -8 },
  'tambourine':     { file: 'hihat-closed-cr78.mp3',  group: 'hh',     volOff: -6 },
  // Toms / congas / misc — best approximation with available samples
  'tom-floor-lo':   { file: 'kick-kit3.mp3',          group: 'bd',     volOff: -4 },
  'tom-floor-hi':   { file: 'kick-kit3.mp3',          group: 'bd',     volOff: -6 },
  'tom-lo':         { file: 'kick-kit3.mp3',          group: 'bd',     volOff: -8 },
  'tom-lo-mid':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -6 },
  'tom-hi-mid':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -8 },
  'tom-hi':         { file: 'kick-kit8.mp3',          group: 'bd',     volOff:-10 },
  'tom-mid':        { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -7 },
  'bongo-hi':       { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -8 },
  'bongo-lo':       { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -6 },
  'conga-mute':     { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -8 },
  'conga-hi':       { file: 'kick-kit8.mp3',          group: 'bd',     volOff: -7 },
  'conga-lo':       { file: 'kick-kit3.mp3',          group: 'bd',     volOff: -5 },
  'timbale-hi':     { file: 'snare-cr78.mp3',         group: 'snare',  volOff: -6 },
  'timbale-lo':     { file: 'snare-cr78.mp3',         group: 'snare',  volOff: -4 },
  'agogo-hi':       { file: 'hihat-closed-roland.wav',group: 'hh',     volOff:  0 },
  'agogo-lo':       { file: 'hihat-closed-roland.wav',group: 'hh',     volOff: -2 },
  'cabasa':         { file: 'hihat-closed-cr78.mp3',  group: 'hh',     volOff: -8 },
  'maracas':        { file: 'hihat-closed-cr78.mp3',  group: 'hh',     volOff: -6 },
  'cowbell':        { file: 'ride-berklee1.mp3',      group: 'cymbal', volOff:  0 },
  'vibraslap':      { file: 'crash-berklee1.mp3',     group: 'cymbal', volOff: -6 },
  'chinese-cymbal': { file: 'crash-berklee2.mp3',     group: 'cymbal', volOff:  0 },
  'splash':         { file: 'crash-berklee1.mp3',     group: 'cymbal', volOff: -4 },
  'crash-2':        { file: 'crash-berklee2.mp3',     group: 'cymbal', volOff:  0 },
  'ride-2':         { file: 'ride-roland.wav',        group: 'cymbal', volOff:  0 },
  'ride-bell':      { file: 'ride-roland.wav',        group: 'cymbal', volOff:  2 },
  'claves':         { file: 'hihat-closed-roland.wav',group: 'hh',     volOff:  2 },
  'wood-block-hi':  { file: 'hihat-closed-roland.wav',group: 'hh',     volOff:  4 },
  'wood-block-lo':  { file: 'hihat-closed-korg.wav',  group: 'hh',     volOff:  2 },
  'triangle-mute':  { file: 'hihat-closed-roland.wav',group: 'hh',     volOff:  6 },
  'triangle-open':  { file: 'hihat-open-roland.wav',  group: 'hh',     volOff:  4 },
};

const BASE_URL = '/samples/drums/';

// ─── Module-level singletons ─────────────────────────────────────────────────
// All state lives at module scope so every hook call shares the same engine.

/**
 * Per-row audio chain: each rowId maps to { player, volGain, revGain }.
 *   player  — Tone.Player for the row's current sample
 *   volGain — Tone.Gain (linear) routing to destination; controlled by row.volume + vel
 *   revGain — Tone.Gain (linear) routing to shared reverb; controlled by row.reverb
 * Rebuilt whenever a row's sample changes (via ensureRowChain).
 */
let drumReverb  = null;
/** rowId → { player: Tone.Player, volGain: Tone.Gain, revGain: Tone.Gain, sampleKey: string } */
const rowChains = new Map();
/** True once the shared reverb is ready. */
let reverbReady = false;
/** Promise serialising reverb creation. */
let reverbPromise = null;

let seqRef   = null;   // drum loop
let clickRef = null;   // click track loop
// Live-mutable rows reference — updated by updateDrumRows without restarting the Sequence
const liveRows = { current: null };
// Live-mutable overrides — updated by updateDrumOverrides
const liveOverrides = { current: { hiHatCadence: 'eighth', bassPattern: 'standard' } };
// Callback invoked on every 16th-note step with the step index (for UI highlight)
const onStepCbs = new Set();

// ─── Audio chain management ───────────────────────────────────────────────────

async function ensureReverb() {
  if (reverbReady && drumReverb) return;
  if (reverbPromise) { await reverbPromise; return; }
  reverbPromise = (async () => {
    drumReverb = new Tone.Reverb({ decay: 2.0, wet: 1.0 }).toDestination();
    await drumReverb.ready;
    reverbReady = true;
  })();
  await reverbPromise;
}

/**
 * Build or rebuild the audio chain for one row.
 * Called on first use and whenever the row's sample key changes.
 */
async function ensureRowChain(rowId, sampleKey) {
  await ensureReverb();

  const existing = rowChains.get(rowId);
  if (existing && existing.sampleKey === sampleKey) return; // already correct

  // Tear down old chain if sample changed.
  if (existing) {
    existing.player.dispose();
    existing.volGain.dispose();
    existing.revGain.dispose();
  }

  const url     = BASE_URL + (SAMPLE_CATALOGUE[sampleKey]?.file ?? '');
  const revGain = new Tone.Gain(0).connect(drumReverb);
  const volGain = new Tone.Gain(1).toDestination();
  const player  = new Tone.Player({ url, autostart: false });
  // Connect: player → volGain (dry) AND player → revGain → reverb (wet)
  player.connect(volGain);
  player.connect(revGain);
  await Tone.loaded();

  rowChains.set(rowId, { player, volGain, revGain, sampleKey });
}

/**
 * Ensure chains for all rows in a rows array (called before playback starts).
 */
async function ensureAllRowChains(rows) {
  await Promise.all(rows.map(row => {
    const sampleKey = row.sample ?? row.rowId;
    return ensureRowChain(row.rowId, sampleKey);
  }));
}

function disposeAllChains() {
  rowChains.forEach(({ player, volGain, revGain }) => {
    player.dispose();
    volGain.dispose();
    revGain.dispose();
  });
  rowChains.clear();
  if (drumReverb) { drumReverb.dispose(); drumReverb = null; }
  reverbReady   = false;
  reverbPromise = null;
}

// ─── Click synth (no sample needed — stays synthesised for low latency) ───────

function makeClick() {
  return new Tone.MembraneSynth({
    pitchDecay: 0.008, octaves: 2, volume: -6,
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
  }).toDestination();
}

let clickSynth = null;
function ensureClickSynth() {
  if (!clickSynth) clickSynth = makeClick();
}
function disposeClickSynth() {
  if (clickSynth) { clickSynth.dispose(); clickSynth = null; }
}

// ─── Trigger a row using the Players instance ─────────────────────────────────

function triggerRow(row, time, vel = 1.0) {
  const chain = rowChains.get(row.rowId);
  if (!chain) return;

  const { player, volGain, revGain } = chain;
  if (!player || player.state === 'disposed') return;

  const sampleKey = row.sample ?? row.rowId;
  const info      = SAMPLE_CATALOGUE[sampleKey] ?? {};

  // ── Volume: step velocity × row volume knob × per-sample dB offset ───────
  const rowGain  = (row.volume ?? 80) / 100;
  const combined = vel * rowGain;
  const volOff   = info.volOff ?? 0;
  // Convert to linear gain for the Gain node (include the per-sample dB offset).
  volGain.gain.value = combined < 0.01 ? 0 : combined * Math.pow(10, volOff / 20);

  // ── Reverb: row reverb knob → send gain (0–100 → 0.0–1.0 linear) ─────────
  revGain.gain.value = (row.reverb ?? 0) / 100;

  // Stop any in-progress playback before restarting.
  if (player.state === 'started') player.stop(time);
  player.start(time);
}

// ─── Hi-hat cadence override ──────────────────────────────────────────────────
function hhStepActive(step, cadence) {
  if (cadence === 'sixteenth') return true;
  if (cadence === 'eighth')    return step % 2 === 0;
  if (cadence === 'quarter')   return step % 4 === 0;
  return false;
}

// ─── Bass pattern override ────────────────────────────────────────────────────
const BASS_PATTERNS = {
  'standard':      new Set([0, 8]),
  'on-ones':       new Set([0]),
  'four-on-floor': new Set([0, 4, 8, 12]),
  'off':           null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDrumSequencer() {

  /** Register a step-highlight callback; returns a cleanup function. */
  const onStep = useCallback((cb) => {
    onStepCbs.add(cb);
    return () => onStepCbs.delete(cb);
  }, []);

  /** Update the rows reference live — takes effect on the next step pulse.
   *  Also rebuilds any per-row chains whose sample key has changed. */
  const updateDrumRows = useCallback((rows) => {
    liveRows.current = rows;
    // Rebuild chains for rows whose sample changed (fire-and-forget).
    rows.forEach(row => {
      const sampleKey = row.sample ?? row.rowId;
      const existing  = rowChains.get(row.rowId);
      if (existing && existing.sampleKey !== sampleKey) {
        ensureRowChain(row.rowId, sampleKey);
      }
    });
  }, []);

  /**
   * Update hi-hat cadence and bass pattern overrides live.
   * Takes effect on the very next step without restarting the loop.
   */
  const updateDrumOverrides = useCallback((overrides) => {
    liveOverrides.current = { ...liveOverrides.current, ...overrides };
  }, []);

  /**
   * Start the drum sequencer in sync with the Transport.
   * rows: the pattern rows array.
   * overrides: { hiHatCadence, bassPattern } optional — applied on top of the rows.
   */
  const startDrumSeq = useCallback(async (rows, timeSig = '4/4', overrides = {}) => {
    stopDrumSeqInternal();
    ensureClickSynth();

    liveRows.current = rows;
    liveOverrides.current = {
      hiHatCadence: overrides.hiHatCadence ?? 'eighth',
      bassPattern:  overrides.bassPattern  ?? 'standard',
    };

    // Ensure a per-row audio chain exists for every row's current sample.
    await ensureAllRowChains(rows);

    // Build the loop. triggerRow is synchronous and reads rowChains, which are
    // now guaranteed to exist after ensureAllRowChains resolves.
    let step = 0;
    seqRef = new Tone.Loop((time) => {
      const currentRows = liveRows.current;
      const { hiHatCadence, bassPattern } = liveOverrides.current;
      const currentStep = step;

      if (currentRows) {
        for (const row of currentRows) {
          const s = row.steps[currentStep];

          if (row.rowId === 'hh') {
            if (hiHatCadence === 'off') {
              // No cadence override — use the row's own pattern steps.
              if (s?.on) triggerRow(row, time, s.vel ?? 1.0);
            } else if (hhStepActive(currentStep, hiHatCadence)) {
              const vel = currentStep % 4 === 0 ? 1.0 : 0.6;
              triggerRow(row, time, vel);
            }
          } else if (row.rowId === 'bd') {
            const beatSet = BASS_PATTERNS[bassPattern] ?? null;
            // 'off' bassPattern → beatSet is null → honour only explicit pattern steps.
            if (beatSet === null || s?.on) {
              if (s?.on) triggerRow(row, time, s.vel ?? 1.0);
            } else if (beatSet.has(currentStep)) {
              triggerRow(row, time, 1.0);
            }
          } else {
            if (s?.on) triggerRow(row, time, s.vel ?? 1.0);
          }
        }
      }
      Tone.getDraw().schedule(() => {
        onStepCbs.forEach(cb => cb(currentStep));
      }, time);
      step = (step + 1) % 16;
    }, '16n');

    const transport = Tone.getTransport();
    const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
    const barDurSec  = Tone.Time(`${beatUnit}n`).toSeconds() * beatsPerBar;
    const nowSec     = transport.seconds;
    const posInBar   = nowSec % barDurSec;
    const nextBarSec = posInBar < 0.01
      ? nowSec
      : nowSec + (barDurSec - posInBar);

    seqRef.start(nextBarSec);
  }, []);

  const stopDrumSeq = useCallback(() => {
    stopDrumSeqInternal();
    stopClickInternal();
    disposeAllChains();
    disposeClickSynth();
    liveRows.current = null;
    onStepCbs.forEach(cb => cb(null));
  }, []);

  /**
   * Start the simple click track — a wood-block accent on beat 1, softer clicks
   * on beats 2–4.  Independent of the drum sequencer; can run alongside it.
   */
  const startClickSeq = useCallback((timeSig = '4/4') => {
    stopClickInternal();
    ensureClickSynth();

    const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
    const transport  = Tone.getTransport();
    const barDurSec  = Tone.Time(`${beatUnit}n`).toSeconds() * beatsPerBar;
    const nowSec     = transport.seconds;
    const posInBar   = nowSec % barDurSec;
    const nextBarSec = posInBar < 0.01
      ? nowSec
      : nowSec + (barDurSec - posInBar);

    let beat = 0;
    clickRef = new Tone.Loop((time) => {
      const isAccent = beat === 0;
      if (clickSynth) {
        clickSynth.volume.value = isAccent ? 0 : -6;
        clickSynth.triggerAttackRelease(isAccent ? 'G4' : 'E4', '32n', time);
      }
      beat = (beat + 1) % beatsPerBar;
    }, `${beatUnit}n`);

    clickRef.start(nextBarSec);
  }, []);

  const stopClickSeq = useCallback(() => {
    stopClickInternal();
    if (!seqRef) disposeClickSynth();
  }, []);

  /**
   * Preview a single sample sound immediately (outside of sequencer playback).
   */
  const previewSample = useCallback(async (sampleKey) => {
    await Tone.start();
    // Use a temporary rowId for preview so it doesn't interfere with live rows.
    const previewRowId = '__preview__';
    await ensureRowChain(previewRowId, sampleKey);
    const chain = rowChains.get(previewRowId);
    if (chain) {
      chain.volGain.gain.value = 0.85;
      chain.revGain.gain.value = 0;
      if (chain.player.state === 'started') chain.player.stop();
      chain.player.start();
    }
  }, []);

  return { startDrumSeq, stopDrumSeq, updateDrumRows, updateDrumOverrides, startClickSeq, stopClickSeq, onStep, previewSample };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function stopDrumSeqInternal() {
  if (seqRef) {
    seqRef.stop();
    seqRef.dispose();
    seqRef = null;
  }
}

function stopClickInternal() {
  if (clickRef) {
    clickRef.stop();
    clickRef.dispose();
    clickRef = null;
  }
}
