import { useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { useSampler } from '../../audio/useSampler';
import { getChordNotes } from '../../theory/chords';

const PLAY_STYLES = [
  { id: 'block',      label: 'Block chord' },
  { id: 'strum-on',   label: 'On-beat strum' },
  { id: 'strum-off',  label: 'Off-beat strum' },
  { id: 'arpeggio-up',   label: 'Arpeggio ↑' },
  { id: 'arpeggio-down', label: 'Arpeggio ↓' },
  { id: 'arpeggio-updown', label: 'Arpeggio ↑↓' },
];

const NOTE_VALUES = ['1n', '2n', '4n', '8n', '16n'];

const BASE_OCTAVE = 4;

function toToneNote(noteName, octave = BASE_OCTAVE) {
  return `${noteName}${octave}`;
}

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

  const play = useCallback(async ({
    cells,
    progressionId,
    bpm,
    timeSig,
    instrument,
    playStyle = 'block',
    noteValue = '4n',
    metronome,
  }) => {
    await Tone.start();
    stop();

    const synth = await getSynth(instrument);
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
    // One beat = one beatUnit note (e.g. quarter note for x/4, eighth note for x/8)
    // A full bar = beatsPerBar beats
    const oneBeatSec = Tone.Time(`${beatUnit}n`).toSeconds();
    const barDur = oneBeatSec * beatsPerBar;

    let cursor = 0; // seconds

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const cellDur = barDur;

      const chords = cell.split
        ? cell.subCells.filter(Boolean).map(sc => ({ ...sc, dur: cellDur / 2 }))
        : cell.chord ? [{ ...cell.chord, dur: cellDur }] : [];

      for (const chord of chords) {
        const notes = getChordNotes(chord.root, chord.typeKey).map(n => toToneNote(n));
        const chordDur = chord.dur;
        const ci = i;

        const events = buildEvents(notes, playStyle, noteValue, chordDur);

        for (const ev of events) {
          const t = cursor + ev.time;
          const part = new Tone.Part((time) => {
            synth.triggerAttackRelease(ev.notes, ev.duration, time);
          }, [{ time: 0 }]);
          part.start(t);
          partsRef.current.push(part);
        }

        // Cursor marker
        const markerPart = new Tone.Part((time) => {
          dispatch({ type: 'SET_PLAYBACK_CURSOR', cursor: { progressionId, cellIndex: ci } });
        }, [{ time: 0 }]);
        markerPart.start(cursor);
        partsRef.current.push(markerPart);

        cursor += chordDur;
      }
    }

    // Schedule stop
    const stopPart = new Tone.Part((time) => {
      Tone.getDraw().schedule(() => stop(), time);
    }, [{ time: 0 }]);
    stopPart.start(cursor);
    partsRef.current.push(stopPart);

    // Metronome
    if (metronome?.enabled) {
      setupMetronome(metronome.mode, bpm, timeSig);
    }

    dispatch({ type: 'SET_PLAYING', playing: true });
    transport.start();
  }, [stop, getSynth, dispatch]);

  function setupMetronome(mode, bpm, timeSig) {
    const [beats, division] = timeSig.split('/').map(Number);
    const clickSynth = new Tone.MembraneSynth({ pitchDecay: 0.008, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    const snareSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } }).toDestination();
    const bassSynth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination();
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

  return { play, stop };
}

function buildEvents(notes, playStyle, noteValue, cellDur) {
  const stepSec = Tone.Time(noteValue).toSeconds();
  const events = [];

  if (playStyle === 'block') {
    events.push({ time: 0, notes, duration: cellDur * 0.9 });
  } else if (playStyle === 'strum-on') {
    let t = 0;
    while (t < cellDur - 0.001) {
      events.push({ time: t, notes, duration: Math.min(stepSec * 0.9, cellDur - t) });
      t += stepSec;
    }
  } else if (playStyle === 'strum-off') {
    let t = stepSec / 2;
    while (t < cellDur - 0.001) {
      events.push({ time: t, notes, duration: Math.min(stepSec * 0.9, cellDur - t) });
      t += stepSec;
    }
  } else if (playStyle.startsWith('arpeggio')) {
    let seq = [...notes];
    if (playStyle === 'arpeggio-down') seq = seq.reverse();
    if (playStyle === 'arpeggio-updown') seq = [...seq, ...[...seq].reverse().slice(1)];
    let t = 0;
    let ni = 0;
    while (t < cellDur - 0.001) {
      events.push({ time: t, notes: [seq[ni % seq.length]], duration: stepSec * 0.9 });
      t += stepSec;
      ni++;
    }
  }
  return events;
}
