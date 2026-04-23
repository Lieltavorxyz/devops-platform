import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Workflow, GitBranch, Shield, RefreshCw, Terminal, AlertTriangle } from 'lucide-react';

export default function CiCd() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">CI/CD</div>
        <h1>CI/CD Pipelines</h1>
        <p>Pipeline architecture, GitHub Actions with OIDC, push-based vs GitOps CD, image tagging strategy, and how to design a pipeline that catches regressions before prod.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'What a Pipeline Actually Does',
          body: 'A pipeline is an automated sequence of checks and actions triggered by a code event. Its job: give you confidence that the change is safe to ship, and then ship it. Every stage is either a quality gate (can fail and block) or a side effect (build artifact, deploy). The design question is always: what is the minimum set of gates that catches real bugs?'
        },
        {
          title: 'CI vs CD vs Continuous Deployment',
          body: 'Continuous Integration: every commit triggers build and test — catches breaks early. Continuous Delivery: every passing build is deployable to production on demand. Continuous Deployment: every passing build is automatically deployed to production with no human approval. Most teams practice CI + CD, with manual promotion to prod for risk control.'
        }
      ]} />

      <Accordion title="Pipeline Stages — What Each Does and Why" icon={Workflow} defaultOpen={true}>
        <CompareTable
          headers={['Stage', 'What Happens', 'Fails On', 'Cost of Skipping']}
          rows={[
            ['<strong>Lint</strong>', 'ESLint, golangci-lint, flake8, hadolint for Dockerfiles', 'Style violations, obvious bugs, security antipatterns', 'Code rot, inconsistent style, obvious mistakes reach review'],
            ['<strong>Test</strong>', 'Unit + integration tests, coverage threshold enforcement', 'Test failure, coverage drops below threshold', 'Regressions ship to prod undetected'],
            ['<strong>Build</strong>', 'Docker image built, tagged with git commit SHA', 'Compile error, Dockerfile issue, missing dep', 'Non-reproducible artifacts, build-on-deploy antipattern'],
            ['<strong>Security Scan</strong>', 'Trivy or Snyk scans image for CVE in base image and dependencies', 'Critical or High severity CVE', 'Vulnerable software in production'],
            ['<strong>Push to Registry</strong>', 'Image pushed to ECR with git SHA tag', 'Auth failure, network issue', 'Nothing — this is a side effect, not a gate'],
            ['<strong>Deploy Staging</strong>', 'helm upgrade or ArgoCD image update trigger', 'Pod fails to start, health check fails', 'Untested changes go directly to prod'],
            ['<strong>Integration/Smoke Test</strong>', 'HTTP checks, API contract tests against staging', '5xx errors, response contract violations', 'Broken integrations reach prod'],
            ['<strong>Deploy Prod</strong>', 'Same as staging, gated by manual approval or auto after smoke tests', 'Rollback triggered on failure', 'Manual deploys with no audit trail'],
          ]}
        />
        <HighlightBox type="tip">Image tagging strategy matters: always tag with the git commit SHA (<code>payments-api:a3f2b1c</code>). Never use <code>latest</code> in production — it is mutable, breaks reproducibility, and you lose the ability to trace which code is running where. Optionally add a human-readable tag for convenience (<code>payments-api:2.1.0</code>), but the SHA is the canonical identifier.</HighlightBox>
      </Accordion>

      <Accordion title="GitHub Actions — OIDC Authentication Pattern" icon={Shield}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The recommended pattern for CI/CD accessing AWS: GitHub Actions OIDC federation directly to an IAM role. No static AWS_ACCESS_KEY_ID stored in GitHub Secrets — the workflow exchanges a GitHub-signed JWT for temporary AWS credentials.
        </p>
        <CodeBlock language="yaml">
{`name: Build, Scan, and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  ECR_REGISTRY: 123456789.dkr.ecr.us-east-1.amazonaws.com
  ECR_REPOSITORY: payments-api
  AWS_REGION: us-east-1

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # required for OIDC token issuance
      contents: read

    outputs:
      image-tag: \${{ steps.build.outputs.image-tag }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-build
          role-session-name: github-\${{ github.run_id }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        id: build
        run: |
          IMAGE_TAG="\${{ github.sha }}"
          docker build \
            --cache-from $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            --tag $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            .
          echo "image-tag=$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: \${{ env.ECR_REGISTRY }}/\${{ env.ECR_REPOSITORY }}:\${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'   # fail pipeline on Critical/High CVEs

      - name: Push to ECR
        if: github.ref == 'refs/heads/main'  # only push on main, not PRs
        run: |
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:\${{ github.sha }}
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging   # can require reviewers in GitHub environment settings
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (staging account)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::222222222222:role/github-actions-deploy-staging
          aws-region: \${{ env.AWS_REGION }}

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name staging-eks --region \${{ env.AWS_REGION }}

      - name: Deploy to staging
        run: |
          helm upgrade --install payments-api ./charts/payments-api \
            --namespace payments-staging \
            --values charts/payments-api/values-staging.yaml \
            --set image.tag=\${{ needs.build-and-push.outputs.image-tag }} \
            --atomic --wait --timeout 10m`}
        </CodeBlock>
        <HighlightBox>The IAM trust policy for the GitHub OIDC role must specify the exact repo and optionally branch: <code>"token.actions.githubusercontent.com:sub": "repo:myorg/payments-api:ref:refs/heads/main"</code>. Without the branch condition, any branch in the repo can assume the role — including feature branches. Use separate roles for PR builds (read-only ECR login) and main branch deploys (push to ECR, deploy to staging).</HighlightBox>
      </Accordion>

      <Accordion title="GitOps CD vs Push-Based CD" icon={GitBranch}>
        <CompareTable
          headers={['Aspect', 'Push-Based (Helm in CI)', 'GitOps (ArgoCD)']}
          rows={[
            ['Who deploys', 'CI pipeline runs helm upgrade directly', 'ArgoCD controller watches Git, applies changes to cluster'],
            ['Cluster credentials in CI', 'Yes — kubeconfig or role ARN in CI secrets', 'No — ArgoCD runs inside the cluster, pull model'],
            ['Drift detection', 'None — CI only runs on code push', 'Continuous — ArgoCD detects and optionally auto-heals'],
            ['Multi-cluster', 'Complex — need creds for each cluster in CI', 'Clean — ArgoCD manages multiple clusters from one control plane'],
            ['Audit trail', 'CI job logs + CloudTrail', 'Git history is the canonical audit log; ArgoCD logs sync events'],
            ['Rollback mechanism', 'helm rollback or re-run pipeline with old SHA', 'Git revert → ArgoCD syncs old state'],
          ]}
        />
        <HighlightBox type="tip">The recommended hybrid: CI handles the artifact side (build, scan, push image to ECR). CD is GitOps — CI updates the image tag in the Git config repo, ArgoCD detects the change and deploys. This separates concerns cleanly: CI owns artifacts, Git owns desired state, ArgoCD owns reconciliation. Cluster credentials never leave the cluster.</HighlightBox>
        <CodeBlock language="bash">
{`# CI step: update image tag in config repo (GitOps CD pattern)
# After successful image push, CI updates the manifest repo

git clone https://x-access-token:$GH_TOKEN@github.com/myorg/k8s-config.git
cd k8s-config

# Update image tag using yq (safer than sed for YAML)
yq e ".image.tag = \"${GITHUB_SHA}\"" -i apps/payments-api/values-prod.yaml

git add apps/payments-api/values-prod.yaml
git commit -m "chore: update payments-api to ${GITHUB_SHA}

Automated update from ${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

git push

# ArgoCD detects the commit (via webhook or polling every 3 minutes)
# and syncs the Rollout/Deployment to the new image tag`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Artifact Management — ECR Lifecycle and Caching" icon={Terminal}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">ECR lifecycle policies:</span> Without lifecycle policies, ECR repositories grow unbounded. Define rules: keep the last 30 tagged images, keep images tagged with main-*, expire any image older than 90 days. This prevents storage costs from accumulating over months.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">BuildKit cache in CI:</span> Docker's layer cache is local by default. Stateless CI runners start cold on every build, re-downloading and re-building every layer. Use BuildKit's inline cache (<code>--cache-from</code> with the <code>latest</code> tag) or GitHub Actions cache (<code>type=gha</code>) to persist cache between builds. This can reduce build times by 50-80%.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Image signing:</span> Use Cosign (from Sigstore) to sign images after build and verify the signature before deployment. The policy engine (OPA, Kyverno) can enforce that only signed images from your registry are allowed to run in production namespaces. This prevents supply chain attacks where a compromised image is pushed to your registry.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# ECR lifecycle policy — Terraform
resource "aws_ecr_lifecycle_policy" "payments_api" {
  repository = aws_ecr_repository.payments_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 50 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "main"]
          countType     = "imageCountMoreThan"
          countNumber   = 50
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Pipeline Security — Supply Chain Hardening" icon={Shield}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Pin Action versions to SHA:</span> <code>uses: actions/checkout@v4</code> is mutable — the tag can be re-pointed to a different commit. <code>uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11</code> is immutable. Pin third-party Actions to SHAs for supply chain security.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Minimal workflow permissions:</span> GitHub workflows default to broad permissions if not specified. Always set <code>permissions</code> at the workflow or job level to the minimum required. A read-only workflow that accidentally has write access to your repo is a risk.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Secret scanning:</span> Enable GitHub Advanced Security secret scanning (or use truffleHog / gitleaks in CI) to detect accidentally committed credentials. Set up a pre-commit hook locally with <code>detect-secrets scan</code> to catch secrets before they are committed.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Dependency review:</span> GitHub's dependency review action (or OWASP Dependency Check) flags new dependencies with known vulnerabilities in PRs before they are merged. This is earlier in the cycle than image scanning — catch vulnerable deps before they enter the codebase.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# Hardened workflow permissions example
name: Secure Build
permissions:
  contents: read        # read repository code only
  id-token: write       # OIDC token for AWS authentication
  packages: none        # no GitHub Packages access
  security-events: write  # write SARIF security scan results

jobs:
  build:
    permissions:
      contents: read    # job-level override if needed
      id-token: write`}
        </CodeBlock>
        <HighlightBox type="warn">Storing AWS credentials as GitHub Secrets (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY) is the old pattern. These are long-lived static credentials — if a workflow is compromised, the attacker has persistent AWS access. OIDC federation is the replacement: credentials are ephemeral (1 hour), scoped to the exact repo and branch, and do not require any manual secret rotation.</HighlightBox>
      </Accordion>

      <Accordion title="Deployment Strategies in CI/CD" icon={AlertTriangle}>
        <CompareTable
          headers={['Strategy', 'How CI Triggers It', 'Rollback in CI', 'Risk']}
          rows={[
            ['Rolling update (K8s default)', 'helm upgrade with new image tag', 'helm rollback <release> <revision>', 'Medium — gradual replacement, no traffic control'],
            ['Canary (Argo Rollouts)', 'Update image tag in Rollout resource; Rollouts controller manages steps', 'kubectl argo rollouts abort <rollout>', 'Low — controlled traffic split with automated analysis'],
            ['Blue-green (Argo Rollouts)', 'Update Rollout; manual promotion step in CI', 'kubectl argo rollouts abort; traffic switches back instantly', 'Low for traffic, Medium for resources (2x during deploy)'],
            ['Feature flags', 'Deploy code, enable flag separately via LaunchDarkly/Flagsmith', 'Disable flag — no redeploy needed', 'Very low — separate code deployment from feature activation'],
          ]}
        />
        <HighlightBox>The safest deploy sequence for high-traffic services: (1) Deploy to staging with Argo Rollouts canary. (2) Run automated analysis against staging traffic. (3) On promotion, open a PR to update prod image tag in config repo. (4) After PR review and merge, ArgoCD syncs prod with the canary rollout. (5) Argo Rollouts runs the production canary with real traffic and real metrics. (6) Auto-promote or abort based on analysis results. This entire process is auditable, reversible, and requires no manual kubectl commands in production.</HighlightBox>
      </Accordion>
    </div>
  );
}
