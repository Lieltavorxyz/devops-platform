import Accordion from '../components/Accordion';
import ReasoningMap from '../components/ReasoningMap';
import HighlightBox from '../components/HighlightBox';
import CodeBlock from '../components/CodeBlock';
import CompareTable from '../components/CompareTable';
import { BarChart2, Activity, Database, AlertTriangle, Microscope, Settings } from 'lucide-react';

export default function Observability() {
  return (
    <div>
      <div className="page-header">
        <div className="tool-badge">Observability</div>
        <h1>Prometheus, Grafana, and Loki</h1>
        <p>How the open-source observability stack works internally — scraping, storage, querying, alerting, and log aggregation in production Kubernetes environments.</p>
      </div>

      <ReasoningMap cards={[
        {
          title: 'Prometheus',
          body: 'Pull-based time-series metrics database. Every configured interval (default 30s), it calls /metrics on each target and stores the data locally in a compressed time-series format. Evaluates alert rules against stored data. TSDB is local by default — use Thanos or Cortex for long-term storage and multi-cluster aggregation.'
        },
        {
          title: 'Grafana',
          body: 'Visualization and alerting layer. Connects to Prometheus (and Loki, Tempo, Jaeger) as data sources. Renders dashboards from PromQL queries. Dashboards-as-code via JSON or Grafonnet. Unified alerting via Alertmanager integration or its own alert engine.'
        },
        {
          title: 'Loki',
          body: "Log aggregation with a Prometheus-like design philosophy. Labels-based indexing — Loki does not index log content, only metadata (namespace, pod, container). This makes ingest fast and cheap. Query via LogQL — similar syntax to PromQL. Grafana is the primary query UI."
        }
      ]} />

      <Accordion title="How Prometheus Scraping Works Internally" icon={Microscope} defaultOpen={true}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Prometheus uses a pull model: it is responsible for fetching metrics from targets, not the other way around. Service discovery tells Prometheus where to find targets. ServiceMonitor CRDs (from kube-prometheus-stack) define targets in a Kubernetes-native way.
        </p>
        <CodeBlock language="yaml">
{`# ServiceMonitor — tells Prometheus where to scrape your app
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments-api
  namespace: monitoring
  labels:
    release: kube-prometheus-stack   # MUST match the Prometheus selector
spec:
  selector:
    matchLabels:
      app: payments-api
  namespaceSelector:
    matchNames:
      - payments-prod
  endpoints:
    - port: metrics          # named port in the Service
      path: /metrics
      interval: 15s          # scrape every 15s (default is 30s)
      scrapeTimeout: 10s
      relabelings:
        - sourceLabels: [__meta_kubernetes_pod_name]
          targetLabel: pod   # add pod name as label on every metric`}
        </CodeBlock>
        <HighlightBox type="warn">The most common ServiceMonitor failure: the ServiceMonitor's labels do not match the Prometheus operator's serviceMonitorSelector. kube-prometheus-stack defaults to selecting ServiceMonitors with <code>release: kube-prometheus-stack</code>. If your ServiceMonitor does not have this label, Prometheus ignores it silently — it does not error, it just does not scrape. Check the Prometheus operator's targets page: Status → Targets.</HighlightBox>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Metric types:</span> Counter (monotonically increasing — use rate() to get per-second values), Gauge (current value that goes up and down — memory usage, queue depth), Histogram (sampled observations bucketed by range — request duration, response size), Summary (client-side quantile calculation — less useful for aggregation).</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Storage and retention:</span> Prometheus stores data locally in a TSDB (time-series database) with blocks of 2 hours. Default retention is 15 days. For longer retention, Prometheus can remote-write to Thanos, Cortex, Mimir, or Grafana Cloud. For multi-cluster aggregation, Thanos query federation or Grafana Agent are common patterns.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">High-cardinality labels:</span> Every unique combination of label values creates a new time series. A label with high cardinality (like pod name or request ID) exponentially increases the number of series. At millions of series, Prometheus memory usage becomes problematic. Never add user IDs, trace IDs, or request IDs as Prometheus labels.</div>
          </li>
        </ul>
      </Accordion>

      <Accordion title="PromQL — Essential Queries for Production" icon={BarChart2}>
        <CodeBlock language="promql">
{`# Request rate (per second, 5-minute window)
rate(http_requests_total{service="payments-api"}[5m])

# Error rate (5xx as fraction of total requests)
sum(rate(http_requests_total{service="payments-api", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="payments-api"}[5m]))

# p99 latency from histogram
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="payments-api"}[5m])) by (le)
)

# CPU throttling ratio (high = CPU limit too restrictive)
sum(rate(container_cpu_cfs_throttled_seconds_total{container="payments-api"}[5m]))
/
sum(rate(container_cpu_cfs_periods_total{container="payments-api"}[5m]))

# Memory usage vs limit
container_memory_working_set_bytes{container="payments-api"}
/
container_spec_memory_limit_bytes{container="payments-api"}

# Pod restart rate (alert if > 0 over 10m)
increase(kube_pod_container_status_restarts_total{namespace="payments-prod"}[10m])

# Cluster-wide: memory usage by namespace
sum by (namespace) (
  container_memory_working_set_bytes{container!=""}
)

# Node disk pressure (alert if < 10% free)
(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100`}
        </CodeBlock>
        <CompareTable
          headers={['Metric', 'What It Measures', 'Alert Threshold']}
          rows={[
            ['container_cpu_cfs_throttled_seconds_total', 'CPU time throttled by CFS quota', '> 25% throttle ratio for 5 minutes'],
            ['container_memory_working_set_bytes', 'Active memory (what OOMKiller sees)', '> 90% of limit'],
            ['kube_pod_container_status_restarts_total', 'Container restart count', '> 3 restarts in 10 minutes'],
            ['kube_deployment_status_replicas_unavailable', 'Pods not ready in a Deployment', '> 0 for 5 minutes in prod'],
            ['http_requests_total (with status=~"5..")', '5xx error rate', '> 1% error rate for 5 minutes'],
          ]}
        />
        <HighlightBox type="tip">Use <code>without()</code> instead of <code>by()</code> when you want to aggregate across most labels but keep a few. <code>sum without(pod, instance)(metric)</code> keeps all labels except pod and instance, which is cleaner than listing every label you want to keep with <code>by()</code>.</HighlightBox>
      </Accordion>

      <Accordion title="Alerting — Rules, Routing, and Fatigue" icon={AlertTriangle}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Prometheus evaluates alert rules on a configurable interval (default 1 minute). When an expression is true for longer than the <code>for</code> duration, the alert fires. Alertmanager receives fired alerts and routes them to the appropriate receiver.
        </p>
        <CodeBlock language="yaml">
{`# PrometheusRule — alert definitions
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: payments-api-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: payments-api.rules
      interval: 30s   # evaluate these rules every 30 seconds
      rules:
        - alert: PaymentsAPIHighErrorRate
          expr: |
            sum(rate(http_requests_total{service="payments-api",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="payments-api"}[5m]))
            > 0.01
          for: 5m      # must be true for 5 continuous minutes before firing
          labels:
            severity: critical
            team: payments
          annotations:
            summary: "Error rate > 1% on payments-api"
            description: "Error rate is {{ $value | humanizePercentage }}"
            runbook_url: "https://runbooks.mycompany.com/payments-api-errors"

        - alert: PaymentsAPIHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{service="payments-api"}[5m])) by (le)
            ) > 0.5
          for: 5m
          labels:
            severity: warning
            team: payments
          annotations:
            summary: "p99 latency > 500ms on payments-api"`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Alert on symptoms, not causes:</span> Alert on error rate and latency (user impact), not on CPU usage (a cause that may or may not matter). High CPU with no latency degradation should be a dashboard annotation, not a page.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">The for duration:</span> Without <code>for</code>, an alert fires on the first evaluation where the condition is true — this causes false positives from brief metric spikes. A 5-minute <code>for</code> means the issue is sustained. Too long a <code>for</code> delays notification of real incidents.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Alertmanager routing:</span> Route by label matching — critical alerts go to PagerDuty (24/7 on-call), warning alerts go to Slack. Group related alerts (same service, same namespace) into one notification to prevent alert storms during an incident. Use inhibition rules to suppress lower-severity alerts when a critical alert is already firing for the same service.</div>
          </li>
        </ul>
        <HighlightBox type="warn">Alert fatigue kills on-call effectiveness faster than any technical problem. Every alert that fires must be actionable and have a runbook. If an alert fires more than once per sprint without a corresponding incident, it either needs its threshold adjusted or the underlying issue fixed. Track alert firing frequency and treat excessive alerts as technical debt.</HighlightBox>
      </Accordion>

      <Accordion title="Loki and Fluent Bit — Log Pipeline" icon={Database}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          The standard EKS log pipeline: applications write to stdout/stderr → Fluent Bit DaemonSet tails log files from the node filesystem → ships to Loki with pod metadata labels → Grafana queries with LogQL.
        </p>
        <CodeBlock language="yaml">
{`# Fluent Bit DaemonSet configuration (helm values for fluent-bit chart)
config:
  inputs: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

  filters: |
    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On
        Keep_Log            Off
        Annotations         Off   # don't include all annotations as labels
        Labels              On

  outputs: |
    [OUTPUT]
        Name   loki
        Match  kube.*
        Host   loki.monitoring.svc.cluster.local
        Port   3100
        Labels  job=fluentbit,namespace=$kubernetes['namespace_name'],pod=$kubernetes['pod_name'],container=$kubernetes['container_name']`}
        </CodeBlock>
        <CodeBlock language="logql">
{`# LogQL — query language for Loki (similar to PromQL)

# Find all ERROR logs in the payments namespace
{namespace="payments-prod"} |= "ERROR"

# Parse JSON logs and filter by field
{namespace="payments-prod"} | json | level="error" | status_code >= 500

# Count error logs per minute (rate)
sum(rate({namespace="payments-prod"} |= "ERROR" [1m]))

# Find logs containing a specific trace ID
{namespace="payments-prod"} |= "trace_id=abc123def456"

# Aggregate log volume by pod
sum by (pod) (
  count_over_time({namespace="payments-prod"}[5m])
)

# Extract latency from structured logs and compute p99
{namespace="payments-prod"} | json | unwrap latency_ms | quantile_over_time(0.99, [5m])`}
        </CodeBlock>
        <HighlightBox type="warn">Loki's most expensive mistake: high-cardinality labels. Loki indexes only labels (namespace, pod, container, app). If you add a label like <code>trace_id</code> or <code>user_id</code> with thousands of unique values, Loki's index explodes and performance degrades sharply. Search for trace IDs using <code>|=</code> (line filter), not as a label. Keep label count under 10 and cardinality under 100 distinct values per label in production.</HighlightBox>
      </Accordion>

      <Accordion title="Distributed Tracing — Tempo and Jaeger" icon={Activity}>
        <p style={{fontSize:13, color:'var(--muted)', marginBottom:12}}>
          Metrics and logs tell you what happened. Traces tell you where time was spent across service calls. Distributed tracing is the third pillar of observability.
        </p>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">How traces work:</span> Each request gets a unique trace ID at the entry point (ingress controller or ALB). As the request calls downstream services, the trace ID and parent span ID propagate via HTTP headers (W3C Trace-Context or B3). Each service creates a span (start time, duration, attributes) and exports it to a collector (OpenTelemetry Collector). The collector sends to Tempo, Jaeger, or Datadog APM.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">OpenTelemetry is the standard:</span> Instrument with OpenTelemetry SDK (not Jaeger or Zipkin SDKs directly). OpenTelemetry Collector acts as a pipeline — receives traces, processes them (sampling, enrichment), and exports to any backend. This decouples instrumentation from the storage backend.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Sampling strategy:</span> Tracing every request at high traffic rates is expensive. Head-based sampling (decide at trace start whether to sample) is simple but cannot prioritize interesting traces. Tail-based sampling (collect all spans, decide at trace end — sample 100% of error traces, 1% of success traces) is more powerful but requires more infrastructure.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Exemplars:</span> Link between metrics and traces. A Prometheus histogram can attach a trace ID as an exemplar to the data point representing a slow request. In Grafana, you can click on a high-latency spike in the dashboard and jump directly to the trace for that specific request.</div>
          </li>
        </ul>
        <HighlightBox>Grafana LGTM stack (Loki + Grafana + Tempo + Mimir): a fully open-source, self-hosted observability stack that covers logs, metrics, and traces with a unified query experience in Grafana. Tempo integrates natively with both Loki (trace ID to log correlation) and Grafana (metrics to traces via exemplars). For teams that want to avoid cloud observability costs, this is the strongest open-source alternative.</HighlightBox>
      </Accordion>

      <Accordion title="Grafana Dashboards — Production Patterns" icon={Settings}>
        <CodeBlock language="json">
{`// Dashboard JSON pattern — store in Git and sync with Grafana provisioning
// or via Terraform grafana provider

// Key panels for a service dashboard:
// 1. Request rate — rate(http_requests_total{service="$service"}[5m])
// 2. Error rate — fraction of 5xx
// 3. p50/p95/p99 latency — histogram_quantile(0.99, ...)
// 4. Pod count — kube_deployment_status_replicas_available
// 5. CPU usage vs limit
// 6. Memory usage vs limit
// 7. Restart count
// 8. Deploy annotations — mark when deployments happened

// Grafana provisioning: mount dashboards as ConfigMaps
apiVersion: v1
kind: ConfigMap
metadata:
  name: payments-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"    # grafana sidecar picks this up automatically
data:
  payments-api.json: |
    { ... dashboard JSON ... }`}
        </CodeBlock>
        <ul className="item-list">
          <li>
            <span className="bullet">→</span>
            <div><span className="label">Deploy annotations:</span> Mark every deployment on your dashboards with a vertical line. Correlating metric changes with deployments is the most common post-incident analysis — if you cannot see when code changed, you are debugging blind.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">USE method (Utilization, Saturation, Errors):</span> For infrastructure (nodes, CPUs, disks). Every resource has these three properties — measure all three. High utilization alone is fine; high utilization + high saturation means the resource is a bottleneck.</div>
          </li>
          <li>
            <span className="bullet">→</span>
            <div><span className="label">RED method (Rate, Errors, Duration):</span> For services (APIs, microservices). How many requests per second, what percentage are errors, how long they take. These three metrics, monitored per service, give you complete visibility into service health from the user's perspective.</div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
