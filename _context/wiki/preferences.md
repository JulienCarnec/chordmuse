# Working Preferences

## General Approach

- **AI makes decisions first** — the author prefers to let AI take the lead on implementation decisions (architecture, library choices, file structure, etc.) and review after the fact rather than being asked upfront
- When something is ambiguous, make a reasonable decision and note it briefly — don't ask unless it's a significant trade-off that cannot be reversed easily

---

## Coding Style

- **Language:** JavaScript with React (JSX) — no TypeScript
- **Framework:** React 19 with Vite 8
- **Component style:** Functional components with hooks only (no class components)
- **File structure:** Component-based — each component in its own folder with a `.jsx` and a `.module.css` file
- **Styling:** CSS Modules (one `.module.css` per component)
- **Comments:** Add comments for non-obvious logic, especially music theory calculations

---

## Communication Preferences

- Be direct and concise — no filler phrases
- When making a significant architectural decision, state it briefly so it can be reviewed
- Show full file content when creating new files; use targeted diffs for edits
- Before starting a large task, present a short plan if multiple approaches exist

---

## AI Collaboration

- Trust AI to scaffold, structure, and implement without hand-holding
- The author is not deeply familiar with audio/MIDI APIs — explain key concepts briefly when introducing them
- Prefer working, runnable code over stubs or placeholders
- Update the wiki after tasks that introduce durable architectural decisions
