/**
 * Shared pattern controls: play style + note value + arpeggio options.
 * Used both in ChordGrid toolbar (global) and in each ChordCell (per-cell override).
 *
 * Props:
 *   playStyle   – current play style id (string) or null (= use global)
 *   noteValue   – current note value (string) or null
 *   onChange    – ({ playStyle, noteValue }) => void
 *   compact     – bool, if true use mini layout for cells
 *   allowNull   – bool, if true show a "— global —" option (for per-cell use)
 */

import { useState } from 'react';
import { usePlayback } from '../Playback/usePlayback';
import styles from './PatternControls.module.css';

export const PLAY_STYLES = [
  { id: 'block',                   label: 'Block chord' },
  { id: 'strum-on',                label: 'On-beat strum' },
  { id: 'strum-off',               label: 'Off-beat strum' },
  { id: 'bass-split',              label: 'Bass + split' },
  { id: 'bach-prelude',            label: 'Bach prelude' },
  { id: 'arpeggio-up',             label: 'Arpeggio ↑' },
  { id: 'arpeggio-down',           label: 'Arpeggio ↓' },
  { id: 'arpeggio-updown',         label: 'Arpeggio ↑↓' },
  { id: 'arpeggio-up-sustain',     label: 'Arpeggio ↑ (sus)' },
  { id: 'arpeggio-down-sustain',   label: 'Arpeggio ↓ (sus)' },
  { id: 'arpeggio-updown-sustain', label: 'Arpeggio ↑↓ (sus)' },
];

export const NOTE_VALUES = ['1n', '2n', '4n', '8n', '16n'];

export function PatternControls({
  playStyle,
  noteValue,
  onChange,
  compact = false,
  allowNull = false,
}) {
  const { updateLiveParams } = usePlayback();
  const [arpOctaves, setArpOctaves] = useState(1);
  const [arpRepeat, setArpRepeat]   = useState(true);

  const isArp = playStyle?.startsWith('arpeggio');

  function handleStyleChange(val) {
    const ps = val === '' ? null : val;
    onChange({ playStyle: ps, noteValue });
    if (ps !== null) updateLiveParams({ playStyle: ps });
  }

  function handleNoteValueChange(val) {
    onChange({ playStyle, noteValue: val });
    updateLiveParams({ noteValue: val });
  }

  function handleArpOctaves(v) {
    setArpOctaves(v);
    updateLiveParams({ arpOctaves: v });
  }

  function handleArpRepeat(v) {
    setArpRepeat(v);
    updateLiveParams({ arpRepeat: v });
  }

  if (compact) {
    // Mini layout for inside a cell
    return (
      <div className={styles.compact}>
        <select
          className={styles.miniSelect}
          value={playStyle ?? ''}
          onChange={e => handleStyleChange(e.target.value)}
          onClick={e => e.stopPropagation()}
        >
          {allowNull && <option value="">— global —</option>}
          {PLAY_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          className={styles.miniSelect}
          value={noteValue ?? '4n'}
          onChange={e => handleNoteValueChange(e.target.value)}
          onClick={e => e.stopPropagation()}
        >
          {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    );
  }

  // Full layout for toolbar
  return (
    <div className={styles.full}>
      <select
        className={styles.select}
        value={playStyle ?? 'block'}
        onChange={e => handleStyleChange(e.target.value)}
      >
        {PLAY_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>

      {isArp && (
        <>
          <div className={styles.arpOctGroup}>
            <button
              className={`${styles.arpOctBtn} ${arpOctaves === 1 ? styles.arpOctActive : ''}`}
              onClick={() => handleArpOctaves(1)}
            >1 oct</button>
            <button
              className={`${styles.arpOctBtn} ${arpOctaves === 2 ? styles.arpOctActive : ''}`}
              onClick={() => handleArpOctaves(2)}
            >2 oct</button>
          </div>
          <label className={styles.metLabel}>
            <input
              type="checkbox"
              checked={arpRepeat}
              onChange={e => handleArpRepeat(e.target.checked)}
            />
            Repeat
          </label>
        </>
      )}

      <select
        className={styles.select}
        value={noteValue ?? '4n'}
        onChange={e => handleNoteValueChange(e.target.value)}
      >
        {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}
