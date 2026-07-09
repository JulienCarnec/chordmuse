import { useAppState } from './state/AppContext';
import { TopBar } from './components/TopBar/TopBar';
import { ProgressionManager } from './components/ProgressionManager/ProgressionManager';
import { ChordGrid } from './components/ChordGrid/ChordGrid';
import { PlaybackBar } from './components/Playback/PlaybackBar';
import { TrackEditor } from './components/TrackEditor/TrackEditor';
import { loadProject } from './utils/persistence';
import styles from './App.module.css';

function AppInner() {
  const { state, dispatch } = useAppState();

  async function handleLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const project = await loadProject(file);
      dispatch({ type: 'LOAD_PROJECT', project });
    } catch {
      alert('Failed to load project file.');
    }
  }

  return (
    <div className={styles.layout}>
      <TopBar onLoad={handleLoad} />
      <PlaybackBar />

      {state.activeView === 'editor' && (
        <div className={styles.editorLayout}>
          <ProgressionManager />
          <main className={styles.main}>
            <ChordGrid />
          </main>
        </div>
      )}

      {state.activeView === 'track' && (
        <div className={styles.trackLayout}>
          <TrackEditor />
        </div>
      )}
    </div>
  );
}

export default AppInner;
