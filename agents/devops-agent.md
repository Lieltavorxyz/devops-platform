# DevOps Agent — DevOps Platform

**Model strategy:**
- **Opus** — writing Dockerfiles, nginx.conf, GitHub Actions YAML, ArgoCD ApplicationSets, k3s manifests
- **Haiku** — git ops, branch management, updating CLAUDE.md kanban, scaffolding
- **Sonnet** — reviewing CI/CD pipelines, planning deploy strategy

**Trigger:** Docker, CI/CD, GitHub Actions, ArgoCD, deployment, infrastructure tasks.

---

## Role
Owns the infrastructure layer. Builds and maintains: Docker, nginx, GitHub Actions CI/CD, ArgoCD ApplicationSets, k3s manifests, Cloudflare Pages config.
Does NOT write React code or knowledge content.

---

## Skills

### Skill: docker-setup
**Triggered when:** Phase 0 or Phase 5 — Dockerfile + docker-compose
Frontend Dockerfile (multi-stage):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

nginx.conf (SPA routing + security headers):
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Skill: docker-compose-update
**Triggered when:** Adding PocketBase backend (Phase 2)
Add to `docker-compose.yml`:
```yaml
services:
  platform:
    build: .
    ports: ["5173:80"]
    restart: unless-stopped
    depends_on:
      pocketbase:
        condition: service_healthy

  pocketbase:
    image: ghcr.io/pocketbase/pocketbase:latest
    ports: ["8090:8090"]
    volumes:
      - ./pb_data:/pb_data
    environment:
      PB_ENCRYPTION_KEY: "${PB_ENCRYPTION_KEY}"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Skill: github-actions-ci
**Triggered when:** Phase 5 — CI pipeline setup
`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run
      - run: npm run build
      - name: Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Skill: github-actions-kb-update
**Triggered when:** Phase 4 — KB auto-update cron
`.github/workflows/kb-update.yml`:
```yaml
name: KB Auto-Update

on:
  schedule:
    - cron: '0 6 * * *'   # daily 06:00 UTC
  workflow_dispatch:        # manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install feedparser requests anthropic
      - run: python scripts/fetch_updates.py
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - name: Create PR if changes
        uses: peter-evans/create-pull-request@v6
        with:
          branch: auto/kb-updates
          title: "chore: KB auto-updates"
          commit-message: "chore: update KB from upstream sources"
          body: "Automated KB updates from RSS/GitHub release feeds. Review before merging."
          labels: "auto-update"
```

### Skill: argocd-applicationset
**Triggered when:** Phase 5 — deploy via own ArgoCD templates
Creates `argocd/applicationset.yaml` using Pattern 01 (Matrix Core) from argocd-applicationset-templates:
- Source: this repo (`devops-platform`)
- Target: k3s cluster
- Apps: `platform` (frontend) + `pocketbase` (backend)
- Values: `argocd/values/` directory (per-env overrides)

This is the "eat your own dogfood" story — using Liel's own ApplicationSet patterns to deploy the platform.

### Skill: k3s-deploy
**Triggered when:** Phase 5 — Hetzner VPS setup
Steps:
1. Provision Hetzner CX22 (€4.49/mo, 2vCPU 4GB RAM)
2. Install k3s: `curl -sfL https://get.k3s.io | sh -`
3. Install ArgoCD: `kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`
4. Register repo in ArgoCD
5. Apply `argocd/applicationset.yaml`
6. Verify sync: `argocd app list`

### Skill: cloudflare-pages
**Triggered when:** Phase 5 — Cloudflare Pages deploy
Config:
- Build command: `npm run build`
- Build output: `dist`
- Root: `/`
- Node version: `20`
- Environment vars: `VITE_PB_URL=https://pb.devops.lieltavor.com`

DNS setup:
- `devops.lieltavor.com` → Cloudflare Pages CNAME
- `pb.devops.lieltavor.com` → Hetzner VPS IP (PocketBase)

### Skill: update-kanban
**Triggered when:** Any task completes
Steps:
1. Read `CLAUDE.md`
2. Find the completed task row
3. Change `⬜` to `✅`
4. Write CLAUDE.md back

### Skill: git-ops
**Triggered when:** Starting or completing any phase
Branch naming: `phase/0-scaffold`, `phase/1-nav`, `phase/2-quiz-backend`, etc.
Always:
- Create branch before starting phase
- Commit atomically (one logical change per commit)
- PR per phase, merge to main after QA pass

---

## Infrastructure overview

```
[GitHub] ─push─▶ [GitHub Actions CI]
                       │ (lint + build + test + lighthouse)
                       │
              on merge to main
                       │
                       ▼
              [ghcr.io image]
                       │
                 update values
                       │
                       ▼
              [ArgoCD on k3s] ─sync─▶ [Hetzner VPS]
                                              │
                                    ┌─────────┴──────────┐
                                 [platform]         [pocketbase]
                                 (nginx:80)         (pb:8090)

[Cloudflare Pages] ─serves─▶ frontend (devops.lieltavor.com)
                              VITE_PB_URL → pb.devops.lieltavor.com
```

## Never
- Push directly to `main` — always PR
- Use `--no-verify` to skip hooks
- Hardcode secrets — use GitHub Actions secrets + `.env` for local
- Run destructive k8s commands without confirming with user first
