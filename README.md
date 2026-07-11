<img src="public/favicon.svg" alt="Chordmuse" width="64" height="64">

# Chordmuse

A personal React web app for composing, visualising, and playing back chord progressions. Build chord grids with scale-aware harmony highlighting, arrange them into a full track, and export to MIDI or PDF.

---

## Features

### Chord Progression Editor
- Create named chord grids (e.g. *Intro*, *Verse*, *Chorus*) with a configurable number of cells
- Each cell holds a chord; cells can be **split into two sub-cells** for half-bar changes
- **Scale selector** — major modes (Ionian → Locrian) and minor scales (natural, harmonic, melodic)
- **Harmony colour coding** applied to every cell and the chord dropdown:

  | Colour | Meaning |
  |--------|---------|
  | 🟢 Green  | Fits in the active scale |
  | 🟡 Yellow | Dominant of degree I (V) |
  | 🟠 Orange | Secondary dominant (dom. of II) |
  | 🔵 Blue   | Subdominant of degree I (IV) |
  | 🟣 Purple | Subdominant of degree II |

- **Transposition** — shift the entire grid and scale by any number of semitones
- **Drag-and-drop** cells to reorder within the grid (Ctrl-drag to copy)

### Track Arranger
- Sequence progressions in any order with a configurable **repeat count** per section
- Live **playback cursor** that highlights the active chord in the mini-grid during playback
- Inline track name and description fields

### Playback Engine
- **BPM** control and **time signatures**: 4/4, 3/4, 6/8, 2/4, 5/4, 7/8, 12/8
- **Groove modes**: straight, shuffle (triplet feel), swing
- **Playing styles** — block chord, on-beat / off-beat strum, folk strum, arpeggio up/down, bass+chord, reggae, and more; fully custom patterns via a pattern editor
- **23 instruments** — piano, e-piano, harpsichord, organ, synths, pad, strings, choir, guitars, bass, brass, woodwinds, percussion
- **Knobs** for humanize, velocity, and reverb
- **Drum sequencer** — 16-step, 4-track sequencer (hi-hat, snare, kick, perc) assignable per section in the arrangement; multiple built-in patterns (Rock, Funk, Bossa Nova, Hip-Hop…)

### Piano Keyboard & Guitar Fretboard
- Visual 2-octave piano highlights scale notes and chord notes
- Click any key to play it; **Play Scale** button plays the scale ascending
- Manual highlight mode identifies the chord name dynamically
- Guitar fretboard shows the same note highlights across all strings

### Persistence & Export
- **Save / Load** — full project state as a `.json` file
- **MIDI export** — full track as a `.mid` file
- **PDF export** — formatted track sheet (name, description, BPM, time signature, chord grids per section) ready to print or save as PDF

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev) + [Vite 8](https://vitejs.dev) |
| Audio engine | [Tone.js 15](https://tonejs.github.io) |
| MIDI export | [@tonejs/midi](https://github.com/Tonejs/Midi) |
| Styling | CSS Modules |
| Linting | [Oxlint](https://oxc.rs/docs/guide/usage/linter) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) **v18 or later** (v20 LTS recommended)
- npm (comes with Node)

### Install

```bash
git clone https://github.com/JulienCarnec/chords-progressions-editor.git
cd chords-progressions-editor
npm install
```

### Run in development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The app hot-reloads on every file save.

### Build for production

```bash
npm run build
```

Output is written to `dist/`. Serve it with any static host or preview locally:

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
src/
├── audio/          # Tone.js sampler and drum sequencer hooks
├── components/
│   ├── ChordGrid/          # Grid editor, cells, pattern controls
│   ├── DrumSequencer/      # Step-sequencer for drum patterns
│   ├── GuitarFretboard/    # Fretboard visualiser
│   ├── PianoKeyboard/      # Piano visualiser & interaction
│   ├── Playback/           # Playback hook, knobs, playback bar
│   ├── ProgressionManager/ # Sidebar progression list
│   ├── ScaleSelector/      # Scale / key selector
│   ├── TopBar/             # Header with transport controls & actions
│   └── TrackEditor/        # Track arranger view
├── i18n/           # EN / FR string tables
├── state/          # Global app state (useReducer + Context)
├── theory/         # Music theory helpers (chords, scales, notes)
└── utils/          # Save/load, MIDI export, PDF export, demo tracks
```

---

## Demo Tracks

Use the **Demos ▾** menu in the header to load built-in example tracks and explore the features without starting from scratch.

---

## License

Personal project — no licence applied. Feel free to explore the code.
