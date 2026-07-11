import { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from './usePlayback';
import { useSampler } from '../../audio/useSampler';
import { Knob } from './Knob';
import { useT } from '../../i18n/index';
import styles from './PlaybackBar.module.css';

export function PlaybackBar() {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume, updateLiveParams } = usePlayback();
  const { setReverbWet } = useSampler();
  const [humanize,    setHumanize]    = useState(30);
  const [maxVelocity, setMaxVelocity] = useState(80);
  const [reverbPct,   setReverbPct]   = useState(60);

  // On mount, reset any stale isPlaying/isPaused state that may have survived
  // a hot-module reload (module-level refs are reset but React state persists).
  useEffect(() => {
    stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep liveParams in sync with knobs at all times (including on first render).
  useEffect(() => {
    updateLiveParams({ humanize: humanize / 100 });
  }, [humanize, updateLiveParams]);

  useEffect(() => {
    updateLiveParams({ maxVelocity: maxVelocity / 100 });
  }, [maxVelocity, updateLiveParams]);

  useEffect(() => {
    setReverbWet(reverbPct / 100);
  }, [reverbPct, setReverbWet]);

  const { isPlaying, isPaused, bpm, timeSig, instrument, metronome, groove,
          progressions, activeProgressionId,
          globalPlayStyle, globalNoteValue, globalPatternLoop } = state;

  function handlePlay() {
    const prog = progressions[activeProgressionId];
    if (!prog) return;
    const progPlayStyle   = prog.playStyle   ?? globalPlayStyle;
    const progNoteValue   = prog.noteValue   ?? globalNoteValue;
    const progPatternLoop = prog.patternLoop ?? globalPatternLoop;
    play({
      cells: prog.cells.map(cell => ({
        ...cell,
        _cellDuration:    prog.cellDuration ?? 'whole',
        _progPlayStyle:   cell.playStyle   ?? progPlayStyle,
        _progNoteValue:   cell.noteValue   ?? progNoteValue,
        _progPatternLoop: cell.patternLoop ?? progPatternLoop,
      })),
      progressionId: prog.id,
      bpm, timeSig, instrument, groove,
      humanize: humanize / 100,
      playStyle:   progPlayStyle,
      noteValue:   progNoteValue,
      patternLoop: progPatternLoop,
      metronome,
      loop: true,
    });
  }

  function adjustBpm(delta) {
    const next = Math.min(1000, Math.max(0, bpm + delta));
    dispatch({ type: 'SET_BPM', bpm: next });
    if (isPlaying || isPaused) Tone.getTransport().bpm.value = next;
  }

  return (
    <div className={styles.bar}>
      {/* Play / Pause / Resume / Stop */}
      {!isPlaying && !isPaused && (
        <button className={styles.playBtn} title={t.playTitle} onClick={handlePlay}>▶ {t.playTitle}</button>
      )}
      {isPlaying && (
        <>
          <button className={styles.playBtn} title={t.pauseTitle} onClick={pause}>⏸ {t.pauseTitle}</button>
          <button className={`${styles.playBtn} ${styles.stop}`} title={t.stopTitle} onClick={stop}>■ {t.stopTitle}</button>
        </>
      )}
      {isPaused && (
        <>
          <button className={styles.playBtn} title={t.resumeTitle} onClick={resume}>▶ {t.resumeTitle}</button>
          <button className={`${styles.playBtn} ${styles.stop}`} title={t.stopTitle} onClick={stop}>■ {t.stopTitle}</button>
        </>
      )}

      {/* BPM */}
      <div className={styles.bpmGroup}>
        <input
          type="number"
          className={styles.bpmInput}
          value={bpm}
          min={0} max={1000}
          title={t.bpmTitle}
          onChange={e => adjustBpm(Number(e.target.value) - bpm)}
        />
        <span className={styles.bpmLabel}>{t.bpm}</span>
      </div>

      {/* Three knobs */}
      <div className={styles.knobsGroup}>
        <Knob
          label={t.hum} value={humanize}
          onChange={setHumanize}
          color="#a78bfa" fmt={v => `${v}%`}
        />
        <Knob
          label={t.velocity} value={maxVelocity}
          onChange={setMaxVelocity}
          min={10} max={100}
          color="#34d399" valColor="#6ee7b7" fmt={v => `${v}%`}
        />
        <Knob
          label={t.reverb} value={reverbPct}
          onChange={setReverbPct}
          color="#60a5fa" valColor="#93c5fd" fmt={v => `${v}%`}
        />
      </div>

      {/* Metronome */}
      <label className={styles.metLabel} title={t.metroTitle}>
        <input
          type="checkbox"
          checked={metronome.enabled}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { enabled: e.target.checked } })}
        />
        {t.metro}
      </label>
      {metronome.enabled && (
        <select
          className={styles.select}
          title={t.metroModeTitle}
          value={metronome.mode}
          onChange={e => dispatch({ type: 'SET_METRONOME', payload: { mode: e.target.value } })}
        >
          <option value="click">{t.metroClick}</option>
          <option value="drum">{t.metroDrum}</option>
        </select>
      )}
    </div>
  );
}
