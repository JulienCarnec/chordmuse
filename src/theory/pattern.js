/**
 * Custom pattern notation parser.
 *
 * Syntax:  {step,step,,step,...}
 *
 * step      = noteToken | groupToken | <empty> (rest)
 * noteToken = letter digit [.]     e.g. a1  b0.  c2
 * groupToken= [ noteToken , noteToken , ... ] [.]   e.g. [a1,b1,c1].
 *
 * letter  a–z: index into voiced chord notes (a=notes[0], b=notes[1], …)
 * digit   octave: 0=oct3, 1=oct4, 2=oct5  (mapped as BASE_OCTAVE-1, BASE_OCTAVE, BASE_OCTAVE+1)
 * .       staccato — very short fixed duration (~60 ms)
 * empty   rest — silence for one step
 *
 * The pattern string MUST be wrapped in { }.
 */

import * as Tone from 'tone';

export const STACCATO_DUR = 0.06; // seconds
const RELEASE_GAP = 0.04;

/** Returns true if str looks like a custom pattern string. */
export function isCustomPattern(str) {
  return typeof str === 'string' && str.trimStart().startsWith('{');
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────

/**
 * Parse the inner content of {…} into an array of step descriptors.
 * Each step: { type: 'note'|'group'|'rest', notes: [{letter,octave,staccato}], staccato }
 * Throws a descriptive Error on syntax problems.
 */
export function parsePattern(src) {
  const trimmed = src.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('Pattern must be wrapped in { }');
  }
  const inner = trimmed.slice(1, -1); // strip braces

  // Split on commas — but NOT commas inside [...] groups.
  // We scan manually so that [a1,b1,c1] is treated as a single token.
  const rawSteps = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '[') { depth++; cur += ch; }
    else if (ch === ']') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { rawSteps.push(cur); cur = ''; }
    else { cur += ch; }
  }
  rawSteps.push(cur); // last segment

  const steps = rawSteps.map((raw, idx) => {
    const s = raw.trim();
    if (s === '') return { type: 'rest' };

    // Group: [a1,b1,c1] or [a1,b1,c1].
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

    // Single note token: a1 / b0. / c2.
    const note = parseNoteToken(s, idx + 1, 1);
    return { type: 'note', notes: [note], staccato: note.staccato };
  });

  return steps;
}

function parseNoteToken(raw, stepIdx, partIdx) {
  // Must be: lowercase-letter DIGIT [.]
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

/**
 * Validate a pattern string.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validatePattern(src) {
  if (!src || !src.trim()) return { valid: false, error: 'Pattern is empty' };
  try {
    parsePattern(src);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

// ─── Event builder ────────────────────────────────────────────────────────────

/**
 * Build Tone.js event list from a custom pattern string.
 *
 * @param {string}   patternSrc  - the full {…} string
 * @param {string[]} voicedNotes - voiced note strings from getChordNotesVoiced, e.g. ["C4","E4","G4"]
 * @param {string}   noteValue   - Tone.js step duration, e.g. "8n"
 * @param {number}   cellDur     - total cell duration in seconds
 * @param {boolean}  loop        - if true, cycle the pattern to fill cellDur; if false, play once
 * @param {number}   humanize    - 0–1 humanization amount (passed through from engine)
 * @param {Function} humanVel    - velocity humanizer from engine
 * @param {Function} humanJitter - jitter humanizer from engine
 *
 * Returns array of { time, notes, duration, velocity, jitter }
 */
/**
 * Apply shuffle/swing groove to a list of events.
 *
 * Groove warps pairs of eighth-note steps so that the second note of each
 * pair ("the and") is delayed, creating a long-short feel:
 *
 *   straight : equal subdivision — no warp (ratio 0.5)
 *   shuffle  : triplet feel — 2:1 ratio (ratio 2/3 ≈ 0.667)
 *   swing    : lighter swing — ~3:2 ratio (ratio 0.58)
 *
 * Only offsets that land on an odd step of the "eighth-note pair" grid are
 * shifted. The step size used for pairing is always an eighth note (8n)
 * regardless of the pattern's noteValue — this correctly handles 16th-note
 * patterns too (every other 16th falls on an 8th).
 *
 * @param {Array}  events   - raw event list from buildEventsFromPattern
 * @param {string} groove   - 'straight' | 'shuffle' | 'swing'
 * @param {number} cellDur  - total cell duration in seconds (for duration recalc)
 */
export function applyGroove(events, groove, cellDur) {
  if (!groove || groove === 'straight' || !events.length) return events;

  // Ratio of first note in a pair to one full pair duration.
  // shuffle: 2/3 (triplet), swing: ~0.58 (jazz/blues feel).
  const ratio = groove === 'shuffle' ? 2 / 3 : 0.58;

  const eighthSec = Tone.Time('8n').toSeconds();
  const pairDur   = eighthSec * 2; // one beat = two eighth-note slots

  return events.map((ev) => {
    // Which eighth-note slot does this event fall in?
    const slot = Math.round(ev.time / eighthSec);
    if (slot % 2 === 0) return ev; // downbeat — no change

    // Upbeat ("and"): delay it from the midpoint to ratio × pairDur after the
    // nearest downbeat.
    const downbeatTime = (slot - 1) * eighthSec;
    const newTime = downbeatTime + pairDur * ratio;

    // Shorten the duration of the preceding downbeat event so notes don't bleed.
    // (We only adjust newTime here; duration is a best-effort sustain anyway.)
    return { ...ev, time: newTime };
  });
}

export function buildEventsFromPattern(
  patternSrc, voicedNotes, noteValue, cellDur, loop,
  humanize, humanVel, humanJitter,
  groove = 'straight',
) {
  const steps = parsePattern(patternSrc); // already validated upstream
  const stepSec = Tone.Time(noteValue).toSeconds();
  const events = [];

  // Map letter index to voiced note at the requested octave.
  // The voiced note already encodes the correct octave after inversion is applied.
  // octave digit: 0=one octave below voiced, 1=same octave as voiced, 2=one octave above
  // → shift = digit - 1 relative to the voiced note's own octave.
  function resolveNote(letter, octaveDigit) {
    const idx = letter.charCodeAt(0) - 65; // A=0, B=1, …
    if (idx < 0 || idx >= voicedNotes.length) return null;
    const base = voicedNotes[idx]; // e.g. "E4" for C maj 1st inversion
    const m = base.match(/^([A-G]#?)(\d+)$/);
    if (!m) return base;
    const voicedOct = Number(m[2]);
    const targetOct = voicedOct + (octaveDigit - 1); // digit 0 → -1 oct, 1 → same, 2 → +1
    return `${m[1]}${targetOct}`;
  }

  let t = 0;
  let si = 0; // step index into pattern

  while (t < cellDur - 0.001) {
    const step = steps[si % steps.length];

    // Stop if loop=false and we've exhausted the pattern
    if (!loop && si >= steps.length) break;

    if (step.type !== 'rest') {
      const resolvedNotes = step.notes
        .map(n => resolveNote(n.letter, n.octave))
        .filter(Boolean);

      if (resolvedNotes.length) {
        const staccato = step.staccato;
        // Non-staccato notes always sustain to the end of the bar.
        // Staccato (.) uses a fixed short duration.
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
