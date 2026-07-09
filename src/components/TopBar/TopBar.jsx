import { useRef, useState } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { useSampler } from '../../audio/useSampler';
import { ReverbKnob } from '../Playback/ReverbKnob';
import { saveProject } from '../../utils/persistence';
import { exportMidi } from '../../utils/midiExport';
import styles from './TopBar.module.css';

export function TopBar({ onLoad }) {
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume } = usePlayback();
  const { setReverbWet } = useSampler();
  const fileRef = useRef();
  const [humanize, setHumanize] = useState(0);
  const [reverbPct, setReverbPct] = useState(50);

  const {
    activeView, isPlaying, isPaused,
    bpm, timeSig, instrument, metronome,
    progressions, activeProgressionId,
    track,
  } = state;

  const inProgEditor = activeView === 'progression';

  function adjustBpm(delta) {
    const next = Math.min(300, Math.max(20, bpm + delta));
    dispatch({ type: 'SET_BPM', bpm: next });
    if (isPlaying) Tone.getTransport().bpm.value = next;
  }

  function handlePlay() {
    if (inProgEditor) {
      // Play the active chord progression
      const prog = progressions[activeProgressionId];
      if (!prog) return;
      play({
        cells: prog.cells,
        progressionId: prog.id,
        bpm, timeSig, instrument,
        humanize: humanize / 100,
        metronome,
      });
    } else {
      // Play the full track
      const allCells = [];
      let firstProgId = null;
      for (const { progressionId, repetitions } of track) {
        const prog = progressions[progressionId];
        if (!prog) continue;
        if (!firstProgId) firstProgId = prog.id;
        for (let r = 0; r < repetitions; r++) {
          allCells.push(...prog.cells);
        }
      }
      if (!allCells.length) return;
      play({
        cells: allCells,
        progressionId: firstProgId,
        bpm, timeSig, instrument,
        humanize: humanize / 100,
        metronome,
      });
    }
  }

  const progName = inProgEditor && progressions[activeProgressionId]
    ? progressions[activeProgressionId].name
    : null;

  return (
    <header className={styles.bar}>
      {/* Left: logo or breadcrumb */}
      <div className={styles.left}>
        <span className={styles.logo}>🎵</span>
        {inProgEditor ? (
          <>
            <span className={styles.breadcrumbSep}>Track</span>
            <span className={styles.breadcrumbArrow}>›</span>
            <span className={styles.breadcrumbCurrent}>{progName}</span>
          </>
        ) : (
          <span className={styles.logoText}>Chord Progressions</span>
        )}
      </div>

      {/* Centre: transport controls */}
      <div className={styles.transport}>
        {/* Play / Pause / Resume / Stop */}
        {!isPlaying && !isPaused && (
          <button className={styles.playBtn} onClick={handlePlay}>▶</button>
        )}
        {isPlaying && (
          <>
            <button className={styles.playBtn} onClick={pause}>⏸</button>
            <button className={`${styles.playBtn} ${styles.stopBtn}`} onClick={stop}>■</button>
          </>
        )}
        {isPaused && (
          <>
            <button className={styles.playBtn} onClick={resume}>▶</button>
            <button className={`${styles.playBtn} ${styles.stopBtn}`} onClick={stop}>■</button>
          </>
        )}

        {/* BPM */}
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

        {/* Humanize */}
        <div className={styles.humanizeGroup}>
          <span className={styles.dimLabel}>Hum</span>
          <input
            type="range"
            className={styles.slider}
            min={0} max={100} step={1}
            value={humanize}
            onChange={e => setHumanize(Number(e.target.value))}
          />
          <span className={styles.dimVal}>{humanize}</span>
        </div>

        {/* Reverb */}
        <ReverbKnob
          value={reverbPct}
          onChange={v => { setReverbPct(v); setReverbWet(v / 100); }}
        />

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
            className={styles.metSelect}
            value={metronome.mode}
            onChange={e => dispatch({ type: 'SET_METRONOME', payload: { mode: e.target.value } })}
          >
            <option value="click">Click</option>
            <option value="drum">Drums</option>
          </select>
        )}
      </div>

      {/* Right: file actions + close button */}
      <div className={styles.right}>
        <button className={styles.actionBtn} onClick={() => saveProject(state)}>💾</button>
        <button className={styles.actionBtn} onClick={() => fileRef.current.click()}>📂</button>
        <button className={styles.actionBtn} onClick={() => exportMidi(state)}>🎼</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onLoad}
        />
        {inProgEditor && (
          <button
            className={styles.closeBtn}
            title="Close editor and return to track"
            onClick={() => dispatch({ type: 'CLOSE_PROGRESSION_EDITOR' })}
          >✕</button>
        )}
      </div>
    </header>
  );
}
