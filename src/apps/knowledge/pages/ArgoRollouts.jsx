import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { GitMerge, BarChart2, Network, ArrowRightLeft, AlertTriangle, Activity } from 'lucide-react';

export default function ArgoRollouts() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">GitOps</div>
        <h1>Argo Rollouts</h1>
        <p>Traffic-controlled deployments for Kubernetes — canary releases, blue-green switches, and automated analysis to catch regressions before they hit all users.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'The Problem with Rolling Updates',
          body: 'A Kubernetes rolling update gradually replaces pods but has no traffic control — 10% of pods updated means approximately 10% of traffic hitting the new version immediately. There is no automated check to see if the new version is healthy before proceeding. If it is broken, you discover it only after serving bad responses to some users.'
        },
        {
          title: 'What Argo Rollouts Adds',
          body: 'Traffic control during deployments. Send a controlled percentage to the new version, query Prometheus (or Datadog, Cloudwatch, Wavefront) for error rate and latency, and automatically promote or abort based on the result. Works with any ingress controller or service mesh.'
        }
      ]} />

      <Accordion title="Canary Deployment — Full Configuration" icon={GitMerge} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          A canary sends a small percentage of traffic to the new version. Metrics are checked at each step. If metrics are healthy, the percentage increases. If metrics fail the threshold, the rollout aborts and traffic returns to the stable version.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payments-api
spec:
  replicas: 20
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: payments-api
          image: payments-api:v2.1.0
  strategy:
    canary:
      canaryService: payments-api-canary   # Service pointing to canary pods
      stableService: payments-api-stable   # Service pointing to stable pods
      trafficRouting:
        nginx:
          stableIngress: payments-api-ingress
      analysis:
        startingStep: 2   # start analysis at step index 2 (after first pause)
        templates:
          - templateName: success-rate
          - templateName: latency-p99
        args:
          - name: service-name
            value: payments-api-canary
      steps:
        - setWeight: 5          # 5% canary traffic
        - pause: {duration: 5m} # observe for 5 minutes
        - setWeight: 20         # ramp to 20%
        - pause: {duration: 10m}
        - setWeight: 50         # half-and-half
        - pause: {duration: 10m}
        - setWeight: 100        # full promotion`}
        </CodeBlock>
        <CodeBlock language="yaml">
{`# AnalysisTemplate — the automated health check
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      # Rollout aborts if success rate drops below 99% for 3 consecutive checks
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc.cluster.local:9090
          query: |
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}",
                status!~"5.."
              }[5m]
            )) /
            sum(rate(
              http_requests_total{service="{{args.service-name}}"}[5m]
            ))
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency-p99
spec:
  args:
    - name: service-name
  metrics:
    - name: p99-latency
      interval: 1m
      successCondition: result[0] <= 0.5    # p99 must be under 500ms
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc.cluster.local:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(
                http_request_duration_seconds_bucket{service="{{args.service-name}}"}[5m]
              )) by (le)
            )`}
        </CodeBlock>
        <HighlightBox type="warn">Analysis only catches regressions visible in your metrics. Bugs that affect a small percentage of edge-case users, logic errors that produce wrong data (not errors), or security vulnerabilities will not be caught by error rate analysis. Analysis is not a substitute for integration tests — it is a production traffic safety net.</HighlightBox>
      </Accordion>

      <Accordion title="Blue-Green Deployment" icon={ArrowRightLeft}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Blue-green runs two identical environments simultaneously. The blue environment serves production traffic. The green environment is the new version, fully deployed but receiving no traffic. Switching traffic is atomic — instant cutover with instant rollback.
        </p>
        <CodeBlock language="yaml">
{`apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: auth-service
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: auth-service-active      # receives production traffic
      previewService: auth-service-preview    # receives preview/smoke test traffic
      autoPromotionEnabled: false             # requires manual promotion
      prePromotionAnalysis:                   # run analysis on preview before promoting
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: auth-service-preview
      scaleDownDelaySeconds: 300   # keep old version running 5 min after promotion
      # In case you need to roll back immediately after promotion`}
        </CodeBlock>
        <CompareTable
          headers={['Aspect', 'Blue-Green', 'Canary']}
          rows={[
            ['Traffic during deploy', '100% stable until instant switch', 'Gradual percentage increase (5% → 20% → 50% → 100%)'],
            ['Resource cost', '2x pod count during deploy', 'Small canary count (e.g., 2 pods vs 18 stable)'],
            ['Rollback mechanism', 'Instant — switch activeService selector back', 'Abort rollout — canary pods scaled down'],
            ['User exposure to bugs', 'Zero during testing, 100% after switch', 'Small percentage exposed during canary steps'],
            ['DB schema changes', 'Requires expand/contract pattern', 'Requires backward-compatible schema'],
            ['Best for', 'Breaking API changes, compliance, atomic switches', 'Gradual confidence-building on feature releases'],
          ]}
        />
        <HighlightBox type="warn">Blue-green and database migrations: if the new version requires a schema change, you cannot atomically switch traffic — the old version cannot read the new schema. Always use the expand/contract (parallel change) pattern: (1) Add new columns/tables while old code still works. (2) Deploy new code that uses new schema. (3) Remove old columns once old code is gone. This can take multiple releases but is the only safe approach.</HighlightBox>
      </Accordion>

      <Accordion title="Traffic Management — Ingress and Service Mesh Integration" icon={Network}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Argo Rollouts requires a traffic provider to control the actual percentage split. Without one, the weight is approximated by the ratio of canary to stable pods — less precise and unreliable at low percentages.
        </p>
        <CompareTable
          headers={['Provider', 'How Split Works', 'Routing Capabilities', 'Setup Complexity']}
          rows={[
            ['<strong>NGINX Ingress</strong>', 'Annotation-based canary: nginx.ingress.kubernetes.io/canary-weight', 'Weight-based only', 'Low — just annotation on Ingress'],
            ['<strong>AWS ALB Ingress</strong>', 'ALB weighted target groups', 'Weight-based, stickiness', 'Medium — ALB Ingress Controller required'],
            ['<strong>Istio</strong>', 'VirtualService weight on stable/canary subsets', 'Weight, headers, cookies, source IP', 'High — requires Istio mesh'],
            ['<strong>Linkerd</strong>', 'TrafficSplit SMI resource', 'Weight-based', 'Medium — requires Linkerd mesh'],
            ['<strong>None (replica ratio)</strong>', 'Kube proxy routes randomly; 1 canary / 10 total ≈ 10%', 'Weight approximation only', 'Zero — fallback behavior'],
          ]}
        />
        <CodeBlock language="yaml">
{`# NGINX-based traffic splitting (most common setup)
# Rollout manages two Ingresses — stable gets normal annotations,
# canary Ingress gets nginx.ingress.kubernetes.io/canary annotations

# The Rollouts controller automatically creates and manages this:
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments-api-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"  # updated per rollout step
spec:
  rules:
    - host: payments.mycompany.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: payments-api-canary   # canary Service
                port:
                  number: 80`}
        </CodeBlock>
      </Accordion>

      <Accordion title="Analysis — Datadog, CloudWatch, and Web Providers" icon={BarChart2}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          AnalysisTemplates support multiple metric providers beyond Prometheus. Use the right provider for your observability stack.
        </p>
        <CodeBlock language="yaml">
{`# Datadog metrics provider
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-datadog
spec:
  args:
    - name: env
  metrics:
    - name: error-rate
      interval: 1m
      successCondition: result <= 0.01    # under 1% error rate
      failureLimit: 3
      provider:
        datadog:
          apiVersion: v2
          query: |
            sum:trace.web.request.errors{env:{{args.env}},service:payments-api}.as_rate() /
            sum:trace.web.request.hits{env:{{args.env}},service:payments-api}.as_rate()
---
# Web (HTTP) provider — call any API that returns a number
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: smoke-test
spec:
  metrics:
    - name: smoke-test-pass
      provider:
        web:
          url: https://payments-canary.mycompany.com/health/deep
          jsonPath: "{$.status}"
          headers:
            - key: X-Internal-Token
              valueFrom:
                secretKeyRef:
                  name: smoke-test-token
                  key: token
      successCondition: result == "healthy"
      failureLimit: 1`}
        </CodeBlock>
        <HighlightBox type="tip">Combine multiple AnalysisTemplates in a single rollout for defense in depth: one template checks error rate, another checks p99 latency, a third runs a smoke test against a business-critical endpoint. All must pass for the rollout to proceed. Any single failure aborts and rolls back.</HighlightBox>
      </Accordion>

      <Accordion title="Operational Commands and Debugging" icon={Activity}>
        <CodeBlock language="bash">
{`# Install Argo Rollouts (kubectl plugin)
brew install argoproj/tap/kubectl-argo-rollouts

# Watch a rollout in real-time
kubectl argo rollouts get rollout payments-api --watch

# Promote a paused rollout to the next step
kubectl argo rollouts promote payments-api

# Manually abort a rollout (scales canary to 0, stable stays)
kubectl argo rollouts abort payments-api

# Retry a failed rollout (useful after fixing the root cause)
kubectl argo rollouts retry rollout payments-api

# Set image to trigger a new rollout
kubectl argo rollouts set image payments-api payments-api=payments-api:v2.2.0

# Get full rollout status including analysis run results
kubectl argo rollouts get rollout payments-api

# View analysis runs for a rollout
kubectl get analysisrun -n payments-prod`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Rollout vs Deployment:</span> A Rollout is a drop-in replacement for a Deployment — same pod spec and selector. You cannot use both for the same workload. When migrating from Deployment to Rollout, you delete the Deployment and create the Rollout with the same pod template. ArgoCD manages this transition cleanly if you change the resource kind in Git.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Debugging a failed analysis:</span> When an AnalysisRun fails, check its status: <code>kubectl describe analysisrun payments-api-REVISION</code>. It shows each metric's last value, the success condition, and how many failures have occurred. If the Prometheus query is wrong, fix the AnalysisTemplate and retry.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Header-based canary testing:</span> Before exposing the canary to real user traffic, route internal testers to it by matching on a specific header (with Istio or a header-capable ingress). This lets your QA team verify the new version before any real user hits it.</div>
          </li>
        </ul>
        <HighlightBox>Argo Rollouts pairs naturally with ArgoCD. ArgoCD manages the Rollout manifest from Git. When the image tag changes in Git, ArgoCD syncs the Rollout resource, which triggers Argo Rollouts to begin the canary or blue-green process. You get GitOps audit trail plus traffic-controlled deployments in one workflow.</HighlightBox>
      </Accordion>

      <Accordion title="Production Gotchas" icon={AlertTriangle}>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">canaryService and stableService must exist before the Rollout:</span> The two Services must be created before applying the Rollout manifest. If they do not exist, the Rollout controller cannot configure traffic routing and the rollout is stuck. Create them in the same namespace with matching selectors.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Analysis during low traffic:</span> AnalysisTemplates that divide by total request count will return NaN or fail during periods of zero traffic (nights, weekends, after scale-to-zero). Handle this with a <code>successCondition</code> that accounts for empty results: use <code>default(result, 1.0)</code> in Prometheus to return 1.0 when there is no data.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Rollout gets stuck at a pause step:</span> A <code>pause: {}</code> (no duration) requires manual promotion. If your CI pipeline expects automatic promotion, it will wait forever. Always set a duration on pause steps in automated pipelines, or add a promotion step in CI with <code>kubectl argo rollouts promote</code>.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">HPA with Rollouts:</span> Do not target an HPA at the Rollout's stable or canary Services — target it at the Rollout resource itself. The Rollout controller manages replica counts for canary/stable pods. An HPA fighting with the Rollout over replica counts causes scaling conflicts.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
