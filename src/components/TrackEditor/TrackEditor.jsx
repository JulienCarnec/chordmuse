import { useState, useRef } from 'react';
import { useAppState } from '../../state/AppContext';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import styles from './TrackEditor.module.css';

const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];
const INSTRUMENTS = ['piano', 'synth', 'strings', 'pad', 'guitar'];

export function TrackEditor() {
  const { state, dispatch } = useAppState();
  const {
    track, progressions, progressionOrder,
    isPlaying, playbackCursor, playbackActiveNotes, playbackNotesDuration,
    bpm, timeSig, instrument,
    trackName, trackDescription,
    scaleRoot, scaleKey,
  } = state;

  // ── Create progression form ──────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState(4);

  // ── Delete confirmation ──────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  const pianoPlaybackNotes = isPlaying
    ? (playbackActiveNotes?.length ? playbackActiveNotes : (playbackCursor?.notes ?? null))
    : null;

  return (
    <div className={styles.wrapper}>

      {/* ── Delete confirmation dialog ─────────────────────── */}
      {confirmDeleteId && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <p className={styles.dialogMsg}>
              Delete <strong>{progressions[confirmDeleteId]?.name}</strong>?<br />
              <span className={styles.dialogSub}>This cannot be undone. Any track entries using it will be removed.</span>
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className={styles.dialogConfirm} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <input
          className={styles.trackNameInput}
          placeholder="Track name…"
          value={trackName}
          onChange={e => dispatch({ type: 'SET_TRACK_NAME', name: e.target.value })}
        />
        {/* Global settings row */}
        <div className={styles.settingsRow}>
          <label className={styles.settingLabel}>BPM</label>
          <input
            type="number"
            className={styles.settingInput}
            value={bpm}
            min={20} max={300}
            onChange={e => dispatch({ type: 'SET_BPM', bpm: Number(e.target.value) })}
          />
          <label className={styles.settingLabel}>Time</label>
          <select
            className={styles.settingSelect}
            value={timeSig}
            onChange={e => dispatch({ type: 'SET_TIME_SIG', timeSig: e.target.value })}
          >
            {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className={styles.settingLabel}>Instrument</label>
          <select
            className={styles.settingSelect}
            value={instrument}
            onChange={e => dispatch({ type: 'SET_INSTRUMENT', instrument: e.target.value })}
          >
            {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────── */}
      <div className={styles.descSection}>
        <textarea
          className={styles.descTextarea}
          placeholder="Track description, notes, lyrics…"
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
            <h3 className={styles.subTitle}>Progressions</h3>
          </div>

          {/* Create new */}
          <div className={styles.createRow}>
            <input
              className={styles.createInput}
              list="progression-presets"
              placeholder="Name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProgression()}
            />
            <datalist id="progression-presets">
              {['Intro','Verse','Pre-Chorus','Chorus','Bridge','Break','Drop','Outro'].map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <input
              type="number"
              className={styles.sizeInput}
              value={newSize}
              min={1} max={32}
              title="Number of cells"
              onChange={e => setNewSize(Number(e.target.value))}
            />
            <button
              className={styles.createBtn}
              onClick={createProgression}
              disabled={!newName.trim()}
            >+ New</button>
          </div>

          {/* Progression cards */}
          {!progressionOrder.length && (
            <p className={styles.hint}>Create your first progression above.</p>
          )}
          {progressionOrder.map(id => (
            <div key={id} className={styles.progCard}>
              <span className={styles.progCardName}>{progressions[id].name}</span>
              <div className={styles.progCardActions}>
                <button
                  className={styles.editBtn}
                  title="Edit this progression"
                  onClick={() => dispatch({ type: 'OPEN_PROGRESSION_EDITOR', id })}
                >✎ Edit</button>
                <button
                  className={styles.addToTrackBtn}
                  title="Add to arrangement"
                  onClick={() => addToTrack(id)}
                >+ Add</button>
                <button
                  className={styles.deleteProgBtn}
                  title="Delete progression"
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
            Arrangement
            <span className={styles.dragHint}>drag to reorder · Ctrl+drag to copy</span>
          </h3>
          {!track.length && (
            <p className={styles.hint}>Add progressions from the left panel.</p>
          )}
          {track.map(({ progressionId, repetitions }, idx) => {
            const prog = progressions[progressionId];
            const isCurrentProg = isPlaying && playbackCursor?.progressionId === progressionId;
            const isDragging = dragIndexRef.current === idx;
            return (
              <div key={`${progressionId}-${idx}`} className={styles.trackItemOuter}>
                {dropIndex === idx && <div className={styles.dropIndicator} />}
                <div
                  className={`${styles.trackItem} ${isCurrentProg ? styles.current : ''} ${isDragging ? styles.itemDragging : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, dropIndex ?? idx)}
                  onDragEnd={handleDragEnd}
                >
                  <span className={styles.dragHandle}>⠿</span>
                  <span className={styles.trackName}>{prog?.name ?? '?'}</span>
                  <label className={styles.repLabel}>×</label>
                  <input
                    type="number"
                    className={styles.repInput}
                    value={repetitions}
                    min={1} max={99}
                    onClick={e => e.stopPropagation()}
                    onChange={e => dispatch({ type: 'SET_TRACK_REPETITIONS', index: idx, repetitions: Number(e.target.value) })}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => dispatch({ type: 'REMOVE_FROM_TRACK', index: idx })}
                  >×</button>
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

      {/* ── Piano keyboard ─────────────────────────────────── */}
      <div className={styles.pianoSection}>
        <PianoKeyboard
          scaleRoot={scaleRoot}
          scaleKey={scaleKey}
          selectedChord={null}
          instrument={instrument}
          playbackNotes={pianoPlaybackNotes}
          playbackNotesDuration={playbackNotesDuration}
        />
      </div>
    </div>
  );
}
