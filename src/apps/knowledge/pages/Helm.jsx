import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import NotesBox from '../components/NotesBox';
import HighlightBox from '../components/HighlightBox';
import CompareTable from '../components/CompareTable';
import CodeBlock from '../components/CodeBlock';

export default function Helm() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">{'\u26F5'} Kubernetes</div>
        <h1>Helm</h1>
        <p>The Kubernetes package manager. Helm templates K8s manifests, manages releases, handles upgrades and rollbacks, and is the standard way to install third-party apps in a cluster.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem',
          body: "Deploying the same app to dev/staging/prod requires different values (image tag, replica count, resource limits) but identical structure. Without Helm you either duplicate YAML or write fragile sed scripts. Helm separates structure (templates) from values, and tracks release history so you can roll back."
        },
        {
          title: 'What Helm Actually Is',
          body: "Helm is a client-side templating engine + release manager. helm install renders templates with your values and sends the result to the K8s API. It stores release metadata in Secrets in the cluster so it can track history and do diffs."
        }
      ]} />

      <Accordion title="Chart Structure" icon={'\uD83D\uDCC1'} defaultOpen={true}>
        <CodeBlock>{`my-app/
├── Chart.yaml          # chart name, version, appVersion, dependencies
├── values.yaml         # default values — override per environment
├── values-prod.yaml    # production overrides (not in chart, passed with -f)
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl    # named templates (partials) — reusable snippets
│   └── NOTES.txt       # shown after install — usage instructions
└── charts/             # dependencies (subcharts) vendored here`}</CodeBlock>
        <HighlightBox type="tip"><strong>Key pattern:</strong> Keep <code>values.yaml</code> as a full set of safe defaults. Use <code>-f values-prod.yaml</code> to override only what differs per environment. Never put secrets in values files.</HighlightBox>
      </Accordion>

      <Accordion title="Templating — The Key Patterns" icon={'\uD83D\uDCDD'}>
        <CodeBlock>{`# values.yaml
replicaCount: 2
image:
  repository: myapp
  tag: "1.0.0"
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}    # from _helpers.tpl
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}`}</CodeBlock>
        <HighlightBox type="warn"><strong>Common mistake:</strong> Forgetting <code>nindent</code> after <code>toYaml</code> — this breaks YAML indentation and the template renders invalid manifests. Always pipe blocks through <code>nindent N</code>.</HighlightBox>
      </Accordion>

      <Accordion title="Helm Lifecycle — Install, Upgrade, Rollback" icon={'\uD83D\uDD04'}>
        <CodeBlock>{`# Install (or upgrade if exists) — the idempotent pattern
helm upgrade --install my-app ./my-app \\
  -n production \\
  -f values-prod.yaml \\
  --set image.tag=v2.1.0 \\
  --atomic \\          # roll back automatically if upgrade fails
  --timeout 5m \\
  --wait              # wait until all pods are Ready

# Check release history
helm history my-app -n production

# Roll back to previous revision
helm rollback my-app 2 -n production

# Dry run — see what would be applied
helm upgrade --install my-app ./my-app --dry-run --debug`}</CodeBlock>
        <HighlightBox type="tip"><strong>Real-world tip:</strong> Always use <code>--atomic</code> in CI/CD. Without it, a failed upgrade leaves the release in a broken state and the next <code>helm upgrade</code> will fail because the previous one never finished. <code>--atomic</code> auto-rolls back on failure.</HighlightBox>
        <NotesBox id="helm-lifecycle" placeholder="How did you use Helm? Did you write your own charts or use community charts? How did you manage values per environment?" />
      </Accordion>

      <Accordion title="Helm Hooks — Real Use Cases" icon={'\uD83E\uDE9D'}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Hooks let you run Jobs at specific points in the release lifecycle. Common real-world uses:
        </p>
        <CompareTable
          headers={['Hook', 'When It Runs', 'Real Use Case']}
          rows={[
            ['<code>pre-install</code>', 'Before any resources are created', 'DB schema migration, wait for dependency to be ready'],
            ['<code>post-install</code>', 'After all resources are created', 'Seed initial data, send Slack deploy notification'],
            ['<code>pre-upgrade</code>', 'Before an upgrade', 'DB migration before new code is deployed'],
            ['<code>post-upgrade</code>', 'After upgrade completes', 'Cache warm-up, smoke test'],
            ['<code>pre-delete</code>', 'Before resources are deleted', 'Backup data, drain connections'],
          ]}
        />
        <HighlightBox type="warn"><strong>Hook gotcha:</strong> Hook Jobs are not deleted automatically (by default). They pile up and can block future deploys if the hook job name is reused. Set <code>helm.sh/hook-delete-policy: before-hook-creation</code> to auto-clean the old job before creating the new one.</HighlightBox>
      </Accordion>

      <Accordion title="Interview Q&A" icon={'\uD83D\uDCAC'}>
        <HighlightBox type="info">
          <strong>Q: How do you manage different values per environment with Helm?</strong><br /><br />
          {'`'}We have a base <code>values.yaml</code> with safe defaults, and per-environment override files (<code>values-prod.yaml</code>, <code>values-staging.yaml</code>). CI/CD runs <code>helm upgrade --install -f values-$ENV.yaml --set image.tag=$GIT_SHA</code>. We never hardcode environment-specific values in the chart itself — that would make the chart environment-aware.{`"`}
        </HighlightBox>
        <HighlightBox type="info">
          <strong>Q: What happens when a Helm upgrade fails mid-way?</strong><br /><br />
          {`"`}Without <code>--atomic</code>, the release is left in a FAILED state. The next upgrade attempt will also fail because Helm won't upgrade a release that's in a failed state — you have to manually rollback first. With <code>--atomic</code>, Helm automatically rolls back on failure and the release stays on the last good revision. We always use <code>--atomic</code> in pipelines.{`"`}
        </HighlightBox>
      </Accordion>
    </div>
  );
}
