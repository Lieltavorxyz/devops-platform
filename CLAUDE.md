# CLAUDE.md — devops-platform

## What this project is
Public DevOps learning platform by **Liel Tavor**. One monorepo, one React app, one Cloudflare Pages deploy.

Two apps under one React Router (Architecture section removed from nav — code kept in `src/apps/architecture/` but not routed):
- `/` — Knowledge Base (migrated from devops-knowledge)
- `/quiz/*` — Quiz + Flashcards + Scores (migrated from devops-quiz)

**Portfolio is separate** → `portfolio-site` repo → `ltavor.com`  
**This platform** → `devops-platform` repo → `devops.ltavor.com`

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
  k8s/
    pocketbase/           ← Deployment, Service, PVC, Ingress for k3s
  scripts/                ← KB auto-update Python scripts (RSS → MDX)
  argocd/                 ← ArgoCD Application pointing to k8s/pocketbase/
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
| P1-2 | Global TopBar with nav tabs (Knowledge / Quiz) | ✅ |
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
| P5-1 | Cloudflare Pages setup — connect repo, build command, env vars | ⬜ (Liel doing manually) |
| P5-2 | `Dockerfile` (multi-stage: node build → nginx) | ✅ |
| P5-3 | `nginx.conf` — SPA routing, gzip, security headers | ✅ |
| P5-4 | CI: `ci.yml` runs lint + test + build on every PR and push to main | ✅ |
| P5-5 | PocketBase on k3s — `k8s/pocketbase/` manifests (Deployment, Service, PVC, Ingress) | ✅ |
| P5-6 | ArgoCD Application — `argocd/pocketbase.yaml` syncs `k8s/pocketbase/` to k3s | ✅ |
| P5-7 | Custom domain: `devops.ltavor.com` DNS → Cloudflare Pages | ⬜ (Liel doing manually) |
| P5-8 | Smoke test production deploy | ⬜ |

---

### Phase 6 — Portfolio ↔ Platform Integration
**Goal**: When a visitor lands on `ltavor.com` (portfolio), they can click through to `devops.ltavor.com` (platform) and vice versa. Both sites must know each other's live URLs via env vars.

**Required steps to make it work end-to-end:**

| # | Where | What | Notes |
|---|-------|------|-------|
| P6-1 | DNS (Cloudflare) | Add CNAME record: `devops.ltavor.com → <cloudflare-pages-subdomain>.pages.dev` | Done as part of P5-7; prerequisite for everything else |
| P6-2 | Cloudflare Pages — platform project | Set env var `VITE_PORTFOLIO_URL=https://ltavor.com` | Already consumed by `src/config.ts`; TopBar "← ltavor.com" link uses it |
| P6-3 | Portfolio deploy (Cloudflare Pages or Vercel) | Set env var `VITE_PLATFORM_URL=https://devops.ltavor.com` | Portfolio site reads this to build the "DevOps Platform" link |
| P6-4 | `portfolio-site` repo | Add a "DevOps Platform" project card or nav link pointing to `VITE_PLATFORM_URL` | Code change in the portfolio repo — card with title, short description, and CTA button |
| P6-5 | `devops-platform` repo | Verify `src/config.ts` `URLS.portfolio` resolves correctly in prod | Already coded; just needs the env var from P6-2 |
| P6-6 | Both sites | Smoke test cross-links in production — click portfolio → platform → back | Confirm no redirect loops, correct domains |

**Why each step is required:**
- **P6-1** is a hard blocker — without the DNS record `devops.ltavor.com` doesn't exist in the public internet.
- **P6-2 + P6-3** are needed so hardcoded localhost URLs don't survive into production builds (the config already has `|| 'http://localhost:...'` fallbacks that would silently break prod links).
- **P6-4** is the user-visible change — without adding a link in the portfolio there is nothing to click.
- **P6-5 + P6-6** are verification — env vars are easy to forget and hard to debug after deploy.

| # | Task | Status |
|---|------|--------|
| P6-1 | DNS: CNAME `devops.ltavor.com` → Cloudflare Pages (done in P5-7) | ⬜ |
| P6-2 | Platform env vars in Cloudflare Pages dashboard → Settings → Environment Variables: `VITE_PORTFOLIO_URL`, `VITE_PLATFORM_URL`, `VITE_POCKETBASE_URL` | ⬜ |
| P6-3 | Portfolio env var: `VITE_PLATFORM_URL=https://devops.ltavor.com` in portfolio's Cloudflare Pages env vars | ⬜ |
| P6-4 | Add "DevOps Platform" card/link in portfolio-site repo | ⬜ |
| P6-5 | Verify `src/config.ts` URLS resolve correctly in prod build | ⬜ |
| P6-6 | Smoke test: portfolio → platform → back, no broken links | ⬜ |

---

### Phase 7 — New KB Topics (Interview Depth)
**Goal**: Add 6 new deep-dive topic pages covering the areas most commonly probed in senior DevOps interviews — multi-region architecture, service mesh, database scaling, advanced networking, and autoscaling patterns.

**Agent: Developer (Opus)**
| # | Task | Status |
|---|------|--------|
| P7-1 | KB page: Multi-Region Architecture — active-active vs active-passive, global load balancing, DNS vs anycast routing, DB replication patterns | ⬜ |
| P7-2 | KB page: Service Mesh — Istio architecture, mTLS, traffic management, sidecar vs ambient, when to use vs when not to | ⬜ |
| P7-3 | KB page: Database Scaling Patterns — read replicas, sharding, CQRS, geo-routing, consistency trade-offs (CAP theorem in practice) | ⬜ |
| P7-4 | KB page: Advanced Networking — BGP basics, anycast, ECMP, eBPF in k8s, CNI comparison (Cilium vs Calico vs Flannel) | ⬜ |
| P7-5 | KB page: Autoscaling Deep-Dive — HPA internals, VPA, KEDA (event-driven), Karpenter node provisioning, scaling pitfalls | ⬜ |
| P7-6 | KB page: K8s Failure Modes & Debugging — what breaks at scale, pod pending root causes, OOMKill patterns, etcd pressure, network policy debugging | ⬜ |
| P7-7 | Wire new pages into KB sidebar and home grid | ⬜ |
| P7-8 | QA pass — all pages lint clean, render correctly, no emojis | ⬜ |

---

### Phase 8 — Interview Practice Feature
**Goal**: A dedicated interview practice section with 20-30 curated senior DevOps interview questions, detailed model answers, and a UI that simulates the think-before-reveal dynamic of a real interview.

**Agent: Research (Sonnet) + Designer (Opus) + Developer (Opus)**

#### Content
| # | Task | Status |
|---|------|--------|
| P8-1 | Research: 20-30 most common senior DevOps interview questions with model answers — focus on scale, k8s networking, multi-region, incident response, architecture design | ⬜ |
| P8-2 | Structure questions: category, difficulty, question, model answer, key points interviewer listens for, follow-up questions | ⬜ |
| P8-3 | Write `src/apps/interview/data/questions.js` — all 20-30 questions as structured data | ⬜ |

#### UI Design
| # | Task | Status |
|---|------|--------|
| P8-4 | Design: Interview practice page layout — category filter, question card, think timer, reveal answer, "what the interviewer listens for" callout | ⬜ |
| P8-5 | Design: Progress tracking — questions answered, self-rated confidence (1-3), session summary | ⬜ |

#### Implementation
| # | Task | Status |
|---|------|--------|
| P8-6 | `src/apps/interview/` app scaffold — pages, components, data, styles | ⬜ |
| P8-7 | `QuestionCard` component — question text, think timer, reveal toggle, model answer, key points | ⬜ |
| P8-8 | `InterviewHome` page — category grid, difficulty filter, start session | ⬜ |
| P8-9 | `InterviewSession` page — one question at a time, self-rate confidence, next/prev | ⬜ |
| P8-10 | `SessionSummary` page — which questions were shaky, suggested KB pages to revisit | ⬜ |
| P8-11 | Wire into root router (`/interview/*`) and TopBar nav | ⬜ |
| P8-12 | QA pass — full flow works, mobile responsive, lint clean | ⬜ |

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
