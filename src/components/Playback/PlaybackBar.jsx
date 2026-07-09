import { useState } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from './usePlayback';
import styles from './PlaybackBar.module.css';

const PLAY_STYLES = [
  { id: 'block',                label: 'Block chord' },
  { id: 'strum-on',             label: 'On-beat strum' },
  { id: 'strum-off',            label: 'Off-beat strum' },
  { id: 'arpeggio-up',          label: 'Arpeggio ↑' },
  { id: 'arpeggio-down',        label: 'Arpeggio ↓' },
  { id: 'arpeggio-updown',      label: 'Arpeggio ↑↓' },
  { id: 'arpeggio-up-sustain',     label: 'Arpeggio ↑ (sustain)' },
  { id: 'arpeggio-down-sustain',   label: 'Arpeggio ↓ (sustain)' },
  { id: 'arpeggio-updown-sustain', label: 'Arpeggio ↑↓ (sustain)' },
];

const NOTE_VALUES = ['1n', '2n', '4n', '8n', '16n'];

export function PlaybackBar() {
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume } = usePlayback();
  const [playStyle, setPlayStyle] = useState('block');
  const [noteValue, setNoteValue] = useState('4n');
  const [arpOctaves, setArpOctaves] = useState(1);
  const [humanize, setHumanize] = useState(0);

  const { isPlaying, isPaused, bpm, timeSig, instrument, metronome, progressions, activeProgressionId } = state;

  function handlePlay() {
    const prog = progressions[activeProgressionId];
    if (!prog) return;
    play({ cells: prog.cells, progressionId: prog.id, bpm, timeSig, instrument, playStyle, noteValue, arpOctaves, humanize: humanize / 100, metronome });
  }

  function adjustBpm(delta) {
    const next = Math.min(300, Math.max(20, bpm + delta));
    dispatch({ type: 'SET_BPM', bpm: next });
    // Update transport immediately if playing
    if (isPlaying) Tone.getTransport().bpm.value = next;
  }

  return (
    <div className={styles.bar}>
      {/* Play / Pause / Resume / Stop */}
      {!isPlaying && !isPaused && (
        <button className={styles.playBtn} onClick={handlePlay}>▶ Play</button>
      )}
      {isPlaying && (
        <>
          <button className={styles.playBtn} onClick={pause}>⏸ Pause</button>
          <button className={`${styles.playBtn} ${styles.stop}`} onClick={stop}>■ Stop</button>
        </>
      )}
      {isPaused && (
        <>
          <button className={styles.playBtn} onClick={resume}>▶ Resume</button>
          <button className={`${styles.playBtn} ${styles.stop}`} onClick={stop}>■ Stop</button>
        </>
      )}

      {/* BPM with ± buttons */}
      <div className={styles.bpmGroup}>
        <button className={styles.bpmBtn} onClick={() => adjustBpm(-1)}>−</button>
        <input
          type="number"
          className={styles.bpmInput}
          value={bpm}
          min={20} max={300}
          onChange={e => adjustBpm(Number(e.target.value) - bpm)}
        />
        <span className={styles.bpmLabel}>BPM</span>
        <button className={styles.bpmBtn} onClick={() => adjustBpm(1)}>+</button>
      </div>

      {/* Play style */}
      <select className={styles.select} value={playStyle} onChange={e => setPlayStyle(e.target.value)}>
        {PLAY_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>

      {/* Arpeggio octave span — only shown for arpeggio styles */}
      {playStyle.startsWith('arpeggio') && (
        <div className={styles.arpOctGroup}>
          <button
            className={`${styles.arpOctBtn} ${arpOctaves === 1 ? styles.arpOctActive : ''}`}
            onClick={() => setArpOctaves(1)}
          >1 oct</button>
          <button
            className={`${styles.arpOctBtn} ${arpOctaves === 2 ? styles.arpOctActive : ''}`}
            onClick={() => setArpOctaves(2)}
          >2 oct</button>
        </div>
      )}

      {/* Note value (subdivision) */}
      <select className={styles.select} value={noteValue} onChange={e => setNoteValue(e.target.value)}>
        {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      {/* Humanize slider */}
      <div className={styles.humanizeGroup}>
        <span className={styles.humanizeLabel}>Humanize</span>
        <input
          type="range"
          className={styles.humanizeSlider}
          min={0} max={100} step={1}
          value={humanize}
          onChange={e => setHumanize(Number(e.target.value))}
        />
        <span className={styles.humanizeVal}>{humanize}</span>
      </div>

      {/* Metronome */}
      <label className={styles.metLabel}>
        <input
          type="checkbox"
          checked={metronome.enabled}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { enabled: e.target.checked } })}
        />
        Metro
      </label>
      {metronome.enabled && (
        <select
          className={styles.select}
          value={metronome.mode}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { mode: e.target.value } })}
        >
          <option value="click">Click</option>
          <option value="drum">Drums</option>
        </select>
      )}
    </div>
  );
}
