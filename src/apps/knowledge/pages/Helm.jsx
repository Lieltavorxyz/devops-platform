import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { Package, FileCode, RefreshCw, Archive, Zap, AlertTriangle } from 'lucide-react';

export default function Helm() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Kubernetes</div>
        <h1>Helm</h1>
        <p>How Helm templates and release management work, production patterns for values and hooks, and what happens when an upgrade fails.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Problem It Solves',
          body: 'Deploying the same application to dev, staging, and prod requires different images, replica counts, resource limits, and ingress hostnames — but the same structure. Without Helm, you either duplicate YAML or write fragile sed scripts. Helm separates structure (templates) from values and tracks release history so you can diff and roll back.'
        },
        {
          title: 'How Helm Actually Works',
          body: 'Helm is a client-side templating engine and release manager. helm install renders Go templates with your values, sends the resulting Kubernetes manifests to the API server, and stores a release record as a compressed Secret in the target namespace. Every upgrade or rollback is tracked in that release history.'
        }
      ]} />

      <Accordion title="Chart Structure and Organization" icon={FileCode} defaultOpen={true}>
        <CodeBlock language="bash">
{`my-app/
├── Chart.yaml          # name, version, appVersion, description, dependencies
├── values.yaml         # default values — full set of safe defaults
├── templates/
│   ├── _helpers.tpl    # named templates (macros) — reused across templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── configmap.yaml
│   └── NOTES.txt       # printed to terminal after install — usage instructions
└── charts/             # subcharts (vendored dependencies)`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Chart.yaml fields that matter:</span> <code>version</code> is the chart version (changes with template changes). <code>appVersion</code> is the application version (informational only — does not affect behavior). <code>dependencies</code> lists subcharts with their versions and repositories.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">_helpers.tpl:</span> Contains <code>define</code> blocks that create named templates. The standard pattern is to define a fullname helper and a labels helper, then include them in every template. This keeps names consistent and reduces duplication.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">values.yaml philosophy:</span> Should contain safe, production-ready defaults for everything. No empty required fields. Every field a caller might need to override should be documented with a comment. Callers pass override files — not base values.</div>
          </li>
        </ul>
        <CodeBlock language="yaml">
{`# Chart.yaml
apiVersion: v2
name: payments-api
description: Payment processing API service
type: application
version: 1.4.2        # chart version — bump when templates change
appVersion: "2.1.0"   # app version — informational

dependencies:
  - name: postgresql
    version: "13.2.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled   # only include if enabled in values`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Templating — Patterns and Pitfalls" icon={Package}>
        <CodeBlock language="yaml">
{`# templates/_helpers.tpl
{{- define "myapp.name" -}}
{{ .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "myapp.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "myapp.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

# templates/deployment.yaml — using the helpers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "myapp.name" . }}
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">nindent after toYaml:</span> <code>toYaml</code> converts a values map to YAML text. Without <code>nindent N</code>, the indentation is wrong and the resulting manifest is invalid YAML. Always pipe block values through <code>nindent</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Whitespace control:</span> The <code>-</code> in <code>{'{{-'}</code> and <code>{'-}}'}</code> trims whitespace before/after the block. Without it, extra blank lines appear in the rendered YAML, which is usually harmless but makes the output hard to read. Use <code>{'{{-'}</code> on lines that are pure template logic (no output).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Conditionals for optional resources:</span> Wrap entire resource templates in <code>{'{{- if .Values.ingress.enabled }}'}</code> so they are not rendered when disabled. An ingress with no hostname configured that gets rendered is worse than no ingress.</div>
          </li>
        </ul>
        <HighlightBox type="warn">Template rendering errors produce unhelpful messages like "parsing error." Use <code>helm template . --values values-dev.yaml</code> to render templates locally and see the actual YAML before deploying. Add <code>--debug</code> to see the rendered manifests even on error.</HighlightBox>
      </Accordion>

      <Accordion title="Install, Upgrade, and Rollback" icon={RefreshCw}>
        <CodeBlock language="bash">
{`# Idempotent deploy — install or upgrade in one command
helm upgrade --install my-app ./charts/my-app \
  --namespace production \
  --create-namespace \
  --values values-base.yaml \
  --values values-prod.yaml \
  --set image.tag=${GIT_SHA} \
  --atomic \           # auto-rollback if upgrade fails health checks
  --wait \             # wait until all pods are Ready and Deployments are available
  --timeout 5m         # give up and rollback after 5 minutes

# View release history
helm history my-app --namespace production

# Roll back to the previous revision
helm rollback my-app --namespace production

# Roll back to a specific revision
helm rollback my-app 3 --namespace production

# Dry run — see what would be applied without changing anything
helm upgrade --install my-app ./charts/my-app \
  --values values-prod.yaml \
  --dry-run --debug

# Diff before applying (requires helm-diff plugin)
helm diff upgrade my-app ./charts/my-app --values values-prod.yaml`}
        </CodeBlock>
        <HighlightBox type="warn">Without <code>--atomic</code>, a failed upgrade leaves the release in a FAILED state. The next <code>helm upgrade</code> also fails because Helm will not upgrade a release that is currently in FAILED status — you have to manually rollback first. <code>--atomic</code> auto-rolls back on failure, leaving the release on the last good revision. Always use <code>--atomic</code> in CI/CD pipelines.</HighlightBox>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">How release history is stored:</span> Each Helm release revision is stored as a Kubernetes Secret in the release namespace with label <code>owner: helm</code>. The Secret contains the rendered manifest and metadata. <code>helm history</code> reads these Secrets. If you delete the namespace, you lose the history.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Max history:</span> By default, Helm keeps 10 release revisions. Old Secrets accumulate without bound in older Helm versions. Set <code>--history-max 5</code> on installs or configure it in Helm defaults to prevent Secret buildup.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">--wait semantics:</span> Helm waits for Deployments, StatefulSets, and Jobs to reach their ready state. It polls pod readiness probes. If pods are crashlooping or stuck in Pending, <code>--wait</code> will eventually time out and <code>--atomic</code> will trigger a rollback.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="Values Strategy — Multi-Environment Pattern" icon={Archive}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Helm supports layered values — multiple <code>-f</code> flags, with later files taking precedence. Use this to build a clean override hierarchy without duplicating the full values structure per environment.
        </p>
        <CodeBlock language="yaml">
{`# values.yaml — safe defaults (what runs in any environment)
replicaCount: 2
image:
  repository: 123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api
  tag: ""   # set at deploy time: --set image.tag=abc123
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 256Mi
ingress:
  enabled: true
  host: ""   # must be provided per environment
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 60`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# values-prod.yaml — production overrides only (inherits everything from values.yaml)
replicaCount: 5
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    memory: 1Gi
ingress:
  host: payments.mycompany.com
autoscaling:
  enabled: true
  maxReplicas: 50`}
        </CodeBlock>
        <CodeBlock language="bash">
{`# Deploy: base values + prod overrides + dynamic image tag
helm upgrade --install payments-api ./charts/payments-api \
  --values values.yaml \
  --values values-prod.yaml \
  --set image.tag=${GIT_SHA}`}
        </CodeBlock>
        <HighlightBox type="tip">Never put secrets in values files. Any value that ends up in the Helm release Secret in the cluster is visible to anyone with Secret read access. Use External Secrets Operator or Vault to inject secrets at runtime, and reference them by name in values: <code>existingSecret: my-db-credentials</code>.</HighlightBox>
      </Accordion>

      <Accordion title="Helm Hooks — Database Migrations and Pre/Post Actions" icon={Zap}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Hooks let you run Kubernetes Jobs at specific points in the release lifecycle. The most common real-world use is running database migrations before the new application code starts serving traffic.
        </p>
        <CodeBlock language="yaml">
{`# templates/migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}-migrate-{{ .Release.Revision }}"
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"           # lower = runs first (within same hook type)
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
    # before-hook-creation: delete old job before creating new one (prevents name collision)
    # hook-succeeded: clean up job after it succeeds
spec:
  backoffLimit: 0   # fail fast — don't retry a failed migration
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["python", "manage.py", "migrate"]
          envFrom:
            - secretRef:
                name: database-credentials`}
        </CodeBlock>
        <CompareTable
          headers={['Hook', 'When It Runs', 'Common Use Case']}
          rows={[
            ['pre-install / pre-upgrade', 'Before any resources are created or updated', 'DB schema migration, wait for dependency readiness'],
            ['post-install / post-upgrade', 'After all resources are created and ready', 'Cache warm-up, smoke test, deploy notification'],
            ['pre-delete', 'Before resources are deleted on uninstall', 'Data backup, connection draining, graceful shutdown'],
            ['post-delete', 'After all resources are deleted', 'Clean up external resources not managed by Helm'],
            ['test', 'Only when running helm test', 'Integration tests, connectivity checks'],
          ]}
        />
        <HighlightBox type="warn">Hook job name collision: if you do not include something unique in the job name (like <code>.Release.Revision</code>), the second upgrade will fail because a job with the same name already exists. The <code>before-hook-creation</code> delete policy handles this — it deletes the old job before creating the new one. Use it on all hook jobs.</HighlightBox>
      </Accordion>

      <Accordion title="Production Gotchas and Debugging" icon={AlertTriangle}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">helm upgrade on a non-existent release:</span> Without <code>--install</code>, upgrading a release that does not exist returns an error. In CI pipelines, always use <code>helm upgrade --install</code> so the command is idempotent regardless of whether the release exists.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Resources not managed by Helm:</span> If you create a Kubernetes resource manually with the same name as one in your chart, Helm will error on install because it cannot take ownership. Use <code>helm adopt</code> (Helm 3.13+) or delete and let Helm recreate.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Helm vs kubectl apply conflicts:</span> If ArgoCD or another tool applies changes to resources that Helm manages, the release metadata in the Secret diverges from actual cluster state. Helm will show the release as out of sync. Avoid mixing Helm and raw kubectl applies for the same resources.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Subchart values:</span> Override subchart values by nesting under the subchart name in values.yaml. <code>postgresql.auth.password</code> overrides the <code>postgresql</code> subchart's <code>auth.password</code>. Forgetting the subchart key prefix means the override is silently ignored.</div>
          </li>
        </ul>
        <CodeBlock language="bash">
{`# Debug a release — show the actual rendered manifests stored in the release secret
helm get manifest my-app --namespace production

# Show all values (merged from all sources) used by the current release
helm get values my-app --namespace production --all

# See what Helm would change without applying (requires helm-diff plugin)
helm diff upgrade my-app ./charts/my-app --values values-prod.yaml

# Check release status and events
helm status my-app --namespace production

# List all releases across all namespaces
helm list --all-namespaces`}
        </CodeBlock>
      </Accordion>
    </div>
  );
}
