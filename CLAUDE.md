# CLAUDE.md — devops-platform

## What this project is
Public DevOps learning platform by **Liel Tavor**. One monorepo, one React app, one Cloudflare Pages deploy.

Three apps merged under one React Router:
- `/` — Knowledge Base (migrated from devops-knowledge)
- `/quiz/*` — Quiz + Flashcards + Scores (migrated from devops-quiz)
- `/architecture/*` — Architecture Practice + Excalidraw (migrated from devops-architecture)

**Portfolio is separate** → `portfolio-site` repo → `lieltavor.com`  
**This platform** → `devops-platform` repo → `devops.lieltavor.com`

---

## Who Liel is
- DevOps engineer: Terraform, Terragrunt, Kubernetes (EKS), ArgoCD, AWS, Helm, Python, Bash
- Email: lieltavor25@gmail.com
- **Content constraint**: Never reference Akeyless or Fiverr anywhere.

---

## Tech Stack
| Concern | Choice |
|---|---|
| Frontend | React 19 + Vite 6 + React Router 7 |
| Styling | Zinc dark CSS design system (`src/apps/*/styles/index.css`) |
| Backend | PocketBase (self-hosted SQLite, Docker) |
| Diagrams | @excalidraw/excalidraw (lazy-loaded) |
| Testing | Vitest + @testing-library/react + MSW |
| CI | GitHub Actions (lint + build on every PR, deploy on merge to main) |
| Deploy | Cloudflare Pages (frontend) + Hetzner k3s (PocketBase backend) |
| Icons | lucide-react — NO emojis anywhere in the codebase |

---

## Agent Model Strategy
| Model | Use for |
|---|---|
| **Haiku** | Updating CLAUDE.md, agent files, memory files, non-code writing, research tasks |
| **Sonnet** | Planning, QA review, design pass, content review |
| **Opus** | React/JSX/CSS code, backend logic, data schemas, full implementations |

---

## Project Structure
```
devops-platform/
  src/
    apps/
      knowledge/          ← migrated from devops-knowledge
        components/
        data/
        pages/
        styles/
      quiz/               ← migrated from devops-quiz
        components/
        data/
        hooks/
        pages/
        styles/
      architecture/       ← migrated from devops-architecture
        components/
        data/
        hooks/
        pages/
        styles/
    shared/               ← shared across apps
      components/         ← TopBar, Nav, DifficultyBadge, etc.
      hooks/              ← useScores, useDifficulty, useLocalStorage
      styles/             ← shared CSS variables (design tokens)
    data/
      diagrams/           ← Excalidraw JSON reference answer files
    App.jsx               ← root router
    main.jsx
  backend/                ← PocketBase config + collections schema
  scripts/                ← KB auto-update Python scripts (RSS → MDX)
  argocd/                 ← ApplicationSet for k3s deploy
  agents/                 ← agent definition files (this dir)
  index.html
  package.json
  vite.config.js
  Dockerfile
  nginx.conf
```

---

## Routes
```
/                   → Knowledge Base home
/knowledge/*        → Knowledge Base sections
/quiz               → Quiz home (difficulty picker)
/quiz/session       → Active quiz session
/quiz/results       → Score + leaderboard
/architecture       → Architecture scenarios home
/architecture/:id   → Scenario study + Excalidraw canvas
```

---

## Design System (frozen — don't change)
- Dark zinc theme — feels like a developer tool
- Fonts: Inter (body) + JetBrains Mono (code)
- `--bg: #09090b` / `--surface: #111113` / `--surface-2: #18181b` / `--surface-3: #27272a`
- Accent: `--blue: #3b82f6`
- Difficulty colors: `--green` (easy) / `--blue` (normal) / `--yellow` (hard) / `--red` (expert)
- Cards: surface-2 bg, border, radius 12px, blue glow on hover
- Sidebar: 272px, active = blue-dim bg + blue text + 2px left border

---

## Local Dev
```bash
npm install --legacy-peer-deps && npm run dev    # http://localhost:5173
npm run build
npm run lint
npm run test
```

> `--legacy-peer-deps` is required due to a peer dep conflict between `@excalidraw/excalidraw` and React 19.

## Docker (full stack)
```bash
docker compose up             # frontend + pocketbase backend
```

---

## Build Phases

### Phase 0 — Monorepo Scaffold ✅ DONE
**Agent: DevOps (Haiku)**
| # | Task | Status |
|---|------|--------|
| P0-1 | Create repo structure (`src/apps/`, `src/shared/`, `agents/`) | ✅ |
| P0-2 | Merge `package.json` deps from all 3 apps | ✅ |
| P0-3 | Create root `vite.config.js`, `index.html`, `main.jsx` | ✅ |
| P0-4 | Copy `src/` from devops-knowledge → `src/apps/knowledge/` | ✅ |
| P0-5 | Copy `src/` from devops-quiz → `src/apps/quiz/` | ✅ |
| P0-6 | Copy `src/` from devops-architecture → `src/apps/architecture/` | ✅ |
| P0-7 | Wire root `App.jsx` with React Router (3 app sections) | ✅ |
| P0-8 | Fix all import paths after migration | ✅ |
| P0-9 | `npm run build` passes with zero errors | ✅ |

---

### Phase CI — GitHub Actions CI/CD ✅ DONE
| # | Task | Status |
|---|------|--------|
| CI-1 | `ci.yml` — lint + build on every PR and push to main | ✅ |
| CI-2 | ESLint configured, 0 errors on all PRs | ✅ |

---

### Phase 1 — Shared Navigation + Design Unification ✅ DONE
| # | Task | Status |
|---|------|--------|
| P1-1 | Zinc dark CSS design system across all 3 apps | ✅ |
| P1-2 | Global TopBar with nav tabs (Knowledge / Quiz / Architecture) | ✅ |
| P1-3 | Mobile responsive: hamburger sidebar, single-column | ✅ |
| P1-4 | lucide-react icons throughout — no emojis | ✅ |

---

### Phase 2 — Quiz Backend (Scores + Difficulty) ✅ DONE
| # | Task | Status |
|---|------|--------|
| P2-1 | 90 MCQ questions across 6 categories, tagged easy/normal/hard/expert | ✅ |
| P2-2 | Difficulty picker UI on Quiz home | ✅ |
| P2-3 | `useScores` hook — submit score to PocketBase + localStorage fallback | ✅ |
| P2-4 | Leaderboard page — per-difficulty top scores | ✅ |
| P2-5 | Personal best tracking via localStorage | ✅ |
| P2-6 | Anti-gaming: device fingerprint in score submission | ✅ |

---

### Phase 3 — KB Redesign + Quiz MCQ ✅ DONE
| # | Task | Status |
|---|------|--------|
| P3-1 | MCQ format for all 90 quiz questions (options[] + correctIndex) | ✅ |
| P3-2 | KB home redesigned — grouped sections, lucide icons, no emojis | ✅ |
| P3-3 | KB sidebar — lucide icons, collapsible groups, search | ✅ |
| P3-4 | Architecture quiz questions — real system design scenarios | ✅ |
| P3-5 | KB topic pages — all 25 pages rewritten: richer content, lucide icons, no emojis, CodeBlock/CompareTable/HighlightBox throughout | ✅ |

---

### Phase 4 — Knowledge Base Content + Auto-Updates
**Agent: Research (Haiku) + Developer (Opus for scripts)**
| # | Task | Status |
|---|------|--------|
| P4-1 | Research: confirm reliable RSS/API feeds (K8s, ArgoCD, AWS, CNCF) | ⬜ |
| P4-2 | Write `scripts/fetch_updates.py` — RSS + GitHub API → MDX | ⬜ |
| P4-3 | GitHub Actions cron workflow (daily 06:00 UTC) → auto PR | ⬜ |
| P4-4 | "Updated" badge component — shows on KB cards modified in last 7 days | ⬜ |
| P4-5 | Changelog sidebar card in Knowledge Base | ⬜ |
| P4-6 | QA pass — script runs clean, PRs created correctly | ⬜ |

---

### Phase 5 — Deployment
**Agent: DevOps (Opus)**
| # | Task | Status |
|---|------|--------|
| P5-1 | Cloudflare Pages setup — connect repo, build command, env vars | ⬜ |
| P5-2 | `Dockerfile` (multi-stage: node build → nginx) | ⬜ |
| P5-3 | `nginx.conf` — SPA routing, gzip, security headers | ⬜ |
| P5-4 | GitHub Actions: lint + build + test + Lighthouse CI | ⬜ |
| P5-5 | PocketBase deploy — Fly.io or Hetzner k3s | ⬜ |
| P5-6 | ArgoCD ApplicationSet — deploy platform via own templates (k3s) | ⬜ |
| P5-7 | Custom domain: `devops.lieltavor.com` DNS → Cloudflare Pages | ⬜ |
| P5-8 | Smoke test production deploy | ⬜ |

---

## Known Gotchas

### JSX escaping in KB pages
KB pages embed code samples as JSX. Two patterns that break ESLint parsing if not escaped:

**Helm/Go template syntax `{{-` in JSX text content:**
```jsx
// ❌ ESLint parse error — { opens a JSX expression, {- is invalid JS
<code>{{-</code>

// ✅ correct
<code>{'{{-'}</code>
<code>{'-}}'}</code>
```

**GitHub Actions `${{ }}` inside template literals:**
```jsx
// ❌ ESLint parse error — ${ opens a template interpolation
{`aws-region: ${{ env.AWS_REGION }}`}

// ✅ correct — \$ escapes the interpolation, renders as ${{ }} in browser
{`aws-region: \${{ env.AWS_REGION }}`}
```

### SSH in the Claude Code container
The Claude Code Docker container mounts `~/.ssh/id_ed25519` (and `.pub`) read-only from the host. The `known_hosts` file is **not** mounted — it lives inside the container layer and may not persist across container rebuilds. If SSH push fails with "Host key verification failed", run:
```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
```

---

## Content Constraint
Never reference specific companies Liel has interviewed at (Akeyless, Fiverr, etc.).
All architecture examples use generic service names (payments-api, auth-service, etc.).
