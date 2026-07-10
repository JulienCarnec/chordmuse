import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { useT } from '../../i18n/index';
import styles from './ProgressionManager.module.css';

export function ProgressionManager() {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { progressions, progressionOrder, activeProgressionId } = state;
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
      {/* Create new chord grid */}
      <section className={styles.section}>
        <div className={styles.row}>
          <input
            className={styles.input}
            list="progression-presets"
            placeholder={t.newGridNamePlaceholder}
            title={t.newGridNameTitle}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProgression()}
          />
          <datalist id="progression-presets">
            {t.presetNames.map(n => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <label className={styles.label}>{t.cellsLabel}</label>
          <input
            type="number"
            className={styles.input}
            value={newSize}
            min={1} max={32}
            title={t.cellsInputTitle}
            onChange={e => setNewSize(Number(e.target.value))}
            style={{ width: 56 }}
          />
          <button
            className={styles.createBtn}
            onClick={createProgression}
            disabled={!newName.trim()}
            title={!newName.trim() ? t.newGridNameRequired : t.newGridBtn}
          >{t.newGridBtn}</button>
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
                title={t.deleteGridTitle}
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
