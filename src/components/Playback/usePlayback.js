import { useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { useSampler } from '../../audio/useSampler';
import { getChordNotesVoiced } from '../../theory/chords';

const BASE_OCTAVE = 4;
const RELEASE_GAP = 0.04;

// ─── Humanization constants ────────────────────────────────────────────────────
// Maximum timing jitter in seconds at humanize=1
const MAX_JITTER_SEC = 0.022;
// Maximum velocity scatter (±) at humanize=1
const MAX_VEL_SCATTER = 0.12;

/**
 * Return a random float in [-1, 1]
 */
function rnd() { return Math.random() * 2 - 1; }

/**
 * Clamp a value between lo and hi.
 */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Compute humanized velocity for a single event.
 *
 * baseVel   – the deterministic baseline (0–1) for this position
 * humanize  – amount 0–1
 *
 * Returns a velocity clamped to [0.25, 1.0].
 */
function humanVel(baseVel, humanize) {
  if (humanize === 0) return baseVel;
  return clamp(baseVel + rnd() * MAX_VEL_SCATTER * humanize, 0.25, 1.0);
}

/**
 * Compute timing jitter for a single event (in seconds).
 * humanize – amount 0–1
 */
function humanJitter(humanize) {
  if (humanize === 0) return 0;
  return rnd() * MAX_JITTER_SEC * humanize;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// Mutable refs for live-adjustable playback params
const liveParams = {
  playStyle:  { current: 'block' },
  noteValue:  { current: '4n' },
  arpOctaves: { current: 1 },
  arpRepeat:  { current: true },
  humanize:   { current: 0 },
};

export function usePlayback() {
  const { state, dispatch } = useAppState();
  const { getSynth } = useSampler();
  // Scheduled Tone.js events — disposed on stop
  const eventsRef = useRef([]);
  const metRef = useRef(null);
  // Holds the latest play context so the loop closure can re-read it
  const playCtxRef = useRef(null);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    eventsRef.current.forEach(p => { try { p.dispose(); } catch {} });
    eventsRef.current = [];
    if (metRef.current) {
      metRef.current.loop?.dispose();
      metRef.current.clickSynth?.dispose();
      metRef.current.snareSynth?.dispose();
      metRef.current.bassSynth?.dispose();
      metRef.current = null;
    }
    playCtxRef.current = null;
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: null });
    dispatch({ type: 'SET_PLAYBACK_NOTES', notes: [], durationMs: 0 });
  }, [dispatch]);

  const pause = useCallback(() => {
    Tone.getTransport().pause();
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_PAUSED', paused: true });
  }, [dispatch]);

  const resume = useCallback(() => {
    Tone.getTransport().start();
    dispatch({ type: 'SET_PLAYING', playing: true });
    dispatch({ type: 'SET_PAUSED', paused: false });
  }, [dispatch]);

  const play = useCallback(async ({
    cells,
    progressionId,
    bpm,
    timeSig,
    instrument,
    playStyle = 'block',
    noteValue = '4n',
    arpOctaves = 1,
    arpRepeat = true,
    humanize = 0,
    metronome,
  }) => {
    await Tone.start();
    stop();

    // Seed live params so the loop always reads the latest values
    liveParams.playStyle.current  = playStyle;
    liveParams.noteValue.current  = noteValue;
    liveParams.arpOctaves.current = arpOctaves;
    liveParams.arpRepeat.current  = arpRepeat;
    liveParams.humanize.current   = humanize;

    const synth = await getSynth(instrument);
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
    const oneBeatSec = Tone.Time(`${beatUnit}n`).toSeconds();
    const barDur = oneBeatSec * beatsPerBar;

    // Store play context so the loop closure always reads the latest cells
    playCtxRef.current = { cells, progressionId, barDur, synth };

    /**
     * Schedule one full pass of the current cells starting at `timeOffset`.
     * Reads cells live from playCtxRef so chord/cell edits mid-play take
     * effect on the next loop iteration.
     * Returns the transport time at which the pass ends.
     */
    function schedulePass(timeOffset) {
      const ctx = playCtxRef.current;
      if (!ctx) return timeOffset;
      const segments = buildSegments(ctx.cells, ctx.barDur);
      if (!segments.length) return timeOffset;
      const totalDur = segments.reduce((s, g) => s + g.dur, 0);

      let cursor = timeOffset;
      for (const seg of segments) {
        const { notes, dur, cellIndex } = seg;
        const ps  = seg.playStyle ?? liveParams.playStyle.current;
        const nv  = seg.noteValue  ?? liveParams.noteValue.current;
        const ao  = liveParams.arpOctaves.current;
        const ar  = liveParams.arpRepeat.current;
        const hum = liveParams.humanize.current;
        const events = buildEvents(notes, ps, nv, dur, ao, ar, hum);

        for (const ev of events) {
          const rawT = cursor + ev.time + ev.jitter;
          const t = Math.max(cursor, rawT);
          const evNotes = ev.notes;
          const evDur = ev.duration;
          const evVel = ev.velocity;
          const evDurMs = evDur * 1000;
          const toneEv = new Tone.ToneEvent(() => {
            ctx.synth.triggerAttackRelease(evNotes, evDur, Tone.now(), evVel);
            dispatch({ type: 'SET_PLAYBACK_NOTES', notes: evNotes, durationMs: evDurMs });
          });
          toneEv.start(t);
          eventsRef.current.push(toneEv);
        }

        // Cell cursor marker
        const ci = cellIndex;
        const noteNames = notes.map(n => n.replace(/\d+$/, ''));
        const marker = new Tone.ToneEvent(() => {
          dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: { progressionId: ctx.progressionId, cellIndex: ci, notes: noteNames } });
        });
        marker.start(cursor);
        eventsRef.current.push(marker);

        cursor += dur;
      }
      return cursor; // = timeOffset + totalDur
    }

    // Schedule the first pass at t=0
    const firstEnd = schedulePass(0);

    // At the boundary of each pass: dispose old events, re-read cells, schedule next pass
    function scheduleLoop(nextStart) {
      if (!playCtxRef.current) return;
      const loopMarker = new Tone.ToneEvent(() => {
        if (!playCtxRef.current) return;
        // Dispose all scheduled events (they have already fired or will be replaced)
        eventsRef.current.forEach(p => { try { p.dispose(); } catch {} });
        eventsRef.current = [];
        const nextEnd = schedulePass(Tone.getTransport().seconds);
        scheduleLoop(nextEnd);
      });
      // Fire the marker ~50 ms before the boundary so events land in time
      loopMarker.start(Math.max(0, nextStart - 0.05));
      eventsRef.current.push(loopMarker);
    }
    scheduleLoop(firstEnd);

    if (metronome?.enabled) {
      setupMetronome(metRef, metronome.mode, bpm, timeSig);
    }

    dispatch({ type: 'SET_PLAYING', playing: true });
    transport.start();
  }, [stop, getSynth, dispatch]);

  // Update live params without restarting playback
  const updateLiveParams = useCallback((params) => {
    if (params.playStyle  !== undefined) liveParams.playStyle.current  = params.playStyle;
    if (params.noteValue  !== undefined) liveParams.noteValue.current  = params.noteValue;
    if (params.arpOctaves !== undefined) liveParams.arpOctaves.current = params.arpOctaves;
    if (params.arpRepeat  !== undefined) liveParams.arpRepeat.current  = params.arpRepeat;
    if (params.humanize   !== undefined) liveParams.humanize.current   = params.humanize;
  }, []);

  // Update the live cells ref so the next loop iteration picks up chord/cell changes
  const updateLiveCells = useCallback((cells) => {
    if (playCtxRef.current) {
      playCtxRef.current.cells = cells;
    }
  }, []);

  return { play, stop, pause, resume, updateLiveParams, updateLiveCells };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSegments(cells, barDur) {
  const segments = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    // Per-cell overrides (null = use global)
    const cellPlayStyle = cell.playStyle ?? null;
    const cellNoteValue = cell.noteValue ?? null;
    if (cell.split) {
      for (const sc of cell.subCells.filter(Boolean)) {
        // Sub-cell override takes priority over cell override, which takes priority over global
        const subPlayStyle = sc.playStyle ?? cellPlayStyle;
        const subNoteValue = sc.noteValue ?? cellNoteValue;
        segments.push({
          notes: getChordNotesVoiced(sc.root, sc.typeKey, sc.octave ?? BASE_OCTAVE, sc.inversion ?? 0),
          dur: barDur / 2,
          cellIndex: i,
          playStyle: subPlayStyle,
          noteValue: subNoteValue,
        });
      }
    } else if (cell.chord) {
      segments.push({
        notes: getChordNotesVoiced(cell.chord.root, cell.chord.typeKey, cell.chord.octave ?? BASE_OCTAVE, cell.chord.inversion ?? 0),
        dur: barDur,
        cellIndex: i,
        playStyle: cellPlayStyle,
        noteValue: cellNoteValue,
      });
    }
  }
  return segments;
}

/** Shift a voiced note string up by N octaves (default 1) */
function shiftOctaveUp(noteStr, n = 1) {
  const match = noteStr.match(/^([A-G]#?)(\d+)$/);
  if (!match) return noteStr;
  return `${match[1]}${Number(match[2]) + n}`;
}

/** Shift a voiced note string down by N octaves (default 1) */
function shiftOctaveDown(noteStr, n = 1) {
  const match = noteStr.match(/^([A-G]#?)(\d+)$/);
  if (!match) return noteStr;
  return `${match[1]}${Math.max(0, Number(match[2]) - n)}`;
}

/**
 * Determine the baseline velocity for a strum event.
 *
 * stepSec    – duration of one subdivision step
 * t          – offset within the cell (seconds)
 * isFirstBar – whether this is the very first strum of the cell
 * isOnBeat   – whether t aligns with a beat boundary (within tolerance)
 * style      – 'strum-on' | 'strum-off'
 */
function strumBaseVel(t, stepSec, isFirstEvent, isOnBeat, style) {
  if (style === 'strum-on') {
    if (isFirstEvent) return 0.95;   // downbeat accent
    if (isOnBeat)     return 0.75;   // subsequent on-beat
    return 0.60;                     // off-beat
  }
  // strum-off: everything starts softer
  if (isOnBeat) return 0.70;
  return 0.55;
}

/**
 * Build the event list for one chord segment.
 * Each event: { time, notes, duration, velocity, jitter }
 */
function buildEvents(notes, playStyle, noteValue, cellDur, arpOctaves = 1, arpRepeat = true, humanize = 0) {
  const stepSec = Tone.Time(noteValue).toSeconds();
  const events = [];
  // Tolerance for "on-beat" detection: within 2 ms
  const beatTol = 0.002;

  if (playStyle === 'block') {
    events.push({
      time: 0,
      notes,
      duration: cellDur - RELEASE_GAP,
      velocity: humanVel(0.82, humanize),
      jitter:   humanJitter(humanize),
    });

  } else if (playStyle === 'strum-on' || playStyle === 'strum-off') {
    let t = playStyle === 'strum-on' ? 0 : stepSec / 2;
    let isFirst = true;
    while (t < cellDur - 0.001) {
      // On-beat when t is a near-integer multiple of stepSec
      const isOnBeat = (t % stepSec) < beatTol || (stepSec - (t % stepSec)) < beatTol;
      const baseVel = strumBaseVel(t, stepSec, isFirst, isOnBeat, playStyle);
      events.push({
        time: t,
        notes,
        duration: cellDur - t - RELEASE_GAP,
        velocity: humanVel(baseVel, humanize),
        jitter:   humanJitter(humanize),
      });
      t += stepSec;
      isFirst = false;
    }

  } else if (playStyle.startsWith('arpeggio')) {
    const sustain = playStyle.endsWith('-sustain');
    const baseStyle = playStyle.replace('-sustain', '');
    let seq = [...notes];
    if (arpOctaves === 2) seq = [...seq, ...notes.map(shiftOctaveUp)];
    if (baseStyle === 'arpeggio-down') seq = seq.reverse();
    if (baseStyle === 'arpeggio-updown') seq = [...seq, ...[...seq].reverse().slice(1)];
    let t = 0;
    let ni = 0;
    // arpRepeat=false: play through seq once, then stop
    const maxSteps = arpRepeat ? Infinity : seq.length;
    while (t < cellDur - 0.001 && ni < maxSteps) {
      const duration = sustain
        ? cellDur - t - RELEASE_GAP
        : stepSec - RELEASE_GAP;
      events.push({
        time: t,
        notes: [seq[ni % seq.length]],
        duration,
        velocity: humanVel(0.78, humanize),
        jitter:   humanJitter(humanize),
      });
      t += stepSec;
      ni++;
    }
  } else if (playStyle === 'bass-split') {
    // Pattern: [bass2+bass1], [root], [upper tones], [root] — all sustained to bar end
    // bass notes are chord root shifted 2 and 1 octave below the voicing bass
    const bassNote  = notes[0];                        // e.g. C4
    const bass1     = shiftOctaveDown(bassNote, 1);    // C3
    const bass2     = shiftOctaveDown(bassNote, 2);    // C2
    const upper     = notes.slice(1);                  // [E4, G4]
    // 4-event sequence, each spaced by stepSec, all holding to bar end
    const seq4 = [
      { notes: [bass2, bass1], vel: 0.90 },
      { notes: [bassNote],     vel: 0.78 },
      { notes: upper.length ? upper : [bassNote], vel: 0.72 },
      { notes: [bassNote],     vel: 0.68 },
    ];
    seq4.forEach(({ notes: evNotes, vel }, i) => {
      const t = i * stepSec;
      if (t >= cellDur - 0.001) return; // guard: cell shorter than 4 steps
      events.push({
        time:     t,
        notes:    evNotes,
        duration: cellDur - t - RELEASE_GAP,
        velocity: humanVel(vel, humanize),
        jitter:   humanJitter(humanize),
      });
    });

  } else if (playStyle === 'bach-prelude') {
    // Bach C-major Prelude pattern: 5-note broken-chord figure repeated to fill bar.
    // For voiced notes [n0, n1, ..., nN-1]:
    //   figure = [ n0-1oct, nN-1, n0, n1, nN-1 ]
    // Generalises to any chord size (triads, 7ths, etc.)
    const n0   = notes[0];
    const nTop = notes[notes.length - 1];
    const nMid = notes.length > 2 ? notes[1] : notes[0];
    const figure = [
      shiftOctaveDown(n0),   // low root
      nTop,                  // top note
      n0,                    // root
      nMid,                  // third (or second chord tone)
      nTop,                  // top note again
    ];
    // Velocity accents: beat-1 of figure slightly louder
    const figVels = [0.88, 0.62, 0.72, 0.62, 0.65];
    let t = 0;
    let ni = 0;
    while (t < cellDur - 0.001) {
      const figIdx = ni % figure.length;
      events.push({
        time:     t,
        notes:    [figure[figIdx]],
        duration: cellDur - t - RELEASE_GAP,   // sustain to end of bar
        velocity: humanVel(figVels[figIdx], humanize),
        jitter:   humanJitter(humanize),
      });
      t += stepSec;
      ni++;
    }
  }

  return events;
}

function setupMetronome(metRef, mode, bpm, timeSig) {
  const [beats, division] = timeSig.split('/').map(Number);
  const clickSynth = new Tone.MembraneSynth({ pitchDecay: 0.008, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
  const snareSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } }).toDestination();
  const bassSynth  = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination();
  let count = 0;
  const loop = new Tone.Loop((time) => {
    const beat = count % beats;
    if (mode === 'click') {
      clickSynth.triggerAttackRelease(beat === 0 ? 880 : 440, '32n', time);
    } else {
      if (beat === 0 || (beats === 4 && beat === 2)) bassSynth.triggerAttackRelease('C1', '8n', time);
      if ((beats === 4 && (beat === 1 || beat === 3)) || (beats === 3 && beat === 1)) snareSynth.triggerAttackRelease('8n', time);
      clickSynth.triggerAttackRelease(800, '32n', time);
    }
    count++;
  }, `${division}n`);
  loop.start(0);
  metRef.current = { loop, clickSynth, snareSynth, bassSynth };
}
