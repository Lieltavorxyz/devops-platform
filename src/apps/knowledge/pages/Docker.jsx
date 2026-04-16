import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Docker() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\uD83D\uDC33'} Containers</div>
        <h1>Docker & Container Images</h1>
        <p>Container images are the artifact you build and ship. How you build them affects security, size, build time, and runtime performance.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: "\"It works on my machine\" — containers package the app with its exact dependencies and runtime so it runs identically everywhere. They also enable density: many isolated workloads on one host, each with defined resource limits."
        },
        {
          title: 'The Core Trade-off',
          body: 'Image size vs convenience. A fat image with all tooling is easy to debug but slow to pull, has a large attack surface, and wastes storage. A minimal image (Alpine/distroless) is secure and fast but harder to troubleshoot in production.'
        }
      ]} />

      <Accordion title="Multi-Stage Builds — The Standard Pattern" icon={'\uD83C\uDFD7\uFE0F'} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Multi-stage builds use multiple <code>FROM</code> statements. Only the final stage ships — the build tooling (compilers, dev deps) stays in earlier stages and never reaches production.
        </p>
        <CodeBlock>{`# Stage 1: Build (has all dev tools, compilers, test deps)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                          # ci = reproducible install (lockfile)
COPY . .
RUN npm run build

# Stage 2: Production (minimal — only what runs)
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser                        # never run as root
EXPOSE 3000
CMD ["node", "dist/server.js"]`}</CodeBlock>
        <HighlightBox type="tip"><strong>Result:</strong> Builder stage might be 800MB. Final image is 120MB — no compilers, no test deps, no source code. Smaller image = faster pull, smaller attack surface, less CVE exposure.</HighlightBox>
      </Accordion>

      <Accordion title="Layer Caching — Build Performance" icon={'\u26A1'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Docker caches each layer. If a layer hasn't changed, it reuses the cache — huge build time savings. The key: <strong>put things that change rarely at the top, things that change often at the bottom.</strong>
        </p>
        <CodeBlock>{`# BAD — copies source before installing deps
# Every code change invalidates the npm install layer
COPY . .
RUN npm install

# GOOD — installs deps first (cache hit on every code change)
# npm install only re-runs when package.json changes
COPY package*.json ./
RUN npm ci
COPY . .`}</CodeBlock>
        <HighlightBox type="warn"><strong>Common CI mistake:</strong> Not passing <code>--cache-from</code> in CI. Docker's layer cache is local by default — in a stateless CI runner, every build starts cold. Use <code>--cache-from</code> with a registry or BuildKit's inline cache to persist cache between CI runs.</HighlightBox>
      </Accordion>

      <Accordion title="Image Security Best Practices" icon={'\uD83D\uDD12'}>
        <CompareTable
          headers={['Practice', 'Why', 'How']}
          rows={[
            ['Non-root user', 'Root in container = root on host if container escapes', '<code>USER appuser</code> in Dockerfile'],
            ['Pin base image versions', '<code>node:alpine</code> changes under you — breaks builds, hides CVEs', '<code>FROM node:20.11.0-alpine3.19</code>'],
            ['Scan with Trivy', 'Catches CVEs in base image and deps before they ship', '<code>trivy image myapp:latest --exit-code 1 --severity HIGH,CRITICAL</code>'],
            ["No secrets in layers", "Even if you delete a secret in a later layer, it's in the history", 'Use BuildKit secrets: <code>--mount=type=secret</code>'],
            ['Read-only root filesystem', 'Prevents malware from writing to the container', '<code>securityContext.readOnlyRootFilesystem: true</code> in pod spec'],
            ['Distroless base image', 'No shell, no package manager — nothing to exploit', '<code>FROM gcr.io/distroless/nodejs20-debian12</code>'],
          ]}
        />
        <NotesBox id="docker-security" placeholder="Did you write Dockerfiles? Multi-stage builds? Image scanning in CI? Any security issues found in images?" />
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info"><strong>Q: How do you reduce Docker image size?</strong><br /><br />
        "Three main levers: (1) Multi-stage builds — only the final artifact goes into the production image, no compilers or dev tools. (2) Alpine or distroless base images — alpine is 5MB vs ubuntu's 70MB. (3) Layer hygiene — combine RUN commands so intermediate files don't persist in layers, and add a .dockerignore to exclude node_modules, .git, test files from the build context."</HighlightBox>
        <HighlightBox type="info"><strong>Q: How do you prevent secrets from ending up in a Docker image?</strong><br /><br />
        "Secrets in ENV or ARG persist in the image history even if you try to unset them. The right pattern is BuildKit's <code>--mount=type=secret</code> — secrets are available during the build step but never written to a layer. For runtime secrets, they come from the orchestrator (K8s Secret via ESO) not the image."</HighlightBox>
      </Accordion>
    </div>
  );
}
