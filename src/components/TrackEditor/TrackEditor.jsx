import { useState, useRef, useCallback } from 'react';
import { useAppState } from '../../state/AppContext';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { GuitarFretboard } from '../GuitarFretboard/GuitarFretboard';
import { ProgressionMiniGrid } from './ProgressionMiniGrid';
import { voiceChord } from '../../theory/chords';
import { useSampler } from '../../audio/useSampler';
import { usePlayback } from '../Playback/usePlayback';
import { useT } from '../../i18n/index';
import styles from './TrackEditor.module.css';


const PREVIEW_DURATION_MS = 1800;

export function TrackEditor() {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { seekTo } = usePlayback();
  const { playNotes } = useSampler();
  const {
    track, progressions, progressionOrder,
    isPlaying, isPaused, playbackCursor, playbackActiveNotes, playbackNotesDuration,
    instrument,
    trackName, trackDescription,
    scaleRoot, scaleKey,
  } = state;

  // ── Preview: chord clicked in mini-grid ─────────────────────
  const [previewNotes, setPreviewNotes] = useState(null);
  const previewTimerRef = useRef(null);

  // During active playback: seek to the clicked cell.
  // Otherwise: preview the chord via the sampler.
  const handleCellClick = useCallback((chord, trackIndex, cellIndex) => {
    if (isPlaying || isPaused) {
      seekTo({ trackIndex, cellIndex });
      return;
    }
    const notes = voiceChord(chord, chord.octave ?? 4);
    if (!notes.length) return;
    playNotes(notes, '2n', instrument);
    clearTimeout(previewTimerRef.current);
    setPreviewNotes(notes);
    previewTimerRef.current = setTimeout(() => setPreviewNotes(null), PREVIEW_DURATION_MS);
  }, [isPlaying, isPaused, seekTo, playNotes, instrument]);

  // During active playback: seek to the first cell of the clicked tile.
  const handleTileClick = useCallback((trackIndex) => {
    if (isPlaying || isPaused) {
      seekTo({ trackIndex });
    }
  }, [isPlaying, isPaused, seekTo]);

  // ── Create progression form ──────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState(4);

  // ── Delete confirmation ──────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Inline rename ────────────────────────────────────────────
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // ── Visualiser visibility ────────────────────────────────────
  const [showPiano, setShowPiano] = useState(true);
  const [showGuitar, setShowGuitar] = useState(false);

  // ── Collapsed track items ────────────────────────────────────
  const [collapsedItems, setCollapsedItems] = useState(new Set());
  function toggleCollapse(idx) {
    setCollapsedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function startRename(id, currentName) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      dispatch({ type: 'RENAME_PROGRESSION', id: renamingId, name: renameValue.trim() });
    }
    setRenamingId(null);
  }

  function cancelRename() {
    setRenamingId(null);
  }

  // ── Drag state ──────────────────────────────────────────────
  const dragIndexRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);

  function createProgression() {
    if (!newName.trim()) return;
    const id = `prog-${Date.now()}`;
    dispatch({ type: 'CREATE_PROGRESSION', id, name: newName.trim(), size: newSize });
    setNewName('');
  }

  function addToTrack(progressionId) {
    dispatch({ type: 'ADD_TO_TRACK', progressionId });
  }

  function requestDelete(id) {
    setConfirmDeleteId(id);
  }

  function confirmDelete() {
    if (confirmDeleteId) {
      dispatch({ type: 'DELETE_PROGRESSION', id: confirmDeleteId });
    }
    setConfirmDeleteId(null);
  }

  // ── Drag handlers ────────────────────────────────────────────
  function handleDragStart(e, idx) {
    dragIndexRef.current = idx;
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const slot = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  function handleDragOverAfterLast(e) {
    e.preventDefault();
    e.stopPropagation();
    if (track.length !== dropIndex) setDropIndex(track.length);
  }

  function handleDrop(e, slot) {
    e.preventDefault();
    e.stopPropagation();
    const from = dragIndexRef.current;
    const copy = e.ctrlKey;
    dragIndexRef.current = null;
    setDropIndex(null);
    if (from === null || from === undefined) return;
    dispatch({ type: copy ? 'COPY_TRACK_ITEM' : 'REORDER_TRACK', from, to: slot });
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDropIndex(null);
  }

  const isPlaybackActive = isPlaying || isPaused;
  const pianoPlaybackNotes = isPlaybackActive
    ? (playbackActiveNotes?.length ? playbackActiveNotes : (playbackCursor?.notes ?? null))
    : previewNotes;
  const pianoPlaybackDuration = isPlaybackActive ? playbackNotesDuration : PREVIEW_DURATION_MS;

  return (
    <div className={styles.wrapper}>

      {/* ── Delete confirmation dialog ─────────────────────── */}
      {confirmDeleteId && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogMsg}>
              {t.deleteConfirmMsg(<strong>{progressions[confirmDeleteId]?.name}</strong>)}<br />
              <span className={styles.dialogSub}>{t.deleteConfirmSub}</span>
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setConfirmDeleteId(null)}>{t.cancelBtn}</button>
              <button className={styles.dialogConfirm} onClick={confirmDelete}>{t.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <input
          className={styles.trackNameInput}
          placeholder={t.trackNamePlaceholder}
          title={t.trackNameTitle}
          value={trackName}
          onChange={e => dispatch({ type: 'SET_TRACK_NAME', name: e.target.value })}
        />
      </div>

      {/* ── Description ─────────────────────────────────────── */}
      <div className={styles.descSection}>
        <textarea
          className={styles.descTextarea}
          placeholder={t.trackDescPlaceholder}
          title={t.trackDescTitle}
          value={trackDescription}
          rows={2}
          onChange={e => dispatch({ type: 'SET_TRACK_DESCRIPTION', description: e.target.value })}
        />
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* Left: progressions library */}
        <div className={styles.library}>
          <div className={styles.libraryHeader}>
            <h3 className={styles.subTitle}>{t.progressions}</h3>
          </div>

          {/* Create new */}
          <div className={styles.createRow}>
            <input
              className={styles.createInput}
              list="progression-presets"
              placeholder={t.trackNamePlaceholder}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProgression()}
            />
            <datalist id="progression-presets">
              {t.presetNames.map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <input
              type="number"
              className={styles.sizeInput}
              value={newSize}
              min={1} max={32}
              title={t.numberOfCellsTitle}
              onChange={e => setNewSize(Number(e.target.value))}
            />
            <button
              className={styles.createBtn}
              onClick={createProgression}
              disabled={!newName.trim()}
              title={t.newProgBtnTitle}
            >{t.newProgBtn}</button>
          </div>

          {/* Progression cards */}
          {!progressionOrder.length && (
            <p className={styles.hint}>{t.addProgressionHint}</p>
          )}
          {progressionOrder.map(id => (
            <div key={id} className={styles.progCard}>
              {renamingId === id ? (
                <input
                  className={styles.progCardRenameInput}
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                />
              ) : (
                <span
                  className={styles.progCardName}
                  title={t.clickToRename}
                  onClick={() => startRename(id, progressions[id].name)}
                >{progressions[id].name}</span>
              )}
              <div className={styles.progCardActions}>
                <button
                  className={styles.editBtn}
                  title={t.editProgTitle}
                  onClick={() => dispatch({ type: 'OPEN_PROGRESSION_EDITOR', id })}
                >{t.editBtn}</button>
                <button
                  className={styles.addToTrackBtn}
                  title={t.addToTrackTitle}
                  onClick={() => addToTrack(id)}
                >{t.addToTrackBtn}</button>
                <button
                  className={styles.deleteProgBtn}
                  title={t.deleteProgTitle}
                  onClick={() => requestDelete(id)}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: arrangement */}
        <div
          className={styles.arrangement}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { if (dropIndex !== null) handleDrop(e, dropIndex); }}
        >
          <h3 className={styles.subTitle}>
            {t.arrangement}
            <span className={styles.dragHint}>{t.dragHint}</span>
          </h3>
          {!track.length && (
            <p className={styles.hint}>{t.addArrangementHint}</p>
          )}
          {track.map(({ progressionId, repetitions }, idx) => {
            const prog = progressions[progressionId];
            const isDragging = dragIndexRef.current === idx;
            const isCollapsed = collapsedItems.has(idx);
            return (
              <div key={`${progressionId}-${idx}`} className={styles.trackItemOuter}>
                {dropIndex === idx && <div className={styles.dropIndicator} />}
                <div
                  className={`${styles.trackItem} ${isDragging ? styles.itemDragging : ''} ${isCollapsed ? styles.trackItemCollapsed : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, dropIndex ?? idx)}
                  onDragEnd={handleDragEnd}
                >
                  <span className={styles.dragHandle} title={t.dragHandleTitle}>⠿</span>
                  <div className={styles.trackItemBody}>
                    <div
                      className={`${styles.trackItemHeader} ${(isPlaying || isPaused) ? styles.trackItemHeaderSeekable : ''}`}
                      onClick={() => handleTileClick(idx)}
                    >
                      <span className={styles.trackName}>{prog?.name ?? '?'}</span>
                      <button
                        className={styles.collapseBtn}
                        title={isCollapsed ? t.expandItem : t.collapseItem}
                        onClick={e => { e.stopPropagation(); toggleCollapse(idx); }}
                      >{isCollapsed ? '▶' : '▼'}</button>
                    </div>
                    {!isCollapsed && prog && (
                      <ProgressionMiniGrid
                        prog={prog}
                        globalScaleRoot={scaleRoot}
                        globalScaleKey={scaleKey}
                        playbackCursor={(isPlaying || isPaused) ? playbackCursor : null}
                        trackIndex={idx}
                        onCellClick={(chord, cellIndex) => handleCellClick(chord, idx, cellIndex)}
                        controls={(
                          <>
                            <div className={styles.gridBrace} aria-hidden="true" />
                            <div className={styles.trackItemControls}>
                              <label className={styles.repLabel}>×</label>
                              <input
                                type="number"
                                className={styles.repInput}
                                value={repetitions}
                                min={1} max={99}
                                title={t.repetitionsTitle}
                                onClick={e => e.stopPropagation()}
                                onChange={e => dispatch({ type: 'SET_TRACK_REPETITIONS', index: idx, repetitions: Number(e.target.value) })}
                              />
                              <button
                                className={styles.removeBtn}
                                title={t.removeFromTrackTitle}
                                onClick={() => dispatch({ type: 'REMOVE_FROM_TRACK', index: idx })}
                              >×</button>
                            </div>
                          </>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div
            className={styles.dropZoneEnd}
            onDragOver={handleDragOverAfterLast}
            onDrop={e => handleDrop(e, track.length)}
          >
            {dropIndex === track.length && <div className={styles.dropIndicator} />}
          </div>
        </div>
      </div>

      {/* ── Visualiser section ─────────────────────────────── */}
      <div className={styles.visualiserSection}>
        <div className={styles.visualiserHeader}>
          <button
            className={`${styles.visualiserToggleBtn} ${showPiano ? styles.visualiserToggleActive : ''}`}
            onClick={() => setShowPiano(p => !p)}
          >{t.showPiano}</button>
          <button
            className={`${styles.visualiserToggleBtn} ${showGuitar ? styles.visualiserToggleActive : ''}`}
            onClick={() => setShowGuitar(p => !p)}
          >{t.showGuitar}</button>
        </div>
        {showPiano && (
          <PianoKeyboard
            scaleRoot={scaleRoot}
            scaleKey={scaleKey}
            selectedChord={null}
            instrument={instrument}
            playbackNotes={pianoPlaybackNotes}
            playbackNotesDuration={pianoPlaybackDuration}
            isPaused={isPaused}
          />
        )}
        {showGuitar && (
          <GuitarFretboard
            scaleRoot={scaleRoot}
            scaleKey={scaleKey}
            selectedChord={null}
            instrument={instrument}
            playbackNotes={pianoPlaybackNotes}
            playbackNotesDuration={pianoPlaybackDuration}
            isPaused={isPaused}
          />
        )}
      </div>
    </div>
  );
}
