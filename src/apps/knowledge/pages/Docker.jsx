import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Box, Shield, Zap, Lock, Terminal, AlertTriangle } from 'lucide-react';

export default function Docker() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Containers</div>
        <h1>Docker and Container Images</h1>
        <p>Multi-stage builds, layer caching mechanics, security hardening, and what BuildKit adds — the practices that produce small, secure, fast-building production images.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: '"It works on my machine" — containers package the application with its exact runtime dependencies so it runs identically in development, CI, staging, and production. They enable density: many isolated workloads per host, each with defined resource limits via Linux cgroups and namespace isolation.'
        },
        {
          title: 'The Core Tradeoff',
          body: 'Image size vs convenience. A fat image (Debian, all tooling) is easy to debug but has a large attack surface, pulls slowly (wasting deployment time), and exposes more CVEs. A minimal image (Alpine, distroless) is faster and more secure but harder to troubleshoot in production when something goes wrong.'
        }
      ]} />

      <Accordion title="Multi-Stage Builds — The Standard Pattern" icon={Box} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Multi-stage builds use multiple FROM statements. Each stage can be used as a base for the next, or referenced with COPY --from. Only the final stage becomes the image that is pushed. Build tooling, test dependencies, and intermediate artifacts stay in earlier stages and never reach production.
        </p>
        <CodeBlock language="dockerfile">
{`# ---- Stage 1: Dependencies ----
# Separate stage for dependency installation — benefits from layer caching
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# npm ci uses lockfile for reproducible installs (not npm install)
RUN npm ci --only=production

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci   # includes dev dependencies for building
COPY . .
RUN npm run build

# ---- Stage 3: Production ----
# Minimal final image — only what runs in production
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user before adding files
RUN addgroup -S -g 1001 appgroup && \
    adduser -S -u 1001 -G appgroup appuser

# Copy only built artifacts and production deps (not source code)
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

# Drop to non-root user
USER appuser

# Document the port (does not publish it)
EXPOSE 3000

# Use exec form (no shell) — PID 1 gets SIGTERM directly
CMD ["node", "dist/server.js"]`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Size impact:</span> A Node.js app with a full build environment and dev dependencies might have a builder stage of 600MB. The production stage with only the compiled output and production deps might be 120MB. The final pushed image is 120MB — the builder layer is discarded.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Why separate deps stage:</span> The deps stage installs only production dependencies. The builder stage installs all dependencies for the build. By separating them, you avoid carrying dev dependencies into production, and the deps layer is reusable across builds when package.json has not changed.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Layer Caching — How It Works and How to Exploit It" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Docker builds images as a stack of layers. Each instruction (RUN, COPY, ADD) creates a new layer. If a layer has not changed since the last build, Docker reuses the cached layer — it does not re-execute the instruction. The cache is invalidated when a layer changes, and all subsequent layers are also invalidated.
        </p>
        <CodeBlock language="dockerfile">
{`# BAD: COPY . . before npm install
# Any source file change invalidates the npm install layer
# Every commit rebuilds node_modules from scratch
FROM node:20-alpine
WORKDIR /app
COPY . .          # cache miss on any file change
RUN npm install   # re-runs on every commit

# GOOD: COPY package files first, install, then copy source
# npm install only re-runs when package.json or package-lock.json changes
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./   # cache miss only when deps change
RUN npm ci              # cached on every commit that doesn't change deps
COPY . .                # cache miss on source changes, but npm install stays cached
RUN npm run build       # only rebuilds when source changes`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">The ordering principle:</span> Put layers that change rarely at the top, layers that change frequently at the bottom. OS packages (apt-get) change rarely — put them near the top. Application code changes on every commit — put the COPY . . at the bottom.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Cache in CI (stateless runners):</span> Docker's cache is local to the daemon. A stateless CI runner (GitHub Actions, GitLab CI) starts fresh on every build — no local cache. Use BuildKit's remote cache: <code>--cache-from type=registry,ref=myimage:cache</code> pulls the cache layer from the registry. Or use GitHub Actions cache (<code>type=gha</code>) with Docker Buildx.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">RUN command combining:</span> Each RUN instruction creates a new layer. Multiple RUN commands for the same logical operation (install + clean up) leave intermediate files in earlier layers even if you delete them in a later layer. Combine into one RUN with && to avoid this.</div>
          </li>
        </ul>
        <CodeBlock language="dockerfile">
{`# BAD: cleanup in separate RUN leaves cache files in layer 1
RUN apt-get update && apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*   # this layer removes, but layer above still has it

# GOOD: single RUN — cleanup happens in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*   # not in the final image`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Security Hardening" icon={Shield}>
        <CompareTable
          headers={['Practice', 'Why', 'Implementation']}
          rows={[
            ['Non-root user', 'Root in container with hostPath mount or privileged mode = root on host. Defense in depth.', 'adduser in Dockerfile + USER instruction'],
            ['Pinned base image digest', 'Tag is mutable — node:20-alpine can change under you. Digest is immutable.', 'FROM node:20-alpine@sha256:abc123...'],
            ['Distroless base', 'No shell, no package manager, no OS utilities — nothing to exploit after a container escape', 'FROM gcr.io/distroless/nodejs20-debian12'],
            ['Read-only root filesystem', 'Prevents malware from writing persistent files inside the container', 'securityContext.readOnlyRootFilesystem: true in pod spec'],
            ['No secrets in layers', 'ARG and ENV values persist in image history even if unset in a later layer', 'BuildKit --mount=type=secret for build-time secrets'],
            ['Trivy image scan in CI', 'Catches CVEs in base image and application dependencies before push', 'trivy image --exit-code 1 --severity CRITICAL,HIGH myimage:tag'],
            ['Minimal capabilities', 'Drop all Linux capabilities not needed by the application', 'securityContext.capabilities.drop: ["ALL"]'],
          ]}
        />
        <CodeBlock language="bash">
{`# Scan image for CVEs before pushing
trivy image \
  --exit-code 1 \
  --severity CRITICAL,HIGH \
  --ignore-unfixed \       # only alert on CVEs with available fixes
  --format sarif \
  --output trivy-results.sarif \
  123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:${GIT_SHA}

# View image layers and history
docker history --no-trunc payments-api:latest

# Check if secrets are in image history (bad practice detection)
docker history payments-api:latest | grep -i "secret\|password\|token\|key"`}
        </CodeBlock>
        <HighlightBox type="warn">Secrets in build args: <code>ARG API_KEY=secret123</code> persists in the image manifest's build history. Anyone with docker history access can read it. BuildKit's <code>--mount=type=secret</code> provides secrets to RUN instructions without persisting them in any layer. Use it for build-time secrets like private npm registry tokens.</HighlightBox>
      </Accordion>

      <Accordion title="BuildKit — What It Adds Over Classic Docker Build" icon={Terminal}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          BuildKit is Docker's next-generation build engine. Enable it with <code>DOCKER_BUILDKIT=1</code> or use <code>docker buildx</code>. It adds parallel stage execution, better caching, secret mounts, SSH mounts, and cross-platform builds.
        </p>
        <CodeBlock language="bash">
{`# BuildKit secret mount — provides secret during build without persisting in layer
docker build \
  --secret id=npmrc,src=$HOME/.npmrc \
  -f Dockerfile .

# In Dockerfile: mount the secret in a RUN instruction
# RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
#     npm install --ignore-scripts

# BuildKit cache mount — persist directories across builds (e.g., pip cache, go cache)
# RUN --mount=type=cache,target=/root/.cache/pip \
#     pip install -r requirements.txt

# Cross-platform builds (build ARM image on x86)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag 123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:latest \
  --push .

# Remote cache (reuse cache from registry in CI)
docker buildx build \
  --cache-from type=registry,ref=123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:cache \
  --cache-to type=registry,ref=123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:cache,mode=max \
  --tag 123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:${GIT_SHA} \
  --push .`}
        </CodeBlock>
        <HighlightBox type="tip">BuildKit parallel stage execution: in a multi-stage Dockerfile where stages do not depend on each other (e.g., builder for the app and a separate stage that downloads tools), BuildKit runs them in parallel. This can significantly speed up builds that have independent preparation stages.</HighlightBox>
      </Accordion>

      <Accordion title="Distroless and Minimal Base Images" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The choice of base image is the single biggest lever for both image size and security posture. The smaller and more minimal the base, the fewer CVEs, the smaller the pull time, and the smaller the attack surface.
        </p>
        <CompareTable
          headers={['Base Image', 'Size', 'Shell?', 'CVE Surface', 'Debug Ease']}
          rows={[
            ['ubuntu:latest', '~77MB', 'Yes (bash)', 'High — full OS packages', 'Easy — all tools available'],
            ['debian:slim', '~74MB', 'Yes (bash)', 'Medium', 'Easy'],
            ['alpine:latest', '~7MB', 'Yes (sh)', 'Low — musl libc', 'Medium — apk available'],
            ['gcr.io/distroless/base', '~2MB', 'No shell', 'Very low — no OS utilities', 'Hard — no exec shell in container'],
            ['gcr.io/distroless/nodejs20', '~54MB', 'No shell', 'Low — just Node runtime', 'Hard — kubectl debug or ephemeral container'],
            ['scratch', '0MB', 'None', 'Zero (static binary only)', 'Impossible without debugging tools'],
          ]}
        />
        <HighlightBox>Debugging distroless containers: since there is no shell, <code>kubectl exec -- /bin/sh</code> fails. Use kubectl's ephemeral debug containers: <code>kubectl debug -it my-pod --image=busybox --target=app</code>. The debug container shares the target container's process namespace — you can inspect its filesystem and processes without the main image needing a shell.</HighlightBox>
      </Accordion>

      <Accordion title=".dockerignore and Build Context" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The build context is the directory sent to the Docker daemon before the build starts. A large build context means slow builds and potential secret leakage, even if you never COPY the files.
        </p>
        <CodeBlock language="bash">
{`# .dockerignore — exclude unnecessary files from build context
node_modules/       # will be reinstalled in image — never copy from host
.git/               # git history should not be in the image
.env                # environment files might contain secrets
*.log               # log files
coverage/           # test coverage reports
dist/               # built output (built inside the container, not copied)
**/*.test.js        # test files
.github/            # CI configuration
docs/               # documentation
*.md                # README files`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Why it matters:</span> The build context is transferred to the Docker daemon before any layer is evaluated. A 2GB node_modules directory in the build context means 2GB is transferred on every build even if you never COPY it. A proper .dockerignore reduces this to just the source files you need.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Secret leakage via context:</span> If you have a .env file with credentials and no .dockerignore entry for it, it is included in the build context. Even if no Dockerfile instruction copies it, BuildKit has access to it during the build. Always include .env and credential files in .dockerignore.</div>
          </li>
        </ul>
        <HighlightBox type="tip">To check what files are included in the build context, look at the "Sending build context to Docker daemon" line in build output. If the size is unexpectedly large, add missing .dockerignore entries. With BuildKit and <code>docker buildx</code>, you can use <code>--progress=plain</code> to see the exact context size.</HighlightBox>
      </Accordion>
    </div>
  );
}
