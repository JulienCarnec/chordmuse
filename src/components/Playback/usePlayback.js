import { useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { useSampler } from '../../audio/useSampler';
import { getChordNotesVoiced } from '../../theory/chords';

const BASE_OCTAVE = 4;
const RELEASE_GAP = 0.04;

export function usePlayback() {
  const { state, dispatch } = useAppState();
  const { getSynth } = useSampler();
  const partsRef = useRef([]);
  const metRef = useRef(null);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    partsRef.current.forEach(p => { try { p.dispose(); } catch {} });
    partsRef.current = [];
    if (metRef.current) {
      metRef.current.loop?.dispose();
      metRef.current.clickSynth?.dispose();
      metRef.current.snareSynth?.dispose();
      metRef.current.bassSynth?.dispose();
      metRef.current = null;
    }
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: null });
  }, [dispatch]);

  // Pause: freeze transport, keep cursor/notes highlighted
  const pause = useCallback(() => {
    Tone.getTransport().pause();
    dispatch({ type: 'SET_PLAYING', playing: false });
    dispatch({ type: 'SET_PAUSED', paused: true });
  }, [dispatch]);

  // Resume from pause
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
    metronome,
  }) => {
    await Tone.start();
    stop();

    const synth = await getSynth(instrument);
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
    const oneBeatSec = Tone.Time(`${beatUnit}n`).toSeconds();
    const barDur = oneBeatSec * beatsPerBar;

    // Build the flat list of chord segments once
    const segments = buildSegments(cells, barDur);
    const totalDur = segments.reduce((s, g) => s + g.dur, 0);

    function scheduleSegments(timeOffset) {
      let cursor = timeOffset;
      for (const seg of segments) {
        const { notes, dur, cellIndex } = seg;
        const events = buildEvents(notes, playStyle, noteValue, dur, arpOctaves);

        for (const ev of events) {
          const t = cursor + ev.time;
          // Capture ev by value for closure
          const evNotes = ev.notes;
          const evDur = ev.duration;
          const part = new Tone.ToneEvent((time) => {
            synth.triggerAttackRelease(evNotes, evDur, time);
          });
          part.start(t);
          partsRef.current.push(part);
        }

        // Cursor marker — includes note names for piano roll highlight
        const ci = cellIndex;
        const noteNames = notes.map(n => n.replace(/\d+$/, '')); // strip octave
        const markerEvent = new Tone.ToneEvent(() => {
          dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: { progressionId, cellIndex: ci, notes: noteNames } });
        });
        markerEvent.start(cursor);
        partsRef.current.push(markerEvent);

        cursor += dur;
      }
      return cursor;
    }

    // Schedule first pass immediately, then loop
    let loopStart = 0;
    scheduleSegments(loopStart);

    // Schedule a repeating loop: every totalDur seconds, reschedule all segments
    const loopEvent = new Tone.Loop((time) => {
      loopStart += totalDur;
      scheduleSegments(loopStart);
    }, totalDur);
    loopEvent.start(totalDur);
    partsRef.current.push(loopEvent);

    if (metronome?.enabled) {
      setupMetronome(metRef, metronome.mode, bpm, timeSig);
    }

    dispatch({ type: 'SET_PLAYING', playing: true });
    transport.start();
  }, [stop, getSynth, dispatch]);

  return { play, stop, pause, resume };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSegments(cells, barDur) {
  const segments = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.split) {
      for (const sc of cell.subCells.filter(Boolean)) {
        segments.push({
          notes: getChordNotesVoiced(sc.root, sc.typeKey, sc.octave ?? BASE_OCTAVE, sc.inversion ?? 0),
          dur: barDur / 2,
          cellIndex: i,
        });
      }
    } else if (cell.chord) {
      segments.push({
        notes: getChordNotesVoiced(cell.chord.root, cell.chord.typeKey, cell.chord.octave ?? BASE_OCTAVE, cell.chord.inversion ?? 0),
        dur: barDur,
        cellIndex: i,
      });
    }
  }
  return segments;
}

/** Shift a voiced note string up by one octave, e.g. "C4" → "C5", "A#3" → "A#4" */
function shiftOctaveUp(noteStr) {
  // note name is everything before the last digit(s)
  const match = noteStr.match(/^([A-G]#?)(\d+)$/);
  if (!match) return noteStr;
  return `${match[1]}${Number(match[2]) + 1}`;
}

function buildEvents(notes, playStyle, noteValue, cellDur, arpOctaves = 1) {
  const stepSec = Tone.Time(noteValue).toSeconds();
  const events = [];

  if (playStyle === 'block') {
    events.push({ time: 0, notes, duration: cellDur - RELEASE_GAP });

  } else if (playStyle === 'strum-on') {
    let t = 0;
    while (t < cellDur - 0.001) {
      events.push({ time: t, notes, duration: cellDur - t - RELEASE_GAP });
      t += stepSec;
    }

  } else if (playStyle === 'strum-off') {
    let t = stepSec / 2;
    while (t < cellDur - 0.001) {
      events.push({ time: t, notes, duration: cellDur - t - RELEASE_GAP });
      t += stepSec;
    }

  } else if (playStyle.startsWith('arpeggio')) {
    const sustain = playStyle.endsWith('-sustain');
    const baseStyle = playStyle.replace('-sustain', '');
    // Build one-octave sequence, then optionally append notes shifted up an octave
    let seq = [...notes];
    if (arpOctaves === 2) seq = [...seq, ...notes.map(shiftOctaveUp)];
    if (baseStyle === 'arpeggio-down') seq = seq.reverse();
    if (baseStyle === 'arpeggio-updown') seq = [...seq, ...[...seq].reverse().slice(1)];
    let t = 0;
    let ni = 0;
    while (t < cellDur - 0.001) {
      const duration = sustain
        ? cellDur - t - RELEASE_GAP   // sustain to end of bar
        : stepSec - RELEASE_GAP;       // sustain to next note
      events.push({ time: t, notes: [seq[ni % seq.length]], duration });
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
