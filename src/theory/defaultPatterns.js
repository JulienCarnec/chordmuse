/**
 * Default built-in pattern definitions.
 * Uses the new visual grid format: { id, name, loop, columns, subPatterns: { 3, 4, 5 } }
 *
 * Grid format: grid[colIndex][rowIndex] = 'off' | 'sustain' | 'staccato'
 * Row layout for noteCount N (top → bottom):
 *   octave 2: letters N-1 down to 0  (e.g. for N=3: c2, b2, a2)
 *   octave 1: letters N-1 down to 0  (e.g. for N=3: c1, b1, a1)
 *   octave 0: letters N-1 down to 0  (e.g. for N=3: c0, b0, a0)
 *
 * rowIndex(letter, octave, noteCount):
 *   letterIdx = letter.charCodeAt(0) - 97  (a=0, b=1, c=2, d=3, e=4)
 *   rowIdx = (2 - octave) * noteCount + (noteCount - 1 - letterIdx)
 */

// ─── Builder helpers ──────────────────────────────────────────────────────────

function rowIdx(letter, octave, noteCount) {
  const letterIdx = letter.charCodeAt(0) - 97;
  return (2 - octave) * noteCount + (noteCount - 1 - letterIdx);
}

/**
 * Build a grid with given number of columns and noteCount.
 * active: array of { col, tokens: [{ letter, octave, staccato? }] }
 */
function buildGrid(numCols, noteCount, active) {
  const numRows = noteCount * 3;
  const grid = Array.from({ length: numCols }, () => Array(numRows).fill('off'));
  for (const { col, tokens } of active) {
    if (col < 0 || col >= numCols) continue;
    for (const { letter, octave, staccato } of tokens) {
      const r = rowIdx(letter, octave, noteCount);
      if (r >= 0 && r < numRows) {
        grid[col][r] = staccato ? 'staccato' : 'sustain';
      }
    }
  }
  return grid;
}

/** Shorthand: build active entry for a column with all chord notes at given octave. */
function allNotes(col, octave, noteCount, staccato = false) {
  const tokens = [];
  for (let i = 0; i < noteCount; i++) {
    tokens.push({ letter: String.fromCharCode(97 + i), octave, staccato });
  }
  return { col, tokens };
}

/** Single note token helper */
function note(col, letter, octave, staccato = false) {
  return { col, tokens: [{ letter, octave, staccato }] };
}

/**
 * Fill trailing empty columns of a grid by repeating (cycling) the active
 * columns from the beginning.
 * @param {Array} grid     – the grid to mutate in-place (grid[colIdx][rowIdx])
 * @param {number} activeCols – how many leading columns carry real notes
 */
function wrapFill(grid, activeCols) {
  const totalCols = grid.length;
  for (let ci = activeCols; ci < totalCols; ci++) {
    const srcCol = ci % activeCols;
    grid[ci] = [...grid[srcCol]];
  }
  return grid;
}

// ─── Pattern definitions ──────────────────────────────────────────────────────

/**
 * Block chord — all notes sustain together, 1 column
 */
function makeBlockChord() {
  function makeGrid(noteCount) {
    return buildGrid(1, noteCount, [allNotes(0, 1, noteCount)]);
  }
  return {
    id: 'builtin-block',
    name: 'Block chord',
    loop: true,
    columns: ['4n'],
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Reggae up-beat — bass on beat 1, muted chord on beat 2, rest on beat 3, muted chord on beat 4
 * Pattern: bass(0), chord.(1), rest(2), chord.(3)  — 4 cols of 4n
 */
function makeReggaeUpBeat() {
  function makeGrid(noteCount) {
    return buildGrid(4, noteCount, [
      note(0, 'a', 0),                           // bass note (lowest, oct below)
      allNotes(1, 1, noteCount, true),           // chord staccato
      // col 2 = rest
      allNotes(3, 1, noteCount, true),           // chord staccato
    ]);
  }
  return {
    id: 'builtin-reggae',
    name: 'Reggae up-beat',
    loop: false,
    columns: ['4n', '4n', '4n', '4n'],
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Prelude arpeggio (Bach style) — bass open fifth, then rolling through chord notes
 * 8 steps of 8n. All sub-patterns: a0, c0, then 3-note rolling figure × 2
 */
function makePreludeArpegio() {
  // Bach BWV 846 exact figure: root↓ · 5th↓ · root · 3rd · 5th · root · 3rd · 5th
  // For C major (C4,E4,G4): C3·G3·C4·E4·G4·C4·E4·G4
  // a=root(0), b=3rd(1), c=5th(2) — so 5th below = c0 ✓
  // 3-note: a0, c0, a1, b1, c1, a1, b1, c1
  // 4-note: a0, c0, a1, c1, d1, a1, c1, d1  (uses 5th=c for bass, 7th=d for high)
  // 5-note: a0, c0, a1, c1, e1, a1, c1, e1
  function makeGrid3() {
    return buildGrid(8, 3, [
      note(0, 'a', 0),
      note(1, 'c', 0), // 5th one octave below (c = 3rd chord tone = 5th of chord)
      note(2, 'a', 1),
      note(3, 'b', 1),
      note(4, 'c', 1),
      note(5, 'a', 1),
      note(6, 'b', 1),
      note(7, 'c', 1),
    ]);
  }
  function makeGrid4() {
    return buildGrid(8, 4, [
      note(0, 'a', 0),
      note(1, 'c', 0), // 5th below
      note(2, 'a', 1),
      note(3, 'c', 1),
      note(4, 'd', 1),
      note(5, 'a', 1),
      note(6, 'c', 1),
      note(7, 'd', 1),
    ]);
  }
  function makeGrid5() {
    return buildGrid(8, 5, [
      note(0, 'a', 0),
      note(1, 'c', 0), // 5th below
      note(2, 'a', 1),
      note(3, 'c', 1),
      note(4, 'e', 1),
      note(5, 'a', 1),
      note(6, 'c', 1),
      note(7, 'e', 1),
    ]);
  }
  return {
    id: 'builtin-prelude-arp',
    name: 'Prelude arpeggio',
    loop: true,
    columns: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
    subPatterns: { 3: makeGrid3(), 4: makeGrid4(), 5: makeGrid5() },
  };
}

/**
 * Buckley arpeggio — bass+root, up, skip, return
 * Pattern: [a0,c0], a1, b1, [c1,d1], b1, c1
 */
function makeBuckleyArpegio() {
  function makeGrid3() {
    return buildGrid(6, 3, [
      { col: 0, tokens: [{ letter: 'a', octave: 0 }, { letter: 'c', octave: 0 }] },
      note(1, 'a', 1),
      note(2, 'b', 1),
      note(3, 'c', 1),
      note(4, 'b', 1),
      note(5, 'c', 1),
    ]);
  }
  function makeGrid4() {
    return buildGrid(6, 4, [
      { col: 0, tokens: [{ letter: 'a', octave: 0 }, { letter: 'd', octave: 0 }] },
      note(1, 'a', 1),
      note(2, 'b', 1),
      note(3, 'c', 1),
      note(4, 'd', 1),
      note(5, 'b', 1),
    ]);
  }
  function makeGrid5() {
    return buildGrid(6, 5, [
      { col: 0, tokens: [{ letter: 'a', octave: 0 }, { letter: 'e', octave: 0 }] },
      note(1, 'a', 1),
      note(2, 'b', 1),
      note(3, 'c', 1),
      note(4, 'd', 1),
      note(5, 'e', 1),
    ]);
  }
  return {
    id: 'builtin-buckley',
    name: 'Buckley arpeggio',
    loop: true,
    columns: ['8n', '8n', '8n', '8n', '8n', '8n'],
    subPatterns: { 3: makeGrid3(), 4: makeGrid4(), 5: makeGrid5() },
  };
}

/**
 * Arpeggio up 1 octave — ascending through all notes in octave 1.
 * 5 columns total; smaller sub-patterns wrap-fill from column 0.
 */
function makeArpUp1Oct() {
  const TOTAL_COLS = 5;
  function makeGrid(noteCount) {
    const active = [];
    for (let i = 0; i < noteCount; i++) {
      active.push(note(i, String.fromCharCode(97 + i), 1));
    }
    // Build with full 5 columns so the grid fits the shared columns array,
    // then wrap-fill trailing empty columns from the beginning.
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), noteCount);
  }
  return {
    id: 'builtin-arp-up-1oct',
    name: 'Arpeggio up 1 oct',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio down 1 octave — descending through all notes in octave 1.
 * 5 columns total; smaller sub-patterns wrap-fill from column 0.
 */
function makeArpDown1Oct() {
  const TOTAL_COLS = 5;
  function makeGrid(noteCount) {
    const active = [];
    for (let i = noteCount - 1; i >= 0; i--) {
      active.push(note(noteCount - 1 - i, String.fromCharCode(97 + i), 1));
    }
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), noteCount);
  }
  return {
    id: 'builtin-arp-down-1oct',
    name: 'Arpeggio down 1 oct',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio up 2 octaves — ascending oct 1 then oct 2.
 * 10 columns total; smaller sub-patterns wrap-fill trailing columns.
 */
function makeArpUp2Oct() {
  const TOTAL_COLS = 10;
  function makeGrid(noteCount) {
    const active = [];
    for (let i = 0; i < noteCount; i++) {
      active.push(note(i, String.fromCharCode(97 + i), 1));
    }
    for (let i = 0; i < noteCount; i++) {
      active.push(note(noteCount + i, String.fromCharCode(97 + i), 2));
    }
    const activeCols = noteCount * 2;
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), activeCols);
  }
  return {
    id: 'builtin-arp-up-2oct',
    name: 'Arpeggio up 2 oct',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio down 2 octaves — descending oct 2 then oct 1.
 * 10 columns total; smaller sub-patterns wrap-fill trailing columns.
 */
function makeArpDown2Oct() {
  const TOTAL_COLS = 10;
  function makeGrid(noteCount) {
    const active = [];
    for (let i = noteCount - 1; i >= 0; i--) {
      active.push(note(noteCount - 1 - i, String.fromCharCode(97 + i), 2));
    }
    for (let i = noteCount - 1; i >= 0; i--) {
      active.push(note(noteCount + (noteCount - 1 - i), String.fromCharCode(97 + i), 1));
    }
    const activeCols = noteCount * 2;
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), activeCols);
  }
  return {
    id: 'builtin-arp-down-2oct',
    name: 'Arpeggio down 2 oct',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio up/down — ascend oct 1 then descend back (pendulum).
 * 10 columns total; smaller sub-patterns wrap-fill trailing columns.
 */
function makeArpUpDown() {
  const TOTAL_COLS = 10;
  function makeGrid(noteCount) {
    const active = [];
    // Up: a1, b1, c1, ...
    for (let i = 0; i < noteCount; i++) {
      active.push(note(i, String.fromCharCode(97 + i), 1));
    }
    // Down: skip top and bottom endpoints to avoid repetition
    for (let i = noteCount - 2; i >= 1; i--) {
      active.push(note(noteCount + (noteCount - 2 - i), String.fromCharCode(97 + i), 1));
    }
    const activeCols = noteCount + Math.max(0, noteCount - 2);
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), activeCols);
  }
  return {
    id: 'builtin-arp-updown',
    name: 'Arpeggio up/down',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio down/up — descend then ascend back.
 * 10 columns total; smaller sub-patterns wrap-fill trailing columns.
 */
function makeArpDownUp() {
  const TOTAL_COLS = 10;
  function makeGrid(noteCount) {
    const active = [];
    // Down: c1, b1, a1, ...
    for (let i = noteCount - 1; i >= 0; i--) {
      active.push(note(noteCount - 1 - i, String.fromCharCode(97 + i), 1));
    }
    // Up: skip bottom, come back (b1, c1, ...)
    for (let i = 1; i <= noteCount - 2; i++) {
      active.push(note(noteCount + i - 1, String.fromCharCode(97 + i), 1));
    }
    const activeCols = noteCount + Math.max(0, noteCount - 2);
    return wrapFill(buildGrid(TOTAL_COLS, noteCount, active), activeCols);
  }
  return {
    id: 'builtin-arp-downup',
    name: 'Arpeggio down/up',
    loop: true,
    columns: Array(TOTAL_COLS).fill('8n'),
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Arpeggio 3 notes — open-voiced ascending arpeggio that works for any chord size.
 *
 * Always plays exactly 3 steps (8n each), picking 3 spread voices:
 *   3-note chord  →  a1, b1, c1   (root, 3rd, 5th — all notes)
 *   4-note chord  →  a1, c1, d1   (root, 5th, 7th — skip 3rd)
 *   5-note chord  →  a1, c1, e1   (root, 5th, 9th — skip 3rd & 7th)
 */
function makeArp3Notes() {
  // 3-note: a1→b1→c1
  const grid3 = buildGrid(3, 3, [
    note(0, 'a', 1),
    note(1, 'b', 1),
    note(2, 'c', 1),
  ]);

  // 4-note: a1→c1→d1  (skip b)
  const grid4 = buildGrid(3, 4, [
    note(0, 'a', 1),
    note(1, 'c', 1),
    note(2, 'd', 1),
  ]);

  // 5-note: a1→c1→e1  (skip b and d)
  const grid5 = buildGrid(3, 5, [
    note(0, 'a', 1),
    note(1, 'c', 1),
    note(2, 'e', 1),
  ]);

  return {
    id: 'builtin-arp-3notes',
    name: 'Arpeggio 3 notes',
    loop: true,
    columns: ['8n', '8n', '8n'],
    subPatterns: { 3: grid3, 4: grid4, 5: grid5 },
  };
}

/**
 * Let It Be arpeggio — McCartney's characteristic bass + ascending fill + descending tail.
 * 16 steps of 16n = exactly one 4/4 bar at any tempo.
 *
 * Shape (3-note chord): bass · _ · 5th↓ · root · 3rd · 5th · 3rd · root · 5th↓ · bass · _ · 5th↓ · root · 3rd · 5th · 3rd
 * For C major (C4,E4,G4): C3 · _ · G3 · C4 · E4 · G4 · E4 · C4 · G3 · C3 · _ · G3 · C4 · E4 · G4 · E4
 *
 * The rest on step 2 (beat 1.25) gives the characteristic "breathe" feel.
 * Bass on steps 1 & 10 anchors beats 1 & 3 like McCartney's left hand.
 * The ascending fill c0→a1→b1→c1 and descending return b1→a1 mirror his ornament exactly.
 *
 * With loop=true, split half-cells play steps 0–7: bass·_·5th↓·root·3rd·5th·3rd·root
 * — a complete mini-phrase that works perfectly on its own.
 */
function makeLetItBeArp() {
  // 3-note chord: a=root, b=3rd, c=5th
  // Steps: a0·_·c0·a1·b1·c1·b1·a1 · c0·a0·_·c0·a1·b1·c1·b1
  const grid3 = buildGrid(16, 3, [
    note(0,  'a', 0),           // beat 1:   bass root
    // step 1 = rest
    note(2,  'c', 0),           // beat 1.5: 5th below (open voicing)
    note(3,  'a', 1),           // beat 1.75: root
    note(4,  'b', 1),           // beat 2:   3rd
    note(5,  'c', 1),           // beat 2.25: 5th (top of fill)
    note(6,  'b', 1),           // beat 2.5: 3rd (start descent)
    note(7,  'a', 1),           // beat 2.75: root
    note(8,  'c', 0),           // beat 3:   5th below (links back)
    note(9,  'a', 0),           // beat 3.25: bass root
    // step 10 = rest
    note(11, 'c', 0),           // beat 3.75: 5th below
    note(12, 'a', 1),           // beat 4:   root
    note(13, 'b', 1),           // beat 4.25: 3rd
    note(14, 'c', 1),           // beat 4.5: 5th
    note(15, 'b', 1),           // beat 4.75: 3rd (leads back into next bar)
  ]);

  // 4-note chord: a=root, b=3rd, c=5th, d=7th
  // Extra colour: 7th replaces the top 5th in the fill peak
  const grid4 = buildGrid(16, 4, [
    note(0,  'a', 0),
    note(2,  'c', 0),
    note(3,  'a', 1),
    note(4,  'b', 1),
    note(5,  'd', 1),           // 7th at fill peak (richer colour)
    note(6,  'c', 1),
    note(7,  'b', 1),
    note(8,  'c', 0),
    note(9,  'a', 0),
    note(11, 'c', 0),
    note(12, 'a', 1),
    note(13, 'b', 1),
    note(14, 'd', 1),
    note(15, 'c', 1),
  ]);

  // 5-note chord: a=root, b=3rd, c=5th, d=7th, e=9th
  // 9th replaces 7th at peak for extended harmony
  const grid5 = buildGrid(16, 5, [
    note(0,  'a', 0),
    note(2,  'c', 0),
    note(3,  'a', 1),
    note(4,  'b', 1),
    note(5,  'e', 1),           // 9th at fill peak
    note(6,  'c', 1),
    note(7,  'b', 1),
    note(8,  'c', 0),
    note(9,  'a', 0),
    note(11, 'c', 0),
    note(12, 'a', 1),
    note(13, 'b', 1),
    note(14, 'e', 1),
    note(15, 'c', 1),
  ]);

  return {
    id: 'builtin-let-it-be-arp',
    name: 'Let It Be arpeggio',
    loop: true,
    columns: Array(16).fill('16n'),
    subPatterns: { 3: grid3, 4: grid4, 5: grid5 },
  };
}

/**
 * Waltz oom-pah-pah — bass on beat 1, staccato chord on beats 2 & 3.
 * 3 steps of 4n — fits exactly one 3/4 bar.
 * Classic accompaniment for waltzes, Hallelujah (Cohen version), etc.
 */
function makeWaltzOomPah() {
  function makeGrid(noteCount) {
    return buildGrid(3, noteCount, [
      note(0, 'a', 0),                        // beat 1: bass root
      allNotes(1, 1, noteCount, true),         // beat 2: chord staccato
      allNotes(2, 1, noteCount, true),         // beat 3: chord staccato
    ]);
  }
  return {
    id: 'builtin-waltz-oom-pah',
    name: 'Waltz oom-pah-pah',
    loop: false,
    columns: ['4n', '4n', '4n'],
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Hallelujah arpeggio — Jeff Buckley fingerpicking style, 3/4 waltz.
 * 6 steps of 8n = exactly one 3/4 bar at any tempo.
 * Figure: bass · 5th↓ · root · 5th · 3rd · 5th  (oscillating around the 5th)
 * For C major (C4,E4,G4): C3·G3·C4·G4·E4·G4
 * Simulates the iconic fingerpicked guitar arpeggio.
 * Works for both full cells and half-bar split cells (loop=true, takes 3 steps).
 */
function makeHallelujahArp() {
  // 3-note: a0, c0, a1, c1, b1, c1  → root↓·5th↓·root·5th·3rd·5th
  const grid3 = buildGrid(6, 3, [
    note(0, 'a', 0),
    note(1, 'c', 0),
    note(2, 'a', 1),
    note(3, 'c', 1),
    note(4, 'b', 1),
    note(5, 'c', 1),
  ]);
  // 4-note: a0, c0, a1, c1, d1, b1  → root↓·5th↓·root·5th·7th·3rd
  const grid4 = buildGrid(6, 4, [
    note(0, 'a', 0),
    note(1, 'c', 0),
    note(2, 'a', 1),
    note(3, 'c', 1),
    note(4, 'd', 1),
    note(5, 'b', 1),
  ]);
  // 5-note: a0, c0, a1, c1, e1, b1  → root↓·5th↓·root·5th·9th·3rd
  const grid5 = buildGrid(6, 5, [
    note(0, 'a', 0),
    note(1, 'c', 0),
    note(2, 'a', 1),
    note(3, 'c', 1),
    note(4, 'e', 1),
    note(5, 'b', 1),
  ]);
  return {
    id: 'builtin-hallelujah-arp',
    name: 'Hallelujah arpeggio',
    loop: true,
    columns: ['8n', '8n', '8n', '8n', '8n', '8n'],
    subPatterns: { 3: grid3, 4: grid4, 5: grid5 },
  };
}

/**
 * Blues walking bass comp — walking bass in low octave + chord stabs on beats 2 & 4.
 * 8 steps of 8n = one 4/4 bar.
 *
 * Shape: root↓ · 3rd↓ · [5th↓+chord]. · 7th↓ · root↓ · 3rd↓ · [5th↓+chord]. · 7th↓
 * For A7 (A4,C#4,E4,G4): A3·C#3·[E3+A4+C#4+E4+G4].·G3·A3·C#3·[E3+A4+C#4+E4+G4].·G3
 *
 * The walking bass moves root→3rd→5th→7th on every pair of 8th notes,
 * landing the chord stab + bass 5th together on beats 2 and 4 (shuffle feel).
 * Works perfectly with groove=shuffle.
 */
function makeBluesComp() {
  // 3-note chord: a=root, b=3rd, c=5th — no 7th, use b as walk-back note
  // Walk: a0·b0·[c0+chord].·b0·a0·b0·[c0+chord].·b0
  function makeGrid3() {
    return buildGrid(8, 3, [
      note(0, 'a', 0),
      note(1, 'b', 0),
      { col: 2, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }] },
      note(3, 'b', 0),
      note(4, 'a', 0),
      note(5, 'b', 0),
      { col: 6, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }] },
      note(7, 'b', 0),
    ]);
  }
  // 4-note chord: a=root, b=3rd, c=5th, d=7th
  // Walk: a0·b0·[c0+chord].·d0·a0·b0·[c0+chord].·d0
  function makeGrid4() {
    return buildGrid(8, 4, [
      note(0, 'a', 0),
      note(1, 'b', 0),
      { col: 2, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }, { letter: 'd', octave: 1, staccato: true }] },
      note(3, 'd', 0),
      note(4, 'a', 0),
      note(5, 'b', 0),
      { col: 6, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }, { letter: 'd', octave: 1, staccato: true }] },
      note(7, 'd', 0),
    ]);
  }
  // 5-note chord: a=root, b=3rd, c=5th, d=7th, e=9th
  // Walk: same as 4-note but chord includes 9th
  function makeGrid5() {
    return buildGrid(8, 5, [
      note(0, 'a', 0),
      note(1, 'b', 0),
      { col: 2, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }, { letter: 'd', octave: 1, staccato: true }, { letter: 'e', octave: 1, staccato: true }] },
      note(3, 'd', 0),
      note(4, 'a', 0),
      note(5, 'b', 0),
      { col: 6, tokens: [{ letter: 'c', octave: 0, staccato: true }, { letter: 'a', octave: 1, staccato: true }, { letter: 'b', octave: 1, staccato: true }, { letter: 'c', octave: 1, staccato: true }, { letter: 'd', octave: 1, staccato: true }, { letter: 'e', octave: 1, staccato: true }] },
      note(7, 'd', 0),
    ]);
  }
  return {
    id: 'builtin-blues-comp',
    name: 'Blues walking comp',
    loop: false,
    columns: Array(8).fill('8n'),
    subPatterns: { 3: makeGrid3(), 4: makeGrid4(), 5: makeGrid5() },
  };
}

/**
 * Rock comp — chord on beats 1 & 3, rest on 2 & 4.
 * Drives the rhythm without overcrowding; typical for rock/pop piano/guitar.
 * 4 steps of 4n.
 */
function makeRockComp() {
  function makeGrid(noteCount) {
    return buildGrid(4, noteCount, [
      allNotes(0, 1, noteCount),               // beat 1: chord sustain
      // beat 2: rest
      allNotes(2, 1, noteCount),               // beat 3: chord sustain
      // beat 4: rest
    ]);
  }
  return {
    id: 'builtin-rock-comp',
    name: 'Rock comp',
    loop: false,
    columns: ['4n', '4n', '4n', '4n'],
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

/**
 * Jazz arp-comp — ascending single-note arpeggio from voiced octave into a chord stroke one oct up.
 * 8 steps of 8n = one 4/4 bar.
 *
 * Shape: a1 · b1 · c1 · a2 · b2 · c2 · [all2]. · rest
 * Example for D#maj7 (D#4,F#4,A#4,D5):
 *   D#4 · F#4 · A#4 · D#5 · F#5 · A#5 · [D#5+F#5+A#5+D6]. · rest
 *
 * The arpeggio climbs from the voiced octave up to the octave above,
 * then lands on a staccato full-chord stroke, with beat 4 left open.
 */
function makeJazzArpComp() {
  // Fixed 8-step layout (8 × 8n = one 4/4 bar):
  //   3-note: a1 b1 c1  a2 b2 c2  [a2+b2+c2].  rest
  //   4-note: a1 b1 c1  d1 a2 c2  [a2+b2+c2+d2].  rest
  //   5-note: a1 b1 c1  e1 a2 c2  [a2+b2+c2+d2+e2].  rest
  const grid3 = buildGrid(8, 3, [
    note(0, 'a', 1), note(1, 'b', 1), note(2, 'c', 1),  // voiced arp
    note(3, 'a', 2), note(4, 'b', 2), note(5, 'c', 2),  // oct↑ arp
    allNotes(6, 2, 3, false),                              // chord stroke oct↑
    // step 7: rest
  ]);
  const grid4 = buildGrid(8, 4, [
    note(0, 'a', 1), note(1, 'b', 1), note(2, 'c', 1),  // voiced arp (root·3rd·5th)
    note(3, 'd', 1),                                      // 7th voiced
    note(4, 'a', 2), note(5, 'c', 2),                    // root·5th oct↑
    allNotes(6, 2, 4, false),                              // chord stroke oct↑
    // step 7: rest
  ]);
  const grid5 = buildGrid(8, 5, [
    note(0, 'a', 1), note(1, 'b', 1), note(2, 'c', 1),  // voiced arp (root·3rd·5th)
    note(3, 'e', 1),                                      // 9th voiced
    note(4, 'a', 2), note(5, 'c', 2),                    // root·5th oct↑
    allNotes(6, 2, 5, false),                              // chord stroke oct↑
    // step 7: rest
  ]);
  return {
    id: 'builtin-jazz-arp-comp',
    name: 'Jazz arp-comp',
    loop: false,
    columns: Array(8).fill('8n'),
    subPatterns: { 3: grid3, 4: grid4, 5: grid5 },
  };
}

/**
 * Jazz comp — Freddie Green / stride-lite style.
 * 4 steps of 4n: root(oct↓) · chord. · rest · chord.
 * Bass on beat 1, chord stabs on 2 & 4 (leaving beat 3 open for swing feel).
 */
function makeJazzComp() {
  function makeGrid(noteCount) {
    return buildGrid(4, noteCount, [
      note(0, 'a', 0),                        // beat 1: bass root
      allNotes(1, 1, noteCount, true),         // beat 2: chord staccato
      // beat 3: rest
      allNotes(3, 1, noteCount, true),         // beat 4: chord staccato
    ]);
  }
  return {
    id: 'builtin-jazz-comp',
    name: 'Jazz comp',
    loop: false,
    columns: ['4n', '4n', '4n', '4n'],
    subPatterns: { 3: makeGrid(3), 4: makeGrid(4), 5: makeGrid(5) },
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const DEFAULT_PATTERNS = [
  makeBlockChord(),
  makeReggaeUpBeat(),
  makePreludeArpegio(),
  makeBuckleyArpegio(),
  makeArpUp1Oct(),
  makeArpDown1Oct(),
  makeArpUp2Oct(),
  makeArpDown2Oct(),
  makeArpUpDown(),
  makeArpDownUp(),
  makeArp3Notes(),
  makeLetItBeArp(),
  makeWaltzOomPah(),
  makeHallelujahArp(),
  makeBluesComp(),
  makeRockComp(),
  makeJazzComp(),
  makeJazzArpComp(),
];
