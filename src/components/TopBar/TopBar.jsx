import { useRef, useState, useEffect } from 'react';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { useSampler } from '../../audio/useSampler';
import { Knob } from '../Playback/Knob';
import { saveProject } from '../../utils/persistence';
import { exportMidi } from '../../utils/midiExport';
import { exportPdf } from '../../utils/pdfExport';
import { DEMO_TRACKS } from '../../utils/demoTracks';
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
  const { locale, toggleLocale } = useLocale();
  const { state, dispatch } = useAppState();
  const { play, stop, pause, resume, updateLiveParams, updateLiveInstrument, reschedule, updateDrumRows } = usePlayback();
  const { setReverbWet } = useSampler();
  const fileRef = useRef();
  const [humanize,      setHumanize]      = useState(50);
  const [maxVelocity,   setMaxVelocity]   = useState(80);
  const [reverbPct,     setReverbPct]     = useState(50);
  const [demoOpen,      setDemoOpen]      = useState(false);
  const [pendingDemo,   setPendingDemo]   = useState(null); // { id, build, label }
  const [resetConfirm,  setResetConfirm]  = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);

  // Keep liveParams in sync with knobs at all times (including on first render).
  const {
    activeView, isPlaying, isPaused,
    bpm, timeSig, instrument, groove,
    autoPlay,
    metronome,
    progressions, activeProgressionId,
    drumPatterns, activeDrumPatternId,
    track,
  } = state;

  // Active drum rows — passed to play() when drum sequencer is globally enabled
  const activeDrumRows = metronome.drumEnabled && activeDrumPatternId && drumPatterns[activeDrumPatternId]
    ? drumPatterns[activeDrumPatternId].rows
    : null;

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
        bpm, timeSig, instrument, groove,
        humanize: humanize / 100,
        drumRows: activeDrumRows,
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

      // Bar duration in seconds (needed to compute per-section time offsets)
      const [beatsPerBar, beatUnit] = timeSig.split('/').map(Number);
      const barDurSec = Tone.Time(`${beatUnit}n`).toSeconds() * beatsPerBar;
      const CELL_DUR_FACTOR = { whole: 1, half: 0.5, quarter: 0.25, eighth: 0.125 };

      // Build drumSchedule: one entry per track item start time.
      // Each entry carries the rows to activate (section-assigned pattern,
      // falling back to the global active pattern when drum is enabled, or null).
      const drumSchedule = [];
      let sectionTimeSec = 0;

      track.forEach(({ progressionId, repetitions, drumPatternId }, trackIdx) => {
        const prog = progressions[progressionId];
        if (!prog) return;
        if (!firstProgId) firstProgId = prog.id;

        // Resolve per-progression pattern for each cell
        const progPlayStyle   = prog.playStyle   ?? state.globalPlayStyle;
        const progNoteValue   = prog.noteValue   ?? state.globalNoteValue;
        const progPatternLoop = prog.patternLoop ?? state.globalPatternLoop;

        // Determine drum rows for this section:
        // 1. Section-assigned pattern (always used if set, regardless of drumEnabled)
        // 2. Global active pattern (only when drumEnabled is on)
        // 3. null (silence)
        let sectionRows = null;
        if (drumPatternId && drumPatterns[drumPatternId]) {
          sectionRows = drumPatterns[drumPatternId].rows;
        } else if (activeDrumRows) {
          sectionRows = activeDrumRows;
        }
        drumSchedule.push({ timeSec: sectionTimeSec, rows: sectionRows });

        // Compute total duration of this track item (repetitions × all cells)
        const cellFactor = CELL_DUR_FACTOR[prog.cellDuration ?? 'whole'] ?? 1;
        const cellDurSec = barDurSec * cellFactor;
        const itemDurSec = prog.cells.length * cellDurSec * repetitions;
        sectionTimeSec += itemDurSec;

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

      // Only pass a drumSchedule when at least one section has drum rows.
      const hasAnyDrum = drumSchedule.some(e => e.rows !== null);

      play({
        cells: allCells,
        progressionId: firstProgId,
        bpm, timeSig, instrument, groove,
        humanize: humanize / 100,
        drumRows: hasAnyDrum ? (drumSchedule[0]?.rows ?? null) : null,
        drumSchedule: hasAnyDrum ? drumSchedule : undefined,
        loop: false,
      });
    }
  }

  const progName = inProgEditor && progressions[activeProgressionId]
    ? progressions[activeProgressionId].name
    : null;

  return (
    <header className={styles.bar}>

      {/* ── PRIMARY ROW ──────────────────────────────────────────
          Desktop: the single bar row (left + transport + right).
          Mobile:  logo/name hidden; play+BPM always visible;
                   a chevron button opens/closes the drawer.        */}
      <div className={styles.primaryRow}>

        {/* Left: logo + app name (hidden on mobile) */}
        <div className={styles.left}>
          <img src="/favicon.svg" alt="Chordmuse" className={styles.logo} />
          <span className={styles.appName}>Chordmuse</span>
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

          {/* ── Secondary controls (hidden on mobile, shown in drawer) ── */}
          <div className={styles.secondaryControls}>

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

            {/* Auto-play toggle */}
            <button
              className={`${styles.autoPlayBtn} ${autoPlay ? styles.autoPlayBtnOn : ''}`}
              title={t.autoPlayTitle}
              onClick={() => dispatch({ type: 'SET_AUTO_PLAY', autoPlay: !autoPlay })}
            >▶</button>

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

          </div>{/* end .secondaryControls */}

        </div>{/* end .transport */}

        {/* Right: file actions + language toggle (hidden on mobile → moved to drawer) */}
        <div className={styles.right}>
          {/* Demo tracks dropdown */}
          <div className={styles.demoWrapper}>
            <button
              className={styles.demoBtn}
              title={t.demoBtnTitle}
              onClick={() => setDemoOpen(o => !o)}
            >
              {t.demoBtn} ▾
            </button>
            {demoOpen && (
              <ul className={styles.demoMenu} role="menu">
                {DEMO_TRACKS.map(demo => (
                  <li key={demo.id} role="menuitem">
                    <button
                      className={styles.demoMenuItem}
                      onClick={() => {
                        setDemoOpen(false);
                        const hasGrids = Object.keys(state.progressions).length > 0;
                        if (hasGrids) {
                          setPendingDemo(demo);
                        } else {
                          loadDemo(demo);
                        }
                      }}
                    >
                      {locale === 'fr' ? demo.labelFr : demo.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className={styles.resetBtn}
            title={t.resetTitle}
            onClick={() => setResetConfirm(true)}
          >↺</button>
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
          <button className={styles.actionBtn} title={t.exportPdfTitle} onClick={() => exportPdf(state)}>📄</button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={onLoad}
          />
        </div>

        {/* Mobile-only: chevron to open/close the drawer */}
        <button
          className={`${styles.drawerToggle} ${drawerOpen ? styles.drawerToggleOpen : ''}`}
          aria-expanded={drawerOpen}
          aria-label="More settings"
          onClick={() => setDrawerOpen(o => !o)}
        >
          {drawerOpen ? '▲' : '▼'}
        </button>

      </div>{/* end .primaryRow */}

      {/* ── MOBILE DRAWER ────────────────────────────────────────
          Collapsed by default; opens under the primary row.
          Contains: time-sig, groove, instrument, auto-play,
                    knobs, file actions, language, demo, reset.   */}
      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>

        {/* Row 1: selects */}
        <div className={styles.drawerRow}>
          <select
            className={styles.headerSelect}
            value={timeSig}
            title={t.timeSigTitle}
            onChange={e => dispatch({ type: 'SET_TIME_SIG', timeSig: e.target.value })}
          >
            {TIME_SIGS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

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

          <button
            className={`${styles.autoPlayBtn} ${autoPlay ? styles.autoPlayBtnOn : ''}`}
            title={t.autoPlayTitle}
            onClick={() => dispatch({ type: 'SET_AUTO_PLAY', autoPlay: !autoPlay })}
          >▶ {t.autoPlay}</button>
        </div>

        {/* Row 2: knobs */}
        <div className={styles.drawerRow}>
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
        </div>

        {/* Row 3: file actions + language + demo + reset */}
        <div className={styles.drawerRow}>
          <div className={styles.demoWrapper}>
            <button
              className={styles.demoBtn}
              title={t.demoBtnTitle}
              onClick={() => setDemoOpen(o => !o)}
            >
              {t.demoBtn} ▾
            </button>
            {demoOpen && (
              <ul className={styles.demoMenu} role="menu">
                {DEMO_TRACKS.map(demo => (
                  <li key={demo.id} role="menuitem">
                    <button
                      className={styles.demoMenuItem}
                      onClick={() => {
                        setDemoOpen(false);
                        const hasGrids = Object.keys(state.progressions).length > 0;
                        if (hasGrids) {
                          setPendingDemo(demo);
                        } else {
                          loadDemo(demo);
                        }
                      }}
                    >
                      {locale === 'fr' ? demo.labelFr : demo.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className={styles.resetBtn}
            title={t.resetTitle}
            onClick={() => setResetConfirm(true)}
          >↺</button>

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
          <button className={styles.actionBtn} title={t.exportPdfTitle} onClick={() => exportPdf(state)}>📄</button>
        </div>

      </div>{/* end .drawer */}

      {/* Reset confirmation dialog */}
      {resetConfirm && (
        <div className={styles.demoOverlay} role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
          <div className={styles.demoDialog}>
            <p id="reset-confirm-title" className={styles.demoDialogTitle}>{t.resetConfirmTitle}</p>
            <p className={styles.demoDialogMsg}>{t.resetConfirmMsg}</p>
            <div className={styles.demoDialogActions}>
              <button className={styles.demoDialogCancel} onClick={() => setResetConfirm(false)}>
                {t.cancelBtn}
              </button>
              <button className={styles.resetDialogOk} onClick={() => {
                stop();
                dispatch({ type: 'RESET_PROJECT' });
                setResetConfirm(false);
              }}>
                {t.resetConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation dialog */}
      {resetConfirm && (
        <div className={styles.demoOverlay} role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
          <div className={styles.demoDialog}>
            <p id="reset-confirm-title" className={styles.demoDialogTitle}>{t.resetConfirmTitle}</p>
            <p className={styles.demoDialogMsg}>{t.resetConfirmMsg}</p>
            <div className={styles.demoDialogActions}>
              <button className={styles.demoDialogCancel} onClick={() => setResetConfirm(false)}>
                {t.cancelBtn}
              </button>
              <button className={styles.resetDialogOk} onClick={() => {
                stop();
                dispatch({ type: 'RESET_PROJECT' });
                setResetConfirm(false);
              }}>
                {t.resetConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog for loading a demo over an existing project */}
      {pendingDemo && (
        <div className={styles.demoOverlay} role="dialog" aria-modal="true" aria-labelledby="demo-confirm-title">
          <div className={styles.demoDialog}>
            <p id="demo-confirm-title" className={styles.demoDialogTitle}>{t.demoConfirmTitle}</p>
            <p className={styles.demoDialogMsg}>{t.demoConfirmMsg}</p>
            <div className={styles.demoDialogActions}>
              <button className={styles.demoDialogCancel} onClick={() => setPendingDemo(null)}>
                {t.cancelBtn}
              </button>
              <button className={styles.demoDialogOk} onClick={() => { loadDemo(pendingDemo); setPendingDemo(null); }}>
                {t.demoConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );

  function loadDemo(demo) {
    stop();
    dispatch({ type: 'LOAD_PROJECT', project: demo.build() });
  }
}
