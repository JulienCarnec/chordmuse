import { useRef } from 'react';
import { useAppState } from '../../state/AppContext';
import { saveProject } from '../../utils/persistence';
import { exportMidi } from '../../utils/midiExport';
import styles from './TopBar.module.css';

export function TopBar({ onLoad }) {
  const { state, dispatch } = useAppState();
  const fileRef = useRef();

  return (
    <header className={styles.bar}>
      <span className={styles.logo}>🎵 Chord Progressions Editor</span>
      <nav className={styles.nav}>
        <button
          className={`${styles.navBtn} ${state.activeView === 'editor' ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'editor' })}
        >Editor</button>
        <button
          className={`${styles.navBtn} ${state.activeView === 'track' ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'track' })}
        >Track</button>
      </nav>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => saveProject(state)}>💾 Save</button>
        <button className={styles.actionBtn} onClick={() => fileRef.current.click()}>📂 Load</button>
        <button className={styles.actionBtn} onClick={() => exportMidi(state)}>🎼 MIDI</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onLoad}
        />
      </div>
    </header>
  );
}
