import { useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { useSampler } from '../../audio/useSampler';
import { Knob } from '../Playback/Knob';
import { saveProject } from '../../utils/persistence';
import { exportMidi } from '../../utils/midiExport';
import { useT, useLocale } from '../../i18n/index';
import styles from './TopBar.module.css';

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];

const INSTRUMENTS = [
  { value: 'piano',          label: '🎹 Piano' },
  { value: 'epiano',         label: '🎹 E. Piano' },
  { value: 'harpsichord',    label: '🎹 Harpsichord' },
  { value: 'organ',          label: '🎹 Organ' },
  { value: 'synth',          label: '🎛 Synth Lead' },
  { value: 'synthpad',       label: '🎛 Synth Pad' },
  { value: 'synthbass',      label: '🎛 Synth Bass' },
  { value: 'pad',            label: '🌊 Pad' },
  { value: 'strings',        label: '🎻 Strings' },
  { value: 'violin',         label: '🎻 Violin' },
  { value: 'cello',          label: '🎻 Cello' },
  { value: 'choir',          label: '🎤 Choir' },
  { value: 'guitar',         label: '🎸 Guitar (clean)' },
  { value: 'guitar-distort', label: '🎸 Guitar (distorted)' },
  { value: 'guitar-nylon',   label: '🎸 Guitar (nylon)' },
  { value: 'bass',           label: '🎸 Bass' },
  { value: 'trumpet',        label: '🎺 Trumpet' },
  { value: 'trombone',       label: '🎺 Trombone' },
  { value: 'saxophone',      label: '🎷 Saxophone' },
  { value: 'flute',          label: '🪈 Flute' },
  { value: 'vibraphone',     label: '🎵 Vibraphone' },
  { value: 'marimba',        label: '🎵 Marimba' },
  { value: 'harp',           label: '🎵 Harp' },
];

export function TopBar({ onLoad }) {
  const t = useT();
  const { toggleLocale } = useLocale();
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume, updateLiveParams, updateLiveInstrument, reschedule } = usePlayback();
  const { setReverbWet } = useSampler();
  const fileRef = useRef();
  const [humanize,    setHumanize]    = useState(50);
  const [maxVelocity, setMaxVelocity] = useState(80);
  const [reverbPct,   setReverbPct]   = useState(50);

  // Keep liveParams in sync with knobs at all times (including on first render).
  const {
    activeView, isPlaying, isPaused,
    bpm, timeSig, instrument, groove, metronome,
    progressions, activeProgressionId,
    track,
  } = state;

  useEffect(() => {
    updateLiveParams({ humanize: humanize / 100 });
  }, [humanize, updateLiveParams]);

  useEffect(() => {
    updateLiveParams({ maxVelocity: maxVelocity / 100 });
  }, [maxVelocity, updateLiveParams]);

  useEffect(() => {
    setReverbWet(reverbPct / 100);
  }, [reverbPct, setReverbWet]);

  useEffect(() => {
    updateLiveParams({ timeSig });
    reschedule();
  }, [timeSig, updateLiveParams, reschedule]);

  useEffect(() => {
    updateLiveParams({ groove });
    reschedule();
  }, [groove, updateLiveParams, reschedule]);

  const inProgEditor = activeView === 'progression';

  function adjustBpm(delta) {
    const next = Math.min(300, Math.max(20, bpm + delta));
    dispatch({ type: 'SET_BPM', bpm: next });
    if (isPlaying || isPaused) Tone.getTransport().bpm.value = next;
  }

  function handlePlay() {
    if (inProgEditor) {
      // Play the active chord progression, looping until stopped
      const prog = progressions[activeProgressionId];
      if (!prog) return;
      // Resolve the progression's own pattern (falls back to global if not set)
      const progPlayStyle   = prog.playStyle   ?? state.globalPlayStyle;
      const progNoteValue   = prog.noteValue   ?? state.globalNoteValue;
      const progPatternLoop = prog.patternLoop ?? state.globalPatternLoop;
      play({
        cells: prog.cells.map(cell => ({ ...cell, _cellDuration: prog.cellDuration ?? 'whole' })),
        progressionId: prog.id,
        bpm, timeSig, instrument,
        humanize: humanize / 100,
        metronome,
        loop: true,
        playStyle:   progPlayStyle,
        noteValue:   progNoteValue,
        patternLoop: progPatternLoop,
      });
    } else {
      // Play the full track — tag each cell with its source progressionId,
      // its track-item index, and its local cell index within that progression
      // so the cursor highlights only the correct mini-grid row and cell.
      const allCells = [];
      let firstProgId = null;
      track.forEach(({ progressionId, repetitions }, trackIdx) => {
        const prog = progressions[progressionId];
        if (!prog) return;
        if (!firstProgId) firstProgId = prog.id;
        // Resolve per-progression pattern for each cell
        const progPlayStyle   = prog.playStyle   ?? state.globalPlayStyle;
        const progNoteValue   = prog.noteValue   ?? state.globalNoteValue;
        const progPatternLoop = prog.patternLoop ?? state.globalPatternLoop;
        for (let r = 0; r < repetitions; r++) {
          prog.cells.forEach((cell, localIdx) => {
            allCells.push({
              ...cell,
              _progressionId: prog.id,
              _localCellIndex: localIdx,
              _trackIndex: trackIdx,
              _cellDuration: prog.cellDuration ?? 'whole',
              // Stamp the progression-level pattern fallback so buildSegments can use it
              _progPlayStyle:   cell.playStyle   ?? progPlayStyle,
              _progNoteValue:   cell.noteValue   ?? progNoteValue,
              _progPatternLoop: cell.patternLoop ?? progPatternLoop,
            });
          });
        }
      });
      if (!allCells.length) return;
      play({
        cells: allCells,
        progressionId: firstProgId,
        bpm, timeSig, instrument,
        humanize: humanize / 100,
        metronome,
        loop: false,
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
            <span className={styles.breadcrumbSep}>{t.track}</span>
            <span className={styles.breadcrumbArrow}>›</span>
            <span className={styles.breadcrumbCurrent}>{progName}</span>
          </>
        ) : null}
      </div>

      {/* Centre: transport controls */}
      <div className={styles.transport}>
        {/* Play / Pause / Resume / Stop */}
        {!isPlaying && !isPaused && (
          <button className={styles.playBtn} title={t.playTitle} onClick={handlePlay}>▶</button>
        )}
        {isPlaying && (
          <>
            <button className={styles.playBtn} title={t.pauseTitle} onClick={pause}>⏸</button>
            <button className={`${styles.playBtn} ${styles.stopBtn}`} title={t.stopTitle} onClick={stop}>■</button>
          </>
        )}
        {isPaused && (
          <>
            <button className={styles.playBtn} title={t.resumeTitle} onClick={resume}>▶</button>
            <button className={`${styles.playBtn} ${styles.stopBtn}`} title={t.stopTitle} onClick={stop}>■</button>
          </>
        )}

        {/* BPM */}
        <div className={styles.bpmGroup}>
          <button className={styles.bpmBtn} title={t.bpmDecTitle} onClick={() => adjustBpm(-1)}>−</button>
          <input
            type="number"
            className={styles.bpmInput}
            value={bpm}
            min={20} max={300}
            title={t.bpmTitle}
            onChange={e => adjustBpm(Number(e.target.value) - bpm)}
          />
          <span className={styles.bpmLabel}>{t.bpm}</span>
          <button className={styles.bpmBtn} title={t.bpmIncTitle} onClick={() => adjustBpm(1)}>+</button>
        </div>

        {/* Time signature */}
        <select
          className={styles.headerSelect}
          value={timeSig}
          title={t.timeSigTitle}
          onChange={e => dispatch({ type: 'SET_TIME_SIG', timeSig: e.target.value })}
        >
          {TIME_SIGS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Groove selector */}
        <select
          className={styles.headerSelect}
          value={groove}
          title={t.grooveTitle}
          onChange={e => dispatch({ type: 'SET_GROOVE', groove: e.target.value })}
        >
          <option value="straight">{t.grooveStraight}</option>
          <option value="shuffle">{t.grooveShuffle}</option>
          <option value="swing">{t.grooveSwing}</option>
        </select>

        {/* Instrument */}
        <select
          className={styles.headerSelect}
          value={instrument}
          title={t.instrumentTitle}
          onChange={e => {
            dispatch({ type: 'SET_INSTRUMENT', instrument: e.target.value });
            updateLiveInstrument(e.target.value);
          }}
        >
          {INSTRUMENTS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Knobs: Humanize · Velocity · Reverb */}
        <div className={styles.knobsGroup}>
          <Knob
            label={t.hum} value={humanize}
            onChange={setHumanize}
            title={t.humTitle}
            color="#a78bfa" fmt={v => `${v}%`}
          />
          <Knob
            label={t.velocity} value={maxVelocity}
            onChange={setMaxVelocity}
            min={10} max={100}
            title={t.velocityTitle}
            color="#34d399" valColor="#6ee7b7" fmt={v => `${v}%`}
          />
          <Knob
            label={t.reverb} value={reverbPct}
            onChange={setReverbPct}
            title={t.reverbTitle}
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
            className={styles.metSelect}
            title={t.metroModeTitle}
            value={metronome.mode}
            onChange={e => dispatch({ type: 'SET_METRONOME', payload: { mode: e.target.value } })}
          >
            <option value="click">{t.metroClick}</option>
            <option value="drum">{t.metroDrum}</option>
          </select>
        )}
      </div>

      {/* Right: file actions + language toggle + close button */}
      <div className={styles.right}>
        <button className={styles.langBtn} onClick={toggleLocale} title="Switch language / Changer de langue">
          {t.languageLabel}
        </button>
        <button className={styles.actionBtn} title={t.saveTitle} onClick={() => {
          const raw = state.trackName?.trim() || 'untitled';
          const filename = raw.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') + '.json';
          saveProject(state, filename);
        }}>💾</button>
        <button className={styles.actionBtn} title={t.loadTitle} onClick={() => fileRef.current.click()}>📂</button>
        <button className={styles.actionBtn} title={t.exportMidiTitle} onClick={() => exportMidi(state)}>🎼</button>
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
