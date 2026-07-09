import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from './usePlayback';
import styles from './PlaybackBar.module.css';

const PLAY_STYLES = [
  { id: 'block',           label: 'Block chord' },
  { id: 'strum-on',        label: 'On-beat strum' },
  { id: 'strum-off',       label: 'Off-beat strum' },
  { id: 'arpeggio-up',     label: 'Arpeggio ↑' },
  { id: 'arpeggio-down',   label: 'Arpeggio ↓' },
  { id: 'arpeggio-updown', label: 'Arpeggio ↑↓' },
];

const NOTE_VALUES = ['1n', '2n', '4n', '8n', '16n'];

export function PlaybackBar() {
  const { state, dispatch } = useAppState();
  const { play, stop } = usePlayback();
  const [playStyle, setPlayStyle] = useState('block');
  const [noteValue, setNoteValue] = useState('4n');

  const {
    isPlaying, bpm, timeSig, instrument, metronome,
    progressions, activeProgressionId,
  } = state;

  function handlePlay() {
    const prog = progressions[activeProgressionId];
    if (!prog) return;
    play({
      cells: prog.cells,
      progressionId: prog.id,
      bpm, timeSig, instrument,
      playStyle, noteValue,
      metronome,
    });
  }

  return (
    <div className={styles.bar}>
      <button
        className={`${styles.playBtn} ${isPlaying ? styles.stop : ''}`}
        onClick={isPlaying ? stop : handlePlay}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      <select
        className={styles.select}
        value={playStyle}
        onChange={e => setPlayStyle(e.target.value)}
      >
        {PLAY_STYLES.map(s => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      <select
        className={styles.select}
        value={noteValue}
        onChange={e => setNoteValue(e.target.value)}
      >
        {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select>

      {/* Metronome */}
      <label className={styles.metLabel}>
        <input
          type="checkbox"
          checked={metronome.enabled}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { enabled: e.target.checked } })}
        />
        Metronome
      </label>
      {metronome.enabled && (
        <select
          className={styles.select}
          value={metronome.mode}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { mode: e.target.value } })}
        >
          <option value="click">Click</option>
          <option value="drum">Drum pattern</option>
        </select>
      )}
    </div>
  );
}
