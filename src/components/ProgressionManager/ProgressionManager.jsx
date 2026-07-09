import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import styles from './ProgressionManager.module.css';

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];
const INSTRUMENTS = ['piano', 'synth', 'strings', 'pad', 'guitar'];

export function ProgressionManager() {
  const { state, dispatch } = useAppState();
  const { progressions, progressionOrder, activeProgressionId, bpm, timeSig, instrument } = state;
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState(4);

  function createProgression() {
    if (!newName.trim()) return;
    const id = `prog-${Date.now()}`;
    dispatch({ type: 'CREATE_PROGRESSION', id, name: newName.trim(), size: newSize });
    setNewName('');
  }

  return (
    <div className={styles.panel}>
      {/* Global settings */}
      <section className={styles.section}>
        <div className={styles.row}>
          <label className={styles.label}>BPM</label>
          <input
            type="number"
            className={styles.input}
            value={bpm}
            min={20} max={300}
            onChange={e => dispatch({ type: 'SET_BPM', bpm: Number(e.target.value) })}
          />
          <label className={styles.label}>Time</label>
          <select
            className={styles.select}
            value={timeSig}
            onChange={e => dispatch({ type: 'SET_TIME_SIG', timeSig: e.target.value })}
          >
            {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className={styles.label}>Instrument</label>
          <select
            className={styles.select}
            value={instrument}
            onChange={e => dispatch({ type: 'SET_INSTRUMENT', instrument: e.target.value })}
          >
            {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </section>

      {/* Create new progression */}
      <section className={styles.section}>
        <div className={styles.row}>
          <input
            className={styles.input}
            placeholder="Progression name (e.g. Verse)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProgression()}
          />
          <label className={styles.label}>Cells</label>
          <input
            type="number"
            className={styles.input}
            value={newSize}
            min={1} max={32}
            onChange={e => setNewSize(Number(e.target.value))}
            style={{ width: 56 }}
          />
          <button
            className={styles.createBtn}
            onClick={createProgression}
            disabled={!newName.trim()}
            title={!newName.trim() ? 'Enter a progression name first' : ''}
          >+ New</button>
        </div>
      </section>

      {/* Progression tabs */}
      <div className={styles.tabs}>
        {progressionOrder.map(id => {
          const p = progressions[id];
          return (
            <button
              key={id}
              className={`${styles.tab} ${id === activeProgressionId ? styles.active : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_PROGRESSION', id })}
            >
              {p.name}
              <span
                className={styles.del}
                onClick={e => {
                  e.stopPropagation();
                  dispatch({ type: 'DELETE_PROGRESSION', id });
                }}
              >×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
