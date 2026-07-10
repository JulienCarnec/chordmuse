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

/** Tone.Players instance — loaded once, shared across all hook calls. */
let players = null;
/** True once players.load() has resolved. */
let playersReady = false;
/** Promise returned by the load — lets concurrent calls await the same load. */
let loadPromise = null;

let seqRef   = null;   // drum loop
let clickRef = null;   // click track loop
// Live-mutable rows reference — updated by updateDrumRows without restarting the Sequence
const liveRows = { current: null };
// Live-mutable overrides — updated by updateDrumOverrides
const liveOverrides = { current: { hiHatCadence: 'eighth', bassPattern: 'standard' } };
// Callback invoked on every 16th-note step with the step index (for UI highlight)
const onStepCbs = new Set();

// ─── Players management ───────────────────────────────────────────────────────

/** Build the url map for Tone.Players from the catalogue (deduplicated). */
function buildUrlMap() {
  const seen = new Set();
  const map = {};
  for (const [key, info] of Object.entries(SAMPLE_CATALOGUE)) {
    if (!seen.has(info.file)) {
      seen.add(info.file);
      // Use the sample key as the player key (first occurrence per file)
      map[key] = BASE_URL + info.file;
    }
  }
  return map;
}

/** Returns the player key to use for a given sample key.
 *  Since multiple keys may share the same file, we need to resolve to the
 *  key that was actually registered in the Players instance. */
function resolvePlayerKey(sampleKey) {
  const info = SAMPLE_CATALOGUE[sampleKey];
  if (!info) return null;
  // Find the first catalogue key that uses the same file — that is the key
  // that was registered in Tone.Players.
  for (const [k, v] of Object.entries(SAMPLE_CATALOGUE)) {
    if (v.file === info.file) return k;
  }
  return null;
}

async function ensurePlayers() {
  if (playersReady && players) return players;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const urlMap = buildUrlMap();
    players = new Tone.Players(urlMap).toDestination();
    await Tone.loaded(); // wait until all buffers registered so far are decoded
    playersReady = true;
    return players;
  })();

  return loadPromise;
}

function disposePlayers() {
  if (players) {
    players.dispose();
    players = null;
  }
  playersReady = false;
  loadPromise  = null;
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
  if (!players || !playersReady) return;

  const rowGain  = (row.volume ?? 80) / 100;
  const combined = vel * rowGain;
  const velDb    = combined < 0.01 ? -60 : 20 * Math.log10(combined);

  const sampleKey = row.sample ?? row.rowId;
  const info      = SAMPLE_CATALOGUE[sampleKey];
  if (!info) return;

  const playerKey = resolvePlayerKey(sampleKey);
  if (!playerKey) return;

  const player = players.player(playerKey);
  if (!player || player.state === 'disposed') return;

  player.volume.value = velDb + (info.volOff ?? 0);
  // Stop any in-progress playback of this player before restarting.
  // Tone.Player throws "Start time must be strictly greater than previous start time"
  // when .start() is called while the buffer is still playing (common at fast tempos).
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

  /** Update the rows reference live — takes effect on the next step pulse. */
  const updateDrumRows = useCallback((rows) => {
    liveRows.current = rows;
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

    // Build the loop immediately (before the async load) so `.start()` can be
    // called at transport time 0 before `transport.start()` fires.
    let step = 0;
    seqRef = new Tone.Loop((time) => {
      const currentRows = liveRows.current;
      const { hiHatCadence, bassPattern } = liveOverrides.current;
      const currentStep = step;

      if (currentRows) {
        for (const row of currentRows) {
          const s = row.steps[currentStep];

          if (row.rowId === 'hh') {
            if (hhStepActive(currentStep, hiHatCadence)) {
              const vel = currentStep % 4 === 0 ? 1.0 : 0.6;
              triggerRow(row, time, vel);
            }
          } else if (row.rowId === 'bd') {
            const beatSet = BASS_PATTERNS[bassPattern] ?? null;
            if (beatSet === null || s?.on) {
              // 'off' preset OR the user has explicitly enabled this step — honour the stored pattern
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
    // If transport hasn't started yet (seconds == 0) or we're right at a bar
    // boundary, start at 0 so the first beat fires with beat 1 of the track.
    const nextBarSec = posInBar < 0.01
      ? nowSec
      : nowSec + (barDurSec - posInBar);

    seqRef.start(nextBarSec);

    // Load samples after registering the loop — triggerRow is a no-op until
    // playersReady is true, so any steps that fire before load completes are
    // silently skipped rather than crashing.
    await ensurePlayers();
  }, []);

  const stopDrumSeq = useCallback(() => {
    stopDrumSeqInternal();
    stopClickInternal();
    disposePlayers();
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
    await ensurePlayers();
    const mockRow = { sample: sampleKey, volume: 85 };
    triggerRow(mockRow, Tone.now(), 1.0);
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
