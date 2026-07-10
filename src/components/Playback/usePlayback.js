import { useCallback } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { useSampler, stopAllSynths } from '../../audio/useSampler';
import { useDrumSequencer } from '../../audio/useDrumSequencer';
import { voiceChord } from '../../theory/chords';
import { buildEventsFromPattern } from '../../theory/pattern';

const BASE_OCTAVE = 4;
const RELEASE_GAP = 0.04;

// ─── Humanization constants ────────────────────────────────────────────────────
const MAX_JITTER_SEC = 0.033;
const MAX_VEL_SCATTER = 0.18;

/**
 * How many seconds ahead of the current pass boundary we pre-schedule the next
 * pass. 0.3 s gives the JS main thread plenty of breathing room while staying
 * well below the shortest bar at typical BPMs.
 */
const LOOKAHEAD_SEC = 0.3;

function toSec(expr) {
  return Tone.Time(expr).toSeconds();
}

function rnd() { return Math.random() * 2 - 1; }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function humanVel(baseVel, humanize) {
  if (humanize === 0) return baseVel;
  return clamp(baseVel + rnd() * MAX_VEL_SCATTER * humanize, 0.25, 1.0);
}

function humanJitter(humanize) {
  if (humanize === 0) return 0;
  return rnd() * MAX_JITTER_SEC * humanize;
}

// ─── Module-level singletons ──────────────────────────────────────────────────
// All playback state lives here so every usePlayback() call in any component
// shares exactly one set of refs.  useRef() is intentionally NOT used — plain
// objects with a .current property are equivalent outside React's lifecycle.

// Live-adjustable playback params (mutated directly, never triggers re-render)
const liveParams = {
  playStyle:    { current: '{[a1,b1,c1]}' },
  noteValue:    { current: '4n' },
  humanize:     { current: 0.5 },
  patternLoop:  { current: true },
  timeSig:      { current: '4/4' },
  maxVelocity:  { current: 0.80 },
  groove:       { current: 'straight' },
};

// Playback session state — reset on every play() / stop()
const playCtxRef = { current: null };  // { cells, progressionId, synth, instrument, loop }
const eventsRef  = { current: [] };    // all scheduled transport IDs
// Live drum schedule — mutated in place so Transport callbacks always read current state.
// Array of { timeSec, rows } mirroring the drumSchedule passed to play().
const liveDrumSchedule = { current: [] };

// ─── Module-level scheduling helpers ─────────────────────────────────────────
// Extracted so both play() and reschedule() share identical logic with no
// duplication. Both receive `dispatch` and `stopFn` as arguments.

/**
 * Schedule one full pass of the current cells starting at `timeOffset`.
 * Reads liveParams and playCtxRef.current.cells at call time.
 * Returns the transport time (seconds) at which this pass ends.
 *
 * @param {number} timeOffset  - absolute transport time (seconds) to start from
 * @param {number} [skipToSec] - skip segments whose end time is <= this transport
 *                               time; used by reschedule() to resume mid-sequence
 *                               rather than restarting from cell 0.
 */
function schedulePass(timeOffset, dispatch, stopFn, skipToSec = 0) {
  const ctx = playCtxRef.current;
  if (!ctx) return timeOffset;

  const [beatsPerBar, beatUnit] = liveParams.timeSig.current.split('/').map(Number);
  const barDur = toSec(`${beatUnit}n`) * beatsPerBar;

  const segments = buildSegments(ctx.cells, barDur);
  if (!segments.length) return timeOffset;

  const transport = Tone.getTransport();
  let cursor = timeOffset;

  for (const seg of segments) {
    // If this segment would end before skipToSec, it has already been heard —
    // advance the cursor but do not re-schedule it.
    if (cursor + seg.dur <= skipToSec) {
      cursor += seg.dur;
      continue;
    }
    const { notes, dur, cellIndex } = seg;
    const ps     = seg.playStyle  ?? liveParams.playStyle.current;
    const nv     = seg.noteValue  ?? liveParams.noteValue.current;
    const hum    = liveParams.humanize.current;
    const loop   = seg.patternLoop ?? liveParams.patternLoop.current;
    const maxVel = liveParams.maxVelocity.current;
    const groove = liveParams.groove.current;
    const events = buildEvents(notes, ps, nv, dur, hum, loop, maxVel, groove);

    for (const ev of events) {
      const t = Math.max(cursor, cursor + ev.time + ev.jitter);
      const evNotes = ev.notes;
      const evDur   = ev.duration;
      const evVel   = ev.velocity;
      const evDurMs = evDur * 1000;

      const id = transport.schedule((audioTime) => {
        // Re-read synth from ctx so an instrument swap mid-playback takes
        // effect on the next scheduled event without restarting.
        const activeSynth = playCtxRef.current?.synth ?? ctx.synth;
        activeSynth.triggerAttackRelease(evNotes, evDur, audioTime, evVel);
        Tone.getDraw().schedule(() => {
          dispatch({ type: 'SET_PLAYBACK_NOTES', notes: evNotes, durationMs: evDurMs });
        }, audioTime);
      }, t);
      eventsRef.current.push(id);
    }

    const ci        = cellIndex;
    const progId    = seg.progressionId ?? ctx.progressionId;
    const trkIdx    = seg.trackIndex;   // undefined for progression-editor play
    const noteNames = notes.map(n => n.replace(/\d+$/, ''));
    const markId = transport.schedule((audioTime) => {
      Tone.getDraw().schedule(() => {
        dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: { progressionId: progId, cellIndex: ci, trackIndex: trkIdx, notes: noteNames } });
      }, audioTime);
    }, cursor);
    eventsRef.current.push(markId);

    cursor += dur;
  }
  return cursor;
}

/**
 * Schedule the lookahead marker that will pre-schedule the next pass.
 * Gapless: fires LOOKAHEAD_SEC before the pass boundary, then recurses.
 */
function scheduleLoop(nextStart, dispatch, stopFn, skipToSec = 0) {
  if (!playCtxRef.current) return;
  // If this playback was started with loop:false, stop instead of rescheduling.
  if (!playCtxRef.current.loop) {
    const id = Tone.getTransport().schedule(() => {
      stopFn();
    }, nextStart);
    eventsRef.current.push(id);
    return;
  }
  const triggerAt = Math.max(0, nextStart - LOOKAHEAD_SEC);
  const id = Tone.getTransport().schedule(() => {
    if (!playCtxRef.current) return;
    // skipToSec only applies to the first rescheduled pass; subsequent passes
    // play in full from their own start time.
    const nextPassEnd = schedulePass(nextStart, dispatch, stopFn, skipToSec);
    scheduleLoop(nextPassEnd, dispatch, stopFn);
  }, triggerAt);
  eventsRef.current.push(id);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlayback() {
  const { state, dispatch } = useAppState();
  const { getSynth } = useSampler();
  const { startDrumSeq, stopDrumSeq, updateDrumRows, updateDrumOverrides } = useDrumSequencer();

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    stopAllSynths();
    stopDrumSeq();
    eventsRef.current.forEach(id => {
      try { Tone.getTransport().clear(id); } catch {}
    });
    eventsRef.current = [];
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
    playStyle,
    noteValue,
    humanize = 0,
    drumRows,       // optional rows array for the initial/global drum pattern
    drumSchedule,   // optional [{ timeSec, rows }] — switch drum rows at each time boundary
    loop = true,
  }) => {
    await Tone.start();
    stop();

    // Seed live params — only overwrite entries that were explicitly provided.
    if (playStyle  !== undefined) liveParams.playStyle.current  = playStyle;
    if (noteValue  !== undefined) liveParams.noteValue.current  = noteValue;
    if (timeSig    !== undefined) liveParams.timeSig.current    = timeSig;
    liveParams.humanize.current = humanize;

    const synth = await getSynth(instrument);
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    playCtxRef.current = { cells, progressionId, synth, instrument, loop };

    // Schedule the first pass immediately (starts at transport time 0).
    const firstEnd = schedulePass(0, dispatch, stop);
    scheduleLoop(firstEnd, dispatch, stop);

    // Store the schedule in the live ref so Transport callbacks always read
    // the latest assignment even if the user changes it mid-playback.
    liveDrumSchedule.current = drumSchedule ?? [];

    // Start the drum sequencer with the initial rows (may be null).
    // Await so samples are loaded before transport.start() fires.
    if (drumRows || drumSchedule?.length) {
      await startDrumSeq(drumRows ?? drumSchedule[0].rows, timeSig ?? '4/4');
    }

    // Schedule per-section drum row switches.
    // The callback reads from liveDrumSchedule at fire time so that any
    // mid-playback assignment change (assign/unassign) takes effect immediately.
    if (drumSchedule?.length) {
      for (let i = 0; i < drumSchedule.length; i++) {
        const { timeSec } = drumSchedule[i];
        if (timeSec <= 0) continue; // first section already handled by startDrumSeq above
        const scheduleIndex = i;
        const id = transport.schedule(() => {
          const entry = liveDrumSchedule.current[scheduleIndex];
          updateDrumRows(entry?.rows ?? null);
        }, timeSec);
        eventsRef.current.push(id);
      }
    }

    dispatch({ type: 'SET_PLAYING', playing: true });
    transport.start('+0');
  }, [stop, getSynth, startDrumSeq, updateDrumRows, dispatch]);

  // Update live params without restarting playback.
  const updateLiveParams = useCallback((params) => {
    if (params.playStyle    !== undefined) liveParams.playStyle.current    = params.playStyle;
    if (params.noteValue    !== undefined) liveParams.noteValue.current    = params.noteValue;
    if (params.humanize     !== undefined) liveParams.humanize.current     = params.humanize;
    if (params.patternLoop  !== undefined) liveParams.patternLoop.current  = params.patternLoop;
    if (params.timeSig      !== undefined) liveParams.timeSig.current      = params.timeSig;
    if (params.maxVelocity  !== undefined) liveParams.maxVelocity.current  = params.maxVelocity;
    if (params.groove       !== undefined) liveParams.groove.current       = params.groove;
  }, []);

  // Update the live cells ref so the next scheduled pass picks up the change.
  const updateLiveCells = useCallback((cells) => {
    if (!playCtxRef.current) return;
    playCtxRef.current.cells = cells;
  }, []);

  // Swap the instrument live without stopping playback.
  const updateLiveInstrument = useCallback(async (instrument) => {
    if (!playCtxRef.current) return;
    const newSynth = await getSynth(instrument);
    playCtxRef.current.synth = newSynth;
    playCtxRef.current.instrument = instrument;
  }, [getSynth]);

  /**
   * Flush all pre-scheduled future events and immediately reschedule from the
   * next bar boundary using the current liveParams values.
   *
   * Must be called after mutating liveParams.timeSig or liveParams.groove so
   * that the already-queued lookahead events (built with stale timing/groove)
   * are replaced with freshly computed ones.
   */
  const reschedule = useCallback(() => {
    if (!playCtxRef.current) return;

    // Cancel every event that hasn't fired yet.
    const transport = Tone.getTransport();
    eventsRef.current.forEach(id => {
      try { transport.clear(id); } catch {}
    });
    eventsRef.current = [];

    const now = transport.seconds;

    // Determine the duration of one full pass using the *new* time signature.
    const [beatsPerBar, beatUnit] = liveParams.timeSig.current.split('/').map(Number);
    const barDurSec = toSec(`${beatUnit}n`) * beatsPerBar;

    // Compute the total duration of one pass (sum of all cell durations).
    // We need this to know which absolute-time pass we are currently inside.
    const ctx = playCtxRef.current;
    const allSegDur = buildSegments(ctx.cells, barDurSec).reduce((s, seg) => s + seg.dur, 0);

    // Find the start of the current pass. Passes cycle with period allSegDur
    // from transport time 0. We find which pass index we are in and its start time.
    const passIndex   = allSegDur > 0 ? Math.floor(now / allSegDur) : 0;
    const passStart   = passIndex * allSegDur;

    // Schedule the remainder of the current pass, telling schedulePass to skip
    // any segments that have already played (their end time is in the past).
    // Then chain the normal lookahead loop for all subsequent passes.
    const firstEnd = schedulePass(passStart, dispatch, stop, now);
    scheduleLoop(firstEnd, dispatch, stop);
  }, [stop, dispatch]);

  /**
   * Seek playback to a specific cell during track playback.
   *
   * @param {object} target
   *   - trackIndex  {number}           – the track[] slot to jump to
   *   - cellIndex   {number|undefined} – local cell index within that slot;
   *                                      omit to jump to the start of the slot
   *
   * Walks the flat allCells array (stored in playCtxRef.current.cells) to
   * compute the cumulative time offset of the target cell, seeks the Tone.js
   * transport to that position, flushes the pre-scheduled queue and reschedules
   * from there — identical to what reschedule() does but starting from an
   * explicit transport time instead of "now".
   */
  const seekTo = useCallback(({ trackIndex, cellIndex }) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;

    const transport = Tone.getTransport();
    const [beatsPerBar, beatUnit] = liveParams.timeSig.current.split('/').map(Number);
    const barDurSec = toSec(`${beatUnit}n`) * beatsPerBar;
    const segments  = buildSegments(ctx.cells, barDurSec);

    // Walk segments to find the start time of the target cell.
    let targetSec = null;
    let cursor = 0;
    for (const seg of segments) {
      const matchesTrack = seg.trackIndex === trackIndex;
      const matchesCell  = cellIndex === undefined || seg.cellIndex === cellIndex;
      if (matchesTrack && matchesCell) {
        targetSec = cursor;
        break;
      }
      cursor += seg.dur;
    }
    if (targetSec === null) return; // target not found

    // Flush pre-scheduled queue.
    eventsRef.current.forEach(id => { try { transport.clear(id); } catch {} });
    eventsRef.current = [];

    // Seek the transport to the target time.
    // transport.seconds is writable in Tone.js and moves the playhead.
    transport.seconds = targetSec;

    // Reschedule from this position: play the target pass starting at targetSec,
    // skipping nothing (we are at the exact cell boundary).
    const allSegDur = segments.reduce((s, seg) => s + seg.dur, 0);
    const passIndex = allSegDur > 0 ? Math.floor(targetSec / allSegDur) : 0;
    const passStart = passIndex * allSegDur;

    const firstEnd = schedulePass(passStart, dispatch, stop, targetSec);
    scheduleLoop(firstEnd, dispatch, stop);
  }, [stop, dispatch]);

  /**
   * Update a single entry in the live drum schedule mid-playback.
   * If the changed section is the one currently playing, also hot-swaps
   * the running drum rows immediately via updateDrumRows.
   */
  const updateLiveDrumSchedule = useCallback((trackIndex, rows) => {
    if (trackIndex < 0 || trackIndex >= liveDrumSchedule.current.length) return;
    liveDrumSchedule.current[trackIndex] = {
      ...liveDrumSchedule.current[trackIndex],
      rows,
    };
    // If this section is currently playing, apply immediately.
    const cursor = playCtxRef.current ? state.playbackCursor : null;
    if (cursor?.trackIndex === trackIndex) {
      updateDrumRows(rows);
    }
  }, [state.playbackCursor, updateDrumRows]);

  return { play, stop, pause, resume, updateLiveParams, updateLiveCells, updateLiveInstrument, updateDrumRows, updateDrumOverrides, updateLiveDrumSchedule, reschedule, seekTo };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a cellDuration string to the fraction of one bar it occupies. */
const CELL_DURATION_FACTOR = {
  whole:   1,
  half:    1 / 2,
  quarter: 1 / 4,
  eighth:  1 / 8,
};

function buildSegments(cells, barDur) {
  const segments = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellProgressionId  = cell._progressionId  ?? null;
    const cellLocalCellIndex = cell._localCellIndex ?? i;
    const cellTrackIndex     = cell._trackIndex     ?? null;
    const factor = CELL_DURATION_FACTOR[cell._cellDuration] ?? 1;
    const cellDur = barDur * factor;
    const cellPlayStyle   = cell.playStyle   ?? cell._progPlayStyle   ?? null;
    const cellNoteValue   = cell.noteValue   ?? cell._progNoteValue   ?? null;
    const cellPatternLoop = cell.patternLoop ?? cell._progPatternLoop ?? null;
    if (cell.split) {
      for (const sc of cell.subCells.filter(Boolean)) {
        const subPlayStyle   = sc.playStyle   ?? cellPlayStyle;
        const subNoteValue   = sc.noteValue   ?? cellNoteValue;
        const subPatternLoop = sc.patternLoop ?? cellPatternLoop;
        segments.push({
          notes: voiceChord(sc, sc.octave ?? BASE_OCTAVE),
          dur: cellDur / 2,
          cellIndex: cellLocalCellIndex,
          progressionId: cellProgressionId,
          trackIndex: cellTrackIndex,
          playStyle:   subPlayStyle,
          noteValue:   subNoteValue,
          patternLoop: subPatternLoop,
        });
      }
    } else if (cell.chord) {
      segments.push({
        notes: voiceChord(cell.chord, cell.chord.octave ?? BASE_OCTAVE),
        dur: cellDur,
        cellIndex: cellLocalCellIndex,
        progressionId: cellProgressionId,
        trackIndex: cellTrackIndex,
        playStyle:   cellPlayStyle,
        noteValue:   cellNoteValue,
        patternLoop: cellPatternLoop,
      });
    }
  }
  return segments;
}

/**
 * Build the event list for one chord segment.
 * Each event: { time, notes, duration, velocity, jitter }
 */
function buildEvents(notes, playStyle, noteValue, cellDur, humanize = 0, patternLoop = true, maxVelocity = 0.80, groove = 'straight') {
  const velFn = (baseVel, hum) => humanVel(baseVel * maxVelocity / 0.80, hum);
  return buildEventsFromPattern(
    playStyle, notes, noteValue, cellDur, patternLoop,
    humanize, velFn, humanJitter, groove,
  );
}

