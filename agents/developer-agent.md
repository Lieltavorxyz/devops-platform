# Developer Agent — DevOps Platform

**Model strategy:**
- **Opus** — all React/JSX/CSS code, backend logic, data schemas, full implementations
- **Sonnet** — code review, architecture decisions, planning
- **Haiku** — updating this agent file, scaffolding boilerplate

**Trigger:** Any implementation task — components, hooks, data files, backend config, scripts.

---

## Role
Implements features. Owns `src/`, `backend/`, `scripts/`. Does NOT touch `agents/` or `CLAUDE.md`.
Always reads existing code before writing new code. Never adds features beyond current phase scope.

---

## Skills

### Skill: scaffold-monorepo
**Triggered when:** Phase 0 — initial setup
Steps:
1. Read CLAUDE.md project structure section
2. Create dirs: `src/apps/knowledge/`, `src/apps/quiz/`, `src/apps/architecture/`, `src/shared/components/`, `src/shared/hooks/`, `src/shared/styles/`, `src/data/diagrams/`
3. Merge `package.json` deps from all 3 source repos — take highest version if conflict
4. Create root `vite.config.js` (single app, path aliases for `@shared`, `@knowledge`, `@quiz`, `@architecture`)
5. Create root `main.jsx` + `App.jsx` with React Router (3 sections)
6. Copy source files from each repo into correct `src/apps/` subdirectory
7. Fix all relative imports (e.g. `../../components/` → `@knowledge/components/`)
8. Run `npm run build` — must pass zero errors

Vite aliases:
```js
resolve: {
  alias: {
    '@shared': '/src/shared',
    '@knowledge': '/src/apps/knowledge',
    '@quiz': '/src/apps/quiz',
    '@architecture': '/src/apps/architecture',
  }
}
```

Root App.jsx structure:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TopBar } from '@shared/components/TopBar'
// lazy load each app
const KnowledgeApp = lazy(() => import('@knowledge/App'))
const QuizApp = lazy(() => import('@quiz/App'))
const ArchitectureApp = lazy(() => import('@architecture/App'))

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/*" element={<KnowledgeApp />} />
          <Route path="/quiz/*" element={<QuizApp />} />
          <Route path="/architecture/*" element={<ArchitectureApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### Skill: pocketbase-setup
**Triggered when:** Phase 2 — quiz backend
Steps:
1. Add PocketBase service to `docker-compose.yml`
2. Create `backend/schema.json` — PocketBase collections definition
3. Create `src/shared/hooks/useScores.js` — score submit + fetch
4. Create `src/shared/hooks/useLeaderboard.js` — leaderboard fetch

Collections schema:
```json
{
  "scores": {
    "fields": [
      { "name": "session_id", "type": "text" },
      { "name": "difficulty", "type": "select", "options": ["easy","normal","hard","expert"] },
      { "name": "score", "type": "number" },
      { "name": "total", "type": "number" },
      { "name": "percent", "type": "number" },
      { "name": "device_fp", "type": "text" },
      { "name": "created", "type": "autodate" }
    ]
  }
}
```

useScores hook pattern:
```js
// src/shared/hooks/useScores.js
const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090'

export function useScores() {
  const submit = async ({ difficulty, score, total }) => {
    const percent = Math.round((score / total) * 100)
    const payload = { difficulty, score, total, percent, device_fp: getFingerprint() }
    try {
      await fetch(`${PB_URL}/api/collections/scores/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch {
      // offline fallback: queue in localStorage
      const queue = JSON.parse(localStorage.getItem('score_queue') || '[]')
      queue.push(payload)
      localStorage.setItem('score_queue', JSON.stringify(queue))
    }
  }
  return { submit }
}
```

### Skill: difficulty-system
**Triggered when:** Phase 2 — difficulty tagging + routing
Steps:
1. Read `src/apps/quiz/data/quizData.js` fully
2. Tag all questions: add `difficulty: 'easy'|'normal'|'hard'|'expert'` based on:
   - easy: terminology, definitions, single-concept
   - normal: explain tradeoffs, basic architecture
   - hard: multi-step debugging, advanced config, real production scenarios
   - expert: system design under constraints, failure analysis, security edge cases
3. Update `QuizSession.jsx` to filter questions by selected difficulty
4. Store selected difficulty in `sessionStorage` for cross-component access

Distribution target (60 questions):
- easy: 15 questions
- normal: 20 questions
- hard: 15 questions
- expert: 10 questions

### Skill: excalidraw-components
**Triggered when:** Phase 3 — architecture quiz
Steps:
1. Create `src/shared/components/ExcalidrawViewer.jsx` — read-only, loads JSON from `src/data/diagrams/`
2. Create `src/shared/components/ExcalidrawCanvas.jsx` — editable, auto-saves to localStorage
3. Create `src/apps/architecture/pages/ScenarioSession.jsx` — orchestrates draw + reveal flow

ExcalidrawViewer:
```jsx
import { lazy, Suspense, useState, useEffect } from 'react'
const Excalidraw = lazy(() => import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw })))

export function ExcalidrawViewer({ drawingId }) {
  const [elements, setElements] = useState([])
  useEffect(() => {
    import(`../../data/diagrams/${drawingId}.json`).then(m => setElements(m.default.elements))
  }, [drawingId])
  return (
    <Suspense fallback={<div>Loading diagram...</div>}>
      <Excalidraw initialData={{ elements }} viewModeEnabled />
    </Suspense>
  )
}
```

### Skill: kb-update-script
**Triggered when:** Phase 4 — auto-update pipeline
Create `scripts/fetch_updates.py`:
- Input: feed URLs from `scripts/config.py`
- Process: fetch RSS + GitHub releases API, deduplicate by title hash
- Output: one `.mdx` file per new item in `src/apps/knowledge/content/updates/`
- Uses: `feedparser`, `requests`, `anthropic` (summarize if body > 300 chars, use Haiku model)
- Dedup: check git log for existing file with same hash

### Skill: fix-imports
**Triggered when:** After migrating files (Phase 0)
Steps:
1. Run `npm run build` and capture all import errors
2. For each error: read the file, find the broken import, fix to use alias
3. Common patterns to fix:
   - `../components/` → `@knowledge/components/` (or appropriate app)
   - `../styles/` → `@shared/styles/` (once extracted)
   - `../data/` → `@quiz/data/` (etc.)
4. Re-run build after each batch of fixes
5. Done when `npm run build` exits zero

---

## Data formats (reference)

**Quiz question:**
```js
{
  id: 'tf-001',
  question: '...',
  answer: '...',
  hint: '...',           // optional
  difficulty: 'easy' | 'normal' | 'hard' | 'expert',
  category: 'terraform' | 'kubernetes' | 'eks-aws' | 'cicd-gitops' | 'architecture' | 'observability',
  tags: ['terraform', 'state'],
}
```

**Architecture scenario:**
```js
{
  id: 'ha-eks',
  title: 'High-Availability EKS on AWS',
  difficulty: 'hard',
  tags: ['eks', 'kubernetes', 'aws'],
  estimatedMinutes: 20,
  referenceDrawing: 'ha-eks-full.json',  // path in src/data/diagrams/
  steps: [{ id: 1, title: '...', description: '...', decisions: [], components: [] }],
  keyPoints: ['...'],
}
```

## Code standards
- No default exports from hooks — named exports only
- All async operations wrapped in try/catch with localStorage fallback
- All components: one JSX file, co-located test file
- `import.meta.env.VITE_*` for all env vars — never hardcode URLs

## Never
- Modify `CLAUDE.md` or `agents/` files
- Add features beyond current phase
- Leave unused imports or variables
- Hardcode API URLs
