import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function CiCd() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\u2699\uFE0F'} CI/CD</div>
        <h1>CI/CD Pipelines</h1>
        <p>The automation backbone — build, test, scan, and deploy code changes with confidence and repeatability.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem',
          body: "Manual deploys are slow, error-prone, and unaudited. A good pipeline makes deploying so safe and fast that you do it many times a day without fear. The pipeline is your primary safety net — if it passes, you ship."
        },
        {
          title: 'CI vs CD',
          body: 'CI (Continuous Integration) — every commit triggers build + test. Catches breaks early. CD (Continuous Delivery) — every passing build is deployable. Continuous Deployment — every passing build is deployed automatically, no manual approval.'
        }
      ]} />

      <Accordion title="A Real Pipeline — Stage by Stage" icon={'\uD83D\uDD04'} defaultOpen={true}>
        <CompareTable
          headers={['Stage', 'What Happens', 'Fails On']}
          rows={[
            ['<strong>Lint</strong>', 'Code style, formatting, static analysis', 'Style violations, obvious bugs'],
            ['<strong>Test</strong>', 'Unit + integration tests', 'Test failure, coverage drop below threshold'],
            ['<strong>Build</strong>', 'Docker image built, tagged with git SHA', 'Compile error, Dockerfile issue'],
            ['<strong>Scan</strong>', 'Trivy/Snyk scans image for CVEs', 'Critical/High CVEs in base image or deps'],
            ['<strong>Push</strong>', 'Image pushed to ECR/DockerHub', 'Auth failure, network issue'],
            ['<strong>Deploy Staging</strong>', 'Helm upgrade or ArgoCD sync with new image tag', 'Pod fails to start, health check fails'],
            ['<strong>Smoke Test</strong>', 'Basic HTTP checks against staging', '500 errors, key endpoints down'],
            ['<strong>Deploy Prod</strong>', 'Same as staging, gated by manual approval or auto after staging passes', 'Rollback on failure'],
          ]}
        />
        <HighlightBox type="tip"><strong>Tag strategy:</strong> Tag every image with the git SHA (<code>myapp:a3f2b1c</code>). Never use <code>latest</code> in production — it's not immutable and you lose traceability. Optionally also tag with semver or branch name for human readability.</HighlightBox>
      </Accordion>

      <Accordion title="GitHub Actions — Real Workflow" icon={'\uD83D\uDCDD'}>
        <CodeBlock>{`name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # required for OIDC auth to AWS
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC — no static keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-role
          aws-region: us-east-1

      - name: Build and push to ECR
        run: |
          IMAGE_TAG=\${{ github.sha }}
          aws ecr get-login-password | docker login --username AWS \\
            --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
          docker build -t myapp:\${IMAGE_TAG} .
          docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:\${IMAGE_TAG}

      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name my-cluster --region us-east-1
          helm upgrade --install my-app ./charts/my-app \\
            --set image.tag=\${{ github.sha }} \\
            --atomic --wait`}</CodeBlock>
        <HighlightBox type="tip"><strong>OIDC instead of static keys:</strong> The <code>id-token: write</code> permission + <code>configure-aws-credentials</code> action lets GitHub Actions assume an IAM role via OIDC — no AWS_ACCESS_KEY_ID stored in GitHub secrets. This is the secure pattern. The IAM role's trust policy restricts it to your specific repo and branch.</HighlightBox>
      </Accordion>

      <Accordion title="GitOps CD vs Push-based CD" icon={'\uD83D\uDEA6'}>
        <CompareTable
          headers={['Aspect', 'Push-based (Helm in CI)', 'GitOps (ArgoCD)']}
          rows={[
            ['Who deploys', 'CI pipeline runs helm upgrade', 'ArgoCD watches Git, applies changes'],
            ['Cluster credentials in CI', 'Yes — kubeconfig in CI secrets', 'No — ArgoCD runs in-cluster, pull model'],
            ['Drift detection', 'None — CI only runs on push', 'Continuous — ArgoCD detects and can auto-heal'],
            ['Audit trail', 'CI job logs', 'Git history is the audit log'],
            ['Multi-cluster', 'Complex — need creds for each cluster', 'Clean — ArgoCD manages multiple clusters natively'],
          ]}
        />
        <HighlightBox type="info"><strong>Best practice:</strong> CI builds and pushes the image (push-based for artifacts). CD is GitOps — CI updates the image tag in the Git repo, ArgoCD picks it up and deploys. This separates concerns and keeps cluster credentials out of CI.</HighlightBox>
        <NotesBox id="cicd-gitops" placeholder="What CI/CD tools did you use? GitLab CI? GitHub Actions? Jenkins? How did you handle deploy to multiple envs? Any pipeline failures that caused outages?" />
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info"><strong>Q: How do you ensure a bad deploy doesn't take down production?</strong><br /><br />
        "Multiple layers: (1) Automated tests in CI catch logic errors. (2) Image scanning catches vulnerable deps. (3) Deploy staging first with smoke tests before prod. (4) Use <code>--atomic</code> in Helm or ArgoCD auto-rollback so a failed deploy self-heals. (5) Deployment strategy — rolling update with <code>maxUnavailable: 0</code> means we never take down running pods before new ones are healthy. (6) PodDisruptionBudget ensures minimum replicas during the rollout."</HighlightBox>
        <HighlightBox type="info"><strong>Q: A deploy went out and broke prod. What do you do?</strong><br /><br />
        "Immediate rollback first, investigate second. Either <code>helm rollback</code> or ArgoCD sync to the previous git revision. Alert the team. Once prod is stable, look at what slipped past the pipeline — was it a missing test, a feature that behaves differently under real load, a config difference between staging and prod? Fix the gap in the pipeline so it can't happen again."</HighlightBox>
      </Accordion>
    </div>
  );
}
