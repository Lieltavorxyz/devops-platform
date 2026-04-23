import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { GitBranch, RefreshCw, Lock, Workflow, Settings } from 'lucide-react';

export default function ArgoCD() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">GitOps</div>
        <h1>ArgoCD</h1>
        <p>How ArgoCD's reconciliation loop works, Application and ApplicationSet design, sync strategies, and secrets handling in a GitOps workflow.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Why GitOps / Why ArgoCD',
          body: 'Push-based CD requires cluster credentials in your CI system — a compromise point. Pull-based GitOps (ArgoCD) keeps credentials inside the cluster and pulls desired state from Git. Every change is a PR with code review, audit trail, and instant rollback by reverting a commit.'
        },
        {
          title: 'The Reconciliation Model',
          body: 'ArgoCD runs a controller that continuously compares what is in Git against what is in the cluster. When they diverge (drift), it can auto-sync back to Git or alert for manual reconciliation. This is the guarantee: Git is always the source of truth, not whatever was last applied.'
        }
      ]} />

      <Accordion title="Application vs ApplicationSet" icon={GitBranch} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          An Application is the fundamental ArgoCD unit — it watches one Git path and syncs to one cluster/namespace. An ApplicationSet is a template that generates multiple Applications from a generator, eliminating boilerplate when you have many services or many environments.
        </p>
        <CodeBlock language="yaml">
{`# Single Application — watches a Helm chart in Git
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-api-prod
  namespace: argocd
spec:
  project: payments-team
  source:
    repoURL: https://github.com/myorg/k8s-config
    targetRevision: main
    path: apps/payments-api
    helm:
      valueFiles:
        - values-prod.yaml
      parameters:
        - name: image.tag
          value: "abc1234"    # updated by CI after successful image build
  destination:
    server: https://kubernetes.default.svc
    namespace: payments-prod
  syncPolicy:
    automated:
      prune: true       # delete resources removed from Git
      selfHeal: true    # revert manual changes back to Git state
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# ApplicationSet — generates an Application per directory in the repo
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/k8s-config
        revision: main
        directories:
          - path: "apps/*"   # generates one Application per directory under apps/
  template:
    metadata:
      name: "{{path.basename}}-prod"
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/k8s-config
        targetRevision: main
        path: "{{path}}"
        helm:
          valueFiles:
            - values-prod.yaml
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}-prod"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true`}
        </CodeBlock>
        <HighlightBox>ApplicationSet generators: git directory (one app per folder), git file (one app per matching JSON/YAML file), list (explicit list of values), cluster (one app per registered cluster), matrix (cartesian product of two generators — e.g., all services × all clusters). The matrix generator is the cleanest way to manage many services across many clusters.</HighlightBox>
      </Accordion>

      <Accordion title="App of Apps Pattern — Bootstrapping a Cluster" icon={Workflow}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The App of Apps pattern uses a root Application that manages other Applications. It solves the chicken-and-egg problem of bootstrapping ArgoCD applications on a fresh cluster from a single git commit.
        </p>
        <CodeBlock language="yaml">
{`# Root Application — watched by ArgoCD after bootstrapping
# It manages all other Applications in the cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/k8s-config
    targetRevision: main
    path: clusters/prod/apps   # directory containing Application manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd          # ArgoCD manages Applications in argocd namespace
  syncPolicy:
    automated:
      prune: true
      selfHeal: true`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# Bootstrapping a new cluster — one-time manual step
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Apply the root application — ArgoCD then manages everything else
kubectl apply -f root-app.yaml -n argocd

# After this, all cluster state is driven from Git — no more kubectl apply`}
        </CodeBlock>
        <HighlightBox type="tip">The App of Apps pattern means a new cluster can be fully configured from a single git repo with one kubectl command. ArgoCD reconciles the rest. This is essential for multi-cluster GitOps where you need clusters to be identical and reproducible.</HighlightBox>
      </Accordion>

      <Accordion title="Sync Strategies, Self-Heal, and Waves" icon={RefreshCw}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Auto-sync vs manual sync:</span> Auto-sync applies changes as soon as Git changes, within the default 3-minute polling interval (or immediately with Git webhooks). Manual sync requires someone to click Sync in the UI or run <code>argocd app sync</code>. Most teams: auto-sync in staging, manual sync in production with required PR approval.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Self-heal:</span> When enabled, ArgoCD reverts any changes made directly to the cluster (via kubectl apply or Helm) that do not match Git. This enforces the GitOps contract strictly. Necessary for compliance but frustrating when debugging — you make a change and ArgoCD reverts it seconds later.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Prune:</span> When enabled, ArgoCD deletes resources from the cluster that have been removed from Git. Without prune, removing a Deployment from your chart leaves it running in the cluster forever. Enable prune carefully — a misconfigured delete in Git will delete the production resource.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Sync waves:</span> Resources within an Application are ordered by sync wave annotation. Wave -1 runs before wave 0, which runs before wave 1. ArgoCD waits for each wave to be healthy before proceeding to the next. Use for: namespaces before workloads, CRDs before CRs, secrets before Deployments.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# Sync wave annotations — resources in wave 0 are applied first
# CRD must exist before CustomResource can be created
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"   # applied before anything else
---
# Database migration Job — runs before Deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/hook: PreSync       # runs before sync, not as a wave
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
---
# Deployment — in wave 1, applied after wave 0 is healthy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  annotations:
    argocd.argoproj.io/sync-wave: "1"`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Secrets Management in a GitOps Workflow" icon={Lock}>
        <HighlightBox type="warn">Never store actual secret values in Git, even encrypted. Git history is forever. A secret that was committed, then removed, still exists in git history and must be treated as compromised.</HighlightBox>
        <CompareTable
          headers={['Approach', 'How It Works', 'Git Contains', 'Verdict']}
          rows={[
            ['<strong>External Secrets Operator</strong>', 'CRD syncs secrets from AWS Secrets Manager, Vault, or SSM into K8s Secrets', 'ExternalSecret CR — path reference only, no values', 'Preferred — secrets never touch Git'],
            ['<strong>Sealed Secrets</strong>', 'Bitnami controller holds a cluster keypair. You seal secrets with the public key; only the cluster can decrypt', 'Encrypted ciphertext — safer than plaintext but still in Git', 'Acceptable for simpler setups; rotation is manual'],
            ['<strong>Vault + ESO</strong>', 'ESO syncs from HashiCorp Vault using Kubernetes auth method', 'ExternalSecret CR with Vault path', 'Best for multi-cloud or existing Vault investment'],
            ['<strong>SOPS</strong>', 'File-level encryption with age or PGP keys; decrypted at sync time by ArgoCD SOPS plugin', 'Encrypted YAML — requires ArgoCD plugin setup', 'Works, but key management and plugin maintenance add overhead'],
            ['<strong>Plain K8s Secrets in Git</strong>', 'Base64-encoded YAML committed to the repo', 'Readable by anyone with Git access', 'Never — base64 is not encryption'],
          ]}
        />
        <CodeBlock language="yaml">
{`# ExternalSecret — what lives in Git (no secret values)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payments-db-credentials
  namespace: payments-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payments-db-credentials    # K8s Secret created by ESO
    creationPolicy: Owner
  data:
    - secretKey: POSTGRES_USER
      remoteRef:
        key: prod/payments/database
        property: username
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: prod/payments/database
        property: password`}
        </CodeBlock>
        <HighlightBox type="tip">The GitOps chicken-and-egg for secrets: ESO itself needs credentials to call AWS Secrets Manager. The solution is IRSA — ESO uses the Kubernetes ServiceAccount identity (projected token) exchanged with AWS STS via OIDC. No static credentials in the cluster. The IRSA role ARN is configured in the ClusterSecretStore, which is a non-secret value safe to commit.</HighlightBox>
      </Accordion>

      <Accordion title="Projects — Multi-Team RBAC in ArgoCD" icon={Lock}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          ArgoCD Projects provide RBAC boundaries within ArgoCD. A project restricts which Git repos, which target clusters/namespaces, and which resources a team's Applications can manage.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payments-team
  namespace: argocd
spec:
  description: Applications owned by the payments team
  sourceRepos:
    - https://github.com/myorg/k8s-config    # only this repo
  destinations:
    - namespace: payments-*    # only payments-* namespaces
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace           # can create namespaces
  namespaceResourceBlacklist:
    - group: ''
      kind: ResourceQuota       # cannot modify quotas (platform team owns these)
  roles:
    - name: developer
      description: Read-only access
      policies:
        - p, proj:payments-team:developer, applications, get, payments-team/*, allow
        - p, proj:payments-team:developer, applications, sync, payments-team/*, allow
      groups:
        - payments-developers   # SSO group`}
        </CodeBlock>
        <HighlightBox>Projects are the primary way to give teams self-service ArgoCD access without giving them cluster-admin. A team can create and sync their own Applications within their project boundaries, but cannot touch other teams' namespaces or cluster-scoped resources like ClusterRoles.</HighlightBox>
      </Accordion>

      <Accordion title="Image Updater and CI Integration" icon={Settings}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Pure GitOps means CI updates the image tag in Git, ArgoCD deploys from Git. This is the recommended pattern. ArgoCD Image Updater is an alternative that lets ArgoCD watch a registry and update the tag automatically — useful but bypasses the Git audit trail for image changes.
        </p>
        <CodeBlock language="bash">
{`# CI pipeline approach (recommended): update image tag in Git
# After successful image build and push:
git config --global user.email "ci@myorg.com"
git config --global user.name "CI Bot"
git clone https://github.com/myorg/k8s-config
cd k8s-config

# Update image tag in the values file
sed -i "s/tag: .*/tag: ${GIT_SHA}/" apps/payments-api/values-prod.yaml
git add apps/payments-api/values-prod.yaml
git commit -m "chore: update payments-api image to ${GIT_SHA}"
git push

# ArgoCD detects the Git change (via webhook or polling) and syncs`}
        </CodeBlock>
        <HighlightBox type="tip">Configure ArgoCD with Git webhooks rather than the default 3-minute polling interval. Webhooks trigger sync within seconds of a Git push. Use the ArgoCD GitHub webhook URL from the ArgoCD server and configure it in your Git provider. This eliminates the deploy lag that teams find frustrating with GitOps.</HighlightBox>
      </Accordion>
    </div>
  );
}
