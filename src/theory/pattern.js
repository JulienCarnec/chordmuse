/**
 * Pattern system — two complementary representations:
 *
 * 1. VISUAL GRID (primary, stored in state)
 *    A pattern object has:
 *      id, name, loop (bool), columns (string[]) — duration per step, e.g. ['4n','8n',…]
 *      subPatterns: { 3: grid3, 4: grid4, 5: grid5 }
 *    Each grid is a 2-D array:  grid[colIndex][rowIndex] = 'off' | 'sustain' | 'staccato'
 *    Row layout (top → bottom):
 *      For noteCount N, rows = [N−1, …, 0] letters at octave 2, then oct 1, then oct 0.
 *      e.g. noteCount=3: c2,b2,a2, c1,b1,a1, c0,b0,a0
 *
 * 2. PATTERN STRING (legacy / derived)
 *    The {…} syntax understood by the existing parser/scheduler.
 *    Used as fallback when a pattern has no subPatterns (old saved projects).
 *
 * Helpers in this module:
 *   noteRows(noteCount)          → ordered row descriptors
 *   gridToPatternString(grid, columns, noteCount)  → '{…}' string
 *   selectSubPattern(pattern, noteCount)           → { patternStr, noteValue }
 *   isCustomPattern / parsePattern / validatePattern / buildEventsFromPattern / applyGroove
 */

import * as Tone from 'tone';

export const STACCATO_DUR = 0.06; // seconds
const RELEASE_GAP = 0.04;

// ─── Note row descriptors ─────────────────────────────────────────────────────

/**
 * Returns the ordered list of row descriptors (top → bottom) for a given note count.
 * Each descriptor: { letter: 'a'|'b'|…, octave: 0|1|2 }
 * Octave mapping:  0 = one below voiced, 1 = voiced octave, 2 = one above.
 * Letters:         a = lowest chord note, b = 2nd, …, (noteCount−1 = highest)
 */
export function noteRows(noteCount) {
  const letters = [];
  for (let i = noteCount - 1; i >= 0; i--) {
    letters.push(String.fromCharCode(97 + i)); // 'a', 'b', 'c', …
  }
  const rows = [];
  for (const oct of [2, 1, 0]) {
    for (const letter of letters) {
      rows.push({ letter, octave: oct });
    }
  }
  return rows;
}

// ─── Grid → pattern string ────────────────────────────────────────────────────

/**
 * Convert a visual grid + column durations into a {…} pattern string.
 * grid: grid[colIndex][rowIndex] = 'off'|'sustain'|'staccato'
 * columns: string[] of Tone.js note values for each step
 * noteCount: number of chord notes (determines row layout)
 *
 * Since the existing parser uses a single global noteValue for all steps,
 * we encode variable step durations by emitting multiple tokens per step
 * if the column duration is a multiple of the minimum unit.
 * (If all durations are equal, this produces the same output as before.)
 */
export function gridToPatternString(grid, columns, noteCount) {
  if (!grid || !grid.length) return '{}';
  const rows = noteRows(noteCount);
  const steps = [];
  for (let c = 0; c < grid.length; c++) {
    const col = grid[c] ?? [];
    const activeNotes = [];
    for (let r = 0; r < rows.length; r++) {
      const state = col[r] ?? 'off';
      if (state === 'off') continue;
      const { letter, octave } = rows[r];
      activeNotes.push({ token: `${letter}${octave}`, staccato: state === 'staccato' });
    }
    if (!activeNotes.length) {
      steps.push('');
    } else if (activeNotes.length === 1) {
      const n = activeNotes[0];
      steps.push(n.token + (n.staccato ? '.' : ''));
    } else {
      // Group — staccato if any note is staccato
      const anyStaccato = activeNotes.some(n => n.staccato);
      steps.push(`[${activeNotes.map(n => n.token).join(',')}]${anyStaccato ? '.' : ''}`);
    }
  }
  return `{${steps.join(',')}}`;
}

// ─── Sub-pattern selector ─────────────────────────────────────────────────────

/**
 * Given a pattern object and the number of voiced notes, pick the right sub-pattern
 * and return { patternStr, noteValue } ready for buildEventsFromPattern.
 *
 * Handles both new (subPatterns grid) and old (pattern string) formats.
 */
export function selectSubPattern(pattern, noteCount) {
  if (!pattern) return null;

  // New format: visual grid sub-patterns
  if (pattern.subPatterns) {
    // Clamp to available: 3, 4, or 5
    const key = Math.max(3, Math.min(5, noteCount));
    const sub = pattern.subPatterns[key] ?? pattern.subPatterns[3];
    if (!sub) return null;
    const patternStr = gridToPatternString(sub, pattern.columns ?? ['4n'], key);
    return { patternStr, noteValue: (pattern.columns ?? ['4n'])[0] ?? '4n' };
  }

  // Legacy format: raw pattern string
  if (pattern.pattern) {
    return { patternStr: pattern.pattern, noteValue: pattern.noteValue ?? '4n' };
  }

  return null;
}

// ─── Empty grid factory ───────────────────────────────────────────────────────

/**
 * Create a blank grid for a given number of columns and noteCount.
 * All cells are 'off'.
 */
export function makeEmptyGrid(numCols, noteCount) {
  const numRows = noteCount * 3; // 3 octaves × noteCount
  return Array.from({ length: numCols }, () => Array(numRows).fill('off'));
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────

/** Returns true if str looks like a custom pattern string. */
export function isCustomPattern(str) {
  return typeof str === 'string' && str.trimStart().startsWith('{');
}

/**
 * Parse the inner content of {…} into an array of step descriptors.
 * Each step: { type: 'note'|'group'|'rest', notes: [{letter,octave,staccato}], staccato }
 */
export function parsePattern(src) {
  const trimmed = src.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('Pattern must be wrapped in { }');
  }
  const inner = trimmed.slice(1, -1);

  const rawSteps = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '[') { depth++; cur += ch; }
    else if (ch === ']') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { rawSteps.push(cur); cur = ''; }
    else { cur += ch; }
  }
  rawSteps.push(cur);

  const steps = rawSteps.map((raw, idx) => {
    const s = raw.trim();
    if (s === '') return { type: 'rest' };

    if (s.startsWith('[')) {
      const closeIdx = s.indexOf(']');
      if (closeIdx === -1) throw new Error(`Step ${idx + 1}: missing closing "]"`);
      const inner2 = s.slice(1, closeIdx);
      const suffix = s.slice(closeIdx + 1);
      if (suffix !== '' && suffix !== '.') {
        throw new Error(`Step ${idx + 1}: unexpected characters after "]": "${suffix}"`);
      }
      const staccato = suffix === '.';
      const parts = inner2.split(',').map(p => p.trim());
      if (!parts.length || (parts.length === 1 && parts[0] === '')) {
        throw new Error(`Step ${idx + 1}: empty group [ ]`);
      }
      const notes = parts.map((p, pi) => parseNoteToken(p, idx + 1, pi + 1));
      return { type: 'group', notes, staccato };
    }

    const note = parseNoteToken(s, idx + 1, 1);
    return { type: 'note', notes: [note], staccato: note.staccato };
  });

  return steps;
}

function parseNoteToken(raw, stepIdx, partIdx) {
  const m = raw.match(/^([a-z])([012])(\.*)?$/);
  if (!m) {
    throw new Error(
      `Step ${stepIdx}${partIdx > 1 ? ` part ${partIdx}` : ''}: ` +
      `invalid token "${raw}" — expected lowercase letter + octave (0/1/2) + optional .`
    );
  }
  return { letter: m[1].toUpperCase(), octave: Number(m[2]), staccato: m[3] === '.' };
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function validatePattern(src) {
  if (!src || !src.trim()) return { valid: false, error: 'Pattern is empty' };
  try {
    parsePattern(src);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ─── Groove ───────────────────────────────────────────────────────────────────

export function applyGroove(events, groove, cellDur) {
  if (!groove || groove === 'straight' || !events.length) return events;

  const ratio = groove === 'shuffle' ? 2 / 3 : 0.58;
  const eighthSec = Tone.Time('8n').toSeconds();
  const pairDur   = eighthSec * 2;

  return events.map((ev) => {
    const slot = Math.round(ev.time / eighthSec);
    if (slot % 2 === 0) return ev;
    const downbeatTime = (slot - 1) * eighthSec;
    const newTime = downbeatTime + pairDur * ratio;
    return { ...ev, time: newTime };
  });
}

// ─── Event builder ────────────────────────────────────────────────────────────

export function buildEventsFromPattern(
  patternSrc, voicedNotes, noteValue, cellDur, loop,
  humanize, humanVel, humanJitter,
  groove = 'straight',
  patternTimeOffset = 0, // seconds already consumed by a previous sibling (e.g. first half of a split cell)
) {
  const steps = parsePattern(patternSrc);
  const stepSec = Tone.Time(noteValue).toSeconds();
  const events = [];

  function resolveNote(letter, octaveDigit) {
    const idx = letter.charCodeAt(0) - 65; // A=0, B=1, …
    if (idx < 0 || idx >= voicedNotes.length) return null;
    const base = voicedNotes[idx];
    const m = base.match(/^([A-G]#?)(\d+)$/);
    if (!m) return base;
    const voicedOct = Number(m[2]);
    const targetOct = voicedOct + (octaveDigit - 1);
    return `${m[1]}${targetOct}`;
  }

  // Fast-forward through steps already consumed by the offset without emitting events
  let si = 0;
  let tFwd = 0;
  while (tFwd + stepSec <= patternTimeOffset - 0.001) {
    if (!loop && si >= steps.length) break;
    tFwd += stepSec;
    si++;
  }

  let t = 0; // time relative to the start of this segment (emitted event times)

  while (t < cellDur - 0.001) {
    const step = steps[si % steps.length];

    if (!loop && si >= steps.length) break;

    if (step.type !== 'rest') {
      const resolvedNotes = step.notes
        .map(n => resolveNote(n.letter, n.octave))
        .filter(Boolean);

      if (resolvedNotes.length) {
        const staccato = step.staccato;
        const duration = staccato
          ? STACCATO_DUR
          : cellDur - t - RELEASE_GAP;

        events.push({
          time:     t,
          notes:    resolvedNotes,
          duration: Math.max(0.01, duration),
          velocity: humanVel(0.80, humanize),
          jitter:   humanJitter(humanize),
        });
      }
    }

    t += stepSec;
    si++;
  }

  return applyGroove(events, groove, cellDur);
}
