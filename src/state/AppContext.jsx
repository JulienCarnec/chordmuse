import { createContext, useContext, useReducer } from 'react';
import { CHROMATIC } from '../theory/notes';

// ─── Initial State ────────────────────────────────────────────────────────────

export const INITIAL_STATE = {
  // Global track settings
  bpm: 120,
  timeSig: '4/4',
  instrument: 'piano',
  groove: 'straight',   // 'straight' | 'shuffle' | 'swing'
  metronome: { enabled: false, mode: 'click' }, // mode: 'click' | 'drum'

  // Built-in + user-saved custom patterns: array of { id, name, pattern, noteValue, loop }
  // IDs prefixed with "builtin-" are shipped with the app; user patterns use "custom-<timestamp>".
  customPatterns: [
    // ── Block / Strum ────────────────────────────────────────────────────────
    {
      id: 'builtin-block',
      name: 'Block chord',
      pattern: '{[a1,b1,c1]}',
      noteValue: '4n',
      loop: true,
    },
    {
      id: 'builtin-strum-on',
      name: 'On-beat strum',
      pattern: '{[a1,b1,c1],[a1,b1,c1],[a1,b1,c1],[a1,b1,c1]}',
      noteValue: '4n',
      loop: false,
    },
    {
      id: 'builtin-strum-off',
      name: 'Off-beat strum',
      pattern: '{,[a1,b1,c1],[a1,b1,c1],[a1,b1,c1],[a1,b1,c1]}',
      noteValue: '4n',
      loop: false,
    },
    {
      id: 'builtin-strum-folk',
      name: 'Folk strum (D-DU-DU)',
      pattern: '{[a1,b1,c1],,[a1,b1,c1],[a1,b1,c1],,[a1,b1,c1],[a1,b1,c1]}',
      noteValue: '8n',
      loop: false,
    },
    {
      id: 'builtin-strum-staccato',
      name: 'Staccato chops',
      pattern: '{[a1,b1,c1].,[a1,b1,c1].,[a1,b1,c1].,[a1,b1,c1].}',
      noteValue: '4n',
      loop: false,
    },
    {
      id: 'builtin-reggae',
      name: 'Reggae off-beat',
      pattern: '{a0,[a1,b1,c1].,,[a1,b1,c1].}',
      noteValue: '4n',
      loop: false,
    },
    // ── Bass + chord ─────────────────────────────────────────────────────────
    {
      id: 'builtin-bass-chord',
      name: 'Bass + chord',
      pattern: '{a0,[b1,c1],a0,[b1,c1]}',
      noteValue: '4n',
      loop: false,
    },
    {
      id: 'builtin-oom-pah-pah',
      name: 'Oom-pah-pah (3/4)',
      pattern: '{a0,[b1,c1],[b1,c1]}',
      noteValue: '4n',
      loop: false,
    },
    {
      id: 'builtin-bass-walk',
      name: 'Bass walk',
      pattern: '{a0,a0,[b1,c1],a0}',
      noteValue: '4n',
      loop: false,
    },
    // ── Arpeggios ────────────────────────────────────────────────────────────
    {
      id: 'builtin-arp-up',
      name: 'Arpeggio up',
      pattern: '{a1,b1,c1}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-arp-down',
      name: 'Arpeggio down',
      pattern: '{c1,b1,a1}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-arp-updown',
      name: 'Arpeggio up-down',
      pattern: '{a1,b1,c1,b1}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-arp-2oct',
      name: 'Arpeggio 2 octaves',
      pattern: '{a1,b1,c1,a2,b2,c2}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-arp-staccato',
      name: 'Arpeggio staccato',
      pattern: '{a1.,b1.,c1.}',
      noteValue: '8n',
      loop: true,
    },
    // ── Figures ──────────────────────────────────────────────────────────────
    {
      id: 'builtin-bach',
      name: 'Bach prelude',
      pattern: '{a0,c0,a1,b1,c1,a1,b1,c1}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-bass-burst',
      name: 'Bass + arp burst',
      pattern: '{a0,[b1,c1],a1,c1,a1,[b1,c1]}',
      noteValue: '8n',
      loop: true,
    },
    {
      id: 'builtin-pickup',
      name: 'Staccato pick-up',
      pattern: '{a1.,b1.,c1.,[a1,b1,c1]}',
      noteValue: '8n',
      loop: false,
    },
    {
      id: 'builtin-alberti',
      name: 'Alberti bass',
      pattern: '{[a0,c0],a1,[b1,c1],a1}',
      noteValue: '4n',
      loop: true,
    },
    // ── 7th-chord figures ────────────────────────────────────────────────────
    {
      id: 'builtin-arp-7th',
      name: 'Arpeggio (7th chord)',
      pattern: '{a0,c1,b1,d1,c1,b1}',
      noteValue: '8n',
      loop: true,
    },
  ],

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

  // Track arrangement: array of { progressionId, repetitions }
  track: [],
  trackName: '',
  trackDescription: '',

  // Global pattern settings (saved with the project)
  globalPlayStyle:   '{[a1,b1,c1]}',
  globalNoteValue:   '4n',
  globalPatternLoop: true,

  // Active view: 'chords' | 'track'
  activeView: 'track',
  activeProgressionId: null,
};

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
      const { id, name, size } = action;
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
            cellDuration: 'whole',
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

    case 'LOAD_PROJECT':
      return {
        ...INITIAL_STATE,
        ...action.project,
        activeView: 'track',
        // Playback state must never be restored from a saved file —
        // the audio engine is not running when the file loads.
        isPlaying: false,
        isPaused:  false,
        playbackCursor: null,
        playbackNotes:  [],
      };

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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  return useContext(AppContext);
}
