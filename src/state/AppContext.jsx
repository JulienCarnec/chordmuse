import { createContext, useContext, useReducer, useEffect } from 'react';
import { CHROMATIC } from '../theory/notes';
import { DEFAULT_PATTERNS } from '../theory/defaultPatterns';

// ─── Persistence key ──────────────────────────────────────────────────────────
const LS_KEY = 'chordmuse_state_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(state) {
  try {
    // Strip volatile runtime properties before persisting
    const { isPlaying, isPaused, playbackCursor, playbackActiveNotes, playbackNotesDuration, ...rest } = state;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
  } catch { /* quota or private mode — silently ignore */ }
}

// ─── Initial State ────────────────────────────────────────────────────────────

export const INITIAL_STATE = {
  // Help panel open/closed (shared across track editor and chord grid editor)
  helpOpen: false,

  // Global track settings
  bpm: 120,
  timeSig: '4/4',
  instrument: 'piano',
  groove: 'straight',   // 'straight' | 'shuffle' | 'swing'
  autoPlay: true,       // preview sounds automatically on cell/step selection
  metronome: {
    drumEnabled: false,     // whether the drum sequencer fires during playback
  },

  // Built-in + user-saved custom patterns.
  // Built-in IDs are prefixed "builtin-"; user patterns use "custom-<timestamp>".
  // New format: { id, name, loop, columns, subPatterns: { 3, 4, 5 } }
  customPatterns: DEFAULT_PATTERNS,

  // Playback
  isPlaying: false,
  isPaused: false,
  playbackCursor: null,        // { progressionId, cellIndex, notes }
  playbackActiveNotes: [],     // exact note+octave strings currently sounding

  // Currently selected cell chord (for piano roll highlight)
  selectedCellChord: null, // { root, typeKey }

  // Scale
  scaleRoot: null,
  scaleKey: null,

  // Chord progressions map: id -> progression
  progressions: {},
  progressionOrder: [],

  // ── Drum patterns ───────────────────────────────────────────────────────────
  // Map id → drumPattern; ids prefixed 'drum-builtin-' are presets, 'drum-<ts>' are user-saved.
  // Each drumPattern: { id, name, rows: [ { rowId, label, sample, volume, reverb, steps: [{ on, vel }×16] } ] }
  drumPatterns: {
    'drum-builtin-rock': {
      id: 'drum-builtin-rock',
      name: 'Rock 1',
      rows: [
        { rowId: 'hh',     label: 'HH',    sample: 'hh-closed',  volume: 80, reverb: 15, steps: Array.from({length:16},(_,i)=>({ on:i%4===0, vel:1.0 })) },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8',  volume: 85, reverb: 20, steps: Array.from({length:16},(_,i)=>({ on:i===4||i===12, vel:1.0 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',        volume: 90, reverb: 10, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===8,  vel:1.0 })) },
        { rowId: 'custom', label: 'Perc',  sample: 'clap',        volume: 70, reverb: 15, steps: Array.from({length:16},()=>({ on:false, vel:1.0 })) },
      ],
    },
    'drum-builtin-rock2': {
      id: 'drum-builtin-rock2',
      name: 'Rock 2',
      rows: [
        // HH on steps 0,2,4,6,8,10,12,14 — velocity fades across each group of 4:
        //   beat downbeat (0,8) → 1.0, upbeat (4,12) → 0.7, off-beats → 0.45
        { rowId: 'hh',    label: 'HH',   sample: 'hh-closed', volume: 80, reverb: 15, steps: (() => {
          const HH_ON  = new Set([0, 2, 4, 6, 8, 10, 12, 14]);
          const HH_VEL = { 0:1.0, 2:0.45, 4:0.7, 6:0.45, 8:1.0, 10:0.45, 12:0.7, 14:0.45 };
          return Array.from({length:16}, (_,i) => ({ on: HH_ON.has(i), vel: HH_VEL[i] ?? 1.0 }));
        })() },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8', volume: 85, reverb: 20, steps: Array.from({length:16},(_,i)=>({ on:i===4||i===12, vel:1.0 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',       volume: 90, reverb: 10, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===8,  vel:1.0 })) },
        { rowId: 'custom', label: 'Perc',  sample: 'clap',       volume: 70, reverb: 15, steps: Array.from({length:16},()=>({ on:false, vel:1.0 })) },
      ],
    },
    'drum-builtin-rock3': {
      id: 'drum-builtin-rock3',
      name: 'Rock 3',
      rows: [
        // HH on steps 0,2,4,6,8,10,12,14 — velocity fades across each group of 4:
        //   beat downbeat (0,8) → 1.0, upbeat (4,12) → 0.7, off-beats → 0.45
        { rowId: 'hh',    label: 'HH',   sample: 'hh-closed', volume: 80, reverb: 15, steps: (() => {
          const HH_ON  = new Set([0, 2, 4, 6, 8, 10, 12, 14]);
          const HH_VEL = { 0:1.0, 2:0.45, 4:0.7, 6:0.45, 8:1.0, 10:0.45, 12:0.7, 14:0.45 };
          return Array.from({length:16}, (_,i) => ({ on: HH_ON.has(i), vel: HH_VEL[i] ?? 1.0 }));
        })() },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8', volume: 85, reverb: 20, steps: Array.from({length:16},(_,i)=>({ on:i===8, vel:1.0 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',       volume: 90, reverb: 10, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===12,  vel:1.0 })) },
        { rowId: 'custom', label: 'Perc',  sample: 'clap',       volume: 70, reverb: 15, steps: Array.from({length:16},()=>({ on:false, vel:1.0 })) },
      ],
    },
    'drum-builtin-funk': {
      id: 'drum-builtin-funk',
      name: 'Funk',
      rows: [
        { rowId: 'hh',     label: 'HH',    sample: 'hh-closed',  volume: 75, reverb: 15, steps: Array.from({length:16},(_,i)=>({ on:true,  vel:i%4===0?1.0:i%2===0?0.7:0.4 })) },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8',  volume: 85, reverb: 20, steps: Array.from({length:16},(_,i)=>({ on:i===4||i===10||i===12, vel:1.0 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',        volume: 90, reverb: 10, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===6||i===8,   vel:1.0 })) },
        { rowId: 'custom', label: 'Perc',  sample: 'clap',        volume: 70, reverb: 15, steps: Array.from({length:16},(_,i)=>({ on:i===2||i===14, vel:0.7 })) },
      ],
    },
    'drum-builtin-bossa': {
      id: 'drum-builtin-bossa',
      name: 'Bossa Nova',
      rows: [
        { rowId: 'hh',     label: 'HH',    sample: 'hh-closed',  volume: 70, reverb: 25, steps: Array.from({length:16},(_,i)=>({ on:i%2===0, vel:i%4===0?1.0:0.6 })) },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-brush', volume: 75, reverb: 30, steps: Array.from({length:16},(_,i)=>({ on:i===4||i===8||i===12, vel:0.7 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',        volume: 85, reverb: 15, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===4, vel:1.0 })) },
        { rowId: 'custom', label: 'Rim',   sample: 'snare-rim',   volume: 65, reverb: 20, steps: Array.from({length:16},(_,i)=>({ on:i===3||i===7||i===11||i===15, vel:0.5 })) },
      ],
    },
    'drum-builtin-hiphop': {
      id: 'drum-builtin-hiphop',
      name: 'Hip-Hop',
      rows: [
        { rowId: 'hh',     label: 'HH',    sample: 'hh-closed',  volume: 70, reverb: 15, steps: Array.from({length:16},(_,i)=>({ on:i%4===2, vel:0.7 })) },
        { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8',  volume: 85, reverb: 25, steps: Array.from({length:16},(_,i)=>({ on:i===4||i===12, vel:1.0 })) },
        { rowId: 'bd',     label: 'BD',    sample: 'kick',        volume: 90, reverb: 10, steps: Array.from({length:16},(_,i)=>({ on:i===0||i===3||i===8||i===11, vel:1.0 })) },
        { rowId: 'custom', label: 'Perc',  sample: 'clap',        volume: 70, reverb: 15, steps: Array.from({length:16},()=>({ on:false, vel:1.0 })) },
      ],
    },
  },
  drumPatternOrder: ['drum-builtin-rock','drum-builtin-rock2','drum-builtin-rock3','drum-builtin-funk','drum-builtin-bossa','drum-builtin-hiphop'],
  // id of the drum pattern currently loaded in the editor panel (null = blank)
  activeDrumPatternId: 'drum-builtin-rock2',

  // Track arrangement: array of { progressionId, repetitions, drumPatternId? }
  track: [],
  trackName: '',
  trackDescription: '',

  // Global pattern settings (saved with the project)
  globalPlayStyle:   'builtin-block',
  globalNoteValue:   '4n',
  globalPatternLoop: true,

  // Active view: 'chords' | 'track'
  activeView: 'track',
  activeProgressionId: null,
};

// ─── Merge saved state with INITIAL_STATE ────────────────────────────────────
// Ensures any new fields added to INITIAL_STATE are always present.
function buildInitialState() {
  const saved = loadFromStorage();
  if (!saved) return INITIAL_STATE;

  // Restore activeView / activeProgressionId only when the referenced
  // progression actually exists in the saved data.
  const savedProgId = saved.activeProgressionId;
  const canRestoreEditor =
    saved.activeView === 'progression' &&
    savedProgId &&
    (saved.progressions ?? {})[savedProgId] != null;

  // Rebuild the canonical builtin-* entries from DEFAULT_PATTERNS, and
  // keep only user custom-* patterns from localStorage. This prevents stale
  // old built-in definitions (with wrong IDs or old formats) from surviving
  // across releases.
  const savedCustom = (saved.customPatterns ?? []).filter(
    p => !p.id.startsWith('builtin-')  // drop all saved builtin-* entries
  );
  const mergedPatterns = [
    ...DEFAULT_PATTERNS,               // canonical builtins always come first
    ...savedCustom,                    // then the user's own custom-* patterns
  ];

  return {
    ...INITIAL_STATE,
    ...saved,
    // Always use fresh built-ins merged with user customs
    customPatterns: mergedPatterns,
    metronome: { ...INITIAL_STATE.metronome, ...(saved.metronome ?? {}) },
    drumPatterns: { ...INITIAL_STATE.drumPatterns, ...(saved.drumPatterns ?? {}) },
    drumPatternOrder: saved.drumPatternOrder?.length
      ? saved.drumPatternOrder
      : INITIAL_STATE.drumPatternOrder,
    // Always reset playback state
    isPlaying: false,
    isPaused: false,
    playbackCursor: null,
    playbackActiveNotes: [],
    // Restore the chord grid editor if the progression is still present,
    // otherwise fall back to the track view.
    activeView: canRestoreEditor ? 'progression' : 'track',
    activeProgressionId: canRestoreEditor ? savedProgId : null,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BPM':
      return { ...state, bpm: action.bpm };
    case 'SET_TIME_SIG':
      return { ...state, timeSig: action.timeSig };
    case 'SET_INSTRUMENT':
      return { ...state, instrument: action.instrument };
    case 'SET_METRONOME':
      return { ...state, metronome: { ...state.metronome, ...action.payload } };
    case 'SET_AUTO_PLAY':
      return { ...state, autoPlay: action.autoPlay };
    case 'SET_GROOVE':
      return { ...state, groove: action.groove };

    case 'SET_SCALE':
      return { ...state, scaleRoot: action.root, scaleKey: action.key };

    case 'SET_GLOBAL_PATTERN': {
      // Write into the active progression's own pattern fields (per-progression pattern).
      // Falls back to updating root state only when no progression is active (legacy path).
      const activeProg = state.progressions[state.activeProgressionId];
      if (activeProg) {
        return {
          ...state,
          progressions: {
            ...state.progressions,
            [activeProg.id]: {
              ...activeProg,
              playStyle:   action.playStyle   ?? activeProg.playStyle   ?? state.globalPlayStyle,
              noteValue:   action.noteValue   ?? activeProg.noteValue   ?? state.globalNoteValue,
              patternLoop: action.patternLoop ?? activeProg.patternLoop ?? state.globalPatternLoop,
            },
          },
        };
      }
      return {
        ...state,
        globalPlayStyle:   action.playStyle   ?? state.globalPlayStyle,
        globalNoteValue:   action.noteValue   ?? state.globalNoteValue,
        globalPatternLoop: action.patternLoop ?? state.globalPatternLoop,
      };
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing, isPaused: false, playbackActiveNotes: [] };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.paused };
    case 'SET_PLAYBACK_CURSOR':
      return { ...state, playbackCursor: action.cursor };
    case 'SET_PLAYBACK_NOTES':
      return {
        ...state,
        playbackActiveNotes: action.notes ?? [],
        playbackNotesDuration: action.durationMs ?? 900,
      };
    case 'SET_SELECTED_CELL_CHORD':
      return { ...state, selectedCellChord: action.chord };

    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    // Open the chord progression editor for a specific progression
    case 'OPEN_PROGRESSION_EDITOR':
      return { ...state, activeView: 'progression', activeProgressionId: action.id };
    // Return to track view
    case 'CLOSE_PROGRESSION_EDITOR':
      return { ...state, activeView: 'track' };
    case 'SET_ACTIVE_PROGRESSION':
      return { ...state, activeProgressionId: action.id };

    case 'CREATE_PROGRESSION': {
      const { id, name, size, cellDuration } = action;
      const cells = Array.from({ length: size }, (_, i) => ({
        id: `${id}-cell-${i}`,
        chord: null,   // { root, typeKey }
        split: false,
        subCells: [null, null],
      }));
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [id]: {
            id, name, cells,
            scaleRoot: null, scaleKey: null,
            cellDuration: cellDuration ?? 'whole',
            // Per-progression pattern — null means "inherit from app global"
            playStyle:   null,
            noteValue:   null,
            patternLoop: null,
          },
        },
        progressionOrder: [...state.progressionOrder, id],
        activeProgressionId: id,
        activeView: 'progression',
      };
    }

    case 'DELETE_PROGRESSION': {
      const { [action.id]: _, ...rest } = state.progressions;
      return {
        ...state,
        progressions: rest,
        progressionOrder: state.progressionOrder.filter(id => id !== action.id),
        activeProgressionId:
          state.activeProgressionId === action.id
            ? state.progressionOrder.find(id => id !== action.id) ?? null
            : state.activeProgressionId,
      };
    }

    case 'SAVE_PATTERN': {
      // Upsert by id — add new or replace existing
      const existing = state.customPatterns.findIndex(p => p.id === action.pattern.id);
      const customPatterns = existing >= 0
        ? state.customPatterns.map((p, i) => i === existing ? action.pattern : p)
        : [...state.customPatterns, action.pattern];
      return { ...state, customPatterns };
    }

    case 'DELETE_PATTERN': {
      return { ...state, customPatterns: state.customPatterns.filter(p => p.id !== action.id) };
    }

    case 'SET_CELL_PLAY_STYLE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex
          ? { ...cell, playStyle: action.playStyle, noteValue: action.noteValue, patternLoop: action.patternLoop ?? cell.patternLoop }
          : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_SUB_CELL_PLAY_STYLE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) => {
        if (i !== action.cellIndex || !cell.split) return cell;
        const subCells = cell.subCells.map((sc, si) =>
          si === action.subIndex && sc
            ? { ...sc, playStyle: action.playStyle, noteValue: action.noteValue, patternLoop: action.patternLoop ?? sc.patternLoop }
            : sc
        );
        return { ...cell, subCells };
      });
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'ADD_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const newCell = {
        id: `${action.progressionId}-cell-${Date.now()}`,
        chord: null,
        split: false,
        subCells: [null, null],
      };
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, cells: [...prog.cells, newCell] },
        },
      };
    }

    case 'REMOVE_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog || prog.cells.length <= 1) return state;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: {
            ...prog,
            cells: prog.cells.filter((_, i) => i !== action.cellIndex),
          },
        },
      };
    }

    // Move cell from fromIndex to toIndex (insert before toIndex after removal).
    case 'MOVE_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex || fromIndex === toIndex - 1) return state;
      const cells = [...prog.cells];
      const [moved] = cells.splice(fromIndex, 1);
      // After removal toIndex may shift by -1 if we removed before it
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      cells.splice(insertAt, 0, moved);
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    // Copy cell: insert a deep clone at toIndex without removing the source.
    case 'COPY_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const { fromIndex, toIndex } = action;
      const cells = [...prog.cells];
      const src = cells[fromIndex];
      const clone = JSON.parse(JSON.stringify(src));
      clone.id = `${action.progressionId}-cell-${Date.now()}`;
      // Give each sub-cell a fresh identity too
      if (clone.subCells) {
        clone.subCells = clone.subCells.map((sc, i) =>
          sc ? { ...sc } : sc
        );
      }
      cells.splice(toIndex, 0, clone);
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'RENAME_PROGRESSION':
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.id]: { ...state.progressions[action.id], name: action.name },
        },
      };

    case 'DUPLICATE_PROGRESSION': {
      const src = state.progressions[action.id];
      if (!src) return state;
      const newId = `prog-${Date.now()}`;
      const clonedCells = src.cells.map((cell, i) => ({
        ...JSON.parse(JSON.stringify(cell)),
        id: `${newId}-cell-${i}`,
      }));
      const clone = {
        ...JSON.parse(JSON.stringify(src)),
        id: newId,
        name: `${src.name} (copy)`,
        cells: clonedCells,
      };
      const srcOrderIdx = state.progressionOrder.indexOf(action.id);
      const newOrder = [...state.progressionOrder];
      newOrder.splice(srcOrderIdx + 1, 0, newId);
      return {
        ...state,
        progressions: { ...state.progressions, [newId]: clone },
        progressionOrder: newOrder,
      };
    }

    case 'SET_CELL_CHORD': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, chord: action.chord } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SPLIT_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, split: true, subCells: [cell.chord, null] } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'UNSPLIT_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, split: false, subCells: [null, null] } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_SUB_CELL_CHORD': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) => {
        if (i !== action.cellIndex) return cell;
        const subCells = [...cell.subCells];
        subCells[action.subIndex] = action.chord;
        return { ...cell, subCells };
      });
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_PROGRESSION_SCALE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, scaleRoot: action.root, scaleKey: action.key },
        },
      };
    }

    case 'SET_CELL_DURATION': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, cellDuration: action.cellDuration },
        },
      };
    }

    case 'TRANSPOSE_PROGRESSION': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const semitones = action.semitones;
      const transposedCells = prog.cells.map(cell => ({
        ...cell,
        chord: cell.chord
          ? { ...cell.chord, root: transposeNoteLocal(cell.chord.root, semitones) }
          : null,
        subCells: cell.subCells.map(sc =>
          sc ? { ...sc, root: transposeNoteLocal(sc.root, semitones) } : null
        ),
      }));
      const newRoot = prog.scaleRoot ? transposeNoteLocal(prog.scaleRoot, semitones) : null;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, cells: transposedCells, scaleRoot: newRoot },
        },
      };
    }

    case 'ADD_TO_TRACK':
      return { ...state, track: [...state.track, { progressionId: action.progressionId, repetitions: 1 }] };
    case 'REMOVE_FROM_TRACK':
      return { ...state, track: state.track.filter((_, i) => i !== action.index) };
    case 'SET_TRACK_REPETITIONS': {
      const track = state.track.map((item, i) =>
        i === action.index ? { ...item, repetitions: action.repetitions } : item
      );
      return { ...state, track };
    }
    case 'REORDER_TRACK': {
      const track = [...state.track];
      const [moved] = track.splice(action.from, 1);
      // Adjust destination after removal
      const insertAt = action.from < action.to ? action.to - 1 : action.to;
      track.splice(insertAt, 0, moved);
      return { ...state, track };
    }

    case 'COPY_TRACK_ITEM': {
      const track = [...state.track];
      const clone = { ...track[action.from] };
      track.splice(action.to, 0, clone);
      return { ...state, track };
    }

    case 'SET_TRACK_NAME':
      return { ...state, trackName: action.name };
    case 'SET_TRACK_DESCRIPTION':
      return { ...state, trackDescription: action.description };

    // ── Drum pattern actions ─────────────────────────────────────────────────

    case 'SET_ACTIVE_DRUM_PATTERN':
      return { ...state, activeDrumPatternId: action.id };

    case 'SAVE_DRUM_PATTERN': {
      const { pattern } = action;
      const existing = state.drumPatterns[pattern.id];
      return {
        ...state,
        drumPatterns: { ...state.drumPatterns, [pattern.id]: pattern },
        drumPatternOrder: existing
          ? state.drumPatternOrder
          : [...state.drumPatternOrder, pattern.id],
        activeDrumPatternId: pattern.id,
      };
    }

    case 'DELETE_DRUM_PATTERN': {
      const { [action.id]: _removed, ...restPatterns } = state.drumPatterns;
      return {
        ...state,
        drumPatterns: restPatterns,
        drumPatternOrder: state.drumPatternOrder.filter(id => id !== action.id),
        activeDrumPatternId:
          state.activeDrumPatternId === action.id ? null : state.activeDrumPatternId,
        // Remove pattern assignment from any track item that used it
        track: state.track.map(item =>
          item.drumPatternId === action.id ? { ...item, drumPatternId: null } : item
        ),
      };
    }

    case 'UPDATE_DRUM_STEP': {
      // Toggle / set velocity on a single step in the active pattern.
      // action: { patternId, rowId, stepIndex, on, vel }
      const pat = state.drumPatterns[action.patternId];
      if (!pat) return state;
      const rows = pat.rows.map(row => {
        if (row.rowId !== action.rowId) return row;
        const steps = row.steps.map((s, i) =>
          i === action.stepIndex ? { on: action.on, vel: action.vel } : s
        );
        return { ...row, steps };
      });
      return {
        ...state,
        drumPatterns: { ...state.drumPatterns, [action.patternId]: { ...pat, rows } },
      };
    }

    case 'UPDATE_DRUM_ROW': {
      // Update label / note for a row.
      const pat = state.drumPatterns[action.patternId];
      if (!pat) return state;
      const rows = pat.rows.map(row =>
        row.rowId === action.rowId ? { ...row, ...action.changes } : row
      );
      return {
        ...state,
        drumPatterns: { ...state.drumPatterns, [action.patternId]: { ...pat, rows } },
      };
    }

    case 'SET_TRACK_DRUM_PATTERN': {
      const track = state.track.map((item, i) =>
        i === action.index ? { ...item, drumPatternId: action.drumPatternId } : item
      );
      return { ...state, track };
    }

    case 'LOAD_PROJECT':
      return {
        ...INITIAL_STATE,
        ...action.project,
        // Deep-merge sub-objects so new fields added to INITIAL_STATE are
        // always present even when loading an older saved project that lacks them.
        metronome: { ...INITIAL_STATE.metronome, ...(action.project.metronome ?? {}) },
        drumPatterns: {
          ...INITIAL_STATE.drumPatterns,
          ...(action.project.drumPatterns ?? {}),
        },
        drumPatternOrder: action.project.drumPatternOrder?.length
          ? action.project.drumPatternOrder
          : INITIAL_STATE.drumPatternOrder,
        activeView: 'track',
        // Playback state must never be restored from a saved file —
        // the audio engine is not running when the file loads.
        isPlaying: false,
        isPaused:  false,
        playbackCursor: null,
        playbackNotes:  [],
      };

    case 'RESET_PROJECT':
      return { ...INITIAL_STATE };

    case 'SET_HELP_OPEN':
      return { ...state, helpOpen: action.open };

    default:
      return state;
  }
}

// Local helper to avoid circular import
function transposeNoteLocal(note, semitones) {
  const flat2sharp = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const n = flat2sharp[note] ?? note;
  const idx = CHROMATIC.indexOf(n);
  if (idx === -1) return note;
  return CHROMATIC[(idx + semitones + 120) % 12];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Persist state to localStorage after every change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  return useContext(AppContext);
}
