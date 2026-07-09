import { useState } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from './usePlayback';
import { useSampler } from '../../audio/useSampler';
import { ReverbKnob } from './ReverbKnob';
import styles from './PlaybackBar.module.css';

export function PlaybackBar() {
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume } = usePlayback();
  const { setReverbWet } = useSampler();
  const [humanize, setHumanize] = useState(0);
  const [reverbPct, setReverbPct] = useState(50);

  const { isPlaying, isPaused, bpm, timeSig, instrument, metronome, progressions, activeProgressionId } = state;
  // Pattern controls live on ChordGrid; read them from a shared ref exported by ChordGrid context
  // PlaybackBar only needs to trigger play with the values already seeded in liveParams.
  function handlePlay() {
    const prog = progressions[activeProgressionId];
    if (!prog) return;
    // playStyle/noteValue/arpOctaves/arpRepeat are managed by ChordGrid via liveParams;
    // passing defaults here — ChordGrid will have already seeded liveParams.
    play({
      cells: prog.cells,
      progressionId: prog.id,
      bpm, timeSig, instrument,
      humanize: humanize / 100,
      metronome,
    });
  }

  function adjustBpm(delta) {
    const next = Math.min(300, Math.max(20, bpm + delta));
    dispatch({ type: 'SET_BPM', bpm: next });
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
        <span className={styles.humanizeLabel}>Humanize</span>
        <input
          type="range"
          className={styles.humanizeSlider}
          min={0} max={100} step={1}
          value={humanize}
          onChange={e => { setHumanize(Number(e.target.value)); }}
        />
        <span className={styles.humanizeVal}>{humanize}</span>
      </div>

      {/* Reverb knob */}
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
