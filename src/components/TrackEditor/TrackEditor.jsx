import { useState, useRef } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import styles from './TrackEditor.module.css';

export function TrackEditor() {
  const { state, dispatch } = useAppState();
  const {
    track, progressions, progressionOrder,
    isPlaying, playbackCursor, playbackActiveNotes, playbackNotesDuration,
    bpm, timeSig, instrument, metronome,
    trackName, trackDescription,
    scaleRoot, scaleKey,
  } = state;
  const { play, stop } = usePlayback();

  // ── Drag state ──────────────────────────────────────────────
  const dragIndexRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);

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
    const mid = rect.top + rect.height / 2;
    const slot = e.clientY < mid ? idx : idx + 1;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  function handleDragOverAfterLast(e) {
    e.preventDefault();
    e.stopPropagation();
    const slot = track.length;
    if (slot !== dropIndex) setDropIndex(slot);
  }

  function handleDrop(e, slot) {
    e.preventDefault();
    e.stopPropagation();
    const from = dragIndexRef.current;
    const copy = e.ctrlKey;
    dragIndexRef.current = null;
    setDropIndex(null);
    if (from === null || from === undefined) return;
    if (copy) {
      dispatch({ type: 'COPY_TRACK_ITEM', from, to: slot });
    } else {
      dispatch({ type: 'REORDER_TRACK', from, to: slot });
    }
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDropIndex(null);
  }

  // ── Playback ────────────────────────────────────────────────
  function addToTrack(progressionId) {
    dispatch({ type: 'ADD_TO_TRACK', progressionId });
  }

  function playTrack() {
    const allSegments = [];
    for (const { progressionId, repetitions } of track) {
      const prog = progressions[progressionId];
      if (!prog) continue;
      for (let r = 0; r < repetitions; r++) {
        allSegments.push({ cells: prog.cells, progressionId: prog.id });
      }
    }
    if (!allSegments.length) return;
    play({
      cells: allSegments.flatMap(s => s.cells),
      progressionId: allSegments[0].progressionId,
      bpm, timeSig, instrument,
      playStyle: 'block', noteValue: '4n',
      metronome,
    });
  }

  const pianoPlaybackNotes = (isPlaying) ? (playbackActiveNotes?.length ? playbackActiveNotes : (playbackCursor?.notes ?? null)) : null;

  return (
    <div className={styles.wrapper}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <input
            className={styles.trackNameInput}
            placeholder="Track name…"
            value={trackName}
            onChange={e => dispatch({ type: 'SET_TRACK_NAME', name: e.target.value })}
          />
        </div>
        <div className={styles.actions}>
          <button className={`${styles.playBtn} ${isPlaying ? styles.stopBtn : ''}`}
            onClick={isPlaying ? stop : playTrack}>
            {isPlaying ? '■ Stop' : '▶ Play Track'}
          </button>
        </div>
      </div>

      {/* ── Description ── */}
      <div className={styles.descSection}>
        <textarea
          className={styles.descTextarea}
          placeholder="Track description, notes, lyrics…"
          value={trackDescription}
          rows={3}
          onChange={e => dispatch({ type: 'SET_TRACK_DESCRIPTION', description: e.target.value })}
        />
      </div>

      {/* ── Body: progressions + arrangement ── */}
      <div className={styles.body}>
        {/* Left: available progressions */}
        <div className={styles.available}>
          <h3 className={styles.subTitle}>Progressions</h3>
          {progressionOrder.map(id => (
            <div key={id} className={styles.progItem}>
              <span>{progressions[id].name}</span>
              <button className={styles.addBtn} onClick={() => addToTrack(id)}>+ Add</button>
            </div>
          ))}
          {!progressionOrder.length && (
            <p className={styles.hint}>Create progressions in Chord Progressions first.</p>
          )}
        </div>

        {/* Right: track arrangement */}
        <div
          className={styles.arrangement}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { if (dropIndex !== null) handleDrop(e, dropIndex); }}
        >
          <h3 className={styles.subTitle}>
            Arrangement
            <span className={styles.dragHint}>— drag to reorder · Ctrl+drag to copy</span>
          </h3>
          {!track.length && (
            <p className={styles.hint}>Add progressions from the left panel.</p>
          )}

          {track.map(({ progressionId, repetitions }, idx) => {
            const prog = progressions[progressionId];
            const isCurrentProg = isPlaying && playbackCursor?.progressionId === progressionId;
            const isDragging = dragIndexRef.current === idx;
            const showDropBefore = dropIndex === idx;

            return (
              <div key={`${progressionId}-${idx}`} className={styles.trackItemOuter}>
                {/* Drop indicator above this item */}
                {showDropBefore && <div className={styles.dropIndicator} />}

                <div
                  className={`${styles.trackItem} ${isCurrentProg ? styles.current : ''} ${isDragging ? styles.itemDragging : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, dropIndex ?? idx)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drag handle */}
                  <span className={styles.dragHandle} title="Drag to reorder">⠿</span>
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

          {/* Drop zone after the last item */}
          <div
            className={`${styles.dropZoneEnd} ${dropIndex === track.length ? styles.dropZoneEndActive : ''}`}
            onDragOver={handleDragOverAfterLast}
            onDrop={e => handleDrop(e, track.length)}
          >
            {dropIndex === track.length && <div className={styles.dropIndicator} />}
          </div>
        </div>
      </div>

      {/* ── Piano keyboard ── */}
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
