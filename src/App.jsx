import { useAppState } from './state/AppContext';
import { TopBar } from './components/TopBar/TopBar';
import { ChordGrid } from './components/ChordGrid/ChordGrid';
import { TrackEditor } from './components/TrackEditor/TrackEditor';
import { loadProject } from './utils/persistence';
import { usePlayback } from './components/Playback/usePlayback';
import { LocaleProvider } from './i18n/index';
import styles from './App.module.css';

function AppInner() {
  const { state, dispatch } = useAppState();
  const { stop } = usePlayback();

  async function handleLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const project = await loadProject(file);
      stop();
      dispatch({ type: 'LOAD_PROJECT', project });
    } catch {
      alert('Failed to load project file.');
    }
  }

  const inProgressionEditor = state.activeView === 'progression';

  return (
    <LocaleProvider>
      <div className={styles.layout}>
        <TopBar onLoad={handleLoad} />

        {/* Track view — always mounted, hidden when editing a progression */}
        <div className={`${styles.viewLayer} ${inProgressionEditor ? styles.hidden : ''}`}>
          <TrackEditor />
        </div>

        {/* Progression editor — slides in over the track view */}
        {inProgressionEditor && (
          <div className={styles.viewLayer}>
            <ChordGrid />
          </div>
        )}
      </div>
    </LocaleProvider>
  );
}

export default AppInner;
