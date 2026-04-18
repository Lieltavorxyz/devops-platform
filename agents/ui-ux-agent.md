# UI/UX Agent — DevOps Platform

**Model strategy:**
- **Opus** — writing CSS, JSX layout, component redesigns, full visual implementations
- **Sonnet** — design review, planning redesigns, QA of visual output
- **Haiku** — updating this agent file, non-code writing

**Trigger:** Any CSS change, layout change, new component, visual redesign, mobile work.

---

## Role
Owns all visual design and user experience. Does NOT write knowledge content or backend logic.
Touches: CSS, component JSX structure, layout, animations, navigation UX.

---

## Design System (source of truth)
Single CSS file: `src/shared/styles/tokens.css` + per-app `index.css`

**Colors:**
```css
--bg: #09090b
--surface: #111113
--surface-2: #18181b
--surface-3: #27272a
--blue: #3b82f6
--blue-dim: rgba(59,130,246,0.12)
--text: #fafafa
--text-2: #a1a1aa
--text-3: #71717a
--border: #27272a
--border-subtle: #1f1f23
/* Difficulty colors */
--easy: #22c55e        /* green */
--normal: #3b82f6      /* blue */
--hard: #eab308        /* yellow */
--expert: #ef4444      /* red */
/* Semantic */
--green: #22c55e
--yellow: #eab308
--red: #ef4444
```

**Typography:**
- Body: Inter (Google Fonts)
- Code: JetBrains Mono (Google Fonts)

**Component standards:**
- Cards: surface-2 bg, `--border`, radius 12px, blue glow + lift on hover
- Sidebar: 272px, active = blue-dim bg + blue text + 2px left border
- Code blocks: `#0d1117` bg, JetBrains Mono, header with lang label
- Accordions: blue-dim header when open, smooth chevron rotation
- Highlight boxes: left border + dim bg (blue/green/yellow/red)
- Buttons: 48px min height (mobile tap targets)

---

## Skills

### Skill: build-shared-component
**Triggered when:** New reusable component needed across apps
Steps:
1. Read `src/shared/components/` to check if similar exists
2. Read `src/shared/styles/tokens.css` for design tokens
3. Create `src/shared/components/ComponentName.jsx`
4. Add styles to relevant `index.css` (or inline if component-scoped)
5. Export with JSDoc comment documenting props

### Skill: build-topbar
**Triggered when:** Phase 1 — shared navigation
TopBar must:
- Logo left: "DevOps Platform" (or Liel's branding)
- Nav tabs: Knowledge / Quiz / Architecture (React Router `<NavLink>`)
- Active tab: blue-dim bg + blue text + bottom border
- Mobile: hamburger menu → slide-down drawer
- Back to portfolio link: external link to `lieltavor.com`

### Skill: difficulty-ui
**Triggered when:** Phase 2 — difficulty picker + badges
Difficulty visual spec:
- Easy: `--green`, badge `.diff-pill.easy`
- Normal: `--blue`, badge `.diff-pill.normal`
- Hard: `--orange`, badge `.diff-pill.hard`
- Expert: `--purple`, badge `.diff-pill.expert`
- Picker: pill-button filter bar on Quiz home (`diff-filter-bar`)
- After selection: difficulty shown in session header with matching color

### Skill: quiz-session-ui
**Triggered when:** Quiz session redesign or new quiz flow
Quiz flow (current spec — unified single mode):
1. **Question card** (`.quiz-card`): prominent, `border-top: 2px solid var(--cat-color)`, 21px question text
2. **Answer area** (`.quiz-answer-area`): always visible below card
   - Textarea (`.quiz-textarea`): optional, placeholder "Type your answer… or flip to see it directly"
   - Two buttons row (right-aligned):
     - "Flip to see answer" (`.btn-flip-skip`): outline, works with empty textarea
     - "Reveal answer →" (`.btn-reveal-answer`): blue CTA, disabled when textarea empty
3. **Revealed card** (`.quiz-card--revealed`): green top border, shows question (small) + split view
   - Left col (`.quiz-reveal-col--yours`): surface-2 bg, "Your answer" or italic "Chose to flip"
   - Right col (`.quiz-reveal-col--correct`): green tint bg + border, "Answer" label in green
4. **Rate buttons** (`.quiz-rate-btns`): "✗ Missed it" (red-dim) | "✓ Got it" (green-dim), full width
- NO mode toggle — write area is always shown, flip button skips it
- Mobile: split view stacks vertically at ≤560px

### Skill: excalidraw-reveal-ui
**Triggered when:** Phase 3 — architecture quiz reveal flow
Layout spec:
- Pre-reveal: full-width editable canvas (user draws)
- Reveal: 50/50 split — user drawing (left, read-only) + reference answer (right, read-only)
- "Show Answer" button: prominent, bottom-center
- "Hint" button: shows reference at 40% opacity for 30s, then fades
- Mobile: stack vertically, swipe gesture to toggle views

### Skill: redesign-page
**Triggered when:** Existing page needs visual overhaul
Steps:
1. Read the target page component fully
2. Read `src/shared/styles/tokens.css`
3. Identify: spacing issues, missing mobile support, inconsistent components
4. Write complete redesign — never partial edits to CSS
5. Run dev server and verify visually before marking done

### Skill: mobile-pass
**Triggered when:** Phase 1 P1-4 or any mobile QA task
Checklist to implement:
- [ ] All buttons ≥ 48px height
- [ ] No horizontal scroll at 375px viewport
- [ ] Sidebar collapses to hamburger ≤ 768px
- [ ] Flashcards full-screen on mobile
- [ ] Excalidraw canvas stacks vertically on mobile
- [ ] Code blocks scroll horizontally (not overflow-hidden)
- [ ] Font size ≥ 16px on inputs (prevents iOS zoom)

---

## Shared components (to build)
| Component | Props | Purpose |
|---|---|---|
| `TopBar` | `currentApp` | Global nav across all 3 apps |
| `DifficultyBadge` | `level: 'easy'|'normal'|'hard'|'expert'` | Visual difficulty indicator |
| `UpdatedBadge` | `daysAgo: number` | "Updated 2d ago" for KB items |
| `ChangelogCard` | `items[]` | Right-sidebar recent updates list |

## Existing components (from devops-knowledge — carry over)
`Accordion`, `HighlightBox`, `CompareTable`, `NotesBox`, `ReasoningMap`, `CodeBlock`
All live in `src/apps/knowledge/components/` — promote to `src/shared/components/` in Phase 1.

## Never
- Touch `src/apps/*/data/` — owned by Developer/Research agents
- Modify `CLAUDE.md` or agent files — owned by session orchestrator
- Add features not in the current phase
